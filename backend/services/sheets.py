"""
Google Sheets bidirectional sync service.

Sheet layout (row 1 = frozen headers, data from row 2):
  A: ID           - DB application id (server-written, do not edit)
  B: Company
  C: Job Title
  D: Stage
  E: Job URL
  F: Applied Date (YYYY-MM-DD)
  G: Recruiter
  H: Notes
  I: Last Updated (DB)   - server-written timestamp
  J: DB Sync Time        - server-written timestamp (marks when this row was last pushed from DB)
"""

import json
import logging
from datetime import datetime, timezone

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.config import settings
from backend.models.application import Application
from backend.models.credential import EncryptedCredential
from backend.services.crypto import decrypt, encrypt

logger = logging.getLogger(__name__)

SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]
CREDENTIAL_SERVICE = "google_oauth"

# Column indices (0-based for list access, 1-based in A1 notation)
COL_ID = 0
COL_COMPANY = 1
COL_JOB_TITLE = 2
COL_STAGE = 3
COL_JOB_URL = 4
COL_APPLIED_DATE = 5
COL_RECRUITER = 6
COL_NOTES = 7
COL_LAST_UPDATED_DB = 8
COL_DB_SYNC_TIME = 9
NUM_COLS = 10

HEADERS = [
    "ID",
    "Company",
    "Job Title",
    "Stage",
    "Job URL",
    "Applied Date",
    "Recruiter",
    "Notes",
    "Last Updated (DB)",
    "DB Sync Time",
]


# ---------------------------------------------------------------------------
# OAuth helpers
# ---------------------------------------------------------------------------

def build_oauth_flow() -> Flow:
    client_config = {
        "web": {
            "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [settings.google_redirect_uri],
        }
    }
    return Flow.from_client_config(
        client_config,
        scopes=SCOPES,
        redirect_uri=settings.google_redirect_uri,
    )


async def get_credentials(db: AsyncSession, profile_id: int) -> Credentials | None:
    row = (
        await db.execute(
            select(EncryptedCredential).where(
                EncryptedCredential.profile_id == profile_id,
                EncryptedCredential.service == CREDENTIAL_SERVICE,
            )
        )
    ).scalar_one_or_none()

    if not row or not row.extra_enc:
        return None

    token_data = json.loads(decrypt(row.extra_enc))
    creds = Credentials(
        token=token_data.get("token"),
        refresh_token=token_data.get("refresh_token"),
        token_uri=token_data.get("token_uri", "https://oauth2.googleapis.com/token"),
        client_id=token_data.get("client_id", settings.google_client_id),
        client_secret=token_data.get("client_secret", settings.google_client_secret),
        scopes=token_data.get("scopes", SCOPES),
    )
    expiry_str = token_data.get("expiry")
    if expiry_str:
        creds.expiry = datetime.fromisoformat(expiry_str)
    return creds


async def save_credentials(db: AsyncSession, profile_id: int, creds: Credentials) -> None:
    token_data = {
        "token": creds.token,
        "refresh_token": creds.refresh_token,
        "token_uri": creds.token_uri,
        "client_id": creds.client_id,
        "client_secret": creds.client_secret,
        "scopes": list(creds.scopes) if creds.scopes else SCOPES,
        "expiry": creds.expiry.isoformat() if creds.expiry else None,
    }
    encrypted = encrypt(json.dumps(token_data))

    existing = (
        await db.execute(
            select(EncryptedCredential).where(
                EncryptedCredential.profile_id == profile_id,
                EncryptedCredential.service == CREDENTIAL_SERVICE,
            )
        )
    ).scalar_one_or_none()

    if existing:
        existing.extra_enc = encrypted
    else:
        db.add(
            EncryptedCredential(
                profile_id=profile_id,
                service=CREDENTIAL_SERVICE,
                extra_enc=encrypted,
            )
        )
    await db.commit()


async def _get_service(db: AsyncSession, profile_id: int):
    """Return an authorized Sheets API client, refreshing token if needed."""
    creds = await get_credentials(db, profile_id)
    if not creds:
        return None

    if creds.expired and creds.refresh_token:
        import google.auth.transport.requests
        creds.refresh(google.auth.transport.requests.Request())
        await save_credentials(db, profile_id, creds)

    return build("sheets", "v4", credentials=creds, cache_discovery=False)


# ---------------------------------------------------------------------------
# Sheet helpers
# ---------------------------------------------------------------------------

def _app_to_row(app: Application) -> list[str]:
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    return [
        str(app.id),
        app.company or "",
        app.job_title or "",
        app.stage or "",
        app.job_url or "",
        app.applied_at.strftime("%Y-%m-%d") if app.applied_at else "",
        app.recruiter_name or "",
        app.notes or "",
        app.last_updated.strftime("%Y-%m-%d %H:%M:%S UTC") if app.last_updated else "",
        now_str,
    ]


def _parse_date(s: str) -> datetime | None:
    s = s.strip()
    if not s:
        return None
    for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y"):
        try:
            return datetime.strptime(s, fmt).replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    return None


# ---------------------------------------------------------------------------
# Core sync
# ---------------------------------------------------------------------------

async def pull_from_sheet(db: AsyncSession, profile_id: int) -> int:
    """Read the sheet and update the DB for any rows that differ. Returns count of updates."""
    if not settings.google_sheet_id:
        return 0

    service = await _get_service(db, profile_id)
    if not service:
        return 0

    try:
        result = (
            service.spreadsheets()
            .values()
            .get(spreadsheetId=settings.google_sheet_id, range="A2:J")
            .execute()
        )
    except Exception:
        logger.exception("Failed to read sheet during pull")
        return 0

    rows = result.get("values", [])
    updated = 0

    for row in rows:
        # Pad to full width
        row = row + [""] * (NUM_COLS - len(row))

        raw_id = row[COL_ID].strip()
        if not raw_id.isdigit():
            continue
        app_id = int(raw_id)

        app = await db.get(Application, app_id)
        if not app or app.profile_id != profile_id:
            continue

        changed = False
        sheet_stage = row[COL_STAGE].strip()
        if sheet_stage and sheet_stage != app.stage:
            from backend.models.application import VALID_STAGES
            if sheet_stage in VALID_STAGES:
                app.stage = sheet_stage
                changed = True

        sheet_notes = row[COL_NOTES].strip() or None
        if sheet_notes != app.notes:
            app.notes = sheet_notes
            changed = True

        sheet_recruiter = row[COL_RECRUITER].strip() or None
        if sheet_recruiter != app.recruiter_name:
            app.recruiter_name = sheet_recruiter
            changed = True

        sheet_company = row[COL_COMPANY].strip()
        if sheet_company and sheet_company != app.company:
            app.company = sheet_company
            changed = True

        sheet_title = row[COL_JOB_TITLE].strip()
        if sheet_title and sheet_title != app.job_title:
            app.job_title = sheet_title
            changed = True

        sheet_url = row[COL_JOB_URL].strip() or None
        if sheet_url != app.job_url:
            app.job_url = sheet_url
            changed = True

        sheet_applied = _parse_date(row[COL_APPLIED_DATE])
        db_applied_date = app.applied_at.date() if app.applied_at else None
        sheet_applied_date = sheet_applied.date() if sheet_applied else None
        if sheet_applied_date != db_applied_date:
            app.applied_at = sheet_applied
            changed = True

        if changed:
            app.last_updated = datetime.now(timezone.utc)
            updated += 1

    if updated:
        await db.commit()
        logger.info("Sheet pull: updated %d application(s) for profile %d", updated, profile_id)

    return updated


async def push_all_to_sheet(db: AsyncSession, profile_id: int) -> None:
    """Rewrite the entire sheet from the DB (rows 2+). Row 1 is headers."""
    if not settings.google_sheet_id:
        return

    service = await _get_service(db, profile_id)
    if not service:
        return

    apps = (
        await db.execute(
            select(Application)
            .where(Application.profile_id == profile_id)
            .order_by(Application.last_updated.desc())
        )
    ).scalars().all()

    spreadsheet_id = settings.google_sheet_id
    sheets_svc = service.spreadsheets()

    try:
        # Ensure header row exists
        sheets_svc.values().update(
            spreadsheetId=spreadsheet_id,
            range="A1:J1",
            valueInputOption="RAW",
            body={"values": [HEADERS]},
        ).execute()

        # Clear all data rows
        sheets_svc.values().clear(
            spreadsheetId=spreadsheet_id,
            range="A2:J",
        ).execute()

        if apps:
            rows = [_app_to_row(app) for app in apps]
            sheets_svc.values().update(
                spreadsheetId=spreadsheet_id,
                range=f"A2:J{1 + len(rows)}",
                valueInputOption="RAW",
                body={"values": rows},
            ).execute()

        logger.info(
            "Sheet push: wrote %d application(s) for profile %d", len(apps), profile_id
        )
    except Exception:
        logger.exception("Failed to push applications to sheet for profile %d", profile_id)


async def full_sync(db: AsyncSession, profile_id: int) -> None:
    """Pull sheet → DB, then push DB → sheet."""
    await pull_from_sheet(db, profile_id)
    await push_all_to_sheet(db, profile_id)


async def get_connected_profile_ids(db: AsyncSession) -> list[int]:
    """Return profile IDs that have a valid Google OAuth credential stored."""
    rows = (
        await db.execute(
            select(EncryptedCredential.profile_id).where(
                EncryptedCredential.service == CREDENTIAL_SERVICE,
                EncryptedCredential.extra_enc.isnot(None),
            )
        )
    ).scalars().all()
    return list(rows)
