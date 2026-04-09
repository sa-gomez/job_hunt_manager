"""
Single source of truth for companies with known scraper slugs.

Add entries here when onboarding a new company to Greenhouse or Lever scraping.
The scrapers derive their slug lookups and defaults from this list.
"""
from dataclasses import dataclass, field


@dataclass
class CompanyInfo:
    name: str                    # Display name shown in the UI
    greenhouse_slug: str | None = None
    lever_slug: str | None = None
    # Whether to include in the default scan when no target companies are set
    greenhouse_default: bool = False
    lever_default: bool = False


COMPANIES: list[CompanyInfo] = [
    # ── Greenhouse ────────────────────────────────────────────────────────────
    CompanyInfo("Airbnb",       greenhouse_slug="airbnb",      greenhouse_default=True),
    CompanyInfo("Cloudflare",   greenhouse_slug="cloudflare",  greenhouse_default=True),
    CompanyInfo("Confluent",    greenhouse_slug="confluent"),
    CompanyInfo("Databricks",   greenhouse_slug="databricks",  greenhouse_default=True),
    CompanyInfo("Discord",      greenhouse_slug="discord",     greenhouse_default=True),
    CompanyInfo("Elastic",      greenhouse_slug="elastic"),
    CompanyInfo("Figma",        greenhouse_slug="figma",       greenhouse_default=True),
    CompanyInfo("GitHub",       greenhouse_slug="github",      greenhouse_default=True),
    CompanyInfo("GitLab",       greenhouse_slug="gitlab",      greenhouse_default=True),
    CompanyInfo("HashiCorp",    greenhouse_slug="hashicorp"),
    CompanyInfo("HubSpot",      greenhouse_slug="hubspot",     greenhouse_default=True),
    CompanyInfo("Linear",       greenhouse_slug="linear"),
    CompanyInfo("MongoDB",      greenhouse_slug="mongodb",     greenhouse_default=True),
    CompanyInfo("Notion",       greenhouse_slug="notion",      greenhouse_default=True),
    CompanyInfo("PagerDuty",    greenhouse_slug="pagerduty"),
    CompanyInfo("Shopify",      greenhouse_slug="shopify",     greenhouse_default=True),
    CompanyInfo("Snowflake",    greenhouse_slug="snowflake"),
    CompanyInfo("Squarespace",  greenhouse_slug="squarespace"),
    CompanyInfo("Stripe",       greenhouse_slug="stripe",      greenhouse_default=True),
    CompanyInfo("Twilio",       greenhouse_slug="twilio"),
    CompanyInfo("Vercel",       greenhouse_slug="vercel",      greenhouse_default=True),
    CompanyInfo("Zendesk",      greenhouse_slug="zendesk"),
    # ── Lever ─────────────────────────────────────────────────────────────────
    CompanyInfo("Airtable",     lever_slug="airtable",   lever_default=True),
    CompanyInfo("Anthropic",    lever_slug="anthropic",  lever_default=True),
    CompanyInfo("Asana",        lever_slug="asana",      lever_default=True),
    CompanyInfo("Brex",         lever_slug="brex",       lever_default=True),
    CompanyInfo("Carta",        lever_slug="carta"),
    CompanyInfo("Checkr",       lever_slug="checkr"),
    CompanyInfo("Coinbase",     lever_slug="coinbase",   lever_default=True),
    CompanyInfo("Gusto",        lever_slug="gusto",      lever_default=True),
    CompanyInfo("Lattice",      lever_slug="lattice"),
    CompanyInfo("Lever",        lever_slug="lever"),
    CompanyInfo("Loom",         lever_slug="loom"),
    CompanyInfo("Mercury",      lever_slug="mercury"),
    CompanyInfo("Modal",        lever_slug="modal"),
    CompanyInfo("Netflix",      lever_slug="netflix",    lever_default=True),
    CompanyInfo("OpenAI",       lever_slug="openai",     lever_default=True),
    CompanyInfo("Plaid",        lever_slug="plaid"),
    CompanyInfo("Replit",       lever_slug="replit",     lever_default=True),
    CompanyInfo("Retool",       lever_slug="retool",     lever_default=True),
    CompanyInfo("Rippling",     lever_slug="rippling",   lever_default=True),
    CompanyInfo("Scale AI",     lever_slug="scaleai"),
    CompanyInfo("Together",     lever_slug="together"),
]


def _normalize(name: str) -> str:
    import re
    return re.sub(r"[\s\-_.,&'/]", "", name.lower())


# Pre-built lookup dicts used by the scrapers
GREENHOUSE_SLUGS: dict[str, str] = {
    _normalize(c.name): c.greenhouse_slug
    for c in COMPANIES
    if c.greenhouse_slug
}

LEVER_SLUGS: dict[str, str] = {
    _normalize(c.name): c.lever_slug
    for c in COMPANIES
    if c.lever_slug
}

DEFAULT_GREENHOUSE_SLUGS: list[str] = [
    c.greenhouse_slug for c in COMPANIES if c.greenhouse_default
]

DEFAULT_LEVER_SLUGS: list[str] = [
    c.lever_slug for c in COMPANIES if c.lever_default
]
