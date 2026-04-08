# Job Hunt Manager — Project Context

Personal full-stack app to track job applications and automatically scan job boards for relevant matches.

## How to run

```bash
# Backend (from project root)
uv run python main.py        # FastAPI on :8000, auto-reloads

# Frontend
cd frontend && npm run dev   # Vite on :5173, proxies /api → :8000
```

Swagger UI: `http://localhost:8000/docs`

## Stack

- **Backend:** Python 3.12, FastAPI, SQLAlchemy (async), aiosqlite (SQLite, Postgres-ready), uv
- **Frontend:** React + TypeScript + Vite + Tailwind CSS (`@tailwindcss/vite`)
- **Scraping:** Playwright (LinkedIn), httpx (Greenhouse, Lever, SerpAPI)
- **Encryption:** `cryptography` Fernet — site credentials encrypted at rest

## Directory layout

```
backend/
  app.py                  # FastAPI app factory + CORS + lifespan
  config.py               # pydantic-settings: DATABASE_URL, ENCRYPTION_KEY
  database.py             # async engine, Base, get_db, create_tables
  models/
    profile.py            # UserProfile ORM
    credential.py         # EncryptedCredential ORM
    job.py                # JobPosting ORM (UNIQUE source+external_id)
    scan.py               # ScanResult ORM (relationship → JobPosting)
  schemas/
    profile.py            # ProfileCreate, ProfileUpdate, ProfileResponse
    credential.py         # CredentialCreate, CredentialInfo (no secrets exposed)
    job.py                # JobResponse, ScanResultResponse, ScanResultStatusUpdate
    scan.py               # ScanRequest, ScanResponse
  routers/
    profile.py            # GET/POST/PUT/PATCH/DELETE /api/profile
    credentials.py        # GET/POST/DELETE /api/credentials (upserts by service)
    scan.py               # POST /api/scan (async bg task), GET /api/scan/{id}
    jobs.py               # GET /api/jobs, GET /api/results, PATCH /api/results/{id}
  services/
    crypto.py             # encrypt(str) → token, decrypt(token) → str
    matching.py           # score_job(profile, job) → (float, breakdown_dict)
    scan_orchestrator.py  # fans out scrapers, persists jobs, scores; in-memory scan state
  scrapers/
    base.py               # BaseScraper ABC: async scrape(profile, creds) → list[JobPosting]
    greenhouse.py         # boards-api.greenhouse.io public API
    lever.py              # api.lever.co public API
    google_jobs.py        # SerpAPI — skipped silently if no "serpapi" credential stored
    linkedin.py           # Playwright + persistent context at ~/.job_hunt_manager/linkedin_context/

frontend/src/
  api/client.ts           # All API wrappers (profileApi, credentialsApi, scanApi, jobsApi)
  pages/
    ProfilePage.tsx       # Profile CRUD form + credential manager
    MatchesPage.tsx       # Scan trigger, polling, ranked results with score bars
    KanbanPage.tsx        # Drag-and-drop board: New / Saved / Applied / Archived
  components/layout/Navbar.tsx
```

## API endpoints

| Method | Path | Description |
|---|---|---|
| GET | /api/health | Health check |
| GET/POST | /api/profile | List / create profiles |
| GET/PUT/PATCH/DELETE | /api/profile/{id} | Profile CRUD |
| GET | /api/credentials?profile_id= | List stored services (no secrets returned) |
| POST | /api/credentials | Store/update encrypted credential |
| DELETE | /api/credentials/{service}?profile_id= | Remove credential |
| POST | /api/scan | Trigger scan → returns scan_id immediately |
| GET | /api/scan/{scan_id} | Poll scan status |
| GET | /api/jobs | List all discovered job postings |
| GET | /api/results?profile_id= | Ranked scan results (score DESC) |
| PATCH | /api/results/{id} | Update status (new/saved/applied/archived) |

## Matching algorithm

Weighted score 0–1 stored per `ScanResult`:

| Component | Weight | Logic |
|---|---|---|
| skill_score | 40% | profile skills ∩ job token set |
| role_score | 35% | target role substring in job title |
| location_score | 15% | remote/city match |
| salary_score | 10% | salary range overlap |

`score_breakdown` stored as JSON so the frontend can display per-component bars.

## Secrets / environment

Copy `.env.example` to `.env` and fill in:

```
DATABASE_URL=sqlite+aiosqlite:///./job_hunt_manager.db
ENCRYPTION_KEY=<fernet key>
```

Generate a key: `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`

`.env` and `*.db` are gitignored.

## Scraper notes

- **Greenhouse / Lever:** public APIs, no credentials needed. Company name → board slug mapping is a hardcoded dict at the top of each scraper file — add entries there as needed.
- **Google Jobs:** requires a SerpAPI key stored as `service="serpapi"`, `password=<key>`. Silently skipped if absent.
- **LinkedIn:** Playwright headless Chromium with a persistent browser context (survives across runs). Login is triggered automatically if the session has expired. 2–4s random delays between page navigations. Personal use only — scraping violates LinkedIn ToS.
- Run `uv run playwright install chromium` once to install the browser.

## Adding new features

Follow the existing pattern: ORM model → Pydantic schema → router → include in `app.py`.

Architectural notes:
- Scan state is stored in-memory (`_scan_state` dict in `scan_orchestrator.py`) — fine for single-process dev; swap for ARQ/Celery when scaling.
- No SQLite-specific types are used, so switching to Postgres only requires changing `DATABASE_URL`.
