// Game Objects Module
// Handles coins, t-shirts, and other collectible objects

import { GAME_CONFIG } from './config.js';

export class Coin {
    constructor(gridX, gridY) {
        this.gridX = gridX;
        this.gridY = gridY;
        this.width = GAME_CONFIG.COIN_SIZE;
        this.height = GAME_CONFIG.COIN_SIZE;
        this.collected = false;
    }

    // Check if player is on this coin's position
    checkCollision(playerGridX, playerGridY) {
        return !this.collected && 
               this.gridX === playerGridX && 
               this.gridY === playerGridY;
    }

    // Collect this coin
    collect() {
        this.collected = true;
    }
}

export class TShirt {
    constructor(config, gridX, gridY) {
        this.id = config.id;
        this.cost = config.price; // Use 'price' from config
        this.img = config.img;
        this.gridX = gridX;
        this.gridY = gridY;
        this.width = GAME_CONFIG.T_SHIRT_SIZE;
        this.height = GAME_CONFIG.T_SHIRT_SIZE;
        this.collected = false;
        this.timeLeft = GAME_CONFIG.T_SHIRT_TIMEOUT_SECONDS;
        this.timerInterval = null;
    }

    // Start countdown timer for this t-shirt
    startTimer(onTimeout) {
        this.timeLeft = GAME_CONFIG.T_SHIRT_TIMEOUT_SECONDS;
        this.timerInterval = setInterval(() => {
            this.timeLeft--;
            if (this.timeLeft <= 0) {
                this.stopTimer();
                if (onTimeout) onTimeout(this);
            }
        }, 1000);
    }

    // Stop the countdown timer
    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    // Check if player is on this t-shirt's position
    checkCollision(playerGridX, playerGridY) {
        return !this.collected && 
               this.gridX === playerGridX && 
               this.gridY === playerGridY;
    }

    // Attempt to collect this t-shirt (if player has enough coins)
    tryCollect(currentCoins) {
        if (currentCoins >= this.cost) {
            this.collected = true;
            this.stopTimer();
            return { success: true, cost: this.cost };
        }
        return { success: false, cost: this.cost };
    }
}

export class RedHat {
    constructor(gridX, gridY) {
        this.gridX = gridX;
        this.gridY = gridY;
        this.width = GAME_CONFIG.RED_HAT_SIZE;
        this.height = GAME_CONFIG.RED_HAT_SIZE;
        this.collected = false;
        this.timeLeft = GAME_CONFIG.RED_HAT_TIMEOUT_SECONDS;
        this.timerInterval = null;
    }

    // Start countdown timer for this red hat
    startTimer(onTimeout) {
        this.timeLeft = GAME_CONFIG.RED_HAT_TIMEOUT_SECONDS;
        this.timerInterval = setInterval(() => {
            this.timeLeft--;
            if (this.timeLeft <= 0) {
                this.stopTimer();
                if (onTimeout) onTimeout(this);
            }
        }, 1000);
    }

    // Stop the countdown timer
    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    // Check if player is on this red hat's position
    checkCollision(playerGridX, playerGridY) {
        return !this.collected && 
               this.gridX === playerGridX && 
               this.gridY === playerGridY;
    }

    // Collect this red hat
    collect() {
        this.collected = true;
        this.stopTimer();
        return true;
    }
}

export class GameObjectManager {
    constructor(assetLoader) {
        this.assetLoader = assetLoader;
        this.coins = [];
        this.tShirtInLevel = null;
        this.redHatInLevel = null;
        this.redHatSpawnTimer = null;
        this.currentCoinCount = 0;
        this.shoppingBasket = [];
    }

    // Initialize coins for current maze
    initializeCoinsForMaze(maze, playerGridX, playerGridY) {
        this.coins = [];
        const accessibleCells = [];

        // Find all accessible cells (excluding player spawn)
        for (let y = 0; y < GAME_CONFIG.MAZE_HEIGHT_TILES; y++) {
            for (let x = 0; x < GAME_CONFIG.MAZE_WIDTH_TILES; x++) {
                // Use the same validation as t-shirt spawning for consistency
                if (this._isValidSpawnPosition(maze, x, y) && !(x === playerGridX && y === playerGridY)) {
                    accessibleCells.push({ gridX: x, gridY: y });
                }
            }
        }
        
        // Shuffle and select coin positions
        this._shuffleArray(accessibleCells);
        
        const coinCount = Math.min(GAME_CONFIG.COINS_PER_LEVEL, accessibleCells.length);
        for (let i = 0; i < coinCount; i++) {
            const pos = accessibleCells[i];
            this.coins.push(new Coin(pos.gridX, pos.gridY));
        }
    }

    _shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    // Check and handle coin collections
    checkCoinCollections(playerGridX, playerGridY) {
        let coinsCollected = 0;
        
        this.coins.forEach(coin => {
            if (coin.checkCollision(playerGridX, playerGridY)) {
                coin.collect();
                this.currentCoinCount++;
                coinsCollected++;
            }
        });

        return coinsCollected;
    }

    // Check if all coins are collected
    allCoinsCollected() {
        return this.coins.every(coin => coin.collected);
    }

    // Spawn a t-shirt in the level
    spawnTShirt() {
        if (this.tShirtInLevel) return false; // Already has a t-shirt

        const tShirts = this.assetLoader.getTShirts();
        const eligibleTShirts = tShirts.filter(tShirt => 
            !tShirt.collected && this.currentCoinCount >= tShirt.spawnThreshold
        );

        if (eligibleTShirts.length === 0) return false;

        // Choose random eligible t-shirt
        const selectedConfig = eligibleTShirts[Math.floor(Math.random() * eligibleTShirts.length)];
        
        // Find spawn position
        const spawnPosition = this._findValidTShirtSpawnPosition();
        if (!spawnPosition) {
            return false;
        }

        // Final validation before creating t-shirt
        if (!this._isValidSpawnPosition(this.currentMaze, spawnPosition.x, spawnPosition.y)) {
            return false;
        }

        // Create and place t-shirt
        this.tShirtInLevel = new TShirt(selectedConfig, spawnPosition.x, spawnPosition.y);
        this.tShirtInLevel.startTimer((tShirt) => {
            this.removeTShirtFromLevel();
        });

        return true;
    }

    // Start red hat spawning timer
    startRedHatSpawning() {
        // Clear any existing timer
        this.stopRedHatSpawning();
        
        // Start recurring timer to spawn red hats every 30 seconds
        this.redHatSpawnTimer = setInterval(() => {
            this.spawnRedHat();
        }, GAME_CONFIG.RED_HAT_SPAWN_INTERVAL_SECONDS * 1000);

    }

    // Stop red hat spawning timer
    stopRedHatSpawning() {
        if (this.redHatSpawnTimer) {
            clearInterval(this.redHatSpawnTimer);
            this.redHatSpawnTimer = null;
        }
    }

    // Spawn a red hat (timer-based)
    spawnRedHat() {
        // Don't spawn if already have one
        if (this.redHatInLevel) {
            return false;
        }

        // Find spawn position
        const spawnPosition = this._findValidRedHatSpawnPosition();
        if (!spawnPosition) {
            return false;
        }

        // Create and place red hat
        this.redHatInLevel = new RedHat(spawnPosition.x, spawnPosition.y);
        this.redHatInLevel.startTimer((redHat) => {
            this.removeRedHatFromLevel();
        });
        
        return true;
    }

    // Remove red hat from level
    removeRedHatFromLevel() {
        if (this.redHatInLevel) {
            this.redHatInLevel.stopTimer();
            this.redHatInLevel = null;
        }
    }

    // Find valid spawn position for red hat
    _findValidRedHatSpawnPosition() {
        const maze = this.currentMaze;
        const player = this.player;
        const activeGhosts = this.activeGhosts;

        if (!maze || !this._validateMazeIntegrity(maze)) {
            return null;
        }

        // Find all accessible cells
        const accessibleCells = [];
        
        for (let y = 0; y < GAME_CONFIG.MAZE_HEIGHT_TILES; y++) {
            for (let x = 0; x < GAME_CONFIG.MAZE_WIDTH_TILES; x++) {
                if (this._isValidSpawnPosition(maze, x, y)) {
                    // Check if position is not occupied
                    const isPlayerPosition = player && x === player.gridX && y === player.gridY;
                    const isGhostPosition = activeGhosts && activeGhosts.some(g => g.gridX === x && g.gridY === y);
                    const isCoinPosition = this.coins.some(c => !c.collected && c.gridX === x && c.gridY === y);
                    const isTShirtPosition = this.tShirtInLevel && x === this.tShirtInLevel.gridX && y === this.tShirtInLevel.gridY;
                    
                    if (!isPlayerPosition && !isGhostPosition && !isCoinPosition && !isTShirtPosition) {
                        accessibleCells.push({ x, y });
                    }
                }
            }
        }

        if (accessibleCells.length === 0) {
            return null;
        }

        // Choose random position from valid cells
        const randomIndex = Math.floor(Math.random() * accessibleCells.length);
        const selectedPosition = accessibleCells[randomIndex];
        
        // Final validation
        if (this._isValidSpawnPosition(maze, selectedPosition.x, selectedPosition.y)) {
            return selectedPosition;
        }
        
        return null;
    }

    // Check and handle red hat collection
    checkRedHatCollection(playerGridX, playerGridY) {
        if (!this.redHatInLevel) return null;

        if (this.redHatInLevel.checkCollision(playerGridX, playerGridY)) {
            this.redHatInLevel.collect();
            const collectedRedHat = this.redHatInLevel;
            this.redHatInLevel = null;
            return collectedRedHat;
        }
        return null;
    }

    // Helper method to validate if a position is truly accessible
    _isValidSpawnPosition(maze, x, y) {
        // Check bounds
        if (x < 0 || x >= GAME_CONFIG.MAZE_WIDTH_TILES || y < 0 || y >= GAME_CONFIG.MAZE_HEIGHT_TILES) {
            return false;
        }
        
        // Check if maze data exists at this position
        if (!maze || !maze[y] || maze[y][x] === undefined) {
            return false;
        }
        
        // Check if it's an open path (0 = open, 1 = wall)
        return maze[y][x] === 0;
    }

    // Validate maze integrity
    _validateMazeIntegrity(maze) {
        if (!maze || !Array.isArray(maze)) return false;
        if (maze.length !== GAME_CONFIG.MAZE_HEIGHT_TILES) return false;
        
        for (let y = 0; y < maze.length; y++) {
            if (!Array.isArray(maze[y]) || maze[y].length !== GAME_CONFIG.MAZE_WIDTH_TILES) {
                return false;
            }
        }
        return true;
    }

    _findValidTShirtSpawnPosition() {
        const maze = this.currentMaze;
        const player = this.player;
        const activeGhosts = this.activeGhosts;

        if (!maze || !this._validateMazeIntegrity(maze)) {
            return null;
        }

        // Find all accessible cells
        const accessibleCells = [];
        
        for (let y = 0; y < GAME_CONFIG.MAZE_HEIGHT_TILES; y++) {
            for (let x = 0; x < GAME_CONFIG.MAZE_WIDTH_TILES; x++) {
                // Use helper method to validate position
                if (this._isValidSpawnPosition(maze, x, y)) {
                    // Check if position is not occupied
                    const isPlayerPosition = player && x === player.gridX && y === player.gridY;
                    const isGhostPosition = activeGhosts && activeGhosts.some(g => g.gridX === x && g.gridY === y);
                    const isCoinPosition = this.coins.some(c => !c.collected && c.gridX === x && c.gridY === y);
                    const isRedHatPosition = this.redHatInLevel && x === this.redHatInLevel.gridX && y === this.redHatInLevel.gridY;
                    
                    if (!isPlayerPosition && !isGhostPosition && !isCoinPosition && !isRedHatPosition) {
                        accessibleCells.push({ x, y });
                    }
                }
            }
        }

        if (accessibleCells.length === 0) {
            return null;
        }

        // Choose random position from valid cells
        const randomIndex = Math.floor(Math.random() * accessibleCells.length);
        const selectedPosition = accessibleCells[randomIndex];
        
        // Final validation
        if (this._isValidSpawnPosition(maze, selectedPosition.x, selectedPosition.y)) {
            return selectedPosition;
        }
        
        return null;
    }



    // Set game state references
    setGameState(maze, player, activeGhosts) {
        this.currentMaze = maze;
        this.player = player;
        this.activeGhosts = activeGhosts;
    }

    // Check and handle t-shirt collection
    checkTShirtCollection(playerGridX, playerGridY) {
        if (!this.tShirtInLevel) return null;
        
        if (this.tShirtInLevel.checkCollision(playerGridX, playerGridY)) {
            const result = this.tShirtInLevel.tryCollect(this.currentCoinCount);
            
            if (result.success) {
                // Store the t-shirt ID before removing it
                const tShirtId = this.tShirtInLevel.id;
                
                // Add to shopping basket
                this.shoppingBasket.push({
                    id: this.tShirtInLevel.id,
                    cost: this.tShirtInLevel.cost,
                    src: this.tShirtInLevel.img.src
                });
                
                this.currentCoinCount -= result.cost;
                this.removeTShirtFromLevel();
                
                // Mark as collected in the main t-shirts array
                const tShirts = this.assetLoader.getTShirts();
                const tShirt = tShirts.find(t => t.id === tShirtId);
                if (tShirt) tShirt.collected = true;
                
                return { success: true, cost: result.cost };
            } else {
                return { success: false, cost: result.cost };
            }
        }

        return null;
    }

    // Remove t-shirt from level
    removeTShirtFromLevel() {
        if (this.tShirtInLevel) {
            this.tShirtInLevel.stopTimer();
            this.tShirtInLevel = null;
        }
    }

    // Check if should spawn t-shirt
    shouldSpawnTShirt() {
        if (this.tShirtInLevel) return false;
        
        const tShirts = this.assetLoader.getTShirts();
        return tShirts.some(tShirt => 
            !tShirt.collected && this.currentCoinCount >= tShirt.spawnThreshold
        );
    }

    // Reset for new game
    resetForNewGame() {
        this.currentCoinCount = 0;
        this.shoppingBasket = [];
        this.removeTShirtFromLevel();
        this.removeRedHatFromLevel();
        this.stopRedHatSpawning();
        
        // Reset all t-shirts as uncollected
        const tShirts = this.assetLoader.getTShirts();
        tShirts.forEach(tShirt => tShirt.collected = false);
    }

    // Reset for new level (keep coins and basket)
    resetForNewLevel() {
        this.removeTShirtFromLevel();
        this.removeRedHatFromLevel();
        // Keep red hat spawning timer running for new level
        
        // Reset t-shirts as uncollected for new level
        const tShirts = this.assetLoader.getTShirts();
        tShirts.forEach(tShirt => tShirt.collected = false);
    }

    // Get current state
    getCurrentState() {
        return {
            coins: this.coins,
            tShirtInLevel: this.tShirtInLevel,
            redHatInLevel: this.redHatInLevel,
            currentCoinCount: this.currentCoinCount,
            shoppingBasket: this.shoppingBasket
        };
    }
}
