from abc import ABC, abstractmethod

from backend.models.job import JobPosting
from backend.models.profile import UserProfile


class BaseScraper(ABC):
    @abstractmethod
    async def scrape(
        self, profile: UserProfile, credentials: dict | None
    ) -> list[JobPosting]:
        """Scrape job postings relevant to the given profile.

        Args:
            profile: The user's job-hunt profile.
            credentials: Decrypted credentials dict for this scraper's service,
                         or None if not configured.

        Returns:
            List of unsaved JobPosting instances.
        """
