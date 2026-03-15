from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DBSession
from typing import List

from ..database import get_db
from ..models import TherapySession as Session, User
from ..schemas import SessionCreate, SessionOut, SessionUpdate

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.get("/", response_model=List[SessionOut])
def list_sessions(psychologist_id: int = None, db: DBSession = Depends(get_db)):
    q = db.query(Session)
    if psychologist_id:
        q = q.filter(Session.psychologist_id == psychologist_id)
    sessions = q.order_by(Session.scheduled_at).all()
    result = []
    for s in sessions:
        data = SessionOut.model_validate(s)
        student = db.query(User).filter(User.id == s.user_id).first()
        if student:
            data.student_name = student.anonymous_id or student.username
        result.append(data)
    return result


@router.get("/{session_id}", response_model=SessionOut)
def get_session(session_id: int, db: DBSession = Depends(get_db)):
    session = db.query(Session).filter(Session.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    data = SessionOut.model_validate(session)
    student = db.query(User).filter(User.id == session.user_id).first()
    if student:
        data.student_name = student.anonymous_id or student.username
    return data


@router.post("/", response_model=SessionOut)
def create_session(session: SessionCreate, db: DBSession = Depends(get_db)):
    db_session = Session(**session.model_dump())
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    data = SessionOut.model_validate(db_session)
    student = db.query(User).filter(User.id == db_session.user_id).first()
    if student:
        data.student_name = student.anonymous_id or student.username
    return data


@router.put("/{session_id}", response_model=SessionOut)
def update_session(session_id: int, payload: SessionUpdate, db: DBSession = Depends(get_db)):
    session = db.query(Session).filter(Session.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(session, key, value)
    db.commit()
    db.refresh(session)
    data = SessionOut.model_validate(session)
    student = db.query(User).filter(User.id == session.user_id).first()
    if student:
        data.student_name = student.anonymous_id or student.username
    return data


@router.delete("/{session_id}")
def delete_session(session_id: int, db: DBSession = Depends(get_db)):
    session = db.query(Session).filter(Session.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    db.delete(session)
    db.commit()
    return {"ok": True}


@router.patch("/{session_id}/complete")
def complete_session(session_id: int, db: DBSession = Depends(get_db)):
    session = db.query(Session).filter(Session.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    session.is_completed = True
    db.commit()
    return {"ok": True}
