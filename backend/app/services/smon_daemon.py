import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.core.database import get_session
from app.models.models import SmonTarget, SmonResult, AlertChannel
from app.services.smon_checker import SmonCheckerService
from app.services.notification import NotificationService
from app.websockets.live_stream import ws_manager

logger = logging.getLogger("uaproxy.smon.daemon")

class SmonDaemon:
    _instance: Optional["SmonDaemon"] = None
    
    def __init__(self):
        self.is_running = False
        self._task: Optional[asyncio.Task] = None
        # In-memory target state tracking: target_id -> {"status": "UP", "last_checked": datetime, "last_alert_sent": datetime}
        self.target_states: Dict[int, Dict[str, Any]] = {}

    @classmethod
    def get_instance(cls) -> "SmonDaemon":
        if cls._instance is None:
            cls._instance = SmonDaemon()
        return cls._instance

    def start(self):
        if not self.is_running:
            self.is_running = True
            self._task = asyncio.create_task(self._run_loop())
            logger.info("SMON Background Prober Daemon started.")

    def stop(self):
        self.is_running = False
        if self._task and not self._task.done():
            self._task.cancel()
            logger.info("SMON Background Prober Daemon stopped.")

    async def _run_loop(self):
        while self.is_running:
            try:
                await self._probe_all_targets()
            except Exception as e:
                logger.error(f"Error in SMON daemon probe cycle: {e}")

            await asyncio.sleep(5) # Evaluates probe queue every 5 seconds

    async def _probe_all_targets(self):
        now = datetime.now(timezone.utc)
        db = await get_session()
        try:
            result = await db.execute(select(SmonTarget).where(SmonTarget.is_active == True))
            targets = result.scalars().all()
            if not targets:
                return

            tasks = []
            for target in targets:
                state = self.target_states.get(target.id, {})
                last_checked = state.get("last_checked")

                # Check if it is time to probe this target based on check_interval
                interval = timedelta(seconds=target.check_interval or 30)
                if last_checked is None or (now - last_checked) >= interval:
                    tasks.append(self._probe_single_target(target, db))

            if tasks:
                await asyncio.gather(*tasks, return_exceptions=True)
        finally:
            await db.close()

    async def _probe_single_target(self, target: SmonTarget, db):
        try:
            # 1. Execute probe
            res = await SmonCheckerService.check_target(target)
            now = datetime.now(timezone.utc)

            # 2. Persist probe result in PostgreSQL
            smon_result = SmonResult(
                target_id=target.id,
                status=res["status"],
                response_time_ms=res["response_time_ms"],
                error_message=res["details"] if res["status"] != "UP" else None,
                checked_at=datetime.utcnow()
            )
            db.add(smon_result)
            await db.commit()

            # 3. Handle state transitions & alerting
            prev_state = self.target_states.get(target.id, {})
            prev_status = prev_state.get("status", "UP")
            last_alert_sent = prev_state.get("last_alert_sent")

            status = res["status"]
            should_alert = False
            alert_type = None

            if status == "DOWN" and prev_status != "DOWN":
                # Incident triggered (UP -> DOWN)
                should_alert = True
                alert_type = "INCIDENT_TRIGGERED"
            elif status == "UP" and prev_status == "DOWN":
                # Incident recovered (DOWN -> UP)
                should_alert = True
                alert_type = "INCIDENT_RECOVERED"
            elif status == "DOWN" and prev_status == "DOWN":
                # Ongoing failure: alert only if cooldown (15 minutes) passed
                if last_alert_sent and (now - last_alert_sent) >= timedelta(minutes=15):
                    should_alert = True
                    alert_type = "INCIDENT_REMINDER"

            if should_alert and alert_type:
                await self._dispatch_incident_alert(target, res, alert_type, db)
                self.target_states[target.id] = {
                    "status": status,
                    "last_checked": now,
                    "last_alert_sent": now
                }
            else:
                self.target_states[target.id] = {
                    "status": status,
                    "last_checked": now,
                    "last_alert_sent": last_alert_sent
                }

            # 4. Broadcast live WebSocket update
            await ws_manager.broadcast({
                "type": "SMON_TARGET_UPDATE",
                "target": {
                    "id": target.id,
                    "name": target.name,
                    "target_type": target.target_type,
                    "host_or_url": target.host_or_url,
                    "latest_status": status,
                    "latest_response_time": res["response_time_ms"],
                    "details": res["details"],
                    "updated_at": now.isoformat()
                }
            })

        except Exception as e:
            logger.error(f"Failed to probe SMON target {target.id} ({target.name}): {e}")

    async def _dispatch_incident_alert(self, target: SmonTarget, probe_res: Dict[str, Any], alert_type: str, db):
        try:
            ch_res = await db.execute(select(AlertChannel).where(AlertChannel.is_enabled == True))
            channels = ch_res.scalars().all()
            if not channels:
                return

            if alert_type == "INCIDENT_TRIGGERED":
                title = f"🚨 CRITICAL: Service DOWN - {target.name}"
                msg = (
                    f"**Target:** {target.name} ({target.target_type.upper()})\n"
                    f"**Endpoint:** `{target.host_or_url}`\n"
                    f"**Details:** {probe_res.get('details', 'No response')}\n"
                    f"**Time:** {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}"
                )
            elif alert_type == "INCIDENT_RECOVERED":
                title = f"✅ RECOVERED: Service Restored - {target.name}"
                msg = (
                    f"**Target:** {target.name} is now UP and healthy.\n"
                    f"**Response Time:** {probe_res.get('response_time_ms', 0)} ms\n"
                    f"**Time:** {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}"
                )
            else:
                title = f"⚠️ ONGOING OUTAGE: {target.name} Still DOWN"
                msg = (
                    f"**Target:** {target.name} remains unreachable.\n"
                    f"**Details:** {probe_res.get('details')}\n"
                    f"**Time:** {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}"
                )

            for ch in channels:
                try:
                    await NotificationService.send_alert(ch.channel_type, ch.config_json, title, msg)
                    logger.info(f"Dispatched {alert_type} to alert channel {ch.name} ({ch.channel_type})")
                except Exception as ex:
                    logger.error(f"Failed to send alert via {ch.name}: {ex}")
        except Exception as e:
            logger.error(f"Error fetching alert channels for dispatch: {e}")
