from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DBSession
from typing import List

from ..database import get_db
from ..models import TherapySession as Session
from ..schemas import SessionCreate, SessionOut

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.get("/", response_model=List[SessionOut])
def list_sessions(psychologist_id: int = None, db: DBSession = Depends(get_db)):
    q = db.query(Session)
    if psychologist_id:
        q = q.filter(Session.psychologist_id == psychologist_id)
    return q.order_by(Session.scheduled_at).all()


@router.post("/", response_model=SessionOut)
def create_session(session: SessionCreate, db: DBSession = Depends(get_db)):
    db_session = Session(**session.model_dump())
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session


@router.patch("/{session_id}/complete")
def complete_session(session_id: int, db: DBSession = Depends(get_db)):
    session = db.query(Session).filter(Session.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    session.is_completed = True
    db.commit()
    return {"ok": True}
