// Ghost AI Module
// Handles ghost spawning, movement, and AI behavior

import { GAME_CONFIG } from './config.js';

export class Ghost {
    constructor(gridX, gridY, speed = GAME_CONFIG.GHOST_BASE_SPEED, pixelMoveSpeed = GAME_CONFIG.GHOST_BASE_PIXEL_MOVE_SPEED) {
        this.gridX = gridX;
        this.gridY = gridY;
        this.pixelX = gridX * GAME_CONFIG.TILE_SIZE;
        this.pixelY = gridY * GAME_CONFIG.TILE_SIZE;
        this.size = GAME_CONFIG.GHOST_SIZE;
        this.isMoving = false;
        this.targetX = this.pixelX;
        this.targetY = this.pixelY;
        
        // Level-specific speed settings
        this.speed = speed;
        this.pixelMoveSpeed = pixelMoveSpeed;
    }

    // Animate movement towards target position
    animateMovement() {
        if (!this.isMoving) return;

        const speed = this.pixelMoveSpeed;
        const dx = this.targetX - this.pixelX;
        const dy = this.targetY - this.pixelY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < speed) {
            this.pixelX = this.targetX;
            this.pixelY = this.targetY;
            this.isMoving = false;
        } else {
            if (dx !== 0) this.pixelX += Math.sign(dx) * speed;
            if (dy !== 0) this.pixelY += Math.sign(dy) * speed;
        }
    }

    // Update ghost position to chase player
    updatePosition(playerGridX, playerGridY, maze) {
        if (this.isMoving) return;

        let newGhostGridX = this.gridX;
        let newGhostGridY = this.gridY;

        // Simple pathfinding: move towards player's position
        if (Math.abs(playerGridX - this.gridX) > Math.abs(playerGridY - this.gridY)) {
            if (playerGridX > this.gridX) newGhostGridX++;
            else if (playerGridX < this.gridX) newGhostGridX--;
        } else {
            if (playerGridY > this.gridY) newGhostGridY++;
            else if (playerGridY < this.gridY) newGhostGridY--;
        }

        // Check if new position is valid
        if (this._isValidPosition(newGhostGridX, newGhostGridY, maze)) {
            this._moveToPosition(newGhostGridX, newGhostGridY);
        } else {
            // Try alternative direction
            newGhostGridX = this.gridX;
            newGhostGridY = this.gridY;

            if (Math.abs(playerGridX - this.gridX) <= Math.abs(playerGridY - this.gridY)) {
                if (playerGridX > this.gridX) newGhostGridX++;
                else if (playerGridX < this.gridX) newGhostGridX--;
            } else {
                if (playerGridY > this.gridY) newGhostGridY++;
                else if (playerGridY < this.gridY) newGhostGridY--;
            }

            if (this._isValidPosition(newGhostGridX, newGhostGridY, maze)) {
                this._moveToPosition(newGhostGridX, newGhostGridY);
            }
        }
    }

    _isValidPosition(gridX, gridY, maze) {
        return maze[gridY] !== undefined && 
               maze[gridY][gridX] !== undefined && 
               maze[gridY][gridX] === 0;
    }

    _moveToPosition(gridX, gridY) {
        this.gridX = gridX;
        this.gridY = gridY;
        this.targetX = gridX * GAME_CONFIG.TILE_SIZE;
        this.targetY = gridY * GAME_CONFIG.TILE_SIZE;
        this.isMoving = true;
    }

    // Check if ghost collides with player
    collidesWithPlayer(playerGridX, playerGridY) {
        return this.gridX === playerGridX && this.gridY === playerGridY;
    }
}

export class GhostManager {
    constructor() {
        this.activeGhosts = [];
        this.ghostSpawnTimer = null;
        this.pendingGhostSpawn = false;
        this.ghostRecurringSpawnTimerId = null;
        this.ghostMovementIntervalId = null;
        
        // Level-specific settings (will be updated per level)
        this.currentLevelConfig = {
            ghostSpeed: GAME_CONFIG.GHOST_BASE_SPEED,
            ghostPixelMoveSpeed: GAME_CONFIG.GHOST_BASE_PIXEL_MOVE_SPEED,
            ghostChaseInterval: GAME_CONFIG.GHOST_BASE_CHASE_INTERVAL_MS
        };
    }

    // Configure ghost settings for current level
    configureLevelSettings(levelConfig) {
        this.currentLevelConfig = {
            ghostSpeed: levelConfig.ghostSpeed || GAME_CONFIG.GHOST_BASE_SPEED,
            ghostPixelMoveSpeed: levelConfig.ghostPixelMoveSpeed || GAME_CONFIG.GHOST_BASE_PIXEL_MOVE_SPEED,
            ghostChaseInterval: levelConfig.ghostChaseInterval || GAME_CONFIG.GHOST_BASE_CHASE_INTERVAL_MS
        };
        
        // Update existing ghosts with new speed
        this.activeGhosts.forEach(ghost => {
            ghost.speed = this.currentLevelConfig.ghostSpeed;
            ghost.pixelMoveSpeed = this.currentLevelConfig.ghostPixelMoveSpeed;
        });
        
        // Restart movement timer with new interval if needed
        if (this.ghostMovementIntervalId) {
            clearInterval(this.ghostMovementIntervalId);
            this.ghostMovementIntervalId = setInterval(() => {
                this.updateAllGhostPositions();
            }, this.currentLevelConfig.ghostChaseInterval);
        }
    }

    // Initialize ghost system
    initialize() {
        this.cleanup();
        this.startInitialGhostSpawnTimer();
        this.ghostMovementIntervalId = setInterval(() => {
            this.updateAllGhostPositions();
        }, this.currentLevelConfig.ghostChaseInterval);
        this.ghostRecurringSpawnTimerId = setInterval(() => {
            this.manageRecurringGhostSpawns();
        }, GAME_CONFIG.GHOST_RECURRING_SPAWN_INTERVAL_SECONDS * 1000);
    }

    // Clean up all ghost-related timers and objects
    cleanup() {
        this.activeGhosts = [];
        clearTimeout(this.ghostSpawnTimer);
        clearInterval(this.ghostRecurringSpawnTimerId);
        clearInterval(this.ghostMovementIntervalId);
        this.ghostSpawnTimer = null;
        this.ghostRecurringSpawnTimerId = null;
        this.ghostMovementIntervalId = null;
        this.pendingGhostSpawn = false;
    }

    // Start initial ghost spawn timer
    startInitialGhostSpawnTimer() {
        clearTimeout(this.ghostSpawnTimer);
        const delayMs = GAME_CONFIG.GHOST_SPAWN_DELAY_SECONDS * 1000;
        this.ghostSpawnTimer = setTimeout(() => {
            if (this.activeGhosts.length < GAME_CONFIG.MAX_GHOSTS) {
                this.spawnGhost();
            }
        }, delayMs);
    }

    // Manage recurring ghost spawns
    manageRecurringGhostSpawns() {
        if (this.activeGhosts.length < GAME_CONFIG.MAX_GHOSTS && !this.pendingGhostSpawn) {
            this.spawnGhost();
        }
    }

    // Spawn a new ghost at a random valid location
    spawnGhost() {
        if (this.activeGhosts.length >= GAME_CONFIG.MAX_GHOSTS) {
            this.pendingGhostSpawn = false;
            return;
        }

        const spawnPosition = this._findValidSpawnPosition();
        if (spawnPosition) {
            const newGhost = new Ghost(
                spawnPosition.x, 
                spawnPosition.y, 
                this.currentLevelConfig.ghostSpeed,
                this.currentLevelConfig.ghostPixelMoveSpeed
            );
            this.activeGhosts.push(newGhost);
            this.pendingGhostSpawn = false;
        } else {
            // Retry spawning after a delay
            this.pendingGhostSpawn = true;
            setTimeout(() => {
                if (this.activeGhosts.length < GAME_CONFIG.MAX_GHOSTS) {
                    this.spawnGhost();
                } else {
                    this.pendingGhostSpawn = false;
                }
            }, 1000);
        }
    }

    _findValidSpawnPosition() {
        let attempts = 0;
        const maxAttempts = 100;

        while (attempts < maxAttempts) {
            const spawnGridX = Math.floor(Math.random() * GAME_CONFIG.MAZE_WIDTH_TILES);
            const spawnGridY = Math.floor(Math.random() * GAME_CONFIG.MAZE_HEIGHT_TILES);

            if (this._isValidSpawnPosition(spawnGridX, spawnGridY)) {
                return { x: spawnGridX, y: spawnGridY };
            }
            attempts++;
        }

        return null;
    }

    _isValidSpawnPosition(x, y) {
        // These need to be set by the game controller
        const maze = this.currentMaze;
        const player = this.player;
        const coins = this.coins;
        const tShirtInLevel = this.tShirtInLevel;

        if (!maze) {
            return false;
        }
        if (maze[y][x] !== 0) {
            return false;
        }
        if (player && x === player.gridX && y === player.gridY) return false;
        if (this.activeGhosts.some(g => g.gridX === x && g.gridY === y)) return false;
        if (coins && coins.some(c => !c.collected && c.gridX === x && c.gridY === y)) return false;
        if (tShirtInLevel && tShirtInLevel.gridX === x && tShirtInLevel.gridY === y) return false;

        return true;
    }

    // Set game state references for spawn validation
    setGameState(maze, player, coins, tShirtInLevel) {
        this.currentMaze = maze;
        this.player = player;
        this.coins = coins;
        this.tShirtInLevel = tShirtInLevel;
    }

    // Update all ghost positions
    updateAllGhostPositions() {
        if (!this.player) return;
                
        this.activeGhosts.forEach(ghost => {
            ghost.updatePosition(this.player.gridX, this.player.gridY, this.currentMaze);
        });
    }

    // Animate all ghost movements
    animateAllGhostMovements() {
        this.activeGhosts.forEach(ghost => {
            ghost.animateMovement();
        });
    }

    // Check collisions between ghosts and player
    checkPlayerCollisions() {
        if (!this.player || this.player.invincible) return null;

        for (let i = this.activeGhosts.length - 1; i >= 0; i--) {
            const ghost = this.activeGhosts[i];
            if (ghost.collidesWithPlayer(this.player.gridX, this.player.gridY)) {
                // Remove the ghost that hit the player
                this.activeGhosts.splice(i, 1);
                return true; // Collision occurred
            }
        }
        return false;
    }

    // Get all active ghosts
    getActiveGhosts() {
        return this.activeGhosts;
    }
}
