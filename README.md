# Job Hunt Manager

A personal full-stack app to track job applications and automatically scan job boards for relevant matches.

Connects to Greenhouse, Lever, Google Jobs (via SerpAPI), and LinkedIn to pull open roles, scores them against your profile, and surfaces the best matches in a ranked list. You can then move jobs through a Kanban board as you apply.

---

## Features

- **Automated job scanning** — scrapes Greenhouse, Lever, Google Jobs, and LinkedIn on demand
- **Smart matching** — scores jobs against your skills, target roles, location preference, and salary range
- **Kanban board** — drag jobs through New → Saved → Applied → Archived
- **Credential manager** — stores service credentials (LinkedIn, SerpAPI) encrypted at rest with Fernet
- **Scan progress log** — live per-step timer in the UI so you can see exactly what's happening during a scan

---

## Stack

| Layer | Tech |
|---|---|
| Backend | Python 3.12, FastAPI, SQLAlchemy (async), asyncpg |
| Database | PostgreSQL (Alembic migrations) |
| Frontend | React + TypeScript, Vite, Tailwind CSS |
| Scraping | Playwright (LinkedIn), httpx (Greenhouse, Lever, SerpAPI) |
| Encryption | `cryptography` Fernet |
| Package manager | [uv](https://github.com/astral-sh/uv) |

---

## Setup

### Prerequisites

- Python 3.12+
- [uv](https://docs.astral.sh/uv/getting-started/installation/)
- Node.js 18+
- PostgreSQL running locally

### 1. Install dependencies

```bash
uv sync
cd frontend && npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/job_hunt_manager
ENCRYPTION_KEY=<fernet key>
```

Generate a Fernet key:

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

### 3. Run database migrations

```bash
uv run alembic upgrade head
```

### 4. (Optional) Install Playwright for LinkedIn scraping

```bash
uv run playwright install chromium
```

---

## Running

Start both servers in separate terminals:

```bash
# Backend — FastAPI on :8000 with auto-reload
uv run python main.py

# Frontend — Vite on :5173, proxies /api → :8000
cd frontend && npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

API docs (Swagger UI): [http://localhost:8000/docs](http://localhost:8000/docs)

---

## How it works

### 1. Create a profile

Fill in your skills, target roles, location, and salary expectations. Optionally add target companies — the scraper will prioritize those boards. If you leave target companies empty, a default list of well-known companies is used.

### 2. Add credentials (optional)

- **SerpAPI** — enables Google Jobs results
- **LinkedIn** — enables LinkedIn scraping (uses a persistent Playwright browser context)

### 3. Run a scan

Hit **Run Scan** on the Matches page. The scan runs in the background and emits live progress updates. When complete, results appear ranked by match score.

### Match scoring

Each job is scored 0–100% across four components:

| Component | Weight | Logic |
|---|---|---|
| Skills | 40% | Overlap between your skills and job description tokens |
| Role | 35% | Whether your target role appears in the job title |
| Location | 15% | Remote/city match |
| Salary | 10% | Whether the job's max salary meets your minimum |

### 4. Track applications

Move jobs through the Kanban board (New → Saved → Applied → Archived) as you progress.

---

## Adding companies to scrape

Greenhouse and Lever host per-company job boards. The scrapers include a mapping of common company names to their board slugs. To add a company, update `GREENHOUSE_SLUGS` in `backend/scrapers/greenhouse.py` or `LEVER_SLUGS` in `backend/scrapers/lever.py`, or simply add the company name to your profile's target companies — the scraper will attempt to use the normalized name as a slug directly.

---
