# Plan: Job Hunt Manager — Full Stack App, Feature 1

## Context
Building a full-stack job hunt manager from an empty Python 3.12 scaffold. First feature: user fills in a profile (skills, target roles, salary, location) + optionally stores site login credentials, triggers a scan across LinkedIn, Greenhouse, Lever, and Google Jobs, and sees ranked matches scored against their profile.

Stack: FastAPI backend + React/Vite/Tailwind frontend, SQLite (Postgres-ready), uv package manager.

---

## Directory Structure

```
job_hunt_manager/
├── pyproject.toml              # Updated with all backend deps
├── main.py                     # Replaced: uvicorn entry point
├── alembic.ini
├── .env.example
│
├── backend/
│   ├── app.py                  # FastAPI app factory
│   ├── config.py               # pydantic-settings: DATABASE_URL, ENCRYPTION_KEY
│   ├── database.py             # SQLAlchemy async engine + session
│   ├── models/
│   │   ├── profile.py          # UserProfile ORM
│   │   ├── credential.py       # EncryptedCredential ORM
│   │   ├── job.py              # JobPosting ORM
│   │   └── scan.py             # ScanResult ORM
│   ├── schemas/                # Pydantic in/out schemas (one per model)
│   ├── routers/
│   │   ├── profile.py          # GET/POST/PUT/PATCH/DELETE /api/profile
│   │   ├── credentials.py      # GET/POST/DELETE /api/credentials
│   │   ├── scan.py             # POST /api/scan, GET /api/scan/{id}
│   │   └── jobs.py             # GET /api/jobs, GET /api/results, PATCH /api/results/{id}
│   ├── services/
│   │   ├── crypto.py           # Fernet encrypt/decrypt helpers
│   │   ├── matching.py         # Job-to-profile scoring engine
│   │   └── scan_orchestrator.py # Fan-out to scrapers, persist results
│   └── scrapers/
│       ├── base.py             # Abstract BaseScraper interface
│       ├── linkedin.py         # Playwright (persistent context + login)
│       ├── greenhouse.py       # Public API: boards-api.greenhouse.io
│       ├── lever.py            # Public API: api.lever.co
│       └── google_jobs.py      # SerpAPI (skipped if no key stored)
│
├── alembic/
│   ├── env.py
│   └── versions/
│
└── frontend/
    ├── vite.config.ts          # Proxy /api → localhost:8000
    ├── tailwind.config.ts
    └── src/
        ├── api/client.ts       # Axios wrappers per endpoint
        ├── components/ui/      # Button, Input, Badge, Card
        ├── components/layout/  # Navbar
        └── pages/
            ├── ProfilePage.tsx  # Profile CRUD form
            ├── MatchesPage.tsx  # Scan trigger + ranked results
            └── KanbanPage.tsx   # Stub board (New / Applied / Interview)
```

---

## Key Dependencies

**Backend (`pyproject.toml`)**
- `fastapi`, `uvicorn[standard]`
- `sqlalchemy[asyncio]`, `alembic`, `aiosqlite`
- `pydantic-settings`, `python-dotenv`
- `cryptography` — Fernet credential encryption
- `playwright` — LinkedIn scraping
- `httpx` — Greenhouse / Lever / SerpAPI async calls

**Frontend**
- `react`, `react-dom`, `react-router-dom`
- `vite`, `@vitejs/plugin-react`, `typescript`
- `tailwindcss`, `autoprefixer`, `postcss`
- `axios`

---

## Database Schema

**`user_profiles`**: `id`, `full_name`, `email`, `location`, `remote_ok`, `skills` (JSON), `experience_years`, `experience_notes`, `target_roles` (JSON), `target_companies` (JSON), `salary_min`, `salary_max`

**`credentials`**: `id`, `profile_id` FK, `service` (e.g. `"linkedin"`, `"serpapi"`), `username_enc`, `password_enc`, `extra_enc` — all encrypted via Fernet; key from `ENCRYPTION_KEY` env var

**`job_postings`**: `id`, `source`, `external_id`, `url`, `title`, `company`, `location`, `remote_flag`, `description`, `salary_min`, `salary_max`, `posted_at`, `raw_json`; UNIQUE(source, external_id)

**`scan_results`**: `id`, `scanned_at`, `profile_id` FK, `job_id` FK, `score` (REAL 0–1), `score_breakdown` (JSON per component), `status` (`new`/`saved`/`applied`/`archived`)

---

## Scraper Strategies

| Source | Auth | Method |
|---|---|---|
| LinkedIn | Optional login (stored credential) | Playwright + persistent browser context (`~/.job_hunt_manager/linkedin_context/`); 2–4s random delays; search URL per target role |
| Greenhouse | None | `GET boards-api.greenhouse.io/v1/boards/{slug}/jobs?content=true`; company → slug mapping dict |
| Lever | None | `GET api.lever.co/v0/postings/{slug}?mode=json`; company → slug mapping dict |
| Google Jobs | SerpAPI key (stored credential) | `GET serpapi.com/search?engine=google_jobs&q=<role>`; silently skipped if no key |

All scrapers implement `async def scrape(profile, credentials) -> list[JobPosting]`. Orchestrator calls them via `asyncio.gather`.

---

## Matching Algorithm (`services/matching.py`)

Weighted score (0.0–1.0):

| Component | Weight | Logic |
|---|---|---|
| `skill_score` | 0.40 | `len(profile.skills ∩ job_tokens) / len(profile.skills)` |
| `role_score` | 0.35 | Target role substring match in job title (case-insensitive) |
| `location_score` | 0.15 | 1.0 if remote match or city match; 0.5 if unknown; 0.0 if mismatch |
| `salary_score` | 0.10 | 1.0 if overlap or no salary listed; 0.0 if job max < profile min |

`score_breakdown` (JSON) stored per result for frontend display.

---

## Implementation Order

**Phase 1 — Backend foundation**
1. Update `pyproject.toml`, run `uv sync`
2. `config.py` (pydantic-settings), `database.py` (async SQLAlchemy)
3. All four ORM models
4. Alembic init + initial migration + `alembic upgrade head`
5. `main.py` → uvicorn entry; `app.py` with `GET /api/health`

**Phase 2 — Profile & credential API**
1. Pydantic schemas
2. Profile router (CRUD)
3. `crypto.py` (Fernet helpers)
4. Credentials router (write encrypts, read returns no secrets)
5. Basic tests

**Phase 3 — Scrapers**
1. Greenhouse (easiest, no auth)
2. Lever (same pattern)
3. Google Jobs / SerpAPI
4. LinkedIn (Playwright, most complex)
5. `scan_orchestrator.py` + scan router

**Phase 4 — Matching service**
1. `matching.py` weighted scorer
2. Unit tests with synthetic data
3. Integrate into orchestrator

**Phase 5 — Frontend**
1. `npm create vite@latest frontend -- --template react-ts` + Tailwind
2. Vite proxy `/api → :8000`
3. `api/client.ts` wrappers
4. `ProfilePage.tsx` (form → POST/PUT profile)
5. `MatchesPage.tsx` (scan button → poll scan_id → ranked table)
6. `KanbanPage.tsx` (stub columns)
7. React Router + Navbar

**Phase 6 — Integration smoke test**

---

## Verification

1. `uv run uvicorn backend.app:app --reload` + `cd frontend && npm run dev`
2. Create profile via UI → verify row in SQLite
3. POST `/api/credentials` for LinkedIn → GET confirms `has_credentials: true`, DB shows Fernet-encrypted value (starts `gAAAAA...`)
4. POST `/api/scan` → poll until `complete` → GET `/api/results` returns scored jobs
5. Remove LinkedIn credential → re-scan → Greenhouse/Lever results still appear, LinkedIn skipped cleanly
6. PATCH `/api/results/{id}` with `{status: "applied"}` → verify persisted

---

## Critical Files

- `pyproject.toml` — install everything first
- `backend/models/profile.py` — central data model all components depend on
- `backend/services/crypto.py` — must be correct before any credential endpoint ships
- `backend/scrapers/linkedin.py` — most complex; Playwright session + rate limiting
- `backend/services/scan_orchestrator.py` — integration seam tying scrapers + matcher + DB
