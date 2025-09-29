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
            //debugLog console.log(`!!!!Attempting to load config from: ${url}`);
            try {
                const response = await fetch(url);
                //debugLog console.log(`!!!!Response status: ${response.status}, ok: ${response.ok}`);
                
                if (response.ok) {
                    const script = await response.text();
                    //debugLog console.log(`!!!!Config script length: ${script.length} characters`);
                    
                    // Safely evaluate the configuration script (plain JavaScript, not ES6 modules)
                    eval(script);
                    
                    if (window.DEPLOYMENT_CONFIG) {
                        //debugLog console.log('!!!!Success: Loaded deployment configuration from', url, window.DEPLOYMENT_CONFIG);
                        return true;
                    } else {
                        //debugLog console.log('!!!!Warning: Config script executed but DEPLOYMENT_CONFIG not found');
                        return false;
                    }
                } else {
                    //debugLog console.log(`!!!!Failed to load config from ${url}: HTTP ${response.status}`);
                }
            } catch (error) {
                // Could not load configuration from file (normal for local development)
                //debugLog console.log(`!!!!Error loading config from ${url}:`, error.message);
            }
            return false;
        },
        
        // Load configuration from environment variables (if available)
        // Note: In browser environments, we don't have access to process.env
        // Environment variables are typically passed via ConfigMaps or other mechanisms
        loadFromEnvironment() {
            //debugLog console.log("!!!!trying to load from environment (browser mode)");
            
            // Check if we're in a Node.js environment (server-side)
            if (typeof process !== 'undefined' && process.env) {
                //debugLog console.log("!!!!Node.js environment detected, loading from process.env");
                if (process.env.WEBSOCKET_URL) {
                    //debugLog console.log("!!!!Loading websocket url from environment variable", process.env.WEBSOCKET_URL);
                    window.WEBSOCKET_URL = process.env.WEBSOCKET_URL;
                }
                if (process.env.LEADERBOARD_URL) {
                    //debugLog console.log("!!!!Loading leaderboard url from environment variable", process.env.LEADERBOARD_URL);
                    window.LEADERBOARD_URL = process.env.LEADERBOARD_URL;
                }
            } else {
                //debugLog console.log("!!!!Browser environment - environment variables not directly accessible");
                //debugLog console.log("!!!!Use ConfigMaps, URL parameters, or deployment config instead");
            }
        },
        
        // Load configuration from URL parameters
        loadFromUrlParams() {
            const urlParams = new URLSearchParams(window.location.search);
            
            // WebSocket URL from URL parameter
            const wsUrl = urlParams.get('ws') || urlParams.get('websocket');
            if (wsUrl) {
                //debugLog console.log("!!!!Loading websocket url from url parameters", wsUrl);
                window.WEBSOCKET_URL = wsUrl;
            }
            
            // Leaderboard URL from URL parameter
            const leaderboardUrl = urlParams.get('leaderboard') || urlParams.get('lb');
            if (leaderboardUrl) {
                window.LEADERBOARD_URL = leaderboardUrl;
            }
        },
        
        // Initialize configuration loading
        async init() {
            //debugLog console.log('!!!!Starting configuration initialization...');
            
            // 0. Initialize basic SHOPMAZE_CONFIG if it doesn't exist
            this.ensureBaseConfiguration();
            
            // 1. Try to load from mounted ConfigMap file (container environments)
            // Note: We don't load the main config.js here as it's already loaded as an ES6 module
            // Try multiple possible paths for ConfigMap-mounted configuration
            let configLoaded = false;
            
            //debugLog console.log('!!!!Attempting to load configuration from file...');
            // Load ConfigMap configuration served by nginx - WAIT for completion
            try {
                configLoaded = await this.loadFromFile('/config/app-config.js');
                //debugLog console.log(`!!!!File loading completed. Config loaded: ${configLoaded}`);
            } catch (error) {
                //debugLog console.log('!!!!Error during file loading:', error);
                configLoaded = false;
            }
            
            // 2. Load from environment variables (only after file loading is complete)
            //debugLog console.log('!!!!Loading from environment variables...');
            this.loadFromEnvironment();
            
            // 3. Load from URL parameters (for testing/debugging)
            //debugLog console.log('!!!!Loading from URL parameters...');
            this.loadFromUrlParams();
            
            // 4. Set up WebSocket URL if configured (only after all sources are loaded)
            //debugLog console.log('!!!!Setting up WebSocket URL...');
            this.setupWebSocketUrl();
            
            // 5. Set up Leaderboard URL if configured
            console.log('!!!!Setting up Leaderboard URL...');
            this.setupLeaderboardUrl();
            console.log('finished Setting up Leaderboard URL...');
            //debugLog console.log('!!!!Configuration initialization complete');
            //debugLog console.log('!!!!Final configuration state:', {
            //debugLog     WEBSOCKET_URL: window.WEBSOCKET_URL,
            //debugLog     LEADERBOARD_URL: window.LEADERBOARD_URL,
            //debugLog     SHOPMAZE_CONFIG: window.SHOPMAZE_CONFIG,
            //debugLog     DEPLOYMENT_CONFIG: window.DEPLOYMENT_CONFIG
            //debugLog });
            
            // Set flag and trigger custom event when configuration is ready
            window.configReady = true;
            window.dispatchEvent(new CustomEvent('shopmaze-config-ready'));
        },
        
        // Ensure base configuration exists
        ensureBaseConfiguration() {
            if (!window.SHOPMAZE_CONFIG) {
                window.SHOPMAZE_CONFIG = {
                    websocketUrl: null,
                    leaderboardUrl: null,
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
                //debugLog console.log("window is undefined");
            } else {
                //debugLog console.log("window is defined");
            }
            
            //debugLog console.log("setting up websocket url");
            //debugLog console.log("window.WEBSOCKET_URL", window.WEBSOCKET_URL);
            // Check if WebSocket URL was already set (highest priority)
            if (window.WEBSOCKET_URL) {
                //debugLog console.log("websocket url already set to ", window.WEBSOCKET_URL);
                return; // Keep existing value
            }
            
            // Set from SHOPMAZE_CONFIG if available
            if (window.SHOPMAZE_CONFIG && window.SHOPMAZE_CONFIG.websocketUrl) {
                window.WEBSOCKET_URL = window.SHOPMAZE_CONFIG.websocketUrl;
                //debugLog console.log("websocket url set from shopmaze config");
            }
            
            // Handle deployment config overrides
            if (window.DEPLOYMENT_CONFIG) {
                // Merge deployment config
                Object.assign(window.SHOPMAZE_CONFIG, window.DEPLOYMENT_CONFIG);
                
                // Set WebSocket URL from deployment config
                if (window.DEPLOYMENT_CONFIG.websocketUrl) {
                    window.WEBSOCKET_URL = window.DEPLOYMENT_CONFIG.websocketUrl;
                    //debugLog console.log("websocket url set from deployment config");
                }
            }
            //debugLog console.log("websocket url set to", window.WEBSOCKET_URL);
            // For quick testing - uncomment one of these lines:
            // window.WEBSOCKET_URL = 'ws://localhost:8080/game-control';
            // window.WEBSOCKET_URL = 'wss://your-websocket-server.com/game-control';
        },
        
        // Set up Leaderboard URL from configuration
        setupLeaderboardUrl() {
            // Check if Leaderboard URL was already set (highest priority)
            if (window.LEADERBOARD_URL) {
                return; // Keep existing value
            }
            
            // Set from SHOPMAZE_CONFIG if available
            if (window.SHOPMAZE_CONFIG && window.SHOPMAZE_CONFIG.leaderboardUrl) {
                window.LEADERBOARD_URL = window.SHOPMAZE_CONFIG.leaderboardUrl;
            }
            
            // Handle deployment config overrides
            if (window.DEPLOYMENT_CONFIG && window.DEPLOYMENT_CONFIG.leaderboardUrl) {
                window.LEADERBOARD_URL = window.DEPLOYMENT_CONFIG.leaderboardUrl;
            }
            window.LEADERBOARD_URL = 'http://localhost:8099/leaderboard';
            console.log("leaderboard url set to", window.LEADERBOARD_URL);
            // For quick testing - uncomment one of these lines:
            // window.LEADERBOARD_URL = 'http://localhost:8081/leaderboard';
            // window.LEADERBOARD_URL = 'https://your-leaderboard-api.com/leaderboard';
        }
    };
    
    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            configLoader.init().catch(error => {
                //debugLog console.error('!!!!Configuration initialization failed:', error);
            });
        });
    } else {
        configLoader.init().catch(error => {
            //debugLog console.error('!!!!Configuration initialization failed:', error);
        });
    }
    
    // Expose loader for manual use
    window.ShopMazeConfigLoader = configLoader;
})();
