"""
WebSocket connection manager for real-time psychologist alert notifications.
"""
import json
import logging
from collections import defaultdict

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        # psychologist_id → list of active WebSocket connections
        self.active: dict[int, list[WebSocket]] = defaultdict(list)

    async def connect(self, psychologist_id: int, websocket: WebSocket):
        await websocket.accept()
        self.active[psychologist_id].append(websocket)
        logger.info(f"[WS] Psychologist {psychologist_id} connected. Total connections: {len(self.active[psychologist_id])}")

    def disconnect(self, psychologist_id: int, websocket: WebSocket):
        conns = self.active.get(psychologist_id, [])
        if websocket in conns:
            conns.remove(websocket)
        logger.info(f"[WS] Psychologist {psychologist_id} disconnected. Remaining: {len(conns)}")

    async def broadcast_to_psychologist(self, psychologist_id: int, data: dict):
        """Send a JSON payload to all active connections of a specific psychologist."""
        conns = list(self.active.get(psychologist_id, []))
        dead = []
        for ws in conns:
            try:
                await ws.send_text(json.dumps(data, ensure_ascii=False, default=str))
            except Exception as e:
                logger.warning(f"[WS] Failed to send to psychologist {psychologist_id}: {e}")
                dead.append(ws)
        for ws in dead:
            self.disconnect(psychologist_id, ws)

    async def broadcast_to_all(self, data: dict):
        """Send a JSON payload to all connected psychologists."""
        for psychologist_id in list(self.active.keys()):
            await self.broadcast_to_psychologist(psychologist_id, data)


# Global singleton used across the application
manager = ConnectionManager()
