import re
import uuid
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..models import Course, CourseModule, TheoryModule, PracticeModule, CourseProgress, ModuleType, CourseStatus
from ..schemas import (
    CourseCreate, CourseUpdate, CourseOut, CourseDetail,
    CourseModuleCreate, CourseModuleOut, CourseModuleUpdate,
    TheoryModuleUpdate, TheoryModuleOut,
    PracticeModuleUpdate, PracticeModuleOut,
    CourseProgressCreate, CourseProgressOut,
)

router = APIRouter(prefix="/courses", tags=["courses"])

UPLOADS_DIR = Path(__file__).resolve().parents[2] / "uploads" / "videos"
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"}
MAX_VIDEO_SIZE_MB = 500


# ── Helpers ───────────────────────────────────────────────────

def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_-]+', '-', text)
    text = re.sub(r'^-+|-+$', '', text)
    return text or "course"


def make_unique_slug(db: Session, base_slug: str, exclude_id: int = None) -> str:
    slug = base_slug
    counter = 1
    while True:
        q = db.query(Course).filter(Course.slug == slug)
        if exclude_id:
            q = q.filter(Course.id != exclude_id)
        if not q.first():
            return slug
        slug = f"{base_slug}-{counter}"
        counter += 1


def course_to_out(c: Course) -> dict:
    return {
        "id": c.id,
        "slug": c.slug,
        "title": c.title,
        "description": c.description,
        "category": c.category,
        "cover_image_url": c.cover_image_url,
        "status": c.status,
        "created_by_id": c.created_by_id,
        "created_at": c.created_at,
        "module_count": len(c.modules),
    }


# ── Courses ───────────────────────────────────────────────────

@router.get("/", response_model=List[CourseOut])
def list_courses(category: str = None, show_all: bool = False, db: Session = Depends(get_db)):
    q = db.query(Course)
    if category:
        q = q.filter(Course.category == category)
    if not show_all:
        q = q.filter(Course.status == CourseStatus.published)

    courses = q.order_by(Course.created_at.desc()).all()

    out_list = []
    for c in courses:
        data = course_to_out(c)
        data['duration'] = c.duration
        out_list.append(CourseOut.model_validate(data))
    return out_list


@router.post("/", response_model=CourseDetail)
def create_course(payload: CourseCreate, db: Session = Depends(get_db)):
    base_slug = slugify(payload.title)
    slug = make_unique_slug(db, base_slug)
    course = Course(
        slug=slug,
        title=payload.title,
        description=payload.description,
        category=payload.category,
        cover_image_url=payload.cover_image_url,
        created_by_id=payload.created_by_id,
        status=CourseStatus.draft,
    )
    db.add(course)
    db.commit()
    db.refresh(course)
    return CourseDetail.model_validate(course)


@router.get("/{course_id}", response_model=CourseDetail)
def get_course(course_id: int, db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return CourseDetail.model_validate(course)


@router.put("/{course_id}", response_model=CourseDetail)
def update_course(course_id: int, payload: CourseUpdate, db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    data = payload.model_dump(exclude_unset=True)
    if "title" in data:
        course.slug = make_unique_slug(db, slugify(data["title"]), exclude_id=course_id)
    for key, value in data.items():
        setattr(course, key, value)
    db.commit()
    db.refresh(course)
    return CourseDetail.model_validate(course)


@router.patch("/{course_id}/publish", response_model=CourseDetail)
def publish_course(course_id: int, db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    course.status = CourseStatus.published
    db.commit()
    db.refresh(course)
    return CourseDetail.model_validate(course)


@router.patch("/{course_id}/draft", response_model=CourseDetail)
def unpublish_course(course_id: int, db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    course.status = CourseStatus.draft
    db.commit()
    db.refresh(course)
    return CourseDetail.model_validate(course)


@router.delete("/{course_id}")
def delete_course(course_id: int, db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    db.delete(course)
    db.commit()
    return {"ok": True}


# ── Modules ───────────────────────────────────────────────────

@router.post("/{course_id}/modules", response_model=CourseModuleOut)
def add_module(course_id: int, payload: CourseModuleCreate, db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    position = payload.position
    if position is None:
        max_pos = max((m.position for m in course.modules), default=-1)
        position = max_pos + 1

    module = CourseModule(
        course_id=course_id,
        position=position,
        module_type=payload.module_type,
        label=payload.label,
    )
    db.add(module)
    db.flush()

    if payload.module_type == ModuleType.theory:
        db.add(TheoryModule(module_id=module.id))
    else:
        db.add(PracticeModule(module_id=module.id))

    db.commit()
    db.refresh(module)
    return CourseModuleOut.model_validate(module)


@router.patch("/{course_id}/modules/{module_id}", response_model=CourseModuleOut)
def update_module(course_id: int, module_id: int, payload: CourseModuleUpdate, db: Session = Depends(get_db)):
    module = db.query(CourseModule).filter(
        CourseModule.id == module_id,
        CourseModule.course_id == course_id,
    ).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(module, key, value)
    db.commit()
    db.refresh(module)
    return CourseModuleOut.model_validate(module)


@router.put("/{course_id}/modules/{module_id}/theory", response_model=TheoryModuleOut)
def update_theory(course_id: int, module_id: int, payload: TheoryModuleUpdate, db: Session = Depends(get_db)):
    module = db.query(CourseModule).filter(
        CourseModule.id == module_id,
        CourseModule.course_id == course_id,
        CourseModule.module_type == ModuleType.theory,
    ).first()
    if not module:
        raise HTTPException(status_code=404, detail="Theory module not found")

    theory = module.theory
    if not theory:
        theory = TheoryModule(module_id=module_id)
        db.add(theory)

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(theory, key, value)

    db.commit()
    db.refresh(theory)
    return TheoryModuleOut.model_validate(theory)


@router.put("/{course_id}/modules/{module_id}/practice", response_model=PracticeModuleOut)
def update_practice(course_id: int, module_id: int, payload: PracticeModuleUpdate, db: Session = Depends(get_db)):
    module = db.query(CourseModule).filter(
        CourseModule.id == module_id,
        CourseModule.course_id == course_id,
        CourseModule.module_type == ModuleType.practice,
    ).first()
    if not module:
        raise HTTPException(status_code=404, detail="Practice module not found")

    practice = module.practice
    if not practice:
        practice = PracticeModule(module_id=module_id)
        db.add(practice)

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(practice, key, value)

    db.commit()
    db.refresh(practice)
    return PracticeModuleOut.model_validate(practice)


@router.post("/{course_id}/modules/{module_id}/upload-video", response_model=TheoryModuleOut)
async def upload_video(
    course_id: int,
    module_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    module = db.query(CourseModule).filter(
        CourseModule.id == module_id,
        CourseModule.course_id == course_id,
        CourseModule.module_type == ModuleType.theory,
    ).first()
    if not module:
        raise HTTPException(status_code=404, detail="Theory module not found")

    if file.content_type not in ALLOWED_VIDEO_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{file.content_type}'. Allowed: mp4, webm, mov, avi",
        )

    dest_dir = UPLOADS_DIR / str(course_id) / str(module_id)
    dest_dir.mkdir(parents=True, exist_ok=True)

    # Remove previous video for this module to avoid orphaned files
    for old_file in dest_dir.iterdir():
        old_file.unlink(missing_ok=True)

    suffix = Path(file.filename).suffix or ".mp4"
    filename = f"{uuid.uuid4().hex}{suffix}"
    dest_path = dest_dir / filename

    contents = await file.read()
    if len(contents) > MAX_VIDEO_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"File exceeds {MAX_VIDEO_SIZE_MB} MB limit")

    dest_path.write_bytes(contents)

    video_url = f"/uploads/videos/{course_id}/{module_id}/{filename}"

    theory = module.theory
    if not theory:
        theory = TheoryModule(module_id=module_id)
        db.add(theory)

    theory.video_url = video_url
    db.commit()
    db.refresh(theory)
    return TheoryModuleOut.model_validate(theory)


@router.delete("/{course_id}/modules/{module_id}/video", response_model=TheoryModuleOut)
def delete_video(course_id: int, module_id: int, db: Session = Depends(get_db)):
    module = db.query(CourseModule).filter(
        CourseModule.id == module_id,
        CourseModule.course_id == course_id,
        CourseModule.module_type == ModuleType.theory,
    ).first()
    if not module or not module.theory:
        raise HTTPException(status_code=404, detail="Theory module not found")

    dest_dir = UPLOADS_DIR / str(course_id) / str(module_id)
    if dest_dir.exists():
        for f in dest_dir.iterdir():
            f.unlink(missing_ok=True)

    module.theory.video_url = None
    db.commit()
    db.refresh(module.theory)
    return TheoryModuleOut.model_validate(module.theory)


@router.delete("/{course_id}/modules/{module_id}")
def delete_module(course_id: int, module_id: int, db: Session = Depends(get_db)):
    module = db.query(CourseModule).filter(
        CourseModule.id == module_id,
        CourseModule.course_id == course_id,
    ).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")

    # Clean up uploaded videos for this module
    dest_dir = UPLOADS_DIR / str(course_id) / str(module_id)
    if dest_dir.exists():
        for f in dest_dir.iterdir():
            f.unlink(missing_ok=True)
        dest_dir.rmdir()

    db.delete(module)
    db.commit()
    return {"ok": True}


@router.put("/{course_id}/modules/reorder")
def reorder_modules(course_id: int, order: List[int], db: Session = Depends(get_db)):
    for pos, mid in enumerate(order):
        db.query(CourseModule).filter(
            CourseModule.id == mid,
            CourseModule.course_id == course_id,
        ).update({"position": pos})
    db.commit()
    return {"ok": True}


# ── Progress ──────────────────────────────────────────────────

@router.post("/progress", response_model=CourseProgressOut)
def update_progress(payload: CourseProgressCreate, db: Session = Depends(get_db)):
    existing = db.query(CourseProgress).filter(
        CourseProgress.user_id == payload.user_id,
        CourseProgress.course_id == payload.course_id,
    ).first()

    if existing:
        course = db.query(Course).filter(Course.id == payload.course_id).first()
        existing.modules_completed = payload.modules_completed
        if course and payload.modules_completed >= len(course.modules):
            existing.is_completed = True
            from sqlalchemy.sql import func
            existing.completed_at = func.now()
        db.commit()
        db.refresh(existing)
        return existing

    db_progress = CourseProgress(**payload.model_dump())
    db.add(db_progress)
    db.commit()
    db.refresh(db_progress)
    return db_progress


@router.get("/progress/{user_id}", response_model=List[CourseProgressOut])
def get_user_progress(user_id: int, db: Session = Depends(get_db)):
    return db.query(CourseProgress).filter(CourseProgress.user_id == user_id).all()
