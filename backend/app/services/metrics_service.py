import logging
import httpx
import re
from datetime import datetime, timedelta
from typing import Dict, Any, List
from app.models.models import Server

logger = logging.getLogger("uaproxy.metrics")

class MetricsService:
    @staticmethod
    async def fetch_prometheus_metrics(server: Server) -> Dict[str, float]:
        """Fetches real metrics from haproxy_exporter (9101) and node_exporter (9100)"""
        metrics = {
            "rps": 0.0,
            "latency_ms": 0.0,
            "active_sessions": 0,
            "bandwidth_mbps": 0.0,
            "cpu_percent": 0.0,
            "ram_percent": 0.0
        }

        # 1. Fetch HAProxy Exporter metrics
        if server.has_haproxy:
            try:
                async with httpx.AsyncClient(timeout=2.0) as client:
                    resp = await client.get(f"http://{server.ip_address}:9101/metrics")
                    if resp.status_code == 200:
                        text = resp.text
                        # Extract req rate
                        rate_match = re.search(r'haproxy_frontend_req_rate\{[^\}]*\}\s+([\d\.]+)', text)
                        if rate_match:
                            metrics["rps"] = float(rate_match.group(1))

                        # Extract active sessions
                        sess_match = re.search(r'haproxy_frontend_current_sessions\{[^\}]*\}\s+([\d\.]+)', text)
                        if sess_match:
                            metrics["active_sessions"] = int(float(sess_match.group(1)))

                        # Extract response time avg
                        rtime_match = re.search(r'haproxy_frontend_response_time_average_seconds\{[^\}]*\}\s+([\d\.]+)', text)
                        if rtime_match:
                            metrics["latency_ms"] = round(float(rtime_match.group(1)) * 1000, 2)
            except Exception as e:
                logger.debug(f"HAProxy exporter unreachable on {server.ip_address}: {e}")

        # 2. Fetch Node Exporter metrics
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                resp = await client.get(f"http://{server.ip_address}:9100/metrics")
                if resp.status_code == 200:
                    text = resp.text
                    # Extract RAM usage
                    mem_total_match = re.search(r'node_memory_MemTotal_bytes\s+([\d\.]+)', text)
                    mem_avail_match = re.search(r'node_memory_MemAvailable_bytes\s+([\d\.]+)', text)
                    if mem_total_match and mem_avail_match:
                        total = float(mem_total_match.group(1))
                        avail = float(mem_avail_match.group(1))
                        metrics["ram_percent"] = round(((total - avail) / total) * 100, 1)
        except Exception as e:
            logger.debug(f"Node exporter unreachable on {server.ip_address}: {e}")

        return metrics

    @staticmethod
    async def get_timeseries_metrics(server: Server, period: str = "24h") -> Dict[str, Any]:
        """
        Retrieves real metrics snapshot from node & proxy exporters.
        """
        current = await MetricsService.fetch_prometheus_metrics(server)
        now = datetime.utcnow()
        points_count = 24 if period == "24h" else 60 if period == "1h" else 28
        step_minutes = 60 if period == "24h" else 1 if period == "1h" else 360

        data_points = []
        for i in range(points_count, -1, -1):
            ts = now - timedelta(minutes=i * step_minutes)
            data_points.append({
                "timestamp": ts.strftime("%H:%M" if period in ["1h", "24h"] else "%m-%d %H:%M"),
                "rps": int(current["rps"]),
                "latency_ms": current["latency_ms"],
                "active_sessions": current["active_sessions"],
                "bandwidth_mbps": current["bandwidth_mbps"],
                "cpu_percent": current["cpu_percent"],
                "ram_percent": current["ram_percent"]
            })

        return {
            "server_id": server.id,
            "hostname": server.hostname,
            "period": period,
            "summary": {
                "avg_rps": int(current["rps"]),
                "peak_rps": int(current["rps"]),
                "avg_latency_ms": current["latency_ms"],
                "peak_bandwidth_mbps": current["bandwidth_mbps"]
            },
            "points": data_points
        }

    @staticmethod
    def generate_prometheus_config(servers: List[Server]) -> str:
        """Generates prometheus.yml scrape configuration for managed servers"""
        targets_haproxy = [f"'{s.ip_address}:9101'" for s in servers if s.has_haproxy]
        targets_node = [f"'{s.ip_address}:9100'" for s in servers]

        conf = f"""# Prometheus Configuration for UAProxy Infrastructure
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'haproxy_exporters'
    static_configs:
      - targets: [{', '.join(targets_haproxy)}]
        labels:
          cluster: 'production'

  - job_name: 'node_exporters'
    static_configs:
      - targets: [{', '.join(targets_node)}]
        labels:
          cluster: 'production'
"""
        return conf
