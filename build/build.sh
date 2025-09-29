#!/bin/bash

# Red Hat Quest Game - Podman Build Script
# Builds the multi-service container with WebSocket support for Intel architecture

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🎮 Red Hat Quest - Podman Build Script${NC}"
echo -e "${BLUE}=====================================${NC}"

# Default values
IMAGE_NAME="redhat-quest"
TAG="latest"
REGISTRY=""
PUSH=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -t|--tag)
            TAG="$2"
            shift 2
            ;;
        -r|--registry)
            REGISTRY="$2/"
            shift 2
            ;;
        -p|--push)
            PUSH=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  -t, --tag TAG        Set the image tag (default: 2.1-websocket)"
            echo "  -r, --registry REG   Set the registry prefix"
            echo "  -p, --push           Push the image after building"
            echo "  -h, --help           Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                                          # Build locally for Intel"
            echo "  $0 -t latest                               # Build with 'latest' tag for Intel"
            echo "  $0 -r quay.io/myorg -t v2.1 -p           # Build and push Intel image to registry"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

FULL_IMAGE_NAME="${REGISTRY}${IMAGE_NAME}:${TAG}"

echo -e "${YELLOW}📋 Build Configuration:${NC}"
echo -e "  Image: ${FULL_IMAGE_NAME}"
echo -e "  Push: $([ "$PUSH" = true ] && echo "Yes" || echo "No")"
echo ""

# Check if required files exist
echo -e "${YELLOW}🔍 Checking required files...${NC}"
REQUIRED_FILES=(
    "Dockerfile"
    "../package.json"
    "../index.html"
    "../js/main.js"
    "../assets/"
    "../css/"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [[ ! -e "$file" ]]; then
        echo -e "${RED}❌ Required file/directory not found: $file${NC}"
        exit 1
    fi
    echo -e "  ✅ $file"
done

echo ""

# Build the Podman image for Intel architecture
echo -e "${YELLOW}🔨 Building Podman image for Intel (x86_64) architecture...${NC}"
echo -e "  Command: podman build --platform linux/amd64 -f Dockerfile -t ${FULL_IMAGE_NAME} .."
echo ""

if podman build --platform linux/amd64 -f Dockerfile -t "${FULL_IMAGE_NAME}" ..; then
    echo ""
    echo -e "${GREEN}✅ Podman image built successfully!${NC}"
    echo -e "  Image: ${FULL_IMAGE_NAME}"
    
    # Show image size
    SIZE=$(podman images "${FULL_IMAGE_NAME}" --format "table {{.Size}}" | tail -n 1)
    echo -e "  Size: ${SIZE}"
else
    echo -e "${RED}❌ Podman build failed!${NC}"
    exit 1
fi

# Push if requested
if [ "$PUSH" = true ]; then
    echo ""
    echo -e "${YELLOW}📤 Pushing image to registry...${NC}"
    
    if podman push "${FULL_IMAGE_NAME}"; then
        echo -e "${GREEN}✅ Image pushed successfully!${NC}"
        echo -e "  Registry: ${FULL_IMAGE_NAME}"
    else
        echo -e "${RED}❌ Failed to push image!${NC}"
        exit 1
    fi
fi

echo ""
echo -e "${GREEN}🎉 Build completed successfully!${NC}"
echo ""
echo -e "${BLUE}🚀 Quick start commands:${NC}"
echo -e "  Local run:       podman run -p 8001:8001 ${FULL_IMAGE_NAME}"
echo -e "  Compose:         podman-compose up"
echo -e "  Health check:    curl http://localhost:8001/"
echo ""
echo -e "${BLUE}🌐 Access URLs (when running):${NC}"
echo -e "  Game:            http://localhost:8001"
echo -e "  Admin Panel:     http://localhost:8001/admin.html"
echo -e "  Leaderboard:     http://localhost:8001/leaderboard.html"
echo ""

