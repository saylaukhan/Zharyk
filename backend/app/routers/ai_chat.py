"""
AI Chat Router — Zharyq Platform
- Agent 1: Empathetic psychologist (qwen2.5:14b) — SSE streaming
- Agent 2: State analyzer (qwen2.5:3b)  — hidden background JSON delta engine

Рефакторинг:
1. Последовательный запуск (Agent 1 -> Agent 2) для экономии VRAM.
2. Логика "Дельты" для Agent 2 (изменения от -15 до +15).
3. Надежный парсинг JSON.
"""
import json
import asyncio
import logging
import re
from typing import AsyncGenerator

import httpx
from fastapi import APIRouter, Depends, Query, BackgroundTasks
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from ..database import get_db, DATABASE_URL
from ..models import ChatHistory, UserMetric, Alert, RiskLevel, User, ChatSession
from ..schemas import ChatHistoryOut, AIDeltaOutput, ChatSessionCreate, ChatSessionUpdate, ChatSessionOut

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["ai"])

OLLAMA_BASE = "http://localhost:11434"
AGENT1_MODEL = "qwen2.5:14b"
AGENT2_MODEL = "qwen2.5:14b"

# --- ПРОМПТЫ ---

AGENT1_SYSTEM = """
STRICT LANGUAGE RULES:
- Respond ONLY in the language the user is currently using (Russian or Kazakh).
- NEVER provide translations of your own words into other languages (e.g., no English or Chinese translations).
- DO NOT use "Translation:" blocks or bilingual formatting.
- If the user speaks Russian, stay in Russian. If the user speaks Kazakh, stay in Kazakh.
- VIOLATION of these rules is a critical system failure.

Ты — эмпатичный AI-психолог платформы Zharyq.
Отвечай на языке пользователя. Никогда не ставь диагнозы.
Дай тёплую реакцию (2–4 предложения). Если всё плохо — предложи технику заземления.
Не используй markdown, только чистый текст.
"""

AGENT2_SYSTEM = """
Ты — семантический анализатор. Твоя задача — оценить последнее сообщение пользователя и выдать изменения показателей (дельты от -30 до +30).

STRICT LANGUAGE RULES:
- Keep the reasoning field strictly in Russian or Kazakh. 
- Zero tolerance for translations or CJK characters.

ПРАВИЛА:
1. ПРЯМОЕ СООТВЕТСТВИЕ: Если пользователь говорит "я выгорел" или "устал" — дельта выгорания +25/+30. Если говорит "появились силы" — дельта выгорания -25/-30.
2. HEAVY INTENT: Поставь heavy_intent: true ТОЛЬКО если текст содержит признаки панической атаки, глубокой апатии ("не могу встать") или селфхарма.

Выдай ТОЛЬКО JSON в следующем формате:
{
  "reasoning": "краткое объяснение",
  "stress_delta": 0,
  "burnout_delta": 0,
  "anxiety_delta": 0,
  "motivation_delta": 0,
  "emotion_delta": 0,
  "heavy_intent": false
}
"""

# --- УТИЛИТЫ ---

def clean_hallucinations(text: str) -> str:
    """
    Удаляет галлюцинации модели: блоки переводов и иероглифы.
    """
    if not text:
        return ""
    
    # 1. Удаляем блоки типа "Translation: ...", "Translate: ...", "Google Translate"
    # Ищем строки, начинающиеся с этих слов (регистронезависимо) и до конца строки или текста
    lines = text.split('\n')
    filtered_lines = []
    for line in lines:
        lower_line = line.lower().strip()
        if any(marker in lower_line for marker in [
            "translation:", "translate:", "google translate", "перевод:", "中文"
        ]):
            continue
        filtered_lines.append(line)
    
    cleaned = "\n".join(filtered_lines)

    # 2. Проверка на иероглифы (CJK Unified Ideographs)
    # Диапазон \u4e00-\u9fff охватывает основные китайские иероглифы
    if re.search(r'[\u4e00-\u9fff]', cleaned):
        # Если в тексте появились иероглифы, мы либо очищаем их, либо возвращаем ошибку
        # В данном случае попробуем просто удалить иероглифы, если их немного
        cleaned = re.sub(r'[\u4e00-\u9fff]+', '', cleaned)
    
    return cleaned.strip()

def _clamp(value: float, lo: float = 0, hi: float = 100) -> float:
    """Ограничивает значение в диапазоне [0, 100]."""
    return max(lo, min(hi, float(value)))

def _robust_json_parse(text: str):
    """Очищает ответ модели от маркдауна и лишнего текста для надежного парсинга."""
    # Убираем блоки кода markdown
    text = re.sub(r'```(?:json)?\s*(.*?)\s*```', r'\1', text, flags=re.DOTALL)
    # Ищем что-то похожее на JSON объект
    match = re.search(r'\{.*\}', text, flags=re.DOTALL)
    if match:
        json_str = match.group()
        # JSON не поддерживает плюсы перед числами (например, +20). Удаляем их.
        json_str = re.sub(r':\s*\+([0-9]+)', r': \1', json_str)
        try:
            return json.loads(json_str)
        except json.JSONDecodeError as e:
            logger.warning(f"Failed to parse JSON after cleanup. Error: {e}. String: {json_str}")
            return None
            
    logger.warning(f"Regex for JSON found no match in text:\\n{text}")
    return None

async def _call_ollama_stream(model: str, messages: list) -> AsyncGenerator[str, None]:
    """Асинхронный стриминг токенов из Ollama."""
    payload = {
        "model": model,
        "messages": messages,
        "stream": True,
        "options": {
            "temperature": 0.4, 
            "top_p": 0.9,
            "num_predict": 512,
            "stop": ["Translation:", "Перевод:", "中文"]
        },
    }
    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            async with client.stream("POST", f"{OLLAMA_BASE}/api/chat", json=payload) as resp:
                resp.raise_for_status()
                async for line in resp.aiter_lines():
                    if not line.strip(): continue
                    chunk = json.loads(line)
                    token = chunk.get("message", {}).get("content", "")
                    if token: yield token
                    if chunk.get("done"): break
        except Exception as e:
            logger.error(f"Ollama stream error: {e}")
            yield f"Error: {str(e)}"

async def _call_ollama_sync(model: str, messages: list) -> str:
    """Синхронный (блокирующий ожидание) вызов Ollama."""
    payload = {
        "model": model,
        "messages": messages,
        "stream": False,
        "options": {
            "temperature": 0.2, # Agent 2 needs even lower temperature for JSON
            "top_p": 0.9,
            "num_predict": 512,
        },
    }
    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(f"{OLLAMA_BASE}/api/chat", json=payload)
        resp.raise_for_status()
        return resp.json().get("message", {}).get("content", "")

# --- ЛОГИКА АГЕНТОВ ---

async def _analyze_and_update(user_id: int, user_message: str):
    """
    Agent 2: Анализ дельты состояния и обновление БД.
    Запускается последовательно ПОСЛЕ стриминга Agent 1.
    """
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    
    # Создаем временную сессию для фонового процесса
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    try:
        # 1. Получаем текущее состояние
        latest = db.query(UserMetric).filter(UserMetric.user_id == user_id).order_by(UserMetric.recorded_at.desc()).first()
        current = {
            "stress": latest.stress if latest else 50,
            "burnout": latest.burnout if latest else 50,
            "anxiety": latest.anxiety if latest else 50,
            "motivation": latest.motivation if latest else 50,
            "emotion": latest.emotion if latest else 50,
        }

        # 2. Формируем упрощенный запрос для Agent 2
        dynamic_system_prompt = AGENT2_SYSTEM

        messages = [
            {"role": "system", "content": dynamic_system_prompt},
            {"role": "user", "content": f"Оцени сообщение: '{user_message}'"},
        ]

        # Вызов Agent 2
        raw_response = await _call_ollama_sync(AGENT2_MODEL, messages)
        print(f"--- AGENT 2 RAW RESPONSE ---\\n{raw_response}\\n--------------------------", flush=True)

        data = _robust_json_parse(raw_response)
        
        if not data:
            print(f"--- AGENT 2 FAILED TO PARSE JSON ---", flush=True)
            logger.warning(f"Agent 2 returned invalid JSON. Raw response: {raw_response}")
            return None

        print(f"--- AGENT 2 PARSED DATA ---\\n{data}\\n--------------------------", flush=True)

        # 3. БИЗНЕС-ЛОГИКА НА БЭКЕНДЕ (Decoupled from LLM)
        # 3.1 Расчет новых абсолютных значений
        new_values = {
            "stress": _clamp(current["stress"] + data.get("stress_delta", 0)),
            "burnout": _clamp(current["burnout"] + data.get("burnout_delta", 0)),
            "anxiety": _clamp(current["anxiety"] + data.get("anxiety_delta", 0)),
            "motivation": _clamp(current["motivation"] + data.get("motivation_delta", 0)),
            "emotion": _clamp(current["emotion"] + data.get("emotion_delta", 0)),
        }

        # 3.2 Проверка порогов для Critical Type
        heavy_intent = data.get("heavy_intent", False)
        critical_type = "none"

        if heavy_intent:
            # Проверяем шкалы, порог 70+. Если несколько, берем ту, что выше.
            potentials = {
                "anxiety": new_values["anxiety"],
                "burnout": new_values["burnout"],
                "stress": new_values["stress"]
            }
            active = {k: v for k, v in potentials.items() if v >= 70}
            if active:
                critical_type = max(active, key=active.get)

        # Сохранение в БД
        new_metric = UserMetric(user_id=user_id, **new_values)
        db.add(new_metric)

        if critical_type != "none":
            alert = Alert(
                user_id=user_id,
                alert_type=f"AI Critical State ({critical_type})",
                level=RiskLevel.critical,
                message=clean_hallucinations(data.get("reasoning", "Обнаружено тяжелое психологическое состояние"))
            )
            db.add(alert)

        db.commit()
        db.refresh(new_metric)

        # Возвращаем АБСОЛЮТНЫЕ значения для фронтенда
        return {**new_values, "critical_type": critical_type}

    except Exception as e:
        logger.error(f"Background analysis failed: {e}")
        return None
    finally:
        db.close()

# --- ЭНДПОИНТЫ ---

@router.get("/chat/stream")
async def chat_stream(
    user_id: int = Query(...),
    session_id: int = Query(...),
    message: str = Query(...),
    db: Session = Depends(get_db),
):
    """
    SSE Стриминг:
    1. Agent 1 генерирует и стримит ответ (VRAM занята моделью 14B).
    2. После завершения стрима вызывается Agent 2 (VRAM переключается на 3B).
    """
    # Обновляем время сессии
    from sqlalchemy.sql import func
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if session:
        session.updated_at = func.now()

    # Сохраняем сообщение пользователя
    db.add(ChatHistory(user_id=user_id, session_id=session_id, role="user", content=message))
    db.commit()

    # Берем историю для контекста
    history = db.query(ChatHistory).filter(ChatHistory.session_id == session_id)\
                .order_by(ChatHistory.created_at.desc()).limit(10).all()
    context = [{"role": "system", "content": AGENT1_SYSTEM}]
    for h in reversed(history):
        context.append({"role": h.role, "content": h.content})

    async def event_generator():
        full_reply = []
        
        # ШАГ 1: Работа Agent 1 (Streaming)
        try:
            async for token in _call_ollama_stream(AGENT1_MODEL, context):
                # Простейшая фильтрация иероглифов на лету
                if re.search(r'[\u4e00-\u9fff]', token):
                    continue
                
                full_reply.append(token)
                yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"
            yield "data: [DONE]\n\n"
            return

        # Сохраняем и чистим финальный ответ
        assistant_text = clean_hallucinations("".join(full_reply))
        
        # Если после чистки текст пустой или подозрительно короткий (галлюцинация)
        if not assistant_text or len(assistant_text) < 5:
            assistant_text = "Извините, произошла техническая ошибка генерации. Пожалуйста, повторите вопрос."
            yield f"data: {json.dumps({'type': 'error', 'content': assistant_text})}\n\n"

        from ..database import SessionLocal as SL
        with SL() as save_db:
            save_db.add(ChatHistory(user_id=user_id, session_id=session_id, role="assistant", content=assistant_text))
            
            save_session = save_db.query(ChatSession).filter(ChatSession.id == session_id).first()
            if save_session:
                from sqlalchemy.sql import func
                save_session.updated_at = func.now()
                if save_session.title == "Новый чат":
                    save_session.title = message[:40] + ("..." if len(message) > 40 else "")

            save_db.commit()

        # ШАГ 2: Работа Agent 2 (Strictly Sequential)
        # Это запускается ТОЛЬКО когда цикл стриминга выше завершен
        updated_metrics = await _analyze_and_update(user_id, message)
        
        if updated_metrics:
            # Отправляем обновленные абсолютные значения для графика
            yield f"data: {json.dumps({'type': 'profile_updated', 'metrics': updated_metrics})}\n\n"

        yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"}
    )

@router.get("/chat/history/{session_id}", response_model=list[ChatHistoryOut])
def get_chat_history(session_id: int, db: Session = Depends(get_db)):
    rows = db.query(ChatHistory).filter(ChatHistory.session_id == session_id)\
            .order_by(ChatHistory.created_at.desc()).limit(40).all()
    return list(reversed(rows))

@router.post("/chat/sessions", response_model=ChatSessionOut)
def create_chat_session(user_id: int = Query(...), db: Session = Depends(get_db)):
    session = ChatSession(user_id=user_id, title="Новый чат")
    db.add(session)
    db.commit()
    db.refresh(session)
    return session

@router.get("/chat/sessions/{user_id}", response_model=list[ChatSessionOut])
def get_chat_sessions(user_id: int, db: Session = Depends(get_db)):
    return db.query(ChatSession).filter(ChatSession.user_id == user_id).order_by(ChatSession.updated_at.desc()).all()

@router.put("/chat/sessions/{session_id}", response_model=ChatSessionOut)
def update_chat_session(session_id: int, payload: ChatSessionUpdate, db: Session = Depends(get_db)):
    from fastapi import HTTPException
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    session.title = payload.title
    db.commit()
    db.refresh(session)
    return session

@router.delete("/chat/sessions/{session_id}")
def delete_chat_session(session_id: int, db: Session = Depends(get_db)):
    from fastapi import HTTPException
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    db.delete(session)
    db.commit()
    return {"message": "deleted"}
