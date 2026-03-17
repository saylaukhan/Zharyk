from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..models import CheckIn, User, UserMetric, Alert, RiskLevel
from ..schemas import CheckInCreate, CheckInOut

router = APIRouter(prefix="/checkins", tags=["checkins"])

_LEVEL_RANK = {"medium": 1, "high": 2, "critical": 3}


def _check_metric_alert(
    stress: float, burnout: float, anxiety: float,
    motivation: float, emotion: float,
) -> tuple[RiskLevel | None, str]:
    """Return (risk_level, alert_type) based on full metric thresholds, or (None, '') if safe."""
    s, b, a = stress or 0, burnout or 0, anxiety or 0
    m, e = motivation or 0, emotion or 0

    # CRITICAL: any negative metric >= 80
    if any(v >= 80 for v in [s, b, a]):
        worst = max([(s, "stress"), (b, "burnout"), (a, "anxiety")], key=lambda x: x[0])
        labels = {"stress": "Критический стресс", "burnout": "Критическое выгорание", "anxiety": "Критическая тревожность"}
        return RiskLevel.critical, labels[worst[1]]

    # HIGH: any negative metric >= 75
    if any(v >= 75 for v in [s, b, a]):
        worst = max([(s, "stress"), (b, "burnout"), (a, "anxiety")], key=lambda x: x[0])
        labels = {"stress": "Высокий стресс", "burnout": "Высокое выгорание", "anxiety": "Высокая тревожность"}
        return RiskLevel.high, labels[worst[1]]

    # MEDIUM: any negative >= 70 OR any positive <= 20
    if any(v >= 70 for v in [s, b, a]):
        worst = max([(s, "stress"), (b, "burnout"), (a, "anxiety")], key=lambda x: x[0])
        labels = {"stress": "Повышенный стресс", "burnout": "Повышенное выгорание", "anxiety": "Повышенная тревожность"}
        return RiskLevel.medium, labels[worst[1]]

    if m <= 20:
        return RiskLevel.medium, "Низкая мотивация"
    if e <= 20:
        return RiskLevel.medium, "Низкий эмоциональный фон"

    return None, ""


@router.post("/{user_id}", response_model=CheckInOut)
def create_checkin(user_id: int, checkin: CheckInCreate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db_checkin = CheckIn(user_id=user_id, **checkin.model_dump())
    db.add(db_checkin)

    s = checkin.stress_level or 0
    b = checkin.burnout_level or 0
    a = checkin.anxiety_level or 0
    m = checkin.motivation_level or 0
    e = checkin.emotion_score or 0

    metric = UserMetric(user_id=user_id, stress=s, burnout=b, anxiety=a, motivation=m, emotion=e)
    db.add(metric)

    risk, alert_type = _check_metric_alert(s, b, a, m, e)
    if risk:
        # Deduplication: skip if unresolved alert of same/higher level already exists
        existing = (
            db.query(Alert)
            .filter(Alert.user_id == user_id, Alert.is_resolved == False)
            .order_by(Alert.created_at.desc())
            .first()
        )
        existing_rank = _LEVEL_RANK.get(existing.level.value, 0) if existing else 0
        if existing_rank < _LEVEL_RANK.get(risk.value, 0):
            db.add(Alert(
                user_id=user_id,
                alert_type=alert_type,
                level=risk,
                message=(
                    f"Чекин: стресс={s}, выгорание={b}, тревожность={a}, "
                    f"мотивация={m}, эмоции={e}"
                ),
                metrics_snapshot={"stress": s, "burnout": b, "anxiety": a, "motivation": m, "emotion": e},
            ))

    db.commit()
    db.refresh(db_checkin)
    return db_checkin


@router.get("/{user_id}", response_model=List[CheckInOut])
def get_user_checkins(user_id: int, limit: int = 30, db: Session = Depends(get_db)):
    return db.query(CheckIn).filter(CheckIn.user_id == user_id).order_by(CheckIn.created_at.desc()).limit(limit).all()
