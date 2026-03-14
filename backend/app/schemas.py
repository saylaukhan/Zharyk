from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from .models import UserRole, RiskLevel


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


class SessionOut(SessionCreate):
    id: int
    is_completed: bool
    created_at: datetime

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


class CourseCreate(BaseModel):
    slug: str
    title: str
    description: str
    category: str
    content_type: str
    duration_minutes: int
    total_lessons: int


class CourseOut(CourseCreate):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class CourseProgressCreate(BaseModel):
    user_id: int
    course_id: int
    lessons_completed: int = 0


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
