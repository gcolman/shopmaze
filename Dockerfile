# Game-Only Red Hat Quest Deployment
# Lightweight static file server for the game
FROM registry.redhat.io/ubi9/nginx-122:latest

# Set working directory
WORKDIR /opt/app-root/src

# Copy static game files
COPY --chown=1001:0 index.html ./
#COPY --chown=1001:0 index-standalone.html ./
COPY --chown=1001:0 admin.html ./
COPY --chown=1001:0 leaderboard.html ./
COPY --chown=1001:0 js/ ./js/
COPY --chown=1001:0 css/ ./css/
COPY --chown=1001:0 assets/ ./assets/


# Create config directory for ConfigMap mounting and set permissions
RUN mkdir -p /opt/app-root/src/config && chown 1001:0 /opt/app-root/src/config && \
    # Ensure CSS files have correct permissions
    find /opt/app-root/src/css -type f -name "*.css" -exec chmod 644 {} \; && \
    chown -R 1001:0 /opt/app-root/src/css

# Create nginx configuration for serving static files
# UBI nginx includes files from nginx.default.d/ inside the default server block
RUN mkdir -p /opt/app-root/etc/nginx.default.d && \
    { \
    echo '# Security headers'; \
    echo 'add_header X-Frame-Options "SAMEORIGIN" always;'; \
    echo 'add_header X-Content-Type-Options "nosniff" always;'; \
    echo 'add_header X-XSS-Protection "1; mode=block" always;'; \
    echo ''; \
    echo '# Serve ConfigMap JavaScript configuration'; \
    echo 'location = /config/app-config.js {'; \
    echo '    alias /opt/app-root/src/config/app-config.js;'; \
    echo '    add_header Content-Type "application/javascript";'; \
    echo '    add_header Cache-Control "no-cache, no-store, must-revalidate";'; \
    echo '    add_header Pragma "no-cache";'; \
    echo '    expires -1;'; \
    echo '}'; \
    echo ''; \
    echo '# Serve JavaScript files with correct content type'; \
    echo 'location ~* \.js$ {'; \
    echo '    add_header Content-Type "application/javascript";'; \
    echo '    expires 1h;'; \
    echo '    add_header Cache-Control "public, immutable";'; \
    echo '}'; \
    echo ''; \
    echo '# Serve CSS files with correct content type'; \
    echo 'location ~* \.css$ {'; \
    echo '    add_header Content-Type "text/css";'; \
    echo '    expires 1h;'; \
    echo '    add_header Cache-Control "public, immutable";'; \
    echo '}'; \
    echo ''; \
    echo '# Serve other static assets'; \
    echo 'location ~* \.(png|jpg|jpeg|gif|ico|svg)$ {'; \
    echo '    expires 1h;'; \
    echo '    add_header Cache-Control "public, immutable";'; \
    echo '}'; \
    echo ''; \
    echo '# Serve HTML files with no cache for development'; \
    echo 'location ~* \.html$ {'; \
    echo '    expires -1;'; \
    echo '    add_header Cache-Control "no-cache, no-store, must-revalidate";'; \
    echo '    add_header Pragma "no-cache";'; \
    echo '}'; \
    echo ''; \
    echo '# Health check endpoint'; \
    echo 'location /health {'; \
    echo '    access_log off;'; \
    echo '    return 200 "healthy\n";'; \
    echo '    add_header Content-Type text/plain;'; \
    echo '}'; \
    echo ''; \
    echo '# Default location - must be last'; \
    echo 'location / {'; \
    echo '    try_files $uri $uri/ /index.html;'; \
    echo '}'; \
} > /opt/app-root/etc/nginx.default.d/default.conf

# Expose port for the web server
EXPOSE 8080

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Add labels for better container management
LABEL maintainer="Red Hat Quest v2.1 Game - Static Version" \
      description="A fun maze game served as static files" \
      version="2.1-static" \
      port="8080"

# Switch to non-root user
USER 1001

# Start nginx server
CMD ["nginx", "-g", "daemon off;"]
