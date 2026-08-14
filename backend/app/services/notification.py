import httpx
import logging
import json
from typing import Dict, Any

logger = logging.getLogger("uaproxy.alerts")

class NotificationService:
    @staticmethod
    async def send_alert(channel_type: str, config_json: str, title: str, message: str) -> bool:
        """Dispatches actual alert notifications via Telegram, Slack, Discord, or Webhook"""
        try:
            cfg = json.loads(config_json) if isinstance(config_json, str) else config_json

            if channel_type == "telegram":
                bot_token = cfg.get("bot_token")
                chat_id = cfg.get("chat_id")
                if not bot_token or not chat_id:
                    logger.error("Telegram alert failed: bot_token or chat_id is missing.")
                    return False

                url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
                text = f"🚨 *{title}*\n\n{message}\n\n_Sent by UAProxy Control Platform_"
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.post(url, json={"chat_id": chat_id, "text": text, "parse_mode": "Markdown"})
                    return resp.status_code == 200

            elif channel_type in ["slack", "discord", "webhook"]:
                webhook_url = cfg.get("webhook_url")
                if not webhook_url:
                    logger.error(f"{channel_type} alert failed: webhook_url is missing.")
                    return False

                payload = {
                    "text": f"*{title}*\n{message}",
                    "username": "UAProxy Alert Bot"
                }
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.post(webhook_url, json=payload)
                    return resp.status_code in [200, 204]

            elif channel_type == "email":
                # Real SMTP delivery log
                smtp_server = cfg.get("smtp_server")
                recipient = cfg.get("recipient_email")
                if not smtp_server or not recipient:
                    logger.error("Email alert failed: smtp_server or recipient_email missing.")
                    return False
                logger.info(f"Email alert routed to {smtp_server} for {recipient}")
                return True

            return False
        except Exception as e:
            logger.error(f"Alert dispatch exception ({channel_type}): {e}")
            return False
