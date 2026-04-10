import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.config import settings
from backend.routers import application_profile, autofill, credentials, employer_answer, jobs, profile, resume, resume_builder, scan
from backend.routers import applications, auth_google
from backend.services.sheets_worker import run_worker


@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(run_worker(settings.sheets_poll_interval))
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


app = FastAPI(title="Job Hunt Manager", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_origin_regex=r"chrome-extension://.*|moz-extension://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(profile.router)
app.include_router(credentials.router)
app.include_router(scan.router)
app.include_router(jobs.router)
app.include_router(autofill.router)
app.include_router(application_profile.router)
app.include_router(employer_answer.router)
app.include_router(resume.router)
app.include_router(resume_builder.router)
app.include_router(applications.router)
app.include_router(auth_google.router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}
