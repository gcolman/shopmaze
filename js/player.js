// Player Management Module
// Handles player state, movement, and related functionality

import { GAME_CONFIG, MAZE_LEVELS } from './config.js';

export class Player {
    constructor() {
        this.gridX = 1;
        this.gridY = 1;
        this.pixelX = GAME_CONFIG.TILE_SIZE;
        this.pixelY = GAME_CONFIG.TILE_SIZE;
        this.size = GAME_CONFIG.PLAYER_SIZE;
        this.isMoving = false;
        this.targetX = this.pixelX;
        this.targetY = this.pixelY;
        this.redHats = GAME_CONFIG.RED_HAT_COUNT_START;
        this.invincible = false;
        this.invincibilityTimer = null;
        this.flashTimer = null;
        this.isFlashing = false;
        this.shouldBlink = false;
        this.currentMaze = null;
    }

    // Initialize player for a new level
    initializeForLevel(maze) {
        this.currentMaze = maze;
        this.gridX = 1;
        this.gridY = 1;
        this.pixelX = GAME_CONFIG.TILE_SIZE;
        this.pixelY = GAME_CONFIG.TILE_SIZE;
        this.isMoving = false;
        this.targetX = this.pixelX;
        this.targetY = this.pixelY;
        // Keep invincibility state when going to new level (don't clear it)
    }

    // Reset player for new game
    reset() {
        this.gridX = 1;
        this.gridY = 1;
        this.pixelX = GAME_CONFIG.TILE_SIZE;
        this.pixelY = GAME_CONFIG.TILE_SIZE;
        this.isMoving = false;
        this.targetX = this.pixelX;
        this.targetY = this.pixelY;
        this.redHats = GAME_CONFIG.RED_HAT_COUNT_START;
        this.clearInvincibility();
    }

    // Clear invincibility state and timers
    clearInvincibility() {
        this.invincible = false;
        this.isFlashing = false;
        this.shouldBlink = false;
        
        if (this.invincibilityTimer) {
            clearTimeout(this.invincibilityTimer);
            this.invincibilityTimer = null;
        }
        
        if (this.flashTimer) {
            clearInterval(this.flashTimer);
            this.flashTimer = null;
        }
    }

    // Check if player can move in a direction (without actually moving)
    canMove(direction) {
        if (this.isMoving) {
            return false;
        }

        let newGridX = this.gridX;
        let newGridY = this.gridY;

        switch(direction) {
            case 'up':
                newGridY -= 1;
                break;
            case 'down':
                newGridY += 1;
                break;
            case 'left':
                newGridX -= 1;
                break;
            case 'right':
                newGridX += 1;
                break;
            default:
                return false;
        }

        // Check boundaries
        if (newGridX < 0 || newGridX >= GAME_CONFIG.MAZE_WIDTH_TILES || 
            newGridY < 0 || newGridY >= GAME_CONFIG.MAZE_HEIGHT_TILES) {
            return false;
        }

        // Check for walls
        if (this.currentMaze && this.currentMaze.layout[newGridY][newGridX] === 1) {
            return false;
        }

        return true;
    }

    // Attempt to move player in a direction
    move(direction, gameOver, gameActive, isContinuous = false) {
        if (gameOver || this.isMoving || !gameActive) {
            return false;
        }

        let newGridX = this.gridX;
        let newGridY = this.gridY;
        let moved = false;

        switch(direction) {
            case 'up':
                newGridY -= 1;
                moved = true;
                break;
            case 'down':
                newGridY += 1;
                moved = true;
                break;
            case 'left':
                newGridX -= 1;
                moved = true;
                break;
            case 'right':
                newGridX += 1;
                moved = true;
                break;
        }

        if (!moved) {
            return false;
        }

        // Check boundaries
        if (newGridX < 0 || newGridX >= GAME_CONFIG.MAZE_WIDTH_TILES || 
            newGridY < 0 || newGridY >= GAME_CONFIG.MAZE_HEIGHT_TILES) {
            return false;
        }

        // Check for walls
        if (this.currentMaze && this.currentMaze.layout[newGridY][newGridX] === 1) {
            return false;
        }

        // Update position
        this.gridX = newGridX;
        this.gridY = newGridY;
        this.targetX = newGridX * GAME_CONFIG.TILE_SIZE;
        this.targetY = newGridY * GAME_CONFIG.TILE_SIZE;
        this.isMoving = true;

        return true;
    }

    // Animate movement towards target position
    animateMovement() {
        if (!this.isMoving) return false;

        const speed = GAME_CONFIG.PLAYER_PIXEL_MOVE_SPEED;
        const dx = this.targetX - this.pixelX;
        const dy = this.targetY - this.pixelY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < speed) {
            // Snap to target
            this.pixelX = this.targetX;
            this.pixelY = this.targetY;
            this.isMoving = false;
            return true; // Movement completed
        } else {
            // Continue moving
            if (dx !== 0) this.pixelX += Math.sign(dx) * speed;
            if (dy !== 0) this.pixelY += Math.sign(dy) * speed;
            return false; // Still moving
        }
    }

    // Handle collision with ghost
    handleGhostCollision() {
        if (this.invincible) return false;

        this.redHats--;
        this.startInvincibility();

        return this.redHats <= 0; // Return true if game over
    }

    // Start invincibility period with flashing effect
    startInvincibility() {
        // Clear any existing invincibility
        this.clearInvincibility();
        
        this.invincible = true;
        this.isFlashing = true;
        this.shouldBlink = false;

        // Start flashing effect
        this.flashTimer = setInterval(() => {
            this.shouldBlink = !this.shouldBlink;
        }, GAME_CONFIG.PLAYER_FLASH_INTERVAL_MS);

        // End invincibility after duration
        this.invincibilityTimer = setTimeout(() => {
            this.clearInvincibility();
        }, GAME_CONFIG.PLAYER_INVINCIBILITY_DURATION_MS);
    }

    // Cleanup method for game end
    cleanup() {
        this.clearInvincibility();
    }

    // Get current position info
    getPosition() {
        return {
            gridX: this.gridX,
            gridY: this.gridY,
            pixelX: this.pixelX,
            pixelY: this.pixelY
        };
    }

    // Check if player should blink (when invincible)
    shouldBlink() {
        return this.invincible && Math.floor(Date.now() / 150) % 2 === 0;
    }
}
