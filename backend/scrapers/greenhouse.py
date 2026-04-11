import json
import logging
from html.parser import HTMLParser

import httpx

from backend.models.job import JobPosting
from backend.models.profile import UserProfile
from backend.scrapers.base import BaseScraper
from backend.scrapers.registry import DEFAULT_GREENHOUSE_SLUGS, GREENHOUSE_SLUGS, normalize_company_name

logger = logging.getLogger(__name__)


class _HTMLStripper(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []

    def handle_data(self, data):
        self.parts.append(data)

    def get_text(self) -> str:
        return " ".join(self.parts)


def _strip_html(html: str) -> str:
    parser = _HTMLStripper()
    parser.feed(html)
    return re.sub(r"\s+", " ", parser.get_text()).strip()


class GreenhouseScraper(BaseScraper):
    async def scrape(
        self, profile: UserProfile, credentials: dict | None
    ) -> list[JobPosting]:
        slugs = self._resolve_slugs(profile.target_companies or [])
        results: list[JobPosting] = []

        async with httpx.AsyncClient(timeout=30) as client:
            for slug in slugs:
                try:
                    jobs = await self._fetch_board(client, slug)
                    results.extend(jobs)
                except Exception as exc:
                    logger.warning("Greenhouse scrape failed for slug %s: %s", slug, exc)

        return results

    def _resolve_slugs(self, companies: list[str]) -> list[str]:
        if not companies:
            return list(DEFAULT_GREENHOUSE_SLUGS)

        slugs = []
        for company in companies:
            normalized = normalize_company_name(company)
            if normalized in GREENHOUSE_SLUGS:
                slugs.append(GREENHOUSE_SLUGS[normalized])
            else:
                # Fall back to the normalized name — works for most boards
                slugs.append(normalized)
        return slugs

    async def _fetch_board(self, client: httpx.AsyncClient, slug: str) -> list[JobPosting]:
        url = f"https://boards-api.greenhouse.io/v1/boards/{slug}/jobs?content=true"
        resp = await client.get(url)
        if resp.status_code != 200:
            logger.debug("Greenhouse board %s returned HTTP %s", slug, resp.status_code)
            return []

        data = resp.json()
        jobs = data.get("jobs", [])
        postings = []
        for job in jobs:
            description = _strip_html(job.get("content") or "")
            location = ""
            if job.get("location"):
                location = job["location"].get("name", "")
            postings.append(
                JobPosting(
                    source="greenhouse",
                    external_id=str(job.get("id", "")),
                    url=job.get("absolute_url"),
                    title=job.get("title", ""),
                    company=slug.title(),
                    location=location,
                    remote_flag="remote" in location.lower() if location else None,
                    description=description,
                    raw_json=json.dumps(job),
                )
            )
        return postings
