import random
import time
from datetime import datetime, timedelta
from typing import Dict, Any, List
from app.models.models import Server

class MetricsService:
    @staticmethod
    def get_timeseries_metrics(server: Server, period: str = "24h") -> Dict[str, Any]:
        """
        Generates structured time-series metrics for HAProxy & Node Exporter:
        - Requests Per Second (RPS)
        - Latency (ms)
        - Active Concurrent Sessions
        - Bandwidth In / Out (Mbit/s)
        - CPU & RAM Utilization (%)
        """
        now = datetime.utcnow()
        points_count = 24 if period == "24h" else 60 if period == "1h" else 28 # 7d
        step_minutes = 60 if period == "24h" else 1 if period == "1h" else 360

        data_points = []
        base_rps = 1250 if server.has_haproxy else 450
        base_latency = 18.5

        for i in range(points_count, -1, -1):
            ts = now - timedelta(minutes=i * step_minutes)
            # Add realistic wave variance
            variance = random.uniform(0.85, 1.25)
            rps = int(base_rps * variance)
            latency = round(base_latency * (2.0 - variance) + random.uniform(0, 3.5), 2)
            active_sessions = int(rps * 0.35)
            bandwidth_mbps = round((rps * 18.5 * 8) / 1024, 2) # estimated KB per request
            cpu_pct = round(12.0 + (rps / 100) * 1.8 + random.uniform(0, 4), 1)
            ram_pct = round(42.5 + random.uniform(0, 2), 1)

            data_points.append({
                "timestamp": ts.strftime("%H:%M" if period in ["1h", "24h"] else "%m-%d %H:%M"),
                "rps": rps,
                "latency_ms": latency,
                "active_sessions": active_sessions,
                "bandwidth_mbps": bandwidth_mbps,
                "cpu_percent": min(100.0, cpu_pct),
                "ram_percent": min(100.0, ram_pct)
            })

        return {
            "server_id": server.id,
            "hostname": server.hostname,
            "period": period,
            "summary": {
                "avg_rps": int(sum(p["rps"] for p in data_points) / len(data_points)),
                "peak_rps": max(p["rps"] for p in data_points),
                "avg_latency_ms": round(sum(p["latency_ms"] for p in data_points) / len(data_points), 2),
                "peak_bandwidth_mbps": max(p["bandwidth_mbps"] for p in data_points),
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
