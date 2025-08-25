# Multi-service Red Hat Quest Game with WebSocket Server
# Base: Red Hat UBI Node.js image for both web and WebSocket services
FROM registry.redhat.io/ubi9/nodejs-18:latest

# Set working directory
WORKDIR /opt/app-root/src

# Copy package files and install dependencies for WebSocket server
COPY --chown=1001:0 package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy all application files
COPY --chown=1001:0 *.html ./
COPY --chown=1001:0 style.css ./
COPY --chown=1001:0 websocket-server.js ./
COPY --chown=1001:0 js/ ./js/
COPY --chown=1001:0 assets/ ./assets/

# Create a startup script to run both services
RUN { \
    echo '#!/bin/bash'; \
    echo ''; \
    echo '# Start WebSocket server in background'; \
    echo 'echo "Starting WebSocket server on port 8080..."'; \
    echo 'node websocket-server.js &'; \
    echo 'WEBSOCKET_PID=$!'; \
    echo ''; \
    echo '# Start HTTP server for static files'; \
    echo 'echo "Starting HTTP server on port 8000..."'; \
    echo 'npx http-server . -p 8000 --cors -c-1 &'; \
    echo 'HTTP_PID=$!'; \
    echo ''; \
    echo '# Function to handle shutdown'; \
    echo 'cleanup() {'; \
    echo '    echo "Shutting down services..."'; \
    echo '    kill $WEBSOCKET_PID $HTTP_PID 2>/dev/null'; \
    echo '    wait $WEBSOCKET_PID $HTTP_PID 2>/dev/null'; \
    echo '    echo "Services stopped."'; \
    echo '    exit 0'; \
    echo '}'; \
    echo ''; \
    echo '# Set up signal handlers'; \
    echo 'trap cleanup SIGTERM SIGINT'; \
    echo ''; \
    echo '# Wait for background processes'; \
    echo 'echo "Game and WebSocket services started successfully!"'; \
    echo 'echo "Game available at: http://localhost:8000"'; \
    echo 'echo "Admin panel at: http://localhost:8000/admin.html"'; \
    echo 'echo "Leaderboard at: http://localhost:8000/leaderboard.html"'; \
    echo 'echo "WebSocket server at: ws://localhost:8080"'; \
    echo ''; \
    echo '# Keep container alive'; \
    echo 'wait'; \
} > /opt/app-root/src/start.sh && chmod +x /opt/app-root/src/start.sh

# Install http-server for serving static files
RUN npm install -g http-server

# Expose ports for both services
EXPOSE 8000 8080

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/ && \
      curl -f http://localhost:8080/health || exit 1

# Add labels for better container management
LABEL maintainer="Red Hat Quest v2.1 Game with WebSocket" \
      description="A fun maze game with real-time WebSocket control and leaderboard" \
      version="2.1-websocket" \
      ports.http="8000" \
      ports.websocket="8080"

# Switch to non-root user
USER 1001

# Start both services
CMD ["./start.sh"]