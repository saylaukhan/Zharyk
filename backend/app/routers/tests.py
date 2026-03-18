import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..models import Test, TestQuestion, TestResult, UserMetric, User, UserRole, Course, CourseStatus, Alert, RiskLevel
from ..schemas import TestOut, TestDetailOut, TestSubmit, TestResultOut
from ..auth import get_current_user, require_roles

router = APIRouter(prefix="/tests", tags=["tests"])


# ── Scoring helpers ───────────────────────────────────────────

def _score_answer(value: int, is_reverse: bool) -> int:
    """Direct: 0-3, Reverse: 3-0"""
    v = max(0, min(3, int(value)))
    return (3 - v) if is_reverse else v


def _level_hardiness(score: int) -> str:
    if score <= 62:
        return "low"
    if score <= 81:
        return "medium"
    return "high"


def _level_involvement(score: int) -> str:
    if score <= 30:
        return "low"
    if score <= 38:
        return "medium"
    return "high"


def _level_control(score: int) -> str:
    if score <= 21:
        return "low"
    if score <= 29:
        return "medium"
    return "high"


def _level_risk(score: int) -> str:
    if score <= 10:
        return "low"
    if score <= 14:
        return "medium"
    return "high"


LEVEL_LABELS = {
    "low": "Низкий",
    "medium": "Средний",
    "high": "Высокий",
}


def _hardiness_to_stress(total_score: int) -> float:
    """Convert Hardiness total (0-135) → stress % (0-100).
       High hardiness = low stress."""
    return round(max(0, min(100, 100 - (total_score / 135) * 100)), 1)


def _generate_recommendations(overall_level: str, db: Session) -> list[dict]:
    """Pick relevant courses from the database based on stress level."""
    recs = []
    courses = db.query(Course).filter(Course.status == CourseStatus.published).all()

    # Map categories to recommend based on result levels
    priority_categories = []
    if overall_level == "low":
        priority_categories = ["Стресс", "Мотивация", "Эмоции"]
    elif overall_level == "medium":
        priority_categories = ["Стресс", "Тревожность"]
    else:
        priority_categories = ["Мотивация", "Эмоции"]

    for course in courses:
        if course.category in priority_categories:
            recs.append({"id": course.id, "title": course.title, "category": course.category})
        if len(recs) >= 3:
            break

    # If not enough category-matched, fill up with any published courses
    if len(recs) < 2:
        for course in courses:
            already = {r["id"] for r in recs}
            if course.id not in already:
                recs.append({"id": course.id, "title": course.title, "category": course.category})
            if len(recs) >= 3:
                break

    return recs


# ── Endpoints ─────────────────────────────────────────────────

@router.get("/", response_model=List[TestOut])
def list_tests(db: Session = Depends(get_db)):
    return db.query(Test).filter(Test.is_active == True).all()


@router.get("/{test_id}", response_model=TestDetailOut)
def get_test(test_id: int, db: Session = Depends(get_db)):
    test = db.query(Test).filter(Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    return test


@router.post("/{test_id}/submit", response_model=TestResultOut)
def submit_test(
    test_id: int,
    payload: TestSubmit,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    test = db.query(Test).filter(Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    questions = db.query(TestQuestion).filter(TestQuestion.test_id == test_id).all()
    q_map = {str(q.id): q for q in questions}

    involvement_score = 0
    control_score = 0
    risk_score = 0
    total_score = 0
    overall_level = "medium"
    inv_level = ctrl_level = rsk_level = None

    if test.slug == "hardiness-maddi":
        for qid_str, answer_val in payload.answers.items():
            q = q_map.get(str(qid_str))
            if not q: continue
            pts = _score_answer(int(answer_val), q.is_reverse)
            if q.subscale == "involvement": involvement_score += pts
            elif q.subscale == "control": control_score += pts
            elif q.subscale == "risk_taking": risk_score += pts
            
        total_score = involvement_score + control_score + risk_score
        overall_level = _level_hardiness(total_score)
        inv_level = _level_involvement(involvement_score)
        ctrl_level = _level_control(control_score)
        rsk_level = _level_risk(risk_score)
    else:
        for qid_str, answer_val in payload.answers.items():
            q = q_map.get(str(qid_str))
            if not q: continue
            v = int(answer_val)
            
            if test.slug == "beck-hopelessness":
                is_true = v > 1
                if q.is_reverse:
                    pts = 1 if not is_true else 0
                else:
                    pts = 1 if is_true else 0
                total_score += pts
            elif test.slug == "russell-loneliness":
                pts = _score_answer(v, q.is_reverse)
                total_score += pts
            elif test.slug == "young-internet":
                pts = v + 1  # 1 to 4 (scale has 5 items but UI offers 4, approx fine)
                total_score += pts
            elif test.slug == "rosenberg":
                if q.subscale == "self_respect":
                    involvement_score += _score_answer(v, q.is_reverse)
                elif q.subscale == "self_deprecation":
                    control_score += _score_answer(v, q.is_reverse)
            else:
                total_score += _score_answer(v, q.is_reverse)
        
        if test.slug == "rosenberg":
            total_score = involvement_score + control_score
            if involvement_score >= 8: inv_level = "high"
            elif involvement_score >= 5: inv_level = "medium"
            else: inv_level = "low"
            
            if control_score >= 8: ctrl_level = "high"
            elif control_score >= 5: ctrl_level = "medium"
            else: ctrl_level = "low"
            # Overriding names for UI
            overall_level = inv_level
            
        elif test.slug == "beck-hopelessness":
             if total_score <= 3: overall_level = "low"
             elif total_score <= 8: overall_level = "medium"
             elif total_score <= 14: overall_level = "high"
             else: overall_level = "critical"
        elif test.slug == "russell-loneliness":
             if total_score <= 20: overall_level = "low"
             elif total_score <= 40: overall_level = "medium"
             else: overall_level = "high"
        elif test.slug == "young-internet":
             if total_score <= 49: overall_level = "low"
             elif total_score <= 79: overall_level = "medium"
             else: overall_level = "high"

    recommendations = _generate_recommendations(overall_level, db)

    result = TestResult(
        user_id=current_user.id,
        test_id=test_id,
        total_score=total_score,
        involvement_score=involvement_score,
        control_score=control_score,
        risk_score=risk_score,
        overall_level=overall_level,
        involvement_level=inv_level,
        control_level=ctrl_level,
        risk_level=rsk_level,
        answers_json=json.dumps(payload.answers),
        recommendations=json.dumps(recommendations, ensure_ascii=False),
    )
    db.add(result)

    if test.slug == "hardiness-maddi":
        # Update UserMetric with derived stress value
        stress_val = _hardiness_to_stress(total_score)
        m_stress = stress_val
        m_burnout = 0
        m_anxiety = max(0, 100 - control_score * 3)
        m_motivation = min(100, involvement_score * 2.5)
        m_emotion = min(100, risk_score * 6)

        metric = UserMetric(
            user_id=current_user.id,
            stress=m_stress,
            burnout=m_burnout,
            anxiety=m_anxiety,
            motivation=m_motivation,
            emotion=m_emotion,
        )
        db.add(metric)

        # Alert check: negative metrics >= 70 or positive metrics <= 20
        _LEVEL_RANK = {"medium": 1, "high": 2, "critical": 3}
        from ..routers.checkins import _check_metric_alert
        risk, alert_type = _check_metric_alert(m_stress, m_burnout, m_anxiety, m_motivation, m_emotion)
        if risk:
            existing = (
                db.query(Alert)
                .filter(Alert.user_id == current_user.id, Alert.is_resolved == False)
                .order_by(Alert.created_at.desc())
                .first()
            )
            existing_rank = _LEVEL_RANK.get(existing.level.value, 0) if existing else 0
            if existing_rank < _LEVEL_RANK.get(risk.value, 0):
                db.add(Alert(
                    user_id=current_user.id,
                    alert_type=f"Тест: {alert_type}",
                    level=risk,
                    message=(
                        f"Результат теста «{test.title}»: стресс={m_stress:.0f}, "
                        f"тревожность={m_anxiety:.0f}, мотивация={m_motivation:.0f}, эмоции={m_emotion:.0f}"
                    ),
                    metrics_snapshot={
                        "stress": m_stress, "burnout": m_burnout, "anxiety": m_anxiety,
                        "motivation": m_motivation, "emotion": m_emotion,
                    },
                ))

    db.commit()
    db.refresh(result)

    return {
        **{c.name: getattr(result, c.name) for c in result.__table__.columns},
        "test_slug": test.slug,
        "test_title": test.title,
    }


@router.get("/results/me", response_model=List[TestResultOut])
def my_results(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    results = (
        db.query(TestResult)
        .filter(TestResult.user_id == current_user.id)
        .order_by(TestResult.created_at.desc())
        .limit(20)
        .all()
    )
    out = []
    for r in results:
        test = db.query(Test).filter(Test.id == r.test_id).first()
        out.append({
            **{c.name: getattr(r, c.name) for c in r.__table__.columns},
            "test_slug": test.slug if test else "",
            "test_title": test.title if test else "",
        })
    return out


@router.get("/results/user/{user_id}", response_model=List[TestResultOut])
def user_results(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.psychologist, UserRole.director)),
):
    results = (
        db.query(TestResult)
        .filter(TestResult.user_id == user_id)
        .order_by(TestResult.created_at.desc())
        .limit(20)
        .all()
    )
    out = []
    for r in results:
        test = db.query(Test).filter(Test.id == r.test_id).first()
        out.append({
            **{c.name: getattr(r, c.name) for c in r.__table__.columns},
            "test_slug": test.slug if test else "",
            "test_title": test.title if test else "",
        })
    return out
