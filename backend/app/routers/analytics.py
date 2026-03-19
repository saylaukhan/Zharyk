from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from typing import List, Optional
from datetime import date, timedelta, datetime

from ..database import get_db
from ..models import OrgMetric, UserMetric, CheckIn, User, Alert, RiskLevel, UserRole, TestResult, TherapySession
from ..schemas import OrgMetricCreate, OrgMetricOut, UserMetricOut
from ..auth import require_roles, get_current_user
from ..services.audit import write_audit

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
    stored = db.query(OrgMetric).order_by(OrgMetric.recorded_at.desc()).limit(limit).all()
    if stored:
        return stored

    # Fallback: compute daily wellbeing from UserMetric when org_metrics table is empty
    day_col = func.strftime('%Y-%m-%d', UserMetric.recorded_at).label('day')
    rows = (
        db.query(day_col, func.avg(UserMetric.stress).label('avg_stress'))
        .group_by('day')
        .order_by(day_col.desc())
        .limit(limit)
        .all()
    )

    result = []
    for i, row in enumerate(rows):
        wellbeing = round(100 - (row.avg_stress or 0), 1)
        result.append(OrgMetricOut(
            id=-(i + 1),
            recorded_at=datetime.strptime(row.day, '%Y-%m-%d'),
            wellbeing_index=wellbeing,
            critical_alerts_count=0,
            engagement_rate=0.0,
        ))
    return result


@router.post("/org", response_model=OrgMetricOut)
def record_org_metric(metric: OrgMetricCreate, db: Session = Depends(get_db)):
    db_metric = OrgMetric(**metric.model_dump())
    db.add(db_metric)
    db.commit()
    db.refresh(db_metric)
    return db_metric


@router.get("/user/{user_id}", response_model=List[UserMetricOut])
def get_user_metrics(
    user_id: int,
    limit: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    target = db.query(User).filter(User.id == user_id).first()
    write_audit(
        db, current_user.id, current_user.username, current_user.role,
        "VIEW_USER_ANALYTICS",
        target_user_id=user_id,
        target_anonymous_id=target.anonymous_id if target else None,
        reason=f"Viewed analytics for user_id={user_id}",
    )
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


@router.get("/cohorts")
def get_cohorts(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.psychologist, UserRole.director))
):
    """Return list of distinct class names that have at least one user with metrics."""
    rows = (
        db.query(User.class_name)
        .filter(User.class_name != None, User.class_name != "")
        .distinct()
        .order_by(User.class_name)
        .all()
    )
    return [r.class_name for r in rows]


@router.get("/cohort-comparison")
def get_cohort_comparison(
    cohort_a: str,
    cohort_b: str,
    metric: Optional[str] = "stress",
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.psychologist, UserRole.director))
):
    """
    Return weekly-averaged metric time-series for two class cohorts over the last 12 weeks.
    metric can be: stress | burnout | anxiety | motivation
    """
    allowed_metrics = {"stress", "burnout", "anxiety", "motivation"}
    if metric not in allowed_metrics:
        metric = "stress"

    metric_col = getattr(UserMetric, metric)

    end_date = datetime.utcnow()
    start_date = end_date - timedelta(weeks=12)

    def cohort_series(class_name: str):
        rows = (
            db.query(
                func.strftime('%Y-%W', UserMetric.recorded_at).label("week"),
                func.avg(metric_col).label("avg_val"),
                func.min(UserMetric.recorded_at).label("week_start")
            )
            .join(User, UserMetric.user_id == User.id)
            .filter(User.class_name == class_name)
            .filter(UserMetric.recorded_at >= start_date)
            .group_by(func.strftime('%Y-%W', UserMetric.recorded_at))
            .order_by(func.strftime('%Y-%W', UserMetric.recorded_at))
            .all()
        )
        return [
            {
                "week": r.week,
                "date": r.week_start.strftime("%d %b") if r.week_start else r.week,
                "value": round(r.avg_val or 0, 1)
            }
            for r in rows
        ]

    return {
        "metric": metric,
        "cohort_a": {"name": cohort_a, "data": cohort_series(cohort_a)},
        "cohort_b": {"name": cohort_b, "data": cohort_series(cohort_b)},
    }


# ── SLA thresholds (seconds) ──────────────────────────────────
_SLA_THRESHOLDS = {
    "critical": 2 * 3600,    # 2 hours
    "high":     8 * 3600,    # 8 hours
    "medium":   24 * 3600,   # 24 hours
    "low":      72 * 3600,   # 72 hours
}


def _sla_status(elapsed_s: float, level: str) -> str:
    threshold = _SLA_THRESHOLDS.get(level, 24 * 3600)
    ratio = elapsed_s / threshold
    if ratio >= 1.0:
        return "breached"
    if ratio >= 0.5:
        return "warning"
    return "ok"


@router.get("/sla")
def get_sla(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.director)),
):
    """
    SLA dashboard for the director.
    Returns open alerts with elapsed time + per-psychologist KPI stats.
    """
    now = datetime.utcnow()

    # ── Open alerts ───────────────────────────────────────────
    open_alerts_raw = (
        db.query(Alert, User.anonymous_id, User.class_name, User.username)
        .join(User, Alert.user_id == User.id)
        .filter(Alert.is_resolved == False)
        .order_by(Alert.created_at.asc())
        .all()
    )

    open_alerts = []
    for alert, anon_id, class_name, username in open_alerts_raw:
        created = alert.created_at.replace(tzinfo=None) if alert.created_at.tzinfo else alert.created_at
        elapsed = (now - created).total_seconds()
        level_str = alert.level.value if hasattr(alert.level, "value") else str(alert.level)
        open_alerts.append({
            "id": alert.id,
            "user_id": alert.user_id,
            "anonymous_id": anon_id or f"ID:{alert.user_id}",
            "username": username,
            "class_name": class_name,
            "level": level_str,
            "alert_type": alert.alert_type,
            "created_at": alert.created_at.isoformat(),
            "elapsed_seconds": int(elapsed),
            "sla_threshold_seconds": _SLA_THRESHOLDS.get(level_str, 24 * 3600),
            "sla_status": _sla_status(elapsed, level_str),
        })

    # ── Per-psychologist stats ─────────────────────────────────
    psychologists = db.query(User).filter(User.role == UserRole.psychologist).all()

    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    psych_stats = []
    for psych in psychologists:
        # Sessions created by this psychologist
        open_sessions = (
            db.query(TherapySession)
            .filter(TherapySession.psychologist_id == psych.id, TherapySession.is_completed == False)
            .count()
        )

        # Resolved alerts today (alerts with resolved_at today that had a session by this psychologist)
        resolved_today = (
            db.query(Alert)
            .filter(
                Alert.psychologist_id == psych.id,
                Alert.is_resolved == True,
                Alert.resolved_at >= today_start,
            )
            .count()
        )

        # Average time-to-response: avg(resolved_at - created_at) for resolved alerts by this psychologist
        resolved_alerts = (
            db.query(Alert.created_at, Alert.resolved_at)
            .filter(
                Alert.psychologist_id == psych.id,
                Alert.is_resolved == True,
                Alert.resolved_at != None,
            )
            .limit(50)
            .all()
        )
        if resolved_alerts:
            deltas = []
            for ca, ra in resolved_alerts:
                ca_n = ca.replace(tzinfo=None) if ca.tzinfo else ca
                ra_n = ra.replace(tzinfo=None) if ra.tzinfo else ra
                deltas.append((ra_n - ca_n).total_seconds())
            avg_response = int(sum(deltas) / len(deltas))
        else:
            avg_response = None

        psych_stats.append({
            "id": psych.id,
            "name": psych.username,
            "open_cases": open_sessions,
            "resolved_today": resolved_today,
            "avg_response_seconds": avg_response,
        })

    # ── Summary ────────────────────────────────────────────────
    breached = sum(1 for a in open_alerts if a["sla_status"] == "breached")
    warning  = sum(1 for a in open_alerts if a["sla_status"] == "warning")
    ok       = sum(1 for a in open_alerts if a["sla_status"] == "ok")

    # Overall avg response (all resolved alerts)
    all_resolved = (
        db.query(Alert.created_at, Alert.resolved_at)
        .filter(Alert.is_resolved == True, Alert.resolved_at != None)
        .limit(200)
        .all()
    )
    if all_resolved:
        all_deltas = []
        for ca, ra in all_resolved:
            ca_n = ca.replace(tzinfo=None) if ca.tzinfo else ca
            ra_n = ra.replace(tzinfo=None) if ra.tzinfo else ra
            all_deltas.append((ra_n - ca_n).total_seconds())
        avg_response_all = int(sum(all_deltas) / len(all_deltas))
    else:
        avg_response_all = None

    return {
        "open_alerts": open_alerts,
        "psychologist_stats": psych_stats,
        "summary": {
            "total_open": len(open_alerts),
            "breached": breached,
            "warning": warning,
            "ok": ok,
            "avg_response_seconds": avg_response_all,
        },
    }
