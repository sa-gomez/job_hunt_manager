"""
Background worker that keeps the Google Sheet in sync with the applications DB.

Two behaviors:
  1. Triggered sync — any DB write calls request_sync(), which sets an asyncio.Event.
     The worker wakes up, debounces 2 s (to batch rapid writes), then runs full_sync().
  2. Poll sync — the worker also wakes up every `poll_interval` seconds to pick up
     edits made directly in the sheet.
"""

import asyncio
import logging

from backend.database import AsyncSessionLocal
from backend.services import sheets

logger = logging.getLogger(__name__)

_sync_event: asyncio.Event | None = None


def _get_event() -> asyncio.Event:
    global _sync_event
    if _sync_event is None:
        _sync_event = asyncio.Event()
    return _sync_event


def request_sync() -> None:
    """Signal the worker that a sync is needed. Safe to call from any coroutine."""
    _get_event().set()


async def run_worker(poll_interval: int) -> None:
    """
    Long-running asyncio task. Waits for either:
      - request_sync() to be called (triggered by a DB write), or
      - poll_interval seconds to elapse (periodic poll).
    Then runs a full bidirectional sync for all connected profiles.
    """
    event = _get_event()
    logger.info("Sheets worker started (poll interval: %ds)", poll_interval)

    while True:
        try:
            await asyncio.wait_for(asyncio.shield(event.wait()), timeout=poll_interval)
        except asyncio.TimeoutError:
            pass

        event.clear()

        # Debounce: wait briefly to absorb any rapid follow-up writes
        await asyncio.sleep(2)
        event.clear()

        try:
            async with AsyncSessionLocal() as db:
                profile_ids = await sheets.get_connected_profile_ids(db)

            for profile_id in profile_ids:
                try:
                    async with AsyncSessionLocal() as db:
                        await sheets.full_sync(db, profile_id)
                except Exception:
                    logger.exception(
                        "Sheets sync failed for profile %d", profile_id
                    )
        except Exception:
            logger.exception("Sheets worker encountered an unexpected error")
