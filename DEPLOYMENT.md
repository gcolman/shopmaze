# Red Hat Quest Game - Deployment Guide

## 🚀 Overview

This deployment guide covers the Red Hat Quest game with integrated WebSocket server support. The application now includes:

- **Game Frontend**: Interactive maze game with Red Hat T-shirt collection
- **WebSocket Server**: Real-time game control and data collection
- **Leaderboard API**: REST API for score tracking
- **Admin Interface**: Web-based administrative controls

## 📦 Docker Deployment

### Prerequisites

- Docker Engine 20.10+
- Docker Compose 3.8+ (optional)
- 2 available ports: 8000 (HTTP), 8080 (WebSocket)

### Quick Start

1. **Build the container:**
   ```bash
   ./containerconfig/build-docker.sh
   ```

2. **Run with Docker:**
   ```bash
   docker run -d \
     --name redhat-quest \
     -p 8000:8000 \
     -p 8080:8080 \
     redhat-quest:2.1-websocket
   ```

3. **Or use Docker Compose:**
   ```bash
   docker-compose up -d
   ```

### Build Options

```bash
# Build with custom tag
./containerconfig/build-docker.sh -t latest

# Build and push to registry
./containerconfig/build-docker.sh -r quay.io/myorg -t v2.1 -p

# See all options
./containerconfig/build-docker.sh --help
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `production` | Node.js environment |
| `HTTP_PORT` | `8000` | HTTP server port |
| `WEBSOCKET_PORT` | `8080` | WebSocket server port |

## ☸️ Kubernetes Deployment

### OpenShift/Kubernetes

1. **Apply the deployment:**
   ```bash
   oc apply -f containerconfig/k8s-deployment.yaml
   ```

2. **Check status:**
   ```bash
   oc get pods -l app=redhat-quest
   oc get services -l app=redhat-quest
   oc get routes -l app=redhat-quest
   ```

### Services Created

- **redhat-quest-http**: Game frontend (port 8000)
- **redhat-quest-websocket**: WebSocket server (port 8080)
- **redhat-quest-api**: Leaderboard API (port 8080, path `/leaderboard`)

### Routes Created

- **redhat-quest-http**: Main game interface
- **redhat-quest-websocket**: WebSocket connections
- **redhat-quest-api**: Leaderboard API endpoint

## 🔧 Configuration

### WebSocket Server

The WebSocket server accepts the following commands:

| Command | Description |
|---------|-------------|
| `start` | Start/resume the game |
| `pause` | Pause the game |
| `new` | Create a new game |

### Health Checks

| Endpoint | Port | Description |
|----------|------|-------------|
| `/health` | 8080 | WebSocket server health |
| `/` | 8000 | Game frontend availability |
| `/leaderboard` | 8080 | Leaderboard API |

### Admin Interface

Access the admin panel at `/admin.html`:
- **Password**: `redhat`
- **Features**: WebSocket control, data monitoring
- **Commands**: Start, pause, restart game

## 🏆 API Endpoints

### Leaderboard API

**GET** `/leaderboard`
```json
{
  "success": true,
  "count": 10,
  "data": [
    {
      "playerId": "SillyPenguin",
      "email": "user@example.com",
      "score": 850,
      "tShirtValue": 800,
      "coinsRemaining": 50,
      "level": 3,
      "timestamp": "2025-08-21T18:30:00.000Z"
    }
  ],
  "lastUpdated": "2025-08-21T18:30:00.000Z"
}
```

**GET** `/health`
```json
{
  "status": "healthy",
  "service": "websocket-server",
  "timestamp": "2025-08-21T18:30:00.000Z",
  "uptime": 3600,
  "connectedClients": 5,
  "leaderboardEntries": 10
}
```

## 🌐 Access URLs

After deployment, access the application at:

| Service | URL Pattern | Description |
|---------|-------------|-------------|
| Game | `http://[host]:8000/` | Main game interface |
| Admin | `http://[host]:8000/admin.html` | Administrative controls |
| Leaderboard | `http://[host]:8000/leaderboard.html` | Score rankings |
| WebSocket | `ws://[host]:8080` | Real-time communication |
| API | `http://[host]:8080/leaderboard` | REST API |

## 📊 Monitoring

### Docker Health Checks

```bash
# Check container health
docker ps
docker logs redhat-quest

# Manual health check
curl http://localhost:8080/health
curl http://localhost:8000/
```

### Kubernetes Monitoring

```bash
# Pod status
oc describe pod -l app=redhat-quest

# Service endpoints
oc get endpoints

# Route status
oc get routes
```

## 🔒 Security

### Container Security

- Runs as non-root user (UID 1001)
- Minimal base image (Red Hat UBI)
- No unnecessary privileges
- Security context restrictions

### Network Security

- CORS enabled for API endpoints
- TLS termination at route level
- WebSocket timeout protections
- Input validation for all commands

## 🐛 Troubleshooting

### Common Issues

1. **Port conflicts:**
   ```bash
   # Check what's using ports
   lsof -i :8000
   lsof -i :8080
   
   # Use different ports
   docker run -p 8001:8000 -p 8081:8080 redhat-quest:2.1-websocket
   ```

2. **WebSocket connection fails:**
   ```bash
   # Check WebSocket server
   curl http://localhost:8080/health
   
   # Test WebSocket connection
   wscat -c ws://localhost:8080
   ```

3. **Game assets not loading:**
   ```bash
   # Check HTTP server
   curl http://localhost:8000/
   curl http://localhost:8000/js/main.js
   ```

### Logs

```bash
# Docker logs
docker logs redhat-quest -f

# Kubernetes logs
oc logs -l app=redhat-quest -f
```

## 🔄 Updates

### Rolling Updates

```bash
# Build new version
./containerconfig/build-docker.sh -t v2.2

# Update Kubernetes deployment
oc set image deployment/redhat-quest redhat-quest=redhat-quest:v2.2

# Check rollout status
oc rollout status deployment/redhat-quest
```

### Rollback

```bash
# Rollback deployment
oc rollout undo deployment/redhat-quest

# Check history
oc rollout history deployment/redhat-quest
```

## 📈 Scaling

### Horizontal Scaling

```bash
# Scale pods
oc scale deployment redhat-quest --replicas=3

# Auto-scaling (optional)
oc autoscale deployment redhat-quest --min=1 --max=5 --cpu-percent=80
```

### Resource Limits

Current configuration:
- **Requests**: 100m CPU, 128Mi memory
- **Limits**: 500m CPU, 512Mi memory

Adjust in `containerconfig/k8s-deployment.yaml` as needed.

## 📝 Notes

- The WebSocket server includes a built-in HTTP server for the leaderboard API
- Game state is ephemeral - no persistent storage required
- Leaderboard data is stored in memory and resets on container restart
- For production, consider adding persistent storage for leaderboard data
- CORS is enabled for all origins in development mode

