// Configuration Loader for ShopMaze
// Loads configuration from various sources in order of precedence
//
// Note: The main config.js is loaded as an ES6 module in HTML.
// This loader only handles additional configuration sources like:
// - ConfigMap-mounted files (container deployments)
// - Environment variables
// - URL parameters

(function() {
    'use strict';
    
    // Initialize configuration
    window.SHOPMAZE_CONFIG = window.SHOPMAZE_CONFIG || {};
    
    // Configuration loading functions
    const configLoader = {
        
        // Load configuration from a mounted file (container environments)
        // Note: This loads ConfigMap-mounted files, not the main config.js module
        async loadFromFile(url) {
            try {
                const response = await fetch(url);
                if (response.ok) {
                    const script = await response.text();
                    // Safely evaluate the configuration script (plain JavaScript, not ES6 modules)
                    eval(script);
                    return true;
                }
            } catch (error) {
                // Could not load configuration from file (normal for local development)
            }
            return false;
        },
        
        // Load configuration from environment variables (if available)
        loadFromEnvironment() {
            if (typeof process !== 'undefined' && process.env) {
                if (process.env.WEBSOCKET_URL) {
                    window.WEBSOCKET_URL = process.env.WEBSOCKET_URL;
                }
            }
        },
        
        // Load configuration from URL parameters
        loadFromUrlParams() {
            const urlParams = new URLSearchParams(window.location.search);
            const wsUrl = urlParams.get('ws') || urlParams.get('websocket');
            if (wsUrl) {
                window.WEBSOCKET_URL = wsUrl;
            }
        },
        
        // Initialize configuration loading
        async init() {
            // 0. Initialize basic SHOPMAZE_CONFIG if it doesn't exist
            this.ensureBaseConfiguration();
            
            // 1. Try to load from mounted ConfigMap file (container environments)
            // Note: We don't load the main config.js here as it's already loaded as an ES6 module
            const configLoaded = await this.loadFromFile('/config/app-config.js');
            
            // 2. Load from environment variables
            this.loadFromEnvironment();
            
            // 3. Load from URL parameters (for testing/debugging)
            this.loadFromUrlParams();
            
            // 4. Set up WebSocket URL if configured
            this.setupWebSocketUrl();
            
            // Trigger custom event when configuration is ready
            window.dispatchEvent(new CustomEvent('shopmaze-config-ready'));
        },
        
        // Ensure base configuration exists
        ensureBaseConfiguration() {
            if (!window.SHOPMAZE_CONFIG) {
                window.SHOPMAZE_CONFIG = {
                    websocketUrl: null,
                    game: {
                        debug: false,
                        logLevel: 'info'
                    },
                    ui: {
                        showDebugInfo: false,
                        autoConnect: true
                    }
                };
            }
        },
        
        // Set up WebSocket URL from configuration
        setupWebSocketUrl() {
            if(window === undefined) {
                console.log("window is undefined");
            } else {
                console.log("window is defined");
            }
            console.log("setting up websocket url");
            console.log("window.WEBSOCKET_URL", window.WEBSOCKET_URL);
            // Check if WebSocket URL was already set (highest priority)
            if (window.WEBSOCKET_URL) {
                console.log("websocket url already set");
                return; // Keep existing value
            }
            
            // Set from SHOPMAZE_CONFIG if available
            if (window.SHOPMAZE_CONFIG && window.SHOPMAZE_CONFIG.websocketUrl) {
                window.WEBSOCKET_URL = window.SHOPMAZE_CONFIG.websocketUrl;
                console.log("websocket url set from shopmaze config");
            }
            
            // Handle deployment config overrides
            if (window.DEPLOYMENT_CONFIG) {
                // Merge deployment config
                Object.assign(window.SHOPMAZE_CONFIG, window.DEPLOYMENT_CONFIG);
                
                // Set WebSocket URL from deployment config
                if (window.DEPLOYMENT_CONFIG.websocketUrl) {
                    window.WEBSOCKET_URL = window.DEPLOYMENT_CONFIG.websocketUrl;
                    console.log("websocket url set from deployment config");
                }
            }
            console.log("websocket url set to", window.WEBSOCKET_URL);
            // For quick testing - uncomment one of these lines:
            // window.WEBSOCKET_URL = 'ws://localhost:8080/game-control';
            // window.WEBSOCKET_URL = 'wss://your-websocket-server.com/game-control';
        }
    };
    
    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => configLoader.init());
    } else {
        configLoader.init();
    }
    
    // Expose loader for manual use
    window.ShopMazeConfigLoader = configLoader;
})();
