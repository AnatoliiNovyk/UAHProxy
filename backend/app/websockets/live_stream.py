import asyncio
import json
import random
from typing import List
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

ws_router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception:
                pass

manager = ConnectionManager()

@ws_router.websocket("/ws/metrics")
async def websocket_metrics(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Emit live metric heartbeats to connected UI clients
            payload = {
                "type": "METRICS_UPDATE",
                "timestamp": asyncio.get_event_loop().time(),
                "metrics": {
                    "total_requests": random.randint(12000, 15000),
                    "active_sessions": random.randint(240, 480),
                    "cpu_usage": round(random.uniform(12.5, 35.8), 1),
                    "ram_usage": round(random.uniform(42.1, 58.4), 1),
                    "network_kbps": random.randint(850, 2400),
                    "active_alerts": 0
                }
            }
            await websocket.send_text(json.dumps(payload))
            await asyncio.sleep(2)
    except WebSocketDisconnect:
        manager.disconnect(websocket)
