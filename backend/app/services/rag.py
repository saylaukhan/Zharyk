"""
Course RAG Service — Zharyq Platform

Semantic search over published courses using Ollama embeddings (nomic-embed-text).
Falls back to empty results gracefully if the embedding model is unavailable.

Usage:
    from .services.rag import rag_index
    results = await rag_index.search(db, "не могу справиться с тревогой", top_k=3)
    rag_index.invalidate()   # call when courses are published/updated
"""
import asyncio
import math
import logging
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

EMBED_MODEL = "nomic-embed-text"
OLLAMA_BASE = "http://localhost:11434"


def _cosine_sim(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    mag_a = math.sqrt(sum(x * x for x in a))
    mag_b = math.sqrt(sum(y * y for y in b))
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)


async def _get_embedding(text: str) -> Optional[list[float]]:
    """Fetch a single embedding from Ollama. Returns None on any failure."""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{OLLAMA_BASE}/api/embeddings",
                json={"model": EMBED_MODEL, "prompt": text},
            )
            resp.raise_for_status()
            return resp.json().get("embedding")
    except Exception as e:
        logger.warning(f"RAG: embedding unavailable — {e}")
        return None


class CourseRAGIndex:
    """
    In-memory semantic index for all published courses.

    Lifecycle:
    - Built lazily on the first search call.
    - Invalidated (and rebuilt on next search) whenever a course is published or updated.
    - Thread-safe: index rebuild is guarded by an asyncio Lock.
    """

    def __init__(self):
        # course_id → {id, title, description, category, embedding}
        self._entries: dict[int, dict] = {}
        self._built = False
        self._lock = asyncio.Lock()

    def invalidate(self) -> None:
        """Mark the index stale so it rebuilds on the next search."""
        self._built = False
        logger.info("RAG: index invalidated — will rebuild on next search")

    async def _build(self, db) -> None:
        from ..models import Course, CourseStatus

        courses = (
            db.query(Course)
            .filter(Course.status == CourseStatus.published)
            .all()
        )

        new_entries: dict[int, dict] = {}
        for course in courses:
            # Combine title + description for richer semantic signal
            text = f"{course.title}. {course.description or ''}".strip(". ")
            emb = await _get_embedding(text)
            if emb:
                new_entries[course.id] = {
                    "id": course.id,
                    "title": course.title,
                    "description": course.description or "",
                    "category": course.category or "",
                    "embedding": emb,
                }

        self._entries = new_entries
        self._built = True
        logger.info(
            f"RAG: index built — {len(new_entries)}/{len(courses)} courses embedded"
        )

    async def _ensure_built(self, db) -> None:
        async with self._lock:
            if not self._built:
                await self._build(db)

    async def search(self, db, query: str, top_k: int = 3) -> list[dict]:
        """
        Return top-k published courses most semantically relevant to `query`.
        Returns [] if the embedding model is unavailable or no courses are indexed.
        """
        await self._ensure_built(db)

        if not self._entries:
            return []

        query_emb = await _get_embedding(query)
        if query_emb is None:
            return []

        scored = sorted(
            self._entries.values(),
            key=lambda e: _cosine_sim(query_emb, e["embedding"]),
            reverse=True,
        )

        return [
            {
                "id": e["id"],
                "title": e["title"],
                "category": e["category"],
                "description": e["description"],
            }
            for e in scored[:top_k]
        ]


# Global singleton shared across the app
rag_index = CourseRAGIndex()
