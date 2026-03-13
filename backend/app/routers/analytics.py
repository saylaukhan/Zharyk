from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List

from ..database import get_db
from ..models import OrgMetric, UserMetric, CheckIn
from ..schemas import OrgMetricCreate, OrgMetricOut, UserMetricOut

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/org", response_model=List[OrgMetricOut])
def get_org_metrics(limit: int = 12, db: Session = Depends(get_db)):
    return db.query(OrgMetric).order_by(OrgMetric.recorded_at.desc()).limit(limit).all()


@router.post("/org", response_model=OrgMetricOut)
def record_org_metric(metric: OrgMetricCreate, db: Session = Depends(get_db)):
    db_metric = OrgMetric(**metric.model_dump())
    db.add(db_metric)
    db.commit()
    db.refresh(db_metric)
    return db_metric


@router.get("/user/{user_id}", response_model=List[UserMetricOut])
def get_user_metrics(user_id: int, limit: int = 30, db: Session = Depends(get_db)):
    return (
        db.query(UserMetric)
        .filter(UserMetric.user_id == user_id)
        .order_by(UserMetric.recorded_at.desc())
        .limit(limit)
        .all()
    )


@router.get("/summary")
def get_summary(db: Session = Depends(get_db)):
    avg = db.query(
        func.avg(UserMetric.stress).label("avg_stress"),
        func.avg(UserMetric.motivation).label("avg_motivation"),
        func.avg(UserMetric.anxiety).label("avg_anxiety"),
        func.avg(UserMetric.burnout).label("avg_burnout"),
        func.avg(UserMetric.emotion).label("avg_emotion"),
    ).first()

    return {
        "avg_stress": round(avg.avg_stress or 0, 1),
        "avg_motivation": round(avg.avg_motivation or 0, 1),
        "avg_anxiety": round(avg.avg_anxiety or 0, 1),
        "avg_burnout": round(avg.avg_burnout or 0, 1),
        "avg_emotion": round(avg.avg_emotion or 0, 1),
    }
