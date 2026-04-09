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
            label = scraper_labels.get(name, name)
            _scan_state[scan_id]["message"] = f"Scraping {label}…"
            try:
                result = await scraper.scrape(profile, creds)
                logger.info("Scraper %s returned %d jobs", name, len(result))
                all_jobs.extend(result)
            except Exception as exc:
                logger.error("Scraper %s raised: %s", name, exc)

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

        # Score and upsert results (update if already scored for this profile+job)
        _scan_state[scan_id]["message"] = f"Scoring {len(persisted_jobs)} jobs…"
        scan_results: list[ScanResult] = []
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
                scan_results.append(existing_result)
            else:
                new_result = ScanResult(
                    profile_id=profile_id,
                    job_id=job.id,
                    score=final_score,
                    score_breakdown=breakdown,
                )
                db.add(new_result)
                scan_results.append(new_result)

        await db.commit()

        _scan_state[scan_id]["status"] = "complete"
        _scan_state[scan_id]["message"] = f"Done — {len(persisted_jobs)} jobs found"
        _scan_state[scan_id]["jobs_found"] = len(persisted_jobs)
        _scan_state[scan_id]["results_created"] = len(scan_results)

    except Exception as exc:
        logger.exception("Scan %s failed: %s", scan_id, exc)
        _scan_state[scan_id]["status"] = "error"
        _scan_state[scan_id]["error"] = str(exc)
