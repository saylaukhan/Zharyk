import asyncio
import logging
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text, func
from .database import engine, Base, SessionLocal
from .routers import users, checkins, alerts, sessions, analytics, courses, notes, auth, tests, ai_chat, recommendations
from .routers import ws as ws_router

logger = logging.getLogger(__name__)

Base.metadata.create_all(bind=engine)


def _run_migrations():
    """Safely add new columns to existing tables (SQLite has no IF NOT EXISTS for ADD COLUMN)."""
    new_alert_cols = [
        ("session_id", "INTEGER REFERENCES chat_sessions(id)"),
        ("reasoning", "TEXT"),
        ("metrics_snapshot", "TEXT"),
        ("messages_snapshot", "TEXT"),
    ]
    with engine.connect() as conn:
        for col, ddl in new_alert_cols:
            try:
                conn.execute(text(f"ALTER TABLE alerts ADD COLUMN {col} {ddl}"))
                conn.commit()
            except Exception:
                pass  # column already exists


_run_migrations()

# Ensure uploads directory exists
UPLOADS_DIR = Path(__file__).resolve().parents[1] / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)
(UPLOADS_DIR / "videos").mkdir(exist_ok=True)

# ── Metric threshold scanner ───────────────────────────────────────────────

_SCAN_LEVEL_RANK = {"medium": 1, "high": 2, "critical": 3}


def _threshold_alert_level(stress, burnout, anxiety, motivation, emotion):
    """Return (level_str, alert_type) based purely on metric values, or (None, '')."""
    s, b, a = stress or 0, burnout or 0, anxiety or 0
    m, e = motivation or 0, emotion or 0

    if any(v >= 80 for v in [s, b, a]):
        worst = max([(s, "stress"), (b, "burnout"), (a, "anxiety")], key=lambda x: x[0])
        labels = {"stress": "Критический стресс", "burnout": "Критическое выгорание", "anxiety": "Критическая тревожность"}
        return "critical", labels[worst[1]]

    if any(v >= 75 for v in [s, b, a]):
        worst = max([(s, "stress"), (b, "burnout"), (a, "anxiety")], key=lambda x: x[0])
        labels = {"stress": "Высокий стресс", "burnout": "Высокое выгорание", "anxiety": "Высокая тревожность"}
        return "high", labels[worst[1]]

    if any(v >= 70 for v in [s, b, a]):
        worst = max([(s, "stress"), (b, "burnout"), (a, "anxiety")], key=lambda x: x[0])
        labels = {"stress": "Повышенный стресс", "burnout": "Повышенное выгорание", "anxiety": "Повышенная тревожность"}
        return "medium", labels[worst[1]]

    if m <= 20:
        return "medium", "Низкая мотивация"
    if e <= 20:
        return "medium", "Низкий эмоциональный фон"

    return None, ""


async def _scan_metrics_and_alert():
    """Check every user's latest metrics and create threshold alerts if needed."""
    from .models import UserMetric, Alert, RiskLevel, User, UserRole
    from .services.websocket_manager import manager as ws_manager

    db = SessionLocal()
    try:
        latest_ids = db.query(func.max(UserMetric.id)).group_by(UserMetric.user_id).subquery()
        metrics = db.query(UserMetric).filter(UserMetric.id.in_(latest_ids)).all()

        broadcast_queue = []

        for metric in metrics:
            level_str, alert_type = _threshold_alert_level(
                metric.stress, metric.burnout, metric.anxiety,
                metric.motivation, metric.emotion,
            )
            if not level_str:
                continue

            existing = (
                db.query(Alert)
                .filter(Alert.user_id == metric.user_id, Alert.is_resolved == False)
                .order_by(Alert.created_at.desc())
                .first()
            )
            existing_rank = _SCAN_LEVEL_RANK.get(existing.level.value, 0) if existing else 0
            if existing_rank >= _SCAN_LEVEL_RANK.get(level_str, 0):
                continue

            new_alert = Alert(
                user_id=metric.user_id,
                alert_type=alert_type,
                level=RiskLevel(level_str),
                message=(
                    f"Пороговый алёрт: стресс={metric.stress:.0f}, выгорание={metric.burnout:.0f}, "
                    f"тревожность={metric.anxiety:.0f}, мотивация={metric.motivation:.0f}, "
                    f"эмоции={metric.emotion:.0f}"
                ),
                metrics_snapshot={
                    "stress": metric.stress, "burnout": metric.burnout,
                    "anxiety": metric.anxiety, "motivation": metric.motivation,
                    "emotion": metric.emotion,
                },
            )
            db.add(new_alert)
            db.flush()  # assign new_alert.id without awaiting

            logger.info(f"[MetricScan] {level_str} alert created for user_id={metric.user_id} ({alert_type})")

            student = db.query(User).filter(User.id == metric.user_id).first()
            broadcast_queue.append({
                "alert_id": new_alert.id,
                "level": level_str,
                "student_name": student.username if student else f"User #{metric.user_id}",
                "student_id": metric.user_id,
                "metrics": {
                    "stress": metric.stress, "burnout": metric.burnout,
                    "anxiety": metric.anxiety, "motivation": metric.motivation,
                    "emotion": metric.emotion,
                },
            })

        # Commit all alerts at once — no awaits inside the loop above
        db.commit()

        # Broadcast after commit so IDs are finalised
        psychologists = db.query(User).filter(User.role == UserRole.psychologist).all()
        for item in broadcast_queue:
            payload = {"type": "new_alert", "reasoning": "Метрики превысили пороговые значения", **item}
            for psych in psychologists:
                await ws_manager.broadcast_to_psychologist(psych.id, payload)
    except Exception as exc:
        logger.error(f"[MetricScan] Error: {exc}")
    finally:
        db.close()


async def _metric_scan_loop():
    """Run metric scan immediately on startup, then every 5 minutes."""
    while True:
        try:
            await _scan_metrics_and_alert()
        except Exception as exc:
            logger.error(f"[MetricScanLoop] {exc}")
        await asyncio.sleep(300)


@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(_metric_scan_loop())
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


app = FastAPI(
    title="Zharyq API",
    description="Backend API for Zharyq psychological support platform",
    version="2.0.0",
    lifespan=lifespan,
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
app.include_router(ws_router.router)  # WebSocket: no /api/v1 prefix, path is /ws/alerts/{id}


@app.get("/")
def root():
    return {"message": "Zharyq API is running", "docs": "/docs"}


@app.get("/health")
def health():
    return {"status": "ok"}
