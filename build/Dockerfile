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
COPY --chown=1001:0 css/ ./css/
COPY --chown=1001:0 dev-server.js ./
COPY --chown=1001:0 js/ ./js/
COPY --chown=1001:0 assets/ ./assets/

# Create a startup script
RUN { \
    echo '#!/bin/bash'; \
    echo ''; \
    echo '# Start development server'; \
    echo 'echo "Starting Red Hat Quest Game server on port ${PORT:-8080}..."'; \
    echo 'PORT=${PORT:-8080} node dev-server.js &'; \
    echo 'SERVER_PID=$!'; \
    echo ''; \
    echo '# Function to handle shutdown'; \
    echo 'cleanup() {'; \
    echo '    echo "Shutting down server..."'; \
    echo '    kill $SERVER_PID 2>/dev/null'; \
    echo '    wait $SERVER_PID 2>/dev/null'; \
    echo '    echo "Server stopped."'; \
    echo '    exit 0'; \
    echo '}'; \
    echo ''; \
    echo '# Set up signal handlers'; \
    echo 'trap cleanup SIGTERM SIGINT'; \
    echo ''; \
    echo '# Wait for background process'; \
    echo 'echo "Red Hat Quest Game started successfully!"'; \
    echo 'echo "Game available at: http://localhost:${PORT:-8080}"'; \
    echo 'echo "Admin panel at: http://localhost:${PORT:-8080}/admin.html"'; \
    echo 'echo "Leaderboard at: http://localhost:${PORT:-8080}/leaderboard.html"'; \
    echo ''; \
    echo '# Keep container alive'; \
    echo 'wait'; \
} > /opt/app-root/src/start.sh && chmod +x /opt/app-root/src/start.sh

# Expose port for game server
EXPOSE 8080

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${PORT:-8080}/ || exit 1

# Add labels for better container management
LABEL maintainer="Red Hat Quest v2.1 Game" \
      description="A fun maze game with development server" \
      version="2.1-refactored" \
      ports.http="8080"

# Switch to non-root user
USER 1001

# Start both services
CMD ["./start.sh"]