from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from .database import engine, Base
from .routers import users, checkins, alerts, sessions, analytics, courses, notes, auth

# Drop old course tables and recreate with new schema
_MIGRATION_TABLES = [
    "practice_modules",
    "theory_modules",
    "course_modules",
    "course_progress",
    "courses",
]
with engine.connect() as conn:
    for table in _MIGRATION_TABLES:
        try:
            conn.execute(text(f"DROP TABLE IF EXISTS {table}"))
            conn.commit()
        except Exception:
            pass

Base.metadata.create_all(bind=engine)

# Ensure uploads directory exists
UPLOADS_DIR = Path(__file__).resolve().parents[1] / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)
(UPLOADS_DIR / "videos").mkdir(exist_ok=True)

app = FastAPI(
    title="Zharyq API",
    description="Backend API for Zharyq psychological support platform",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

app.include_router(auth.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(checkins.router, prefix="/api/v1")
app.include_router(alerts.router, prefix="/api/v1")
app.include_router(sessions.router, prefix="/api/v1")
app.include_router(analytics.router, prefix="/api/v1")
app.include_router(courses.router, prefix="/api/v1")
app.include_router(notes.router, prefix="/api/v1")


@app.get("/")
def root():
    return {"message": "Zharyq API is running", "docs": "/docs"}


@app.get("/health")
def health():
    return {"status": "ok"}
