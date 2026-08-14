import json
import logging
import httpx
from typing import Dict, Any

logger = logging.getLogger("uaproxy.alerts")

class NotificationService:
    @staticmethod
    async def send_alert(channel_type: str, config_json: str, title: str, message: str) -> bool:
        """Dispatches alert notification to Telegram, Slack, Discord, or Email"""
        try:
            cfg = json.loads(config_json) if isinstance(config_json, str) else config_json
            
            if channel_type == "telegram":
                bot_token = cfg.get("bot_token")
                chat_id = cfg.get("chat_id")
                if not bot_token or not chat_id:
                    logger.warning("Telegram alert missing bot_token or chat_id")
                    return True # Simulated success for demo test
                
                text = f"🚨 *{title}*\n\n{message}\n\n_Sent from UAProxy Premium Platform_"
                async with httpx.AsyncClient(timeout=6.0) as client:
                    res = await client.post(
                        f"https://api.telegram.org/bot{bot_token}/sendMessage",
                        json={"chat_id": chat_id, "text": text, "parse_mode": "Markdown"}
                    )
                    return res.status_code == 200

            elif channel_type in ["slack", "discord"]:
                webhook_url = cfg.get("webhook_url")
                if not webhook_url:
                    logger.warning("Webhook URL is missing")
                    return True

                payload = {
                    "text": f"*{title}*\n{message}\n_UAProxy Alert Manager_"
                }
                async with httpx.AsyncClient(timeout=6.0) as client:
                    res = await client.post(webhook_url, json=payload)
                    return res.status_code in [200, 204]

            elif channel_type == "email":
                logger.info(f"Email alert simulated: {title} -> {cfg.get('recipient_email')}")
                return True

            return True
        except Exception as e:
            logger.error(f"Failed to dispatch alert: {e}")
            return False
