import re
import string

from backend.models.job import JobPosting
from backend.models.profile import UserProfile

STOP_WORDS = {
    "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "is", "are", "was", "be", "been", "have",
    "has", "will", "can", "you", "we", "our", "your", "this", "that", "as",
    "it", "its", "not", "no", "if", "do", "so", "up", "out", "about",
    "who", "which", "what", "how", "when", "where", "they", "their",
}


def _tokenize(text: str) -> set[str]:
    text = text.lower()
    text = re.sub(r"[" + re.escape(string.punctuation) + r"]", " ", text)
    return {t for t in text.split() if t and t not in STOP_WORDS and len(t) > 1}


def _skill_score(profile: UserProfile, job_tokens: set[str]) -> float:
    if not profile.skills:
        return 0.5
    matched = sum(
        1 for skill in profile.skills if skill.lower() in job_tokens
    )
    return matched / len(profile.skills)


def _role_score(profile: UserProfile, job: JobPosting) -> float:
    if not profile.target_roles or not job.title:
        return 0.5
    title_lower = job.title.lower()
    for role in profile.target_roles:
        if role.lower() in title_lower:
            return 1.0
    return 0.0


def _location_score(profile: UserProfile, job: JobPosting) -> float:
    if job.remote_flag and profile.remote_ok:
        return 1.0
    if not job.location:
        return 0.5
    job_loc = job.location.lower()
    if "remote" in job_loc and profile.remote_ok:
        return 1.0
    if profile.location and profile.location.lower() in job_loc:
        return 1.0
    return 0.0


def _salary_score(profile: UserProfile, job: JobPosting) -> float:
    if not job.salary_min and not job.salary_max:
        return 1.0
    if not profile.salary_min:
        return 1.0
    job_max = job.salary_max or job.salary_min
    if profile.salary_min and job_max and job_max < profile.salary_min:
        return 0.0
    return 1.0


def score_job(profile: UserProfile, job: JobPosting) -> tuple[float, dict]:
    description_text = (job.description or "") + " " + (job.title or "")
    job_tokens = _tokenize(description_text)

    skill = _skill_score(profile, job_tokens)
    role = _role_score(profile, job)
    location = _location_score(profile, job)
    salary = _salary_score(profile, job)

    final = 0.40 * skill + 0.35 * role + 0.15 * location + 0.10 * salary
    breakdown = {
        "skill_score": round(skill, 3),
        "role_score": round(role, 3),
        "location_score": round(location, 3),
        "salary_score": round(salary, 3),
    }
    return round(final, 3), breakdown
