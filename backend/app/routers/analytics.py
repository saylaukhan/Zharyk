from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List

from ..database import get_db
from ..models import OrgMetric, UserMetric, CheckIn, User, Alert, RiskLevel, UserRole
from ..schemas import OrgMetricCreate, OrgMetricOut, UserMetricOut
from ..auth import require_roles

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


@router.get("/stress-distribution")
def get_stress_distribution(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.psychologist, UserRole.director))
):
    subq = (
        db.query(UserMetric.user_id, func.max(UserMetric.recorded_at).label("latest_at"))
        .group_by(UserMetric.user_id)
        .subquery()
    )
    
    latest_metrics = (
        db.query(UserMetric.stress)
        .join(subq, (UserMetric.user_id == subq.c.user_id) & (UserMetric.recorded_at == subq.c.latest_at))
        .all()
    )
    
    res = {"low": 0, "medium": 0, "high": 0, "critical": 0}
    for (stress,) in latest_metrics:
        if stress < 4:
            res["low"] += 1
        elif stress < 7:
            res["medium"] += 1
        elif stress < 9:
            res["high"] += 1
        else:
            res["critical"] += 1
    return res


@router.get("/director-dashboard")
def get_director_dashboard(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.director))
):
    total_students = db.query(func.count(User.id)).filter(User.role == UserRole.student).scalar()
    
    critical_alerts = db.query(func.count(Alert.id)).filter(
        Alert.level == RiskLevel.critical, 
        Alert.is_resolved == False
    ).scalar()
    
    medium_alerts = db.query(func.count(Alert.id)).filter(
        Alert.level == RiskLevel.medium, 
        Alert.is_resolved == False
    ).scalar()
    
    latest_org = db.query(OrgMetric).order_by(OrgMetric.recorded_at.desc()).first()
    wellbeing = latest_org.wellbeing_index if latest_org else 0.0
    engagement = latest_org.engagement_rate if latest_org else 0.0
    
    return {
        "total_students": total_students,
        "critical_alerts": critical_alerts,
        "medium_alerts": medium_alerts,
        "wellbeing_index": wellbeing,
        "engagement_rate": engagement
    }
