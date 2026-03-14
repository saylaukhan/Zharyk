import enum
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from .database import Base


class UserRole(str, enum.Enum):
    student = "student"
    employee = "employee"
    psychologist = "psychologist"
    director = "director"


class RiskLevel(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class CourseStatus(str, enum.Enum):
    draft = "draft"
    published = "published"


class ModuleType(str, enum.Enum):
    theory = "theory"
    practice = "practice"


class PracticeType(str, enum.Enum):
    essay = "essay"
    breathing = "breathing"
    quiz = "quiz"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.student, nullable=False)
    anonymous_id = Column(String, unique=True, index=True, nullable=True)
    class_name = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    checkins = relationship("CheckIn", back_populates="user")
    metrics = relationship("UserMetric", back_populates="user")
    alerts = relationship("Alert", back_populates="user", foreign_keys="Alert.user_id")
    sessions = relationship("TherapySession", back_populates="user", foreign_keys="TherapySession.user_id")
    notes = relationship("Note", back_populates="user", foreign_keys="Note.user_id")
    course_progress = relationship("CourseProgress", back_populates="user")


class CheckIn(Base):
    __tablename__ = "checkins"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    stress_level = Column(Float, nullable=True)
    motivation_level = Column(Float, nullable=True)
    anxiety_level = Column(Float, nullable=True)
    burnout_level = Column(Float, nullable=True)
    emotion_score = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="checkins")


class UserMetric(Base):
    __tablename__ = "user_metrics"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    stress = Column(Float, default=0)
    burnout = Column(Float, default=0)
    anxiety = Column(Float, default=0)
    motivation = Column(Float, default=0)
    emotion = Column(Float, default=0)
    recorded_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="metrics")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    psychologist_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    alert_type = Column(String)
    level = Column(Enum(RiskLevel))
    message = Column(Text)
    is_resolved = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="alerts", foreign_keys=[user_id])


class TherapySession(Base):
    __tablename__ = "therapy_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    psychologist_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String)
    notes = Column(Text, nullable=True)
    scheduled_at = Column(DateTime(timezone=True))
    duration_minutes = Column(Integer, default=50)
    session_type = Column(String, default="individual")
    is_completed = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="sessions", foreign_keys=[user_id])


class Note(Base):
    __tablename__ = "notes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    psychologist_id = Column(Integer, ForeignKey("users.id"))
    content = Column(Text)
    tags = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="notes", foreign_keys=[user_id])


class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String, unique=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String, nullable=True)
    cover_image_url = Column(String, nullable=True)
    status = Column(Enum(CourseStatus), default=CourseStatus.draft, nullable=False)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    duration = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    modules = relationship(
        "CourseModule",
        back_populates="course",
        cascade="all, delete-orphan",
        order_by="CourseModule.position",
    )
    progress = relationship("CourseProgress", back_populates="course", cascade="all, delete-orphan")

    @property
    def lessons_count(self) -> int:
        return len(self.modules) if self.modules else 0

    @property
    def course_type(self) -> str:
        if not self.modules:
            return "Не определен"
        has_video = False
        has_text = False
        for m in self.modules:
            if m.module_type.value == "theory" and getattr(m, "theory", None):
                if m.theory.video_url:
                    has_video = True
                if m.theory.article_content and str(m.theory.article_content).strip() and m.theory.article_content != "<p><br></p>":
                    has_text = True
        
        if has_video and has_text:
            return "Смешанный"
        elif has_video:
            return "Видео"
        elif has_text:
            return "Статья"
        return "Не определен"


class CourseModule(Base):
    __tablename__ = "course_modules"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    position = Column(Integer, default=0, nullable=False)
    module_type = Column(Enum(ModuleType), nullable=False)
    label = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    course = relationship("Course", back_populates="modules")
    theory = relationship(
        "TheoryModule",
        back_populates="module",
        uselist=False,
        cascade="all, delete-orphan",
    )
    practice = relationship(
        "PracticeModule",
        back_populates="module",
        uselist=False,
        cascade="all, delete-orphan",
    )


class TheoryModule(Base):
    __tablename__ = "theory_modules"

    id = Column(Integer, primary_key=True, index=True)
    module_id = Column(Integer, ForeignKey("course_modules.id", ondelete="CASCADE"), unique=True, nullable=False)
    video_url = Column(String, nullable=True)
    lesson_title = Column(String, nullable=True)
    article_content = Column(Text, nullable=True)

    module = relationship("CourseModule", back_populates="theory")


class PracticeModule(Base):
    __tablename__ = "practice_modules"

    id = Column(Integer, primary_key=True, index=True)
    module_id = Column(Integer, ForeignKey("course_modules.id", ondelete="CASCADE"), unique=True, nullable=False)
    practice_type = Column(Enum(PracticeType), default=PracticeType.essay, nullable=False)
    prompt = Column(Text, nullable=True)
    ai_enabled = Column(Boolean, default=False, nullable=False)
    breath_duration_minutes = Column(Integer, default=5, nullable=False)
    quiz_question = Column(Text, nullable=True)
    quiz_options = Column(Text, nullable=True)  # JSON array stored as string
    quiz_correct_index = Column(Integer, nullable=True)

    module = relationship("CourseModule", back_populates="practice")


class CourseProgress(Base):
    __tablename__ = "course_progress"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"))
    modules_completed = Column(Integer, default=0)
    is_completed = Column(Boolean, default=False)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="course_progress")
    course = relationship("Course", back_populates="progress")


class OrgMetric(Base):
    __tablename__ = "org_metrics"

    id = Column(Integer, primary_key=True, index=True)
    wellbeing_index = Column(Float)
    critical_alerts_count = Column(Integer)
    engagement_rate = Column(Float)
    absence_reduction = Column(Float, nullable=True)
    parent_engagement = Column(Float, nullable=True)
    recorded_at = Column(DateTime(timezone=True), server_default=func.now())
