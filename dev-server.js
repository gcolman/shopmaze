#!/usr/bin/env node

// Development Server with No-Cache Headers
// Use this instead of python3 -m http.server for development

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 8001;
const ROOT_DIR = __dirname;

// MIME types for different file extensions
const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.txt': 'text/plain',
    '.md': 'text/markdown'
};

function getContentType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return MIME_TYPES[ext] || 'application/octet-stream';
}

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    let pathname = parsedUrl.pathname;
    
    // Remove query parameters for file path (cache busting params)
    const cleanPath = pathname.split('?')[0];
    
    // Handle health check endpoint for OpenShift liveness/readiness probes
    if (cleanPath === '/health') {
        const healthResponse = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            service: 'red-hat-quest-game',
            version: '2.1'
        };
        
        const headers = {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Access-Control-Allow-Origin': '*'
        };
        
        res.writeHead(200, headers);
        res.end(JSON.stringify(healthResponse));
        
        // Log the health check request
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[${timestamp}] HEALTH ${req.method} ${req.url} -> healthy`);
        return;
    }
    
    // Handle debug endpoint to check file system
    if (cleanPath === '/debug') {
        const fs = require('fs');
        const debugInfo = {
            timestamp: new Date().toISOString(),
            pwd: process.cwd(),
            files: {},
            environment: {
                NODE_ENV: process.env.NODE_ENV,
                PORT: process.env.PORT,
                DEPLOYMENT_TYPE: process.env.DEPLOYMENT_TYPE
            }
        };
        
        // Check if key files exist
        const checkFiles = ['index.html', 'leaderboard.html', 'js/config.js', 'js/config-loader.js', 'js/leaderboard.js'];
        checkFiles.forEach(file => {
            try {
                const stats = fs.statSync(path.join(ROOT_DIR, file));
                debugInfo.files[file] = { exists: true, size: stats.size };
            } catch (err) {
                debugInfo.files[file] = { exists: false, error: err.message };
            }
        });
        
        const headers = {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'Access-Control-Allow-Origin': '*'
        };
        
        res.writeHead(200, headers);
        res.end(JSON.stringify(debugInfo, null, 2));
        
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[${timestamp}] DEBUG ${req.method} ${req.url} -> debug info`);
        return;
    }
    
    // Default to index.html for root
    if (cleanPath === '/') {
        pathname = '/index.html';
    } else {
        pathname = cleanPath;
    }
    
    const filePath = path.join(ROOT_DIR, pathname);
    
    // Security: Prevent directory traversal
    if (!filePath.startsWith(ROOT_DIR)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('403 Forbidden');
        return;
    }
    
    fs.readFile(filePath, (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('404 Not Found');
            } else {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('500 Internal Server Error');
            }
            return;
        }
        
        const contentType = getContentType(filePath);
        
        // Development headers to prevent caching
        const headers = {
            'Content-Type': contentType,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        };
        
        // Add timestamp header for debugging
        headers['X-Served-At'] = new Date().toISOString();
        
        res.writeHead(200, headers);
        res.end(data);
        
        // Log the request (with special attention to JS files)
        const timestamp = new Date().toLocaleTimeString();
        const isJsFile = filePath.endsWith('.js');
        const logPrefix = isJsFile ? 'JS  ' : 'FILE';
        console.log(`[${timestamp}] ${logPrefix} ${req.method} ${req.url} -> ${filePath}`);
    });
});

server.listen(PORT, () => {
    console.log('🚀 Development Server Started');
    console.log(`📡 Server running at http://localhost:${PORT}`);
    console.log('🔄 Cache-busting enabled - files will always be fresh');
    console.log('🛑 Press Ctrl+C to stop');
    console.log('');
    console.log('📂 Serving files from:', ROOT_DIR);
    console.log('');
    console.log('💡 Features:');
    console.log('   • No-cache headers for all files');
    console.log('   • CORS enabled for API testing');
    console.log('   • Request logging');
    console.log('   • Cache-busting query parameter support');
    console.log('');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down development server...');
    server.close(() => {
        console.log('✅ Server stopped');
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
    server.close(() => {
        console.log('✅ Server stopped');
        process.exit(0);
    });
});
