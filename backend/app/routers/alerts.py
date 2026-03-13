from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..models import Alert
from ..schemas import AlertOut

router = APIRouter(prefix="/alerts", tags=["alerts"])


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
