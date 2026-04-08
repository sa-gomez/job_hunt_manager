import json
import logging

import httpx

from backend.models.job import JobPosting
from backend.models.profile import UserProfile
from backend.scrapers.base import BaseScraper

logger = logging.getLogger(__name__)

# Maps company name (lowercase) → Lever posting slug
LEVER_SLUGS: dict[str, str] = {
    "netflix": "netflix",
    "coinbase": "coinbase",
    "plaid": "plaid",
    "scale ai": "scaleai",
    "scale": "scaleai",
    "lever": "lever",
    "rippling": "rippling",
    "brex": "brex",
    "gusto": "gusto",
    "lattice": "lattice",
    "airtable": "airtable",
    "asana": "asana",
    "carta": "carta",
    "checkr": "checkr",
}


class LeverScraper(BaseScraper):
    async def scrape(
        self, profile: UserProfile, credentials: dict | None
    ) -> list[JobPosting]:
        slugs = self._resolve_slugs(profile.target_companies or [])
        results: list[JobPosting] = []

        async with httpx.AsyncClient(timeout=30) as client:
            for slug in slugs:
                try:
                    jobs = await self._fetch_postings(client, slug)
                    results.extend(jobs)
                except Exception as exc:
                    logger.warning("Lever scrape failed for slug %s: %s", slug, exc)

        return results

    def _resolve_slugs(self, companies: list[str]) -> list[str]:
        slugs = []
        for company in companies:
            key = company.lower().strip()
            if key in LEVER_SLUGS:
                slugs.append(LEVER_SLUGS[key])
            else:
                slugs.append(key.replace(" ", ""))
        return slugs

    async def _fetch_postings(
        self, client: httpx.AsyncClient, slug: str
    ) -> list[JobPosting]:
        url = f"https://api.lever.co/v0/postings/{slug}?mode=json"
        resp = await client.get(url)
        if resp.status_code != 200:
            logger.debug("Lever board %s returned HTTP %s", slug, resp.status_code)
            return []

        postings_data = resp.json()
        postings = []
        for posting in postings_data:
            categories = posting.get("categories", {})
            location = categories.get("location", "")
            description = posting.get("descriptionPlain") or posting.get("description") or ""
            postings.append(
                JobPosting(
                    source="lever",
                    external_id=posting.get("id", ""),
                    url=posting.get("hostedUrl"),
                    title=posting.get("text", ""),
                    company=slug.title(),
                    location=location,
                    remote_flag="remote" in location.lower() if location else None,
                    description=description,
                    raw_json=json.dumps(posting),
                )
            )
        return postings
