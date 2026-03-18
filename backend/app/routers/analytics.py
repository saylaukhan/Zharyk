from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import date, timedelta

from ..database import get_db
from ..models import OrgMetric, UserMetric, CheckIn, User, Alert, RiskLevel, UserRole, TestResult
from ..schemas import OrgMetricCreate, OrgMetricOut, UserMetricOut
from ..auth import require_roles, get_current_user

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/streak")
def get_streak(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Collect unique activity dates from checkins, user metrics (AI chat), and test results
    checkin_dates = db.query(func.date(CheckIn.created_at)).filter(
        CheckIn.user_id == current_user.id
    ).all()
    metric_dates = db.query(func.date(UserMetric.recorded_at)).filter(
        UserMetric.user_id == current_user.id
    ).all()
    test_dates = db.query(func.date(TestResult.created_at)).filter(
        TestResult.user_id == current_user.id
    ).all()

    active_dates: set[date] = set()
    for (d,) in checkin_dates + metric_dates + test_dates:
        if d:
            active_dates.add(d if isinstance(d, date) else date.fromisoformat(str(d)))

    today = date.today()

    # Calculate current streak (consecutive days ending today or yesterday)
    streak = 0
    cursor = today if today in active_dates else today - timedelta(days=1)
    while cursor in active_dates:
        streak += 1
        cursor -= timedelta(days=1)

    # Build week_days: 7 booleans Mon–Sun for the current week
    week_start = today - timedelta(days=today.weekday())
    week_days = [(week_start + timedelta(days=i)) in active_dates for i in range(7)]

    return {
        "streak": streak,
        "today_active": today in active_dates,
        "week_days": week_days,
    }


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
    role: Optional[UserRole] = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.psychologist, UserRole.director))
):
    subq = (
        db.query(UserMetric.user_id, func.max(UserMetric.recorded_at).label("latest_at"))
        .group_by(UserMetric.user_id)
        .subquery()
    )
    
    query = (
        db.query(UserMetric.stress)
        .join(subq, (UserMetric.user_id == subq.c.user_id) & (UserMetric.recorded_at == subq.c.latest_at))
        .join(User, UserMetric.user_id == User.id)
    )
    
    if role and role != "all":
        query = query.filter(User.role == role)
        
    latest_metrics = query.all()
    
    res = {"low": 0, "medium": 0, "high": 0, "critical": 0}
    for (stress,) in latest_metrics:
        # Assuming stress is 0-100 based on getRiskProps in frontend
        if stress < 40:
            res["low"] += 1
        elif stress < 60:
            res["medium"] += 1
        elif stress < 80:
            res["high"] += 1
        else:
            res["critical"] += 1
    return res


@router.get("/director-dashboard")
def get_director_dashboard(
    role: Optional[UserRole] = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.director))
):
    users_query = db.query(User)
    alerts_query = db.query(Alert).filter(Alert.is_resolved == False)
    
    if role and role != "all":
        users_query = users_query.filter(User.role == role)
        alerts_query = alerts_query.join(User, Alert.user_id == User.id).filter(User.role == role)
        
    total_users = users_query.filter(User.role != UserRole.director).count()
    
    critical_alerts = alerts_query.filter(Alert.level == RiskLevel.critical).count()
    medium_alerts = alerts_query.filter(Alert.level == RiskLevel.medium).count()
    
    # Calculate wellbeing index dynamically from latest metrics
    subq = (
        db.query(UserMetric.user_id, func.max(UserMetric.recorded_at).label("latest_at"))
        .group_by(UserMetric.user_id)
        .subquery()
    )
    
    metric_query = (
        db.query(func.avg(UserMetric.stress).label("avg_stress"))
        .join(subq, (UserMetric.user_id == subq.c.user_id) & (UserMetric.recorded_at == subq.c.latest_at))
    )
    
    if role and role != "all":
        metric_query = metric_query.join(User, UserMetric.user_id == User.id).filter(User.role == role)
        
    avg_stress = metric_query.scalar() or 0.0
    
    # Simple wellbeing formula: 100 - stress
    wellbeing = max(0, min(100, 100 - avg_stress))
    
    # Calculate engagement rate (users with at least 1 checkin or course progress)
    engaged_subq = db.query(CheckIn.user_id).distinct()
    if role and role != "all":
        engaged_subq = engaged_subq.join(User, CheckIn.user_id == User.id).filter(User.role == role)
        
    engaged_users = engaged_subq.count()
    engagement = (engaged_users / total_users * 100) if total_users > 0 else 0.0
    
    return {
        "total_students": total_users,  # keeping the key same for dashboard backward-compatibility
        "critical_alerts": critical_alerts,
        "medium_alerts": medium_alerts,
        "wellbeing_index": round(wellbeing, 1),
        "engagement_rate": round(engagement, 1)
    }
