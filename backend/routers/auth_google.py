"""
Google OAuth 2.0 flow for authorizing Google Sheets access.

Flow:
  1. Frontend calls GET /api/auth/google?profile_id=N → gets back {"auth_url": "..."}
  2. User is redirected to Google's consent screen
  3. Google redirects to GET /api/auth/google/callback?code=...&state=...
  4. Server exchanges code for tokens, saves encrypted to credentials table
  5. Server redirects browser to /applications?profile_id=N&connected=true
"""

import base64
import json
import logging

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from backend.config import settings
from backend.database import get_db
from backend.services.sheets import (
    CREDENTIAL_SERVICE,
    build_oauth_flow,
    get_credentials,
    save_credentials,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth/google", tags=["auth"])


@router.get("/status")
async def google_auth_status(profile_id: int, db: AsyncSession = Depends(get_db)):
    """Returns whether this profile has a connected Google OAuth token."""
    creds = await get_credentials(db, profile_id)
    connected = creds is not None
    return {"connected": connected}


@router.get("")
async def start_google_auth(profile_id: int):
    """Returns the Google OAuth authorization URL for the given profile."""
    if not settings.google_client_id or not settings.google_client_secret:
        raise HTTPException(
            status_code=503,
            detail="GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in .env",
        )

    flow = build_oauth_flow()
    # Encode profile_id in state so callback knows which profile to associate
    state = base64.urlsafe_b64encode(json.dumps({"profile_id": profile_id}).encode()).decode()
    auth_url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
        state=state,
    )
    return {"auth_url": auth_url}


@router.get("/callback")
async def google_auth_callback(
    code: str,
    state: str,
    db: AsyncSession = Depends(get_db),
):
    """Exchange auth code for tokens, save to DB, redirect to frontend."""
    try:
        state_data = json.loads(base64.urlsafe_b64decode(state.encode()))
        profile_id = int(state_data["profile_id"])
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid OAuth state parameter")

    flow = build_oauth_flow()
    try:
        flow.fetch_token(code=code)
    except Exception as e:
        logger.exception("OAuth token exchange failed")
        raise HTTPException(status_code=400, detail=f"Token exchange failed: {e}")

    await save_credentials(db, profile_id, flow.credentials)

    # Redirect back to the Applications page with a success flag
    return RedirectResponse(
        url=f"http://localhost:5173/applications?profile_id={profile_id}&connected=true"
    )
