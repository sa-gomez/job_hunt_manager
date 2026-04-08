import json
import logging

import httpx

from backend.models.job import JobPosting
from backend.models.profile import UserProfile
from backend.scrapers.base import BaseScraper

logger = logging.getLogger(__name__)

SERPAPI_URL = "https://serpapi.com/search"


class GoogleJobsScraper(BaseScraper):
    async def scrape(
        self, profile: UserProfile, credentials: dict | None
    ) -> list[JobPosting]:
        if not credentials or not credentials.get("password"):
            logger.info("Google Jobs scraper skipped: no SerpAPI key configured")
            return []

        api_key = credentials["password"]
        results: list[JobPosting] = []
        roles = profile.target_roles or []
        location = profile.location or ""

        async with httpx.AsyncClient(timeout=30) as client:
            for role in roles:
                try:
                    jobs = await self._search(client, api_key, role, location)
                    results.extend(jobs)
                except Exception as exc:
                    logger.warning("SerpAPI search failed for role %s: %s", role, exc)

        return results

    async def _search(
        self,
        client: httpx.AsyncClient,
        api_key: str,
        role: str,
        location: str,
    ) -> list[JobPosting]:
        params = {
            "engine": "google_jobs",
            "q": role,
            "api_key": api_key,
        }
        if location:
            params["location"] = location

        resp = await client.get(SERPAPI_URL, params=params)
        if resp.status_code != 200:
            logger.warning("SerpAPI returned HTTP %s", resp.status_code)
            return []

        data = resp.json()
        job_results = data.get("jobs_results", [])
        postings = []
        for job in job_results:
            ext = job.get("detected_extensions", {})
            apply_url = None
            for link in job.get("related_links", []):
                apply_url = link.get("link")
                break

            location_str = job.get("location", "")
            postings.append(
                JobPosting(
                    source="google_jobs",
                    external_id=job.get("job_id", ""),
                    url=apply_url,
                    title=job.get("title", ""),
                    company=job.get("company_name", ""),
                    location=location_str,
                    remote_flag="remote" in location_str.lower() if location_str else None,
                    description=job.get("description", ""),
                    raw_json=json.dumps(job),
                )
            )
        return postings
