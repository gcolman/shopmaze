#!/bin/bash

# Build script for Red Hat Quest Game-Only Docker Image
# This script builds a lightweight container that serves only the static game files

set -e

# Configuration
IMAGE_NAME="red-hat-quest-game"
IMAGE_TAG="static"
CONTAINER_NAME="red-hat-quest-game-static"
PORT="8080"

echo "🎮 Building Red Hat Quest Game-Only Docker Image"
echo "================================================"

# Build the Docker image
echo "📦 Building Docker image: ${IMAGE_NAME}:${IMAGE_TAG}"
docker build -f Dockerfile-game-only -t ${IMAGE_NAME}:${IMAGE_TAG} .

echo "✅ Docker image built successfully!"
echo ""

# Provide usage instructions
echo "🚀 Usage Instructions:"
echo "====================="
echo ""
echo "To run the game container:"
echo "  docker run -d --name ${CONTAINER_NAME} -p ${PORT}:8080 ${IMAGE_NAME}:${IMAGE_TAG}"
echo ""
echo "To access the game:"
echo "  🌐 Main Game: http://localhost:${PORT}"
echo "  📊 Admin Panel: http://localhost:${PORT}/admin.html"
echo "  🏆 Leaderboard: http://localhost:${PORT}/leaderboard.html"
echo ""
echo "To stop the container:"
echo "  docker stop ${CONTAINER_NAME}"
echo ""
echo "To remove the container:"
echo "  docker rm ${CONTAINER_NAME}"
echo ""

# Ask if user wants to run the container immediately
read -p "🤔 Would you like to run the container now? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 Starting container..."
    
    # Stop and remove existing container if it exists
    if docker ps -a | grep -q ${CONTAINER_NAME}; then
        echo "🛑 Stopping existing container..."
        docker stop ${CONTAINER_NAME} || true
        docker rm ${CONTAINER_NAME} || true
    fi
    
    # Run the new container
    docker run -d --name ${CONTAINER_NAME} -p ${PORT}:8080 ${IMAGE_NAME}:${IMAGE_TAG}
    
    echo "✅ Container started successfully!"
    echo "🌐 Game is now available at: http://localhost:${PORT}"
    
    # Wait a moment and check if container is running
    sleep 2
    if docker ps | grep -q ${CONTAINER_NAME}; then
        echo "✅ Container is running healthy!"
    else
        echo "❌ Container failed to start. Check logs with: docker logs ${CONTAINER_NAME}"
    fi
else
    echo "👍 Container build complete. Use the commands above to run it manually."
fi

echo ""
echo "🔍 Key differences from full deployment:"
echo "  ✅ No WebSocket server (smaller, faster)"
echo "  ✅ No Node.js dependencies"
echo "  ✅ Uses lightweight nginx server"
echo "  ❌ No real-time admin control"
echo "  ❌ No persistent leaderboard data"
echo ""
echo "💡 For full functionality, use the original Dockerfile instead."
