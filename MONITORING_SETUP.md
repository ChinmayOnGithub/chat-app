# 📊 Monitoring Setup

## Quick Start

### Run Monitoring Stack

```bash
# Create network
docker network create monitoring

# Start Prometheus
docker run -d --name prometheus --network monitoring \
  -p 9090:9090 \
  -v $(pwd)/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus

# Start Grafana
docker run -d --name grafana --network monitoring \
  -p 3000:3000 \
  grafana/grafana
```

### Configure Grafana

1. Open http://localhost:3000 (admin/admin)
2. Add Data Source → Prometheus
3. URL: `http://prometheus:9090`
4. Save & Test

### Import Dashboard

1. Click **+** → **Import**
2. Enter ID: `1860`
3. Select Prometheus
4. Import

## Available Metrics

### Custom WebSocket Metrics
```
websocket_connections_total              # Active connections
websocket_messages_total{type="message"} # Chat messages
websocket_messages_total{type="identify"} # User identifications
```

### Useful Queries
```
# Memory usage (MB)
process_resident_memory_bytes / 1024 / 1024

# CPU usage (%)
rate(process_cpu_user_seconds_total[1m]) * 100

# Message rate
rate(websocket_messages_total[1m])
```

## Endpoints

- **App**: http://localhost:8000
- **Health**: http://localhost:8000/healthz
- **Metrics**: http://localhost:8000/metrics
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3000

## Management

```bash
# Check status
docker ps

# Stop
docker stop prometheus grafana
docker rm prometheus grafana

# Restart
docker restart prometheus grafana
```
