from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..models import User, UserMetric, TherapySession, CourseProgress, CheckIn
from ..schemas import UserOut, StudentMetrics
from sqlalchemy import func
from ..auth import get_current_user, require_roles
from ..models import UserRole

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/students", response_model=List[StudentMetrics])
def get_students_with_metrics(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.psychologist, UserRole.director))
):
    # Get students with session/course counts and last checkin
    students_query = (
        db.query(
            User,
            func.count(func.distinct(TherapySession.id)).label("sessions_count"),
            func.count(func.distinct(CourseProgress.id)).label("courses_count"),
            func.max(CheckIn.created_at).label("last_checkin_date")
        )
        .outerjoin(TherapySession, User.id == TherapySession.user_id)
        .outerjoin(CourseProgress, User.id == CourseProgress.user_id)
        .outerjoin(CheckIn, User.id == CheckIn.user_id)
        .filter(User.role == UserRole.student)
        .group_by(User.id)
        .all()
    )

    if not students_query:
        return []

    # Fetch the latest metric per student (latest by id = most recent record)
    student_ids = [u.id for u, _, _, _ in students_query]
    latest_ids_sq = (
        db.query(func.max(UserMetric.id).label("mid"))
        .filter(UserMetric.user_id.in_(student_ids))
        .group_by(UserMetric.user_id)
        .subquery()
    )
    metrics_list = (
        db.query(UserMetric)
        .filter(UserMetric.id.in_(db.query(latest_ids_sq.c.mid)))
        .all()
    )
    metrics_map = {m.user_id: m for m in metrics_list}

    res = []
    for u, s_count, c_count, last_check in students_query:
        m = metrics_map.get(u.id)
        res.append({
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "role": u.role,
            "class_name": u.class_name,
            "anonymous_id": u.anonymous_id,
            "personalized_mode": bool(u.personalized_mode),
            "is_active": u.is_active,
            "created_at": u.created_at,
            "stress": m.stress if m else 0,
            "motivation": m.motivation if m else 0,
            "anxiety": m.anxiety if m else 0,
            "burnout": m.burnout if m else 0,
            "emotion": m.emotion if m else 0,
            "sessions_count": s_count,
            "courses_count": c_count,
            "last_checkin_date": last_check,
        })
    return res


@router.get("/", response_model=List[UserOut])
def list_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.psychologist, UserRole.director)),
):
    return db.query(User).offset(skip).limit(limit).all()


@router.get("/{user_id}", response_model=UserOut)
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.delete("/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return {"ok": True}
