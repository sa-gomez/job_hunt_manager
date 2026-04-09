import asyncio
import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.credential import EncryptedCredential
from backend.models.job import JobPosting
from backend.models.profile import UserProfile
from backend.models.scan import ScanResult
from backend.scrapers.google_jobs import GoogleJobsScraper
from backend.scrapers.greenhouse import GreenhouseScraper
from backend.scrapers.lever import LeverScraper
from backend.scrapers.linkedin import LinkedInScraper
from backend.services import crypto
from backend.services.matching import score_job

logger = logging.getLogger(__name__)

# In-memory scan state (sufficient for single-process dev; replace with Redis/ARQ later)
_scan_state: dict[str, dict] = {}


def get_scan_state(scan_id: str) -> dict | None:
    return _scan_state.get(scan_id)


def cancel_scan(scan_id: str) -> bool:
    """Request cancellation of a running scan. Returns False if scan not found."""
    if scan_id not in _scan_state:
        return False
    _scan_state[scan_id]["cancel_requested"] = True
    return True


def _is_cancelled(scan_id: str) -> bool:
    return _scan_state.get(scan_id, {}).get("cancel_requested", False)


async def run_scan(scan_id: str, profile_id: int, db: AsyncSession, sources: list[str] | None = None) -> None:
    _scan_state[scan_id] = {"status": "running", "started_at": datetime.now(timezone.utc).isoformat()}
    try:
        profile = await db.get(UserProfile, profile_id)
        if not profile:
            _scan_state[scan_id]["status"] = "error"
            _scan_state[scan_id]["error"] = f"Profile {profile_id} not found"
            return

        # Load all credentials for this profile
        creds_rows = (
            await db.execute(
                select(EncryptedCredential).where(
                    EncryptedCredential.profile_id == profile_id
                )
            )
        ).scalars().all()

        creds_map: dict[str, dict] = {}
        for row in creds_rows:
            try:
                creds_map[row.service] = {
                    "username": crypto.decrypt(row.username_enc) if row.username_enc else None,
                    "password": crypto.decrypt(row.password_enc) if row.password_enc else None,
                    "extra": crypto.decrypt(row.extra_enc) if row.extra_enc else None,
                }
            except Exception as exc:
                logger.warning("Failed to decrypt credentials for service %s: %s", row.service, exc)

        all_scrapers = [
            ("greenhouse", GreenhouseScraper(), creds_map.get("greenhouse")),
            ("lever", LeverScraper(), creds_map.get("lever")),
            ("google_jobs", GoogleJobsScraper(), creds_map.get("serpapi")),
            ("linkedin", LinkedInScraper(), creds_map.get("linkedin")),
        ]
        scrapers = [s for s in all_scrapers if sources is None or s[0] in sources]

        all_jobs: list[JobPosting] = []
        scraper_labels = {"greenhouse": "Greenhouse", "lever": "Lever", "google_jobs": "Google Jobs", "linkedin": "LinkedIn"}
        for name, scraper, creds in scrapers:
            if _is_cancelled(scan_id):
                logger.info("Scan %s cancelled before scraping %s", scan_id, name)
                break
            label = scraper_labels.get(name, name)
            _scan_state[scan_id]["message"] = f"Scraping {label}…"
            try:
                result = await scraper.scrape(profile, creds)
                logger.info("Scraper %s returned %d jobs", name, len(result))
                all_jobs.extend(result)
            except Exception as exc:
                logger.error("Scraper %s raised: %s", name, exc)

        # Filter to target companies only
        if profile.target_companies:
            target_set = {c.lower() for c in profile.target_companies}
            all_jobs = [j for j in all_jobs if j.company and j.company.lower() in target_set]

        # Filter to target roles only
        if profile.target_roles:
            all_jobs = [
                j for j in all_jobs
                if j.title and any(role.lower() in j.title.lower() for role in profile.target_roles)
            ]

        # Filter to profile city (keep remote jobs if remote_ok)
        if profile.location:
            city = profile.location.lower()
            all_jobs = [
                j for j in all_jobs
                if (profile.remote_ok and j.remote_flag)
                or (j.location and city in j.location.lower())
            ]

        # Upsert job postings (dedup by source + external_id)
        _scan_state[scan_id]["message"] = f"Saving {len(all_jobs)} job postings…"
        persisted_jobs: list[JobPosting] = []
        for job in all_jobs:
            try:
                existing = None
                if job.external_id:
                    existing = (
                        await db.execute(
                            select(JobPosting).where(
                                JobPosting.source == job.source,
                                JobPosting.external_id == job.external_id,
                            )
                        )
                    ).scalar_one_or_none()

                if existing:
                    persisted_jobs.append(existing)
                else:
                    db.add(job)
                    await db.flush()
                    persisted_jobs.append(job)
            except Exception as exc:
                logger.warning("Failed to persist job %s/%s: %s", job.source, job.external_id, exc)

        await db.commit()

        # Discard any leftover pending results from previous scans before creating new ones
        from sqlalchemy import delete as sa_delete
        await db.execute(
            sa_delete(ScanResult).where(
                ScanResult.profile_id == profile_id,
                ScanResult.status == "pending",
            )
        )
        await db.commit()

        # Score and upsert results (update if already scored for this profile+job)
        _scan_state[scan_id]["message"] = f"Scoring {len(persisted_jobs)} jobs…"
        new_results: list[ScanResult] = []
        for job in persisted_jobs:
            final_score, breakdown = score_job(profile, job)
            existing_result = (
                await db.execute(
                    select(ScanResult).where(
                        ScanResult.profile_id == profile_id,
                        ScanResult.job_id == job.id,
                    )
                )
            ).scalar_one_or_none()
            if existing_result:
                existing_result.score = final_score
                existing_result.score_breakdown = breakdown
                existing_result.scanned_at = datetime.now(timezone.utc)
                # preserve existing status — do not reset to pending
            else:
                nr = ScanResult(
                    profile_id=profile_id,
                    job_id=job.id,
                    score=final_score,
                    score_breakdown=breakdown,
                )
                db.add(nr)
                new_results.append(nr)

        await db.commit()
        # IDs are now populated after commit
        _scan_state[scan_id]["pending_result_ids"] = [r.id for r in new_results]

        cancelled = _is_cancelled(scan_id)
        _scan_state[scan_id]["status"] = "cancelled" if cancelled else "complete"
        _scan_state[scan_id]["message"] = f"Cancelled — {len(persisted_jobs)} jobs saved" if cancelled else f"Done — {len(persisted_jobs)} jobs found"
        _scan_state[scan_id]["jobs_found"] = len(persisted_jobs)
        _scan_state[scan_id]["results_created"] = len(new_results)

    except Exception as exc:
        logger.exception("Scan %s failed: %s", scan_id, exc)
        _scan_state[scan_id]["status"] = "error"
        _scan_state[scan_id]["error"] = str(exc)
