"""
Recommendations Router — Zharyq Platform
GET /api/v1/recommendations/{user_id}
Returns top-3 courses based on the user's latest UserMetric.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import UserMetric
from ..services.recommendations import get_recommendations

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


@router.get("/{user_id}")
def get_user_recommendations(user_id: int, db: Session = Depends(get_db)):
    latest = (
        db.query(UserMetric)
        .filter(UserMetric.user_id == user_id)
        .order_by(UserMetric.recorded_at.desc())
        .first()
    )
    if not latest:
        metrics = {"stress": 50, "burnout": 50, "anxiety": 50, "motivation": 50, "emotion": 50}
    else:
        metrics = {
            "stress":     latest.stress,
            "burnout":    latest.burnout,
            "anxiety":    latest.anxiety,
            "motivation": latest.motivation,
            "emotion":    latest.emotion,
        }

    return get_recommendations(db, metrics)
