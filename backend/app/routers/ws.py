"""
WebSocket router for real-time alert notifications to psychologists.
Endpoint: ws://host/ws/alerts/{psychologist_id}
"""
import json
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from ..database import SessionLocal
from ..services.websocket_manager import manager

logger = logging.getLogger(__name__)

router = APIRouter(tags=["websocket"])


async def _send_unresolved_alerts(websocket: WebSocket):
    """Send all currently unresolved alerts to a freshly connected psychologist."""
    from ..models import Alert, User

    db: Session = SessionLocal()
    try:
        alerts = (
            db.query(Alert, User.anonymous_id, User.username)
            .join(User, Alert.user_id == User.id)
            .filter(Alert.is_resolved == False)
            .order_by(Alert.created_at.desc())
            .limit(50)
            .all()
        )
        for alert, anon_id, username in alerts:
            payload = {
                "type": "new_alert",
                "alert_id": alert.id,
                "level": alert.level.value,
                "student_name": anon_id or username or f"User #{alert.user_id}",
                "student_id": alert.user_id,
                "alert_type": alert.alert_type,
                "reasoning": alert.reasoning or alert.message or "",
                "metrics": alert.metrics_snapshot or {},
                "created_at": alert.created_at.isoformat() if alert.created_at else None,
                "is_resolved": False,
            }
            await websocket.send_text(json.dumps(payload, ensure_ascii=False, default=str))
    except Exception as e:
        logger.warning(f"[WS] Failed to send catch-up alerts: {e}")
    finally:
        db.close()


@router.websocket("/ws/alerts/{psychologist_id}")
async def alerts_websocket(websocket: WebSocket, psychologist_id: int):
    """
    Persistent WebSocket connection for a psychologist.
    On connect: sends all unresolved alerts (catch-up).
    Frontend sends ping messages to keep the connection alive.
    Server pushes new_alert JSON payloads when risks are detected.
    """
    await manager.connect(psychologist_id, websocket)
    try:
        # Catch-up: deliver all existing unresolved alerts immediately
        await _send_unresolved_alerts(websocket)

        while True:
            # Keep connection alive; ignore any client messages (ping/pong)
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(psychologist_id, websocket)
    except Exception as e:
        logger.warning(f"[WS] Unexpected error for psychologist {psychologist_id}: {e}")
        manager.disconnect(psychologist_id, websocket)
