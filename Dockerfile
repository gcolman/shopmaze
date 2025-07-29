# Use Red Hat nginx image for rootless operation
FROM registry.redhat.io/rhel9/nginx-124

# Switch to non-root user early
USER 1001

# Set the working directory in the container
WORKDIR /opt/app-root/src

# Copy all application files to the app directory with proper ownership
COPY --chown=1001:0 index.html .
COPY --chown=1001:0 script.js .
COPY --chown=1001:0 style.css .
COPY --chown=1001:0 assets/ ./assets/

# Create a custom nginx configuration for rootless operation
USER 0
RUN echo 'server { \
    listen 8080; \
    server_name localhost; \
    root /opt/app-root/src; \
    index index.html; \
    \
    # Security headers \
    add_header X-Frame-Options "SAMEORIGIN" always; \   
    add_header X-XSS-Protection "1; mode=block" always; \
    add_header X-Content-Type-Options "nosniff" always; \
    \
    # Cache static assets \
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ { \
        expires 1y; \
        add_header Cache-Control "public, immutable"; \
    } \
    \
    # Main application \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    \
    # Gzip compression \
    gzip on; \
    gzip_vary on; \
    gzip_min_length 1024; \
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json; \
}' > /etc/nginx/default.d/redhat-quest.conf && \
sed -i 's/listen 80;/listen 8080;/' /etc/nginx/nginx.conf

# Switch back to non-root user
USER 1001

# Expose port 8080 (non-privileged port for rootless)
EXPOSE 8080

# Add labels for better container management
LABEL maintainer="Red Hat Quest v2.1 Game" \
      description="A fun maze game where you collect Red Hat t-shirts" \
      version="2.1"

# Start nginx when the container launches
CMD ["nginx", "-g", "daemon off;"] 