# Container Configuration

This directory contains all Docker and Kubernetes configuration files for the Red Hat Quest game project.

## Files

### Configuration
- `configmap.yaml` - Kubernetes ConfigMaps for WebSocket URL and app configuration

### Docker Configuration
- `Dockerfile` - Multi-stage container build configuration
- `.dockerignore` - Files to exclude from Docker build context
- `build-docker.sh` - Automated build script with options

### Kubernetes/OpenShift Deployment
- `deployment.yaml` - Basic Kubernetes deployment (legacy)
- `k8s-deployment.yaml` - Full Kubernetes deployment with services and routes
- `openshift-deployment.yaml` - OpenShift-specific deployment with enhanced features

## Usage

### Building the Container

Run the build script from the project root directory:

```bash
# From the project root
./containerconfig/build-docker.sh

# With options
./containerconfig/build-docker.sh -t latest
./containerconfig/build-docker.sh -r quay.io/myorg -t v2.1 -p
./containerconfig/build-docker.sh --help
```

### Deploying to Kubernetes/OpenShift

```bash
# Apply ConfigMap first
kubectl apply -f containerconfig/configmap.yaml

# Update WebSocket URL in ConfigMap
kubectl edit configmap shopmaze-websocket-config

# Kubernetes deployment
kubectl apply -f containerconfig/k8s-deployment.yaml

# OpenShift deployment (recommended)
oc apply -f containerconfig/openshift-deployment.yaml

# Legacy deployment
oc apply -f containerconfig/deployment.yaml
```

## Deployment Features

### OpenShift Deployment (openshift-deployment.yaml)
- ✅ Full HTTPS/TLS routes
- ✅ WebSocket support with secure connections (wss://)
- ✅ Service account with proper security contexts
- ✅ Horizontal Pod Autoscaler
- ✅ Network policies
- ✅ Health checks and readiness probes
- ✅ Separate routes for admin and leaderboard

### Kubernetes Deployment (k8s-deployment.yaml)
- ✅ Services for HTTP and WebSocket
- ✅ Basic ingress configuration
- ✅ Resource limits and requests
- ✅ Security contexts

### Legacy Deployment (deployment.yaml)
- ✅ Basic deployment configuration
- ⚠️  Limited routing and security features

## Notes

- All build commands should be run from the project root directory
- The Dockerfile builds both the web server and WebSocket server in a single container
- Container runs on ports 8000 (HTTP) and 8080 (WebSocket)
- Default base image: Red Hat UBI Node.js 18
