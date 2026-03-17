from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..models import Alert, User, UserRole, ChatHistory
from ..schemas import AlertOut, AlertRich
from ..auth import require_roles

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("/rich", response_model=List[AlertRich])
def list_rich_alerts(
    resolved: bool = False, 
    limit: int = 50, 
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.psychologist, UserRole.director))
):
    alerts_data = (
        db.query(Alert, User.anonymous_id, User.class_name)
        .join(User, Alert.user_id == User.id)
        .filter(Alert.is_resolved == resolved)
        .order_by(Alert.created_at.desc())
        .limit(limit)
        .all()
    )
    
    res = []
    for alert, anon_id, cls_name in alerts_data:
        res.append({
            "id": alert.id,
            "user_id": alert.user_id,
            "anonymous_id": anon_id,
            "class_name": cls_name,
            "alert_type": alert.alert_type,
            "level": alert.level,
            "created_at": alert.created_at,
            "is_resolved": alert.is_resolved
        })
    return res


@router.get("/", response_model=List[AlertOut])
def list_alerts(resolved: bool = False, limit: int = 50, db: Session = Depends(get_db)):
    return (
        db.query(Alert)
        .filter(Alert.is_resolved == resolved)
        .order_by(Alert.created_at.desc())
        .limit(limit)
        .all()
    )


@router.patch("/{alert_id}/resolve")
def resolve_alert(alert_id: int, db: Session = Depends(get_db)):
    from sqlalchemy.sql import func
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.is_resolved = True
    alert.resolved_at = func.now()
    db.commit()
    return {"ok": True}


@router.get("/{alert_id}/messages")
def get_alert_messages(alert_id: int, db: Session = Depends(get_db)):
    """Return the last 5 chat messages from the session that triggered this alert.
    Falls back to the messages_snapshot if the chat session has been deleted."""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    # Try live messages from the session first
    if alert.session_id:
        messages = (
            db.query(ChatHistory)
            .filter(
                ChatHistory.session_id == alert.session_id,
                ChatHistory.role.in_(["user", "assistant"]),
            )
            .order_by(ChatHistory.created_at.desc())
            .limit(5)
            .all()
        )
        if messages:
            return [
                {
                    "id": m.id,
                    "role": m.role,
                    "content": m.content,
                    "created_at": m.created_at,
                }
                for m in reversed(messages)
            ]

    # Session deleted — return the snapshot saved at alert creation
    if alert.messages_snapshot:
        return alert.messages_snapshot

    return []
