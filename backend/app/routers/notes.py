from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..models import Note
from ..schemas import NoteCreate, NoteOut

router = APIRouter(prefix="/notes", tags=["notes"])


@router.get("/", response_model=List[NoteOut])
def list_notes(psychologist_id: int = None, user_id: int = None, db: Session = Depends(get_db)):
    q = db.query(Note)
    if psychologist_id:
        q = q.filter(Note.psychologist_id == psychologist_id)
    if user_id:
        q = q.filter(Note.user_id == user_id)
    return q.order_by(Note.created_at.desc()).all()


@router.post("/", response_model=NoteOut)
def create_note(note: NoteCreate, db: Session = Depends(get_db)):
    db_note = Note(**note.model_dump())
    db.add(db_note)
    db.commit()
    db.refresh(db_note)
    return db_note


@router.put("/{note_id}", response_model=NoteOut)
def update_note(note_id: int, content: str, tags: str = None, db: Session = Depends(get_db)):
    note = db.query(Note).filter(Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    note.content = content
    if tags is not None:
        note.tags = tags
    db.commit()
    db.refresh(note)
    return note


@router.delete("/{note_id}")
def delete_note(note_id: int, db: Session = Depends(get_db)):
    note = db.query(Note).filter(Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    db.delete(note)
    db.commit()
    return {"ok": True}
