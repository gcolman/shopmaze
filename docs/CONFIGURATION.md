# ShopMaze Configuration Guide

This document explains how to configure the ShopMaze application, particularly the WebSocket connection settings for different deployment environments.

## 🔧 Configuration System

ShopMaze uses a hierarchical configuration system that loads settings from multiple sources in order of precedence:

1. **ConfigMap/Mounted Files** (container deployments)
2. **Environment Variables** 
3. **URL Parameters** (for testing/debugging)
4. **Default/Fallback Values** (auto-detection)

## 📝 Configuration Sources

### 1. Default Configuration (`js/config.js`)

Basic configuration file that sets up defaults:

```javascript
window.SHOPMAZE_CONFIG = {
    websocketUrl: null,  // Will be auto-detected if not set
    game: {
        debug: false,
        logLevel: 'info'
    },
    ui: {
        showDebugInfo: false,
        autoConnect: true
    }
};
```

### 2. ConfigMap Configuration (Container Deployments)

For Kubernetes/OpenShift deployments, configuration is provided via ConfigMaps:

```yaml
# Apply the ConfigMap
kubectl apply -f containerconfig/configmap.yaml

# Edit the WebSocket URL in the ConfigMap
kubectl edit configmap shopmaze-config
```

### 3. URL Parameters (Testing/Debugging)

Override WebSocket URL via URL parameters:

```
# Examples
http://localhost:8000/?ws=ws://localhost:8080/game-control
http://localhost:8000/?websocket=wss://my-server.com/game-control
```

### 4. Environment Variables

Set WebSocket URL via environment variable:

```bash
export WEBSOCKET_URL="ws://localhost:8080/game-control"
```

## 🚀 Deployment Configurations

### Local Development

No configuration needed - auto-detects `ws://localhost:8080/game-control`:

```bash
# Start backend
cd shopmaze_backend
npm start

# Start frontend (in another terminal)
cd shopmaze
npm run dev  # or serve via HTTP server
```

### Container Development

Build and run with Docker:

```bash
# Build
./containerconfig/build-docker.sh

# Run with custom WebSocket URL
docker run -p 8000:8000 \
  -e WEBSOCKET_URL="ws://host.docker.internal:8080/game-control" \
  shopmaze:latest
```

### Kubernetes Deployment

1. **Update ConfigMap with your WebSocket URL:**

```bash
# Edit the ConfigMap
kubectl edit configmap shopmaze-websocket-config

# Update the websocket-url value:
data:
  websocket-url: "wss://your-websocket-server.example.com/game-control"
```

2. **Deploy the application:**

```bash
kubectl apply -f containerconfig/configmap.yaml
kubectl apply -f containerconfig/k8s-deployment.yaml
```

### OpenShift Deployment

1. **Create project and apply ConfigMap:**

```bash
oc new-project shopmaze
oc apply -f containerconfig/configmap.yaml
```

2. **Update WebSocket URL for your routes:**

```bash
# Get your WebSocket route
oc get routes | grep websocket

# Edit ConfigMap with actual route URL
oc edit configmap shopmaze-websocket-config
```

3. **Deploy the application:**

```bash
oc apply -f containerconfig/openshift-deployment.yaml
```

## 🔧 Configuration Examples

### Example 1: Local Development with Custom Backend

```javascript
// Set in browser console or add to js/config.js
window.WEBSOCKET_URL = 'ws://192.168.1.100:8080/game-control';
```

### Example 2: Production with External WebSocket Server

```yaml
# In ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: shopmaze-websocket-config
data:
  websocket-url: "wss://websocket.production.example.com/game-control"
```

### Example 3: Staging Environment

```bash
# Via URL parameter for testing
https://staging.example.com/?ws=wss://staging-ws.example.com/game-control
```

## 🐛 Debugging Configuration

### Check Current Configuration

Open browser console and check:

```javascript
// Check if WebSocket URL is configured
console.log('WebSocket URL:', window.WEBSOCKET_URL);

// Check full configuration
console.log('Config:', window.SHOPMAZE_CONFIG);

// Check if deployment config was loaded
console.log('Deployment Config:', window.DEPLOYMENT_CONFIG);
```

### Configuration Loading Events

Listen for configuration ready event:

```javascript
window.addEventListener('shopmaze-config-ready', function() {
    console.log('Configuration loaded and ready');
});
```

### Common Issues

1. **WebSocket Connection Failed**
   - Check that `window.WEBSOCKET_URL` is set correctly
   - Verify WebSocket server is running and accessible
   - Check for CORS/security policy issues

2. **Configuration Not Loading**
   - Verify ConfigMap is mounted correctly: `oc get pods -o yaml`
   - Check browser console for configuration loading errors
   - Ensure scripts are loaded in correct order

3. **Auto-detection Not Working**
   - Set explicit WebSocket URL in ConfigMap
   - Check hostname patterns in fallback logic
   - Use URL parameter as temporary workaround

## 📁 File Structure

```
shopmaze/
├── js/
│   ├── config.js           # Default configuration
│   ├── config-loader.js    # Configuration loading logic
│   └── websocketController.js  # Uses window.WEBSOCKET_URL
├── containerconfig/
│   ├── configmap.yaml      # Kubernetes ConfigMaps
│   └── openshift-deployment.yaml  # Deployment with ConfigMap mount
├── docs/
│   └── CONFIGURATION.md    # This file
└── [HTML files include config scripts]
```

## 🔒 Security Considerations

- ConfigMaps are not encrypted - don't store sensitive data
- WebSocket URLs are visible in browser - use HTTPS/WSS in production
- Validate WebSocket URLs to prevent injection attacks
- Use proper CORS configuration on WebSocket server

## 📝 Environment-Specific Setup

### Development
```bash
# No config needed - auto-detects localhost
npm start
```

### Staging
```yaml
# ConfigMap with staging URLs
websocket-url: "wss://staging-ws.apps.cluster.example.com/game-control"
```

### Production
```yaml
# ConfigMap with production URLs
websocket-url: "wss://prod-ws.apps.cluster.example.com/game-control"
```

This configuration system provides flexibility for different deployment scenarios while maintaining simplicity for development and testing.
