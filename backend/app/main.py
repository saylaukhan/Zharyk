from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .database import engine, Base
from .routers import users, checkins, alerts, sessions, analytics, courses, notes, auth, tests, ai_chat, recommendations

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
app.include_router(ai_chat.router, prefix="/api/v1")
app.include_router(tests.router, prefix="/api/v1")
app.include_router(recommendations.router, prefix="/api/v1")


@app.get("/")
def root():
    return {"message": "Zharyq API is running", "docs": "/docs"}


@app.get("/health")
def health():
    return {"status": "ok"}
