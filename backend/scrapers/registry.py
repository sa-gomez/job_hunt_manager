"""
Single source of truth for company data used across scrapers and the UI.

- Companies with greenhouse_slug / lever_slug are directly scrapable via those boards.
- All companies (with or without slugs) appear in the UI's company browser and autocomplete.
- Add a new company here and everything — scrapers, API, frontend — picks it up.
"""
from dataclasses import dataclass, field
import re


@dataclass
class CompanyInfo:
    name: str                    # Display name shown in the UI
    category: str | None = None  # UI grouping (BulkAddCompaniesModal, etc.)
    greenhouse_slug: str | None = None
    lever_slug: str | None = None
    # Whether to include in the default scan when no target companies are set
    greenhouse_default: bool = False
    lever_default: bool = False


COMPANIES: list[CompanyInfo] = [
    # ── Big Tech ──────────────────────────────────────────────────────────────
    CompanyInfo("Adobe",            category="Big Tech"),
    CompanyInfo("Amazon",           category="Big Tech"),
    CompanyInfo("Apple",            category="Big Tech"),
    CompanyInfo("Cisco",            category="Big Tech"),
    CompanyInfo("Google",           category="Big Tech"),
    CompanyInfo("IBM",              category="Big Tech"),
    CompanyInfo("Intel",            category="Big Tech"),
    CompanyInfo("Meta",             category="Big Tech"),
    CompanyInfo("Microsoft",        category="Big Tech"),
    CompanyInfo("Netflix",          category="Big Tech",         lever_slug="netflix",    lever_default=True),
    CompanyInfo("Oracle",           category="Big Tech"),
    CompanyInfo("Salesforce",       category="Big Tech"),
    CompanyInfo("SAP",              category="Big Tech"),
    CompanyInfo("ServiceNow",       category="Big Tech"),
    CompanyInfo("VMware",           category="Big Tech"),
    CompanyInfo("Workday",          category="Big Tech"),

    # ── Fintech & Payments ────────────────────────────────────────────────────
    CompanyInfo("Affirm",           category="Fintech & Payments"),
    CompanyInfo("Block",            category="Fintech & Payments"),
    CompanyInfo("Brex",             category="Fintech & Payments", lever_slug="brex",      lever_default=True),
    CompanyInfo("Chime",            category="Fintech & Payments"),
    CompanyInfo("Coinbase",         category="Fintech & Payments", lever_slug="coinbase",  lever_default=True),
    CompanyInfo("Marqeta",          category="Fintech & Payments"),
    CompanyInfo("Mercury",          category="Fintech & Payments", lever_slug="mercury"),
    CompanyInfo("PayPal",           category="Fintech & Payments"),
    CompanyInfo("Plaid",            category="Fintech & Payments", lever_slug="plaid"),
    CompanyInfo("Robinhood",        category="Fintech & Payments"),
    CompanyInfo("Stripe",           category="Fintech & Payments", greenhouse_slug="stripe", greenhouse_default=True),

    # ── Cloud & Infrastructure ────────────────────────────────────────────────
    CompanyInfo("Akamai",           category="Cloud & Infrastructure"),
    CompanyInfo("Cloudflare",       category="Cloud & Infrastructure", greenhouse_slug="cloudflare",  greenhouse_default=True),
    CompanyInfo("Databricks",       category="Cloud & Infrastructure", greenhouse_slug="databricks",  greenhouse_default=True),
    CompanyInfo("Datadog",          category="Cloud & Infrastructure"),
    CompanyInfo("DigitalOcean",     category="Cloud & Infrastructure"),
    CompanyInfo("Elastic",          category="Cloud & Infrastructure", greenhouse_slug="elastic"),
    CompanyInfo("Fastly",           category="Cloud & Infrastructure"),
    CompanyInfo("HashiCorp",        category="Cloud & Infrastructure", greenhouse_slug="hashicorp"),
    CompanyInfo("Modal",            category="Cloud & Infrastructure", lever_slug="modal"),
    CompanyInfo("MongoDB",          category="Cloud & Infrastructure", greenhouse_slug="mongodb",     greenhouse_default=True),
    CompanyInfo("New Relic",        category="Cloud & Infrastructure"),
    CompanyInfo("PagerDuty",        category="Cloud & Infrastructure", greenhouse_slug="pagerduty"),
    CompanyInfo("Snowflake",        category="Cloud & Infrastructure", greenhouse_slug="snowflake"),
    CompanyInfo("Splunk",           category="Cloud & Infrastructure"),
    CompanyInfo("Supabase",         category="Cloud & Infrastructure"),
    CompanyInfo("Twilio",           category="Cloud & Infrastructure", greenhouse_slug="twilio"),
    CompanyInfo("Vercel",           category="Cloud & Infrastructure", greenhouse_slug="vercel",      greenhouse_default=True),

    # ── Security ──────────────────────────────────────────────────────────────
    CompanyInfo("Auth0 (Okta)",     category="Security"),
    CompanyInfo("CrowdStrike",      category="Security"),
    CompanyInfo("Okta",             category="Security"),
    CompanyInfo("Palo Alto Networks", category="Security"),
    CompanyInfo("SentinelOne",      category="Security"),
    CompanyInfo("Wiz",              category="Security"),
    CompanyInfo("Zscaler",          category="Security"),

    # ── Developer Tools & Productivity ────────────────────────────────────────
    CompanyInfo("Airtable",         category="Developer Tools & Productivity", lever_slug="airtable",  lever_default=True),
    CompanyInfo("Asana",            category="Developer Tools & Productivity", lever_slug="asana",     lever_default=True),
    CompanyInfo("Atlassian",        category="Developer Tools & Productivity"),
    CompanyInfo("Figma",            category="Developer Tools & Productivity", greenhouse_slug="figma",   greenhouse_default=True),
    CompanyInfo("GitHub",           category="Developer Tools & Productivity", greenhouse_slug="github",  greenhouse_default=True),
    CompanyInfo("GitLab",           category="Developer Tools & Productivity", greenhouse_slug="gitlab",  greenhouse_default=True),
    CompanyInfo("Linear",           category="Developer Tools & Productivity", greenhouse_slug="linear"),
    CompanyInfo("Loom",             category="Developer Tools & Productivity", lever_slug="loom"),
    CompanyInfo("Notion",           category="Developer Tools & Productivity", greenhouse_slug="notion",  greenhouse_default=True),
    CompanyInfo("Replit",           category="Developer Tools & Productivity", lever_slug="replit",    lever_default=True),
    CompanyInfo("Retool",           category="Developer Tools & Productivity", lever_slug="retool",    lever_default=True),
    CompanyInfo("Slack",            category="Developer Tools & Productivity"),
    CompanyInfo("Zoom",             category="Developer Tools & Productivity"),

    # ── Consumer & Social ─────────────────────────────────────────────────────
    CompanyInfo("Airbnb",           category="Consumer & Social",   greenhouse_slug="airbnb",  greenhouse_default=True),
    CompanyInfo("Discord",          category="Consumer & Social",   greenhouse_slug="discord", greenhouse_default=True),
    CompanyInfo("DoorDash",         category="Consumer & Social"),
    CompanyInfo("Dropbox",          category="Consumer & Social"),
    CompanyInfo("Instacart",        category="Consumer & Social"),
    CompanyInfo("Lyft",             category="Consumer & Social"),
    CompanyInfo("Pinterest",        category="Consumer & Social"),
    CompanyInfo("Reddit",           category="Consumer & Social"),
    CompanyInfo("Shopify",          category="Consumer & Social",   greenhouse_slug="shopify", greenhouse_default=True),
    CompanyInfo("Snap",             category="Consumer & Social"),
    CompanyInfo("Spotify",          category="Consumer & Social"),
    CompanyInfo("Squarespace",      category="Consumer & Social",   greenhouse_slug="squarespace"),
    CompanyInfo("TikTok",           category="Consumer & Social"),
    CompanyInfo("Uber",             category="Consumer & Social"),
    CompanyInfo("X (Twitter)",      category="Consumer & Social"),

    # ── Enterprise Software ───────────────────────────────────────────────────
    CompanyInfo("Box",              category="Enterprise Software"),
    CompanyInfo("Carta",            category="Enterprise Software", lever_slug="carta"),
    CompanyInfo("Checkr",           category="Enterprise Software", lever_slug="checkr"),
    CompanyInfo("Confluent",        category="Enterprise Software", greenhouse_slug="confluent"),
    CompanyInfo("Coupa",            category="Enterprise Software"),
    CompanyInfo("Dynatrace",        category="Enterprise Software"),
    CompanyInfo("Freshworks",       category="Enterprise Software"),
    CompanyInfo("Gusto",            category="Enterprise Software", lever_slug="gusto",    lever_default=True),
    CompanyInfo("HubSpot",          category="Enterprise Software", greenhouse_slug="hubspot", greenhouse_default=True),
    CompanyInfo("Lattice",          category="Enterprise Software", lever_slug="lattice"),
    CompanyInfo("Lever",            category="Enterprise Software", lever_slug="lever"),
    CompanyInfo("Marketo",          category="Enterprise Software"),
    CompanyInfo("MuleSoft",         category="Enterprise Software"),
    CompanyInfo("Qualtrics",        category="Enterprise Software"),
    CompanyInfo("Rippling",         category="Enterprise Software", lever_slug="rippling", lever_default=True),
    CompanyInfo("Zendesk",          category="Enterprise Software", greenhouse_slug="zendesk"),

    # ── AI & ML ───────────────────────────────────────────────────────────────
    CompanyInfo("Anthropic",        category="AI & ML",             lever_slug="anthropic", lever_default=True),
    CompanyInfo("Cohere",           category="AI & ML"),
    CompanyInfo("DeepMind",         category="AI & ML"),
    CompanyInfo("Hugging Face",     category="AI & ML"),
    CompanyInfo("Mistral AI",       category="AI & ML"),
    CompanyInfo("OpenAI",           category="AI & ML",             lever_slug="openai",   lever_default=True),
    CompanyInfo("Perplexity",       category="AI & ML"),
    CompanyInfo("Scale AI",         category="AI & ML",             lever_slug="scaleai"),
    CompanyInfo("Stability AI",     category="AI & ML"),
    CompanyInfo("Together",         category="AI & ML",             lever_slug="together"),

    # ── Hardware & Semiconductors ─────────────────────────────────────────────
    CompanyInfo("AMD",              category="Hardware & Semiconductors"),
    CompanyInfo("Arm",              category="Hardware & Semiconductors"),
    CompanyInfo("ASML",             category="Hardware & Semiconductors"),
    CompanyInfo("Broadcom",         category="Hardware & Semiconductors"),
    CompanyInfo("Marvell",          category="Hardware & Semiconductors"),
    CompanyInfo("NVIDIA",           category="Hardware & Semiconductors"),
    CompanyInfo("Qualcomm",         category="Hardware & Semiconductors"),
    CompanyInfo("Texas Instruments", category="Hardware & Semiconductors"),
]


def _normalize(name: str) -> str:
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
