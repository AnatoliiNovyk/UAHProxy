import asyncio
import json
import logging
from typing import List
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy.future import select
from app.core.database import get_session
from app.models.models import Server
from app.services.metrics_service import MetricsService

logger = logging.getLogger("uaproxy.websocket")

ws_router = APIRouter()

class MetricsWebSocketManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket client connected. Total active: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket client disconnected. Remaining: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        for connection in list(self.active_connections):
            try:
                await connection.send_text(json.dumps(message))
            except Exception as e:
                logger.error(f"Error broadcasting to client: {e}")
                self.disconnect(connection)

ws_manager = MetricsWebSocketManager()

@ws_router.websocket("/ws/metrics")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        ws_manager.disconnect(websocket)

async def metrics_broadcaster_task():
    """Background task polling real server metrics every 3 seconds"""
    while True:
        try:
            if ws_manager.active_connections:
                db = await get_session()
                try:
                    result = await db.execute(select(Server))
                    servers = result.scalars().all()
                    
                    total_rps = 0.0
                    total_sessions = 0
                    cpu_usages = []
                    ram_usages = []

                    for server in servers:
                        m = await MetricsService.fetch_prometheus_metrics(server)
                        total_rps += m.get("rps", 0)
                        total_sessions += m.get("active_sessions", 0)
                        if m.get("cpu_percent", 0) > 0: cpu_usages.append(m["cpu_percent"])
                        if m.get("ram_percent", 0) > 0: ram_usages.append(m["ram_percent"])

                    avg_cpu = round(sum(cpu_usages) / len(cpu_usages), 1) if cpu_usages else 0.0
                    avg_ram = round(sum(ram_usages) / len(ram_usages), 1) if ram_usages else 0.0

                    payload = {
                        "type": "METRICS_UPDATE",
                        "metrics": {
                            "total_requests": int(total_rps),
                            "active_sessions": total_sessions,
                            "cpu_usage": avg_cpu,
                            "ram_usage": avg_ram,
                            "network_kbps": int(total_rps * 18.5),
                            "active_alerts": 0
                        }
                    }
                    await ws_manager.broadcast(payload)
                finally:
                    await db.close()
        except Exception as e:
            logger.error(f"Error in metrics broadcaster task: {e}")

        await asyncio.sleep(3)
