from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from datetime import datetime

from ..database import get_db
from ..models import AuditLog, User, UserRole
from ..schemas import AuditLogOut
from ..auth import require_roles

router = APIRouter(prefix="/audit", tags=["audit"])

# All audit-trail actions that can be filtered on in the UI
AUDIT_ACTIONS = [
    "VIEW_METRICS_BATCH",
    "VIEW_USER_ANALYTICS",
    "VIEW_ALERTS",
    "RESOLVE_ALERT",
    "CREATE_SESSION",
    "UPDATE_SESSION",
    "DELETE_SESSION",
    "CREATE_USER",
    "IMPORT_USERS",
    "CREATE_NOTE",
    "VIEW_USER_CHECKINS",
]


@router.get("/actions")
def list_actions(
    _: User = Depends(require_roles(UserRole.director))
):
    """Return the full list of auditable action types for filter dropdowns."""
    return AUDIT_ACTIONS


@router.get("/logs", response_model=List[AuditLogOut])
def get_audit_logs(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    action: Optional[str] = None,
    actor_id: Optional[int] = None,
    target_user_id: Optional[int] = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.director)),
):
    """
    Return paginated, immutable audit log entries.
    Accessible only by directors.
    """
    q = db.query(AuditLog)

    if date_from:
        q = q.filter(AuditLog.created_at >= date_from)
    if date_to:
        q = q.filter(AuditLog.created_at <= date_to)
    if action:
        q = q.filter(AuditLog.action == action)
    if actor_id:
        q = q.filter(AuditLog.actor_id == actor_id)
    if target_user_id:
        q = q.filter(AuditLog.target_user_id == target_user_id)

    return (
        q.order_by(desc(AuditLog.created_at))
        .offset(offset)
        .limit(limit)
        .all()
    )
