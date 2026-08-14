import json
import httpx
import logging
from typing import Dict, Any

logger = logging.getLogger("uaproxy.notification")

class NotificationService:
    @staticmethod
    async def send_alert(channel_type: str, config_json: str, title: str, message: str) -> bool:
        """Dispatches alerts to Telegram bot or Webhook (Slack/Mattermost)"""
        try:
            cfg = json.loads(config_json)
            if channel_type == "telegram":
                token = cfg.get("token")
                chat_id = cfg.get("chat_id")
                if not token or not chat_id:
                    return False
                url = f"https://api.telegram.org/bot{token}/sendMessage"
                text = f"🚨 *{title}*\n\n{message}"
                async with httpx.AsyncClient() as client:
                    resp = await client.post(url, json={"chat_id": chat_id, "text": text, "parse_mode": "Markdown"})
                    return resp.status_code == 200

            elif channel_type in ["slack", "mattermost", "webhook"]:
                webhook_url = cfg.get("webhook_url")
                if not webhook_url:
                    return False
                async with httpx.AsyncClient() as client:
                    resp = await client.post(webhook_url, json={"text": f"*{title}*\n{message}"})
                    return resp.status_code == 200

            return True
        except Exception as e:
            logger.error(f"Failed to send alert via {channel_type}: {e}")
            return False
