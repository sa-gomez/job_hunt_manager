import asyncio
import json
import logging
import random
from pathlib import Path

from backend.models.job import JobPosting
from backend.models.profile import UserProfile
from backend.scrapers.base import BaseScraper

logger = logging.getLogger(__name__)

CONTEXT_DIR = Path.home() / ".job_hunt_manager" / "linkedin_context"
LINKEDIN_BASE = "https://www.linkedin.com"


class LinkedInScraper(BaseScraper):
    async def scrape(
        self, profile: UserProfile, credentials: dict | None
    ) -> list[JobPosting]:
        if not credentials or not credentials.get("username") or not credentials.get("password"):
            logger.info("LinkedIn scraper skipped: no credentials configured")
            return []

        try:
            from playwright.async_api import async_playwright
        except ImportError:
            logger.error("playwright is not installed")
            return []

        CONTEXT_DIR.mkdir(parents=True, exist_ok=True)
        results: list[JobPosting] = []

        async with async_playwright() as pw:
            browser = await pw.chromium.launch_persistent_context(
                str(CONTEXT_DIR),
                headless=True,
                args=["--no-sandbox"],
            )
            page = browser.pages[0] if browser.pages else await browser.new_page()

            try:
                # Check if session is still alive
                await page.goto(f"{LINKEDIN_BASE}/feed", wait_until="domcontentloaded", timeout=15000)
                if "login" in page.url or "authwall" in page.url:
                    logged_in = await self._login(page, credentials)
                    if not logged_in:
                        logger.error("LinkedIn login failed")
                        return []

                for role in (profile.target_roles or [])[:3]:
                    try:
                        jobs = await self._search_role(page, role, profile)
                        results.extend(jobs)
                    except Exception as exc:
                        logger.warning("LinkedIn search failed for role %s: %s", role, exc)

            finally:
                await browser.close()

        return results

    async def _login(self, page, credentials: dict) -> bool:
        await page.goto(f"{LINKEDIN_BASE}/login", wait_until="domcontentloaded", timeout=15000)
        await page.fill("#username", credentials["username"])
        await asyncio.sleep(random.uniform(0.5, 1.0))
        await page.fill("#password", credentials["password"])
        await asyncio.sleep(random.uniform(0.5, 1.0))
        await page.click('button[type="submit"]')
        await page.wait_for_load_state("domcontentloaded", timeout=15000)
        return "feed" in page.url or "checkpoint" not in page.url

    async def _search_role(
        self, page, role: str, profile: UserProfile
    ) -> list[JobPosting]:
        params = f"keywords={role.replace(' ', '%20')}"
        if profile.remote_ok:
            params += "&f_WT=2"
        url = f"{LINKEDIN_BASE}/jobs/search/?{params}&start=0"
        await page.goto(url, wait_until="domcontentloaded", timeout=20000)
        await asyncio.sleep(random.uniform(2, 4))

        job_cards = await page.query_selector_all(".job-card-container")
        postings = []
        for card in job_cards[:20]:
            try:
                posting = await self._parse_card(card)
                if posting:
                    postings.append(posting)
            except Exception as exc:
                logger.debug("Failed to parse LinkedIn job card: %s", exc)
            await asyncio.sleep(random.uniform(0.3, 0.7))

        return postings

    async def _parse_card(self, card) -> JobPosting | None:
        title_el = await card.query_selector(".job-card-list__title, .job-card-container__link")
        company_el = await card.query_selector(".job-card-container__company-name")
        location_el = await card.query_selector(".job-card-container__metadata-item")
        link_el = await card.query_selector("a[href*='/jobs/view/']")

        title = (await title_el.inner_text()).strip() if title_el else ""
        company = (await company_el.inner_text()).strip() if company_el else ""
        location = (await location_el.inner_text()).strip() if location_el else ""
        href = await link_el.get_attribute("href") if link_el else None
        job_id = None
        if href:
            parts = href.split("/jobs/view/")
            if len(parts) > 1:
                job_id = parts[1].split("/")[0].split("?")[0]

        if not title:
            return None

        return JobPosting(
            source="linkedin",
            external_id=job_id,
            url=f"{LINKEDIN_BASE}{href}" if href and href.startswith("/") else href,
            title=title,
            company=company,
            location=location,
            remote_flag="remote" in location.lower() if location else None,
            description="",
            raw_json=json.dumps({"title": title, "company": company, "location": location}),
        )
