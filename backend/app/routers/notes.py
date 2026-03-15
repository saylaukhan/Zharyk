import json
import uuid
import shutil
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional

from ..database import get_db
from ..models import Note
from ..schemas import NoteCreate, NoteOut, NoteUpdate

router = APIRouter(prefix="/notes", tags=["notes"])

UPLOADS_DIR = Path(__file__).resolve().parents[2] / "uploads" / "notes"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


def _parse_images(note: Note) -> list:
    """Parse images JSON string to list."""
    if note.images:
        try:
            return json.loads(note.images)
        except (json.JSONDecodeError, TypeError):
            return []
    return []


def _note_to_dict(note: Note) -> dict:
    """Convert Note model to dict with parsed images."""
    return {
        "id": note.id,
        "user_id": note.user_id,
        "title": note.title,
        "description": note.description,
        "images": _parse_images(note),
        "created_at": note.created_at,
        "updated_at": note.updated_at,
    }


@router.get("/", response_model=List[NoteOut])
def list_notes(user_id: int = None, db: Session = Depends(get_db)):
    q = db.query(Note)
    if user_id:
        q = q.filter(Note.user_id == user_id)
    notes = q.order_by(Note.created_at.desc()).all()
    return [_note_to_dict(n) for n in notes]


@router.get("/{note_id}", response_model=NoteOut)
def get_note(note_id: int, db: Session = Depends(get_db)):
    note = db.query(Note).filter(Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return _note_to_dict(note)


@router.post("/", response_model=NoteOut)
def create_note(
    title: str = Form(...),
    user_id: int = Form(...),
    description: Optional[str] = Form(None),
    images: List[UploadFile] = File(default=[]),
    db: Session = Depends(get_db),
):
    # Save uploaded images
    image_paths = []
    for img in images:
        if img.filename:
            ext = Path(img.filename).suffix or ".jpg"
            filename = f"{uuid.uuid4().hex}{ext}"
            dest = UPLOADS_DIR / filename
            with open(dest, "wb") as f:
                shutil.copyfileobj(img.file, f)
            image_paths.append(f"/uploads/notes/{filename}")

    db_note = Note(
        user_id=user_id,
        title=title,
        description=description,
        images=json.dumps(image_paths) if image_paths else None,
    )
    db.add(db_note)
    db.commit()
    db.refresh(db_note)
    return _note_to_dict(db_note)


@router.put("/{note_id}", response_model=NoteOut)
def update_note(
    note_id: int,
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    images: List[UploadFile] = File(default=[]),
    keep_images: Optional[str] = Form(None),  # JSON array of existing image paths to keep
    db: Session = Depends(get_db),
):
    note = db.query(Note).filter(Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    if title is not None:
        note.title = title
    if description is not None:
        note.description = description

    # Build new image list
    existing_images = []
    if keep_images:
        try:
            existing_images = json.loads(keep_images)
        except (json.JSONDecodeError, TypeError):
            existing_images = []

    # Remove old images that are not in keep list
    old_images = _parse_images(note)
    for old_img in old_images:
        if old_img not in existing_images:
            # Delete file from disk
            file_path = Path(__file__).resolve().parents[2] / old_img.lstrip("/")
            if file_path.exists():
                file_path.unlink()

    # Save new uploaded images
    new_image_paths = list(existing_images)
    for img in images:
        if img.filename:
            ext = Path(img.filename).suffix or ".jpg"
            filename = f"{uuid.uuid4().hex}{ext}"
            dest = UPLOADS_DIR / filename
            with open(dest, "wb") as f:
                shutil.copyfileobj(img.file, f)
            new_image_paths.append(f"/uploads/notes/{filename}")

    note.images = json.dumps(new_image_paths) if new_image_paths else None

    db.commit()
    db.refresh(note)
    return _note_to_dict(note)


@router.delete("/{note_id}")
def delete_note(note_id: int, db: Session = Depends(get_db)):
    note = db.query(Note).filter(Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    # Delete image files
    for img_path in _parse_images(note):
        file_path = Path(__file__).resolve().parents[2] / img_path.lstrip("/")
        if file_path.exists():
            file_path.unlink()

    db.delete(note)
    db.commit()
    return {"ok": True}
