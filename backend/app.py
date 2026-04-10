from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routers import application_profile, autofill, credentials, employer_answer, jobs, profile, resume, resume_builder, scan


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


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


@app.get("/api/health")
async def health():
    return {"status": "ok"}
