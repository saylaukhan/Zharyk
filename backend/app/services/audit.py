"""Audit trail helper — writes immutable log entries for sensitive data-access actions."""
from sqlalchemy.orm import Session
from ..models import AuditLog


def write_audit(
    db: Session,
    actor_id: int,
    actor_name: str,
    actor_role: str,
    action: str,
    target_user_id: int | None = None,
    target_anonymous_id: str | None = None,
    reason: str | None = None,
) -> None:
    """Append a single audit entry. Commits immediately so the log is durable
    even if the caller later rolls back its own transaction."""
    entry = AuditLog(
        actor_id=actor_id,
        actor_name=actor_name,
        actor_role=actor_role,
        action=action,
        target_user_id=target_user_id,
        target_anonymous_id=target_anonymous_id,
        reason=reason,
    )
    db.add(entry)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
