// ShopMaze Configuration
// This file can be customized for different deployment environments
//
// Available exports:
// - ASSET_PATHS: Game asset file paths (object)
// - T_SHIRTS_CONFIG: T-shirt item configurations (array)
// - GAME_CONFIG: Game mechanics constants (object)
// - MAZE_LEVELS: Level configurations (object)
// 
// Global variables set:
// - window.WEBSOCKET_URL: WebSocket connection URL
// - window.SHOPMAZE_CONFIG: Runtime configuration

// Asset paths for game resources
export const ASSET_PATHS = {
    player: 'assets/player.png',
    ghost: 'assets/ghost.png',
    coin: 'assets/coin.png',
    background: 'assets/background.png',
    wallTile: 'assets/wall_tile.png',
    redHatIcon: 'assets/red_hat_icon.png'
};

// T-shirt configuration for game items
export const T_SHIRTS_CONFIG = [
    {
        id: 'ansible',
        name: 'Ansible T-Shirt',
        src: 'assets/t_shirt_ansible.png',
        price: 10,
        spawnThreshold: 10,
        description: 'Automate everything with style!'
    },
    {
        id: 'openshift',
        name: 'OpenShift T-Shirt',
        src: 'assets/t_shirt_openshift.png',
        price: 15,
        spawnThreshold: 15,
        description: 'Container orchestration made easy!'
    },
    {
        id: 'rhel',
        name: 'RHEL T-Shirt',
        src: 'assets/t_shirt_rhel.png',
        price: 20,
        spawnThreshold: 20,
        description: 'The foundation of enterprise computing!'
    }
];

// Game configuration constants
export const GAME_CONFIG = {
    TILE_SIZE: 32,
    BASE_CANVAS_WIDTH: 416, // 13 * 32
    BASE_CANVAS_HEIGHT: 480, // 15 * 32
    CANVAS_WIDTH: 416, // Will be dynamically updated
    CANVAS_HEIGHT: 480, // Will be dynamically updated
    MAZE_WIDTH_TILES: 13,
    MAZE_HEIGHT_TILES: 15,
    PLAYER_SIZE: 28,
    PLAYER_SPEED: 10,
    PLAYER_PIXEL_MOVE_SPEED: 5,
    CONTINUOUS_MOVEMENT_SPEED: 200,
    GHOST_SPEED: 2,
    GHOST_SIZE: 28,
    GHOST_PIXEL_MOVE_SPEED: 1,
    GHOST_CHASE_INTERVAL_MS: 200,
    GHOST_RECURRING_SPAWN_INTERVAL_SECONDS: 10,
    GHOST_SPAWN_DELAY_SECONDS: 3,
    MAX_GHOSTS: 4,
    
    // Progressive ghost difficulty settings
    GHOST_BASE_SPEED: 5,                    // Starting speed for level 1
    GHOST_BASE_PIXEL_MOVE_SPEED: 5,         // Starting pixel speed for level 1
    GHOST_BASE_CHASE_INTERVAL_MS: 1000,     // Starting chase interval for level 1
    GHOST_SPEED_MULTIPLIER_PER_LEVEL: 50,    // Add this much speed per level
    GHOST_PIXEL_SPEED_MULTIPLIER_PER_LEVEL: 20, // Add this much pixel speed per level
    GHOST_CHASE_INTERVAL_REDUCTION_PER_LEVEL: 250, // Reduce interval by this much per level
    COIN_SIZE: 20,
    COIN_VALUE: 10,
    COINS_PER_LEVEL: 25,
    T_SHIRT_SIZE: 24,
    T_SHIRT_TIMEOUT_SECONDS: 15,
    RED_HAT_COUNT_START: 3,
    FPS: 60,
    MIN_SWIPE_DISTANCE: 30,
    PLAYER_INVINCIBILITY_DURATION_MS: 3000, // 3 seconds
    PLAYER_FLASH_INTERVAL_MS: 150, // Flash every 150ms during invincibility
    RED_HAT_SIZE: 24,
    RED_HAT_SPAWN_INTERVAL_SECONDS: 30, // Spawn every 30 seconds
    RED_HAT_TIMEOUT_SECONDS: 20 // Red hat disappears after 20 seconds
};

// Maze level configurations
export const MAZE_LEVELS = {
    level1: {
        width: 13,
        height: 15,
        ghosts: 3,
        coins: 25,
        layout: [
            // Simple 13x15 maze layout: 1 = wall, 0 = open space
            [1,1,1,1,1,1,1,1,1,1,1,1,1],
            [1,0,0,0,0,0,1,0,0,0,0,0,1],
            [1,0,1,1,1,0,1,0,1,1,1,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,1,0,1,1,1,1,1,0,1,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,1,1,0,1,0,1,0,1,0,1,1,1],
            [1,0,0,0,0,0,1,0,0,0,0,0,1],
            [1,1,1,0,1,0,1,0,1,0,1,1,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,1,0,1,1,1,1,1,0,1,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,1,1,1,0,1,0,1,1,1,0,1],
            [1,0,0,0,0,0,1,0,0,0,0,0,1],
            [1,1,1,1,1,1,1,1,1,1,1,1,1]
        ]
    },
    level2: {
        width: 13,
        height: 15,
        ghosts: 4,
        coins: 30,
        layout: [
            // More complex 13x15 maze for level 2
            [1,1,1,1,1,1,1,1,1,1,1,1,1],
            [1,0,0,0,1,0,0,0,1,0,0,0,1],
            [1,0,1,0,1,0,1,0,1,0,1,0,1],
            [1,0,1,0,0,0,1,0,0,0,1,0,1],
            [1,0,1,1,1,0,1,0,1,1,1,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,1,1,0,1,1,1,1,1,0,1,1,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,1,1,0,1,1,1,1,1,0,1,1,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,1,1,1,0,1,0,1,1,1,0,1],
            [1,0,1,0,0,0,1,0,0,0,1,0,1],
            [1,0,1,0,1,0,1,0,1,0,1,0,1],
            [1,0,0,0,1,0,0,0,1,0,0,0,1],
            [1,1,1,1,1,1,1,1,1,1,1,1,1]
        ]
    },
    level3: {
        width: 13,
        height: 15,
        ghosts: 5,
        coins: 35,
        layout: [
            // Complex 13x15 maze for level 3
            [1,1,1,1,1,1,1,1,1,1,1,1,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,1,0,1,0,1,0,1,0,1,0,1],
            [1,0,0,0,1,0,0,0,1,0,0,0,1],
            [1,1,1,0,1,0,1,0,1,0,1,1,1],
            [1,0,0,0,0,0,1,0,0,0,0,0,1],
            [1,0,1,1,1,1,1,1,1,1,1,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,1,1,1,1,1,1,1,1,1,0,1],
            [1,0,0,0,0,0,1,0,0,0,0,0,1],
            [1,1,1,0,1,0,1,0,1,0,1,1,1],
            [1,0,0,0,1,0,0,0,1,0,0,0,1],
            [1,0,1,0,1,0,1,0,1,0,1,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,1,1,1,1,1,1,1,1,1,1,1,1]
        ]
    }
};

// Utility function to calculate ghost settings for a given level
export function calculateGhostSettings(levelIndex) {
    // Level index is 0-based, so level 1 = index 0
    const level = levelIndex + 1;
    
    const ghostSpeed = GAME_CONFIG.GHOST_BASE_SPEED + (levelIndex * GAME_CONFIG.GHOST_SPEED_MULTIPLIER_PER_LEVEL);
    const ghostPixelMoveSpeed = GAME_CONFIG.GHOST_BASE_PIXEL_MOVE_SPEED + (levelIndex * GAME_CONFIG.GHOST_PIXEL_SPEED_MULTIPLIER_PER_LEVEL);
    const ghostChaseInterval = Math.max(
        500, // Minimum interval of 0.5 seconds
        GAME_CONFIG.GHOST_BASE_CHASE_INTERVAL_MS - (levelIndex * GAME_CONFIG.GHOST_CHASE_INTERVAL_REDUCTION_PER_LEVEL)
    );
    

    
    return {
        ghostSpeed,
        ghostPixelMoveSpeed,
        ghostChaseInterval
    };
}

// WebSocket Configuration
// Set window.WEBSOCKET_URL to override automatic detection
// Examples:
// window.WEBSOCKET_URL = 'ws://localhost:8080/game-control';
 window.WEBSOCKET_URL = 'wss://redhat-quest-server-gcolman1-dev.apps.rm2.thpm.p1.openshiftapps.com/game-control';

// Note: All window-dependent configuration is handled by config-loader.js
// This ensures proper initialization order and prevents "window undefined" errors
// 
// To configure WebSocket URL, use one of these methods:
// 1. URL parameter: ?ws=ws://localhost:8080/game-control
// 2. Set window.WEBSOCKET_URL before config-loader.js runs
// 3. Use ConfigMap/deployment configuration
// 4. Edit config-loader.js for custom configuration

