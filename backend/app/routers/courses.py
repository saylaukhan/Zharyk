from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..models import Course, CourseProgress
from ..schemas import CourseCreate, CourseOut, CourseProgressCreate, CourseProgressOut

router = APIRouter(prefix="/courses", tags=["courses"])


@router.get("/", response_model=List[CourseOut])
def list_courses(category: str = None, db: Session = Depends(get_db)):
    q = db.query(Course).filter(Course.is_active == True)
    if category:
        q = q.filter(Course.category == category)
    return q.all()


@router.post("/", response_model=CourseOut)
def create_course(course: CourseCreate, db: Session = Depends(get_db)):
    existing = db.query(Course).filter(Course.slug == course.slug).first()
    if existing:
        raise HTTPException(status_code=400, detail="Course slug already exists")
    db_course = Course(**course.model_dump())
    db.add(db_course)
    db.commit()
    db.refresh(db_course)
    return db_course


@router.get("/{course_id}", response_model=CourseOut)
def get_course(course_id: int, db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course


@router.post("/progress", response_model=CourseProgressOut)
def update_progress(progress: CourseProgressCreate, db: Session = Depends(get_db)):
    existing = db.query(CourseProgress).filter(
        CourseProgress.user_id == progress.user_id,
        CourseProgress.course_id == progress.course_id,
    ).first()
    if existing:
        course = db.query(Course).filter(Course.id == progress.course_id).first()
        existing.lessons_completed = progress.lessons_completed
        if course and progress.lessons_completed >= course.total_lessons:
            existing.is_completed = True
            from sqlalchemy.sql import func
            existing.completed_at = func.now()
        db.commit()
        db.refresh(existing)
        return existing

    db_progress = CourseProgress(**progress.model_dump())
    db.add(db_progress)
    db.commit()
    db.refresh(db_progress)
    return db_progress


@router.get("/progress/{user_id}", response_model=List[CourseProgressOut])
def get_user_progress(user_id: int, db: Session = Depends(get_db)):
    return db.query(CourseProgress).filter(CourseProgress.user_id == user_id).all()
