from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..models import CheckIn, User, UserMetric, Alert, RiskLevel
from ..schemas import CheckInCreate, CheckInOut

router = APIRouter(prefix="/checkins", tags=["checkins"])


def _compute_risk(stress: float, anxiety: float) -> RiskLevel:
    score = max(stress or 0, anxiety or 0)
    if score >= 80:
        return RiskLevel.critical
    if score >= 60:
        return RiskLevel.high
    if score >= 40:
        return RiskLevel.medium
    return RiskLevel.low


@router.post("/{user_id}", response_model=CheckInOut)
def create_checkin(user_id: int, checkin: CheckInCreate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db_checkin = CheckIn(user_id=user_id, **checkin.model_dump())
    db.add(db_checkin)

    metric = UserMetric(
        user_id=user_id,
        stress=checkin.stress_level or 0,
        burnout=checkin.burnout_level or 0,
        anxiety=checkin.anxiety_level or 0,
        motivation=checkin.motivation_level or 0,
        emotion=checkin.emotion_score or 0,
    )
    db.add(metric)

    risk = _compute_risk(checkin.stress_level, checkin.anxiety_level)
    if risk in (RiskLevel.high, RiskLevel.critical):
        alert = Alert(
            user_id=user_id,
            alert_type="Высокий стресс" if (checkin.stress_level or 0) >= 60 else "Тревожность",
            level=risk,
            message=f"Уровень стресса: {checkin.stress_level}, тревожность: {checkin.anxiety_level}",
        )
        db.add(alert)

    db.commit()
    db.refresh(db_checkin)
    return db_checkin


@router.get("/{user_id}", response_model=List[CheckInOut])
def get_user_checkins(user_id: int, limit: int = 30, db: Session = Depends(get_db)):
    return db.query(CheckIn).filter(CheckIn.user_id == user_id).order_by(CheckIn.created_at.desc()).limit(limit).all()
