"""
Recommendation Service — Zharyq Platform
Returns top-N courses based on the user's current psychological metrics.
Uses the existing Course.category field which maps directly to metric names.
"""
from ..models import Course, CourseStatus

METRIC_TO_CATEGORY = {
    "stress":     "Стресс",
    "burnout":    "Выгорание",
    "anxiety":    "Тревожность",
    "motivation": "Мотивация",
    "emotion":    "Эмоции",
}

# For negative metrics (high = bad), need_score = value.
# For positive metrics (low = bad), need_score = 100 - value.
POSITIVE_METRICS = {"motivation", "emotion"}


def get_recommendations(db, metrics: dict, limit: int = 3) -> list[dict]:
    """
    Score each metric by urgency, then return up to `limit` published courses
    whose category best matches the most urgent metrics.

    Args:
        db: SQLAlchemy session
        metrics: dict with keys stress, burnout, anxiety, motivation, emotion (0-100)
        limit: max number of courses to return

    Returns:
        list of {id, title, category}
    """
    # 1. Compute need score for each metric
    need_scores = {}
    for metric, category in METRIC_TO_CATEGORY.items():
        value = metrics.get(metric, 50)
        need_scores[metric] = (100 - value) if metric in POSITIVE_METRICS else value

    # 2. Sort metrics by need score descending → priority category order
    priority_metrics = sorted(need_scores, key=need_scores.__getitem__, reverse=True)
    priority_categories = [METRIC_TO_CATEGORY[m] for m in priority_metrics]

    courses = db.query(Course).filter(Course.status == CourseStatus.published).all()
    seen_ids: set[int] = set()
    recs: list[dict] = []

    # 3. Fill recommendations in priority order
    for category in priority_categories:
        for course in courses:
            if course.id in seen_ids:
                continue
            if course.category == category:
                recs.append({"id": course.id, "title": course.title, "category": course.category})
                seen_ids.add(course.id)
            if len(recs) >= limit:
                break
        if len(recs) >= limit:
            break

    # 4. If still not enough, fill with any remaining published courses
    if len(recs) < limit:
        for course in courses:
            if course.id not in seen_ids:
                recs.append({"id": course.id, "title": course.title, "category": course.category})
                seen_ids.add(course.id)
            if len(recs) >= limit:
                break

    return recs
