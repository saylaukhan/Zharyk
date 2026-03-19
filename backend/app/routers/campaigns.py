from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..auth import require_roles, get_current_user
from ..models import Campaign, CampaignParticipant, User, UserRole, Course, CourseProgress
from ..schemas import CampaignCreate, CampaignOut, CampaignNotificationOut

router = APIRouter(prefix="/campaigns", tags=["campaigns"])


def _campaign_out(c: Campaign, db: Session) -> dict:
    total = len(c.participants)
    completed = 0
    if total > 0:
        user_ids = [p.user_id for p in c.participants]
        completed = (
            db.query(CourseProgress)
            .filter(
                CourseProgress.course_id == c.course_id,
                CourseProgress.user_id.in_(user_ids),
                CourseProgress.is_completed == True,
            )
            .count()
        )
    return {
        "id": c.id,
        "title": c.title,
        "description": c.description,
        "course_id": c.course_id,
        "course_title": c.course.title if c.course else None,
        "target_classes": c.target_classes or [],
        "target_roles": c.target_roles or ["student"],
        "status": c.status,
        "created_by_id": c.created_by_id,
        "created_at": c.created_at,
        "total_participants": total,
        "completed_participants": completed,
    }


def _valid_roles(roles_list):
    valid_values = {e.value for e in UserRole}
    return [UserRole(r) for r in (roles_list or ["student"]) if r in valid_values]


@router.get("/my", response_model=List[CampaignNotificationOut])
def my_campaigns(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return campaigns the current user is enrolled in, with personal course progress."""
    participations = (
        db.query(CampaignParticipant)
        .filter(CampaignParticipant.user_id == current_user.id)
        .order_by(CampaignParticipant.enrolled_at.desc())
        .all()
    )
    result = []
    for p in participations:
        c = db.query(Campaign).filter(Campaign.id == p.campaign_id).first()
        if not c:
            continue
        progress = db.query(CourseProgress).filter(
            CourseProgress.user_id == current_user.id,
            CourseProgress.course_id == c.course_id,
        ).first()
        result.append({
            "id": c.id,
            "title": c.title,
            "description": c.description,
            "course_id": c.course_id,
            "course_title": c.course.title if c.course else None,
            "campaign_status": c.status,
            "enrolled_at": p.enrolled_at,
            "course_started": progress is not None,
            "course_completed": progress.is_completed if progress else False,
        })
    return result


@router.get("/preview")
def preview_audience(
    target_roles: str = "student",
    target_classes: str = "",
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.director, UserRole.psychologist)),
):
    """Return count of users matching the campaign criteria."""
    q = db.query(User).filter(User.is_active == True)
    roles = _valid_roles([r.strip() for r in target_roles.split(",") if r.strip()])
    if roles:
        q = q.filter(User.role.in_(roles))
    classes = [c.strip() for c in target_classes.split(",") if c.strip()]
    if classes:
        q = q.filter(User.class_name.in_(classes))
    return {"count": q.count()}


@router.get("/", response_model=List[CampaignOut])
def list_campaigns(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.director, UserRole.psychologist)),
):
    campaigns = db.query(Campaign).order_by(Campaign.created_at.desc()).all()
    return [_campaign_out(c, db) for c in campaigns]


@router.post("/", response_model=CampaignOut)
def create_campaign(
    data: CampaignCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.director, UserRole.psychologist)),
):
    if not db.query(Course).filter(Course.id == data.course_id).first():
        raise HTTPException(status_code=404, detail="Course not found")
    c = Campaign(
        title=data.title,
        description=data.description,
        course_id=data.course_id,
        target_classes=data.target_classes or [],
        target_roles=data.target_roles or ["student"],
        status="draft",
        created_by_id=current_user.id,
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return _campaign_out(c, db)


@router.post("/{campaign_id}/launch", response_model=CampaignOut)
def launch_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.director, UserRole.psychologist)),
):
    c = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Campaign not found")
    if c.status == "active":
        raise HTTPException(status_code=400, detail="Campaign already active")

    # Find matching users
    q = db.query(User).filter(User.is_active == True)
    roles = _valid_roles(c.target_roles)
    if roles:
        q = q.filter(User.role.in_(roles))
    classes = c.target_classes or []
    if classes:
        q = q.filter(User.class_name.in_(classes))
    users = q.all()

    existing_ids = {p.user_id for p in c.participants}
    for u in users:
        if u.id not in existing_ids:
            db.add(CampaignParticipant(campaign_id=c.id, user_id=u.id))
            # Enroll in the course if not already enrolled
            has_progress = db.query(CourseProgress).filter(
                CourseProgress.user_id == u.id,
                CourseProgress.course_id == c.course_id,
            ).first()
            if not has_progress:
                db.add(CourseProgress(user_id=u.id, course_id=c.course_id))

    c.status = "active"
    db.commit()
    db.refresh(c)
    return _campaign_out(c, db)


@router.delete("/{campaign_id}")
def delete_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.director, UserRole.psychologist)),
):
    c = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Campaign not found")
    db.delete(c)
    db.commit()
    return {"ok": True}
