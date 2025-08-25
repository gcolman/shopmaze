// WebSocket URL Configuration Examples
// Choose one of these methods to set your WebSocket URL

// =================================================================
// METHOD 1: Direct Assignment (Simplest)
// =================================================================
// Add this line to js/config.js or in HTML <script> tag
window.WEBSOCKET_URL = 'ws://localhost:8080/game-control';

// For production with HTTPS:
// window.WEBSOCKET_URL = 'wss://your-websocket-server.com/game-control';

// =================================================================
// METHOD 2: Via Configuration Object
// =================================================================
// Edit js/config.js and set:
window.SHOPMAZE_CONFIG = {
    websocketUrl: 'ws://localhost:8080/game-control',
    // ... other config
};

// =================================================================
// METHOD 3: Environment-Specific Configuration
// =================================================================
// For different environments, you can use conditional logic:

if (window.location.hostname === 'localhost') {
    // Local development
    window.WEBSOCKET_URL = 'ws://localhost:8080/game-control';
} else if (window.location.hostname.includes('staging')) {
    // Staging environment
    window.WEBSOCKET_URL = 'wss://staging-ws.example.com/game-control';
} else {
    // Production environment
    window.WEBSOCKET_URL = 'wss://prod-ws.example.com/game-control';
}

// =================================================================
// METHOD 4: From HTML (Inline Script)
// =================================================================
// Add this in your HTML files before loading the app:
/*
<script>
    window.WEBSOCKET_URL = 'ws://localhost:8080/game-control';
</script>
<script src="js/config.js"></script>
*/

// =================================================================
// METHOD 5: Dynamic from Server/API
// =================================================================
// Load configuration from a server endpoint:
/*
fetch('/api/config')
    .then(response => response.json())
    .then(config => {
        window.WEBSOCKET_URL = config.websocketUrl;
        // Initialize your app after config is loaded
    });
*/

// =================================================================
// METHOD 6: URL Parameters (For Testing)
// =================================================================
// You can also override via URL: ?ws=ws://localhost:8080/game-control
// This is handled automatically by config-loader.js

// =================================================================
// METHOD 7: Browser Console (For Debugging)
// =================================================================
// Open browser console and run:
// window.WEBSOCKET_URL = 'ws://localhost:8080/game-control';
// Then reload the page or reconnect WebSocket

// =================================================================
// KUBERNETES/OPENSHIFT ConfigMap Method
// =================================================================
// The ConfigMap approach creates a file that sets:
// window.DEPLOYMENT_CONFIG = { websocketUrl: 'wss://...' };
// This gets loaded by config-loader.js automatically
