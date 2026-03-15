from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from .models import UserRole, RiskLevel, CourseStatus, ModuleType, PracticeType



class UserRegister(BaseModel):
    username: str
    email: str
    password: str
    role: UserRole = UserRole.student
    class_name: Optional[str] = None


class UserLogin(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str
    role: UserRole
    user_id: int


class UserBase(BaseModel):
    username: str
    email: str
    role: UserRole
    class_name: Optional[str] = None
    anonymous_id: Optional[str] = None


class UserCreate(UserBase):
    pass


class UserOut(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class CheckInCreate(BaseModel):
    stress_level: Optional[float] = None
    motivation_level: Optional[float] = None
    anxiety_level: Optional[float] = None
    burnout_level: Optional[float] = None
    emotion_score: Optional[float] = None
    notes: Optional[str] = None


class CheckInOut(CheckInCreate):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class UserMetricCreate(BaseModel):
    stress: float = 0
    burnout: float = 0
    anxiety: float = 0
    motivation: float = 0
    emotion: float = 0


class UserMetricOut(UserMetricCreate):
    id: int
    user_id: int
    recorded_at: datetime

    class Config:
        from_attributes = True


class AlertCreate(BaseModel):
    user_id: int
    alert_type: str
    level: RiskLevel
    message: str


class AlertOut(AlertCreate):
    id: int
    psychologist_id: Optional[int] = None
    is_resolved: bool
    created_at: datetime
    resolved_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class SessionCreate(BaseModel):
    user_id: int
    psychologist_id: int
    title: str
    notes: Optional[str] = None
    scheduled_at: datetime
    duration_minutes: int = 50
    session_type: str = "individual"


class SessionUpdate(BaseModel):
    user_id: Optional[int] = None
    title: Optional[str] = None
    notes: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    session_type: Optional[str] = None
    is_completed: Optional[bool] = None


class SessionOut(SessionCreate):
    id: int
    is_completed: bool
    created_at: datetime
    student_name: Optional[str] = None

    class Config:
        from_attributes = True


class NoteCreate(BaseModel):
    user_id: int
    psychologist_id: int
    content: str
    tags: Optional[str] = None


class NoteOut(NoteCreate):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ── Course Builder schemas ────────────────────────────────────

class TheoryModuleOut(BaseModel):
    id: int
    module_id: int
    video_url: Optional[str] = None
    lesson_title: Optional[str] = None
    article_content: Optional[str] = None

    class Config:
        from_attributes = True


class TheoryModuleUpdate(BaseModel):
    video_url: Optional[str] = None
    lesson_title: Optional[str] = None
    article_content: Optional[str] = None


class PracticeModuleOut(BaseModel):
    id: int
    module_id: int
    practice_type: PracticeType
    prompt: Optional[str] = None
    ai_enabled: bool
    breath_duration_minutes: int
    quiz_question: Optional[str] = None
    quiz_options: Optional[str] = None
    quiz_correct_index: Optional[int] = None

    class Config:
        from_attributes = True


class PracticeModuleUpdate(BaseModel):
    practice_type: Optional[PracticeType] = None
    prompt: Optional[str] = None
    ai_enabled: Optional[bool] = None
    breath_duration_minutes: Optional[int] = None
    quiz_question: Optional[str] = None
    quiz_options: Optional[str] = None
    quiz_correct_index: Optional[int] = None


class CourseModuleOut(BaseModel):
    id: int
    course_id: int
    position: int
    module_type: ModuleType
    label: Optional[str] = None
    theory: Optional[TheoryModuleOut] = None
    practice: Optional[PracticeModuleOut] = None

    class Config:
        from_attributes = True


class CourseModuleCreate(BaseModel):
    module_type: ModuleType
    position: Optional[int] = None
    label: Optional[str] = None


class CourseModuleUpdate(BaseModel):
    label: Optional[str] = None
    position: Optional[int] = None


class CourseCreate(BaseModel):
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    cover_image_url: Optional[str] = None
    created_by_id: Optional[int] = None


class CourseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    cover_image_url: Optional[str] = None
    status: Optional[CourseStatus] = None
    duration: Optional[int] = None


class CourseOut(BaseModel):
    id: int
    slug: str
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    cover_image_url: Optional[str] = None
    status: CourseStatus
    created_by_id: Optional[int] = None
    created_at: datetime
    module_count: int = 0
    duration: int = 0
    lessons_count: int = 0
    course_type: str = "Не определен"

    class Config:
        from_attributes = True


class CourseDetail(BaseModel):
    id: int
    slug: str
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    cover_image_url: Optional[str] = None
    status: CourseStatus
    created_by_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    duration: int = 0
    lessons_count: int = 0
    course_type: str = "Не определен"
    modules: List[CourseModuleOut] = []

    class Config:
        from_attributes = True


class CourseProgressCreate(BaseModel):
    user_id: int
    course_id: int
    modules_completed: int = 0


class CourseProgressOut(CourseProgressCreate):
    id: int
    is_completed: bool
    started_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class OrgMetricCreate(BaseModel):
    wellbeing_index: float
    critical_alerts_count: int
    engagement_rate: float
    absence_reduction: Optional[float] = None
    parent_engagement: Optional[float] = None


class OrgMetricOut(OrgMetricCreate):
    id: int
    recorded_at: datetime

    class Config:
        from_attributes = True


class AlertRich(BaseModel):
    id: int
    user_id: int
    anonymous_id: Optional[str] = None
    class_name: Optional[str] = None
    alert_type: str
    level: RiskLevel
    created_at: datetime
    is_resolved: bool

    class Config:
        from_attributes = True


class StudentMetrics(BaseModel):
    id: int
    username: str
    email: str
    role: UserRole
    class_name: Optional[str] = None
    anonymous_id: Optional[str] = None
    is_active: bool
    created_at: datetime
    stress: float = 0
    motivation: float = 0
    anxiety: float = 0
    burnout: float = 0
    emotion: float = 0
    sessions_count: int = 0
    courses_count: int = 0
    last_checkin_date: Optional[datetime] = None

    class Config:
        from_attributes = True


class ChatSessionCreate(BaseModel):
    title: str = "Новый чат"


class ChatSessionUpdate(BaseModel):
    title: str


class ChatSessionOut(BaseModel):
    id: int
    user_id: int
    title: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ChatHistoryOut(BaseModel):
    id: int
    user_id: int
    session_id: Optional[int] = None
    role: str
    content: str
# ── Test schemas ──────────────────────────────────────────────

class TestQuestionOut(BaseModel):
    id: int
    position: int
    text: str
    is_reverse: bool
    subscale: Optional[str] = None

    class Config:
        from_attributes = True


class TestOut(BaseModel):
    id: int
    slug: str
    title: str
    description: Optional[str] = None
    duration_minutes: int = 15
    questions_count: int = 0
    is_active: bool = True

    class Config:
        from_attributes = True


class TestDetailOut(TestOut):
    questions: List[TestQuestionOut] = []


class TestSubmit(BaseModel):
    answers: dict  # {question_id: answer_value (0-3)}


class TestResultOut(BaseModel):
    id: int
    user_id: int
    test_id: int
    test_title: Optional[str] = None
    total_score: int = 0
    involvement_score: int = 0
    control_score: int = 0
    risk_score: int = 0
    overall_level: Optional[str] = None
    involvement_level: Optional[str] = None
    control_level: Optional[str] = None
    risk_level: Optional[str] = None
    recommendations: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AIDeltaOutput(BaseModel):
    reasoning: str = Field(description="Краткий семантический анализ сообщения.")
    stress_delta: int = Field(description="Дельта стресса (-30 до 30)")
    burnout_delta: int = Field(description="Дельта выгорания (-30 до 30)")
    anxiety_delta: int = Field(description="Дельта тревожности (-30 до 30)")
    motivation_delta: int = Field(description="Дельта мотивации (-30 до 30)")
    emotion_delta: int = Field(description="Дельта эмоций (-30 до 30)")
    heavy_intent: bool = Field(description="True, если пользователь говорит об ужасных вещах (селфхарм, паника, неспособность функционировать).")
