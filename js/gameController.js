// Main Game Controller
// Orchestrates all game modules and manages the main game loop

import { GAME_CONFIG, MAZE_LEVELS, calculateGhostSettings } from './config.js';
import { AssetLoader } from './assetLoader.js';
import { Player } from './player.js';
import { InputHandler } from './inputHandler.js';
import { GhostManager } from './ghostAI.js';
import { GameObjectManager } from './gameObjects.js';
import { Renderer } from './renderer.js';
import { UIManager } from './uiManager.js';
import { WebSocketController } from './websocketController.js';

export class GameController {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.setupResponsiveCanvas();
        
        // Initialize all modules
        this.assetLoader = new AssetLoader();
        this.player = new Player();
        this.inputHandler = new InputHandler(this.player);
        this.ghostManager = new GhostManager();
        this.gameObjectManager = new GameObjectManager(this.assetLoader);
        this.renderer = new Renderer(this.canvas, this.assetLoader);
        this.uiManager = new UIManager();
        
        // Game state
        this.currentLevelIndex = 0;
        
        if (!MAZE_LEVELS || typeof MAZE_LEVELS !== 'object') {
            console.error('GameController: MAZE_LEVELS is not properly imported!', MAZE_LEVELS);
            throw new Error('MAZE_LEVELS import failed');
        }
        
        this.levelKeys = Object.keys(MAZE_LEVELS);
        
        if (this.levelKeys.length === 0) {
            console.error('GameController: MAZE_LEVELS is empty!');
            throw new Error('MAZE_LEVELS is empty');
        }
        
        this.currentMaze = MAZE_LEVELS[this.levelKeys[this.currentLevelIndex]];
        
        if (!this.currentMaze) {
            console.error('GameController: Failed to load maze for level:', this.levelKeys[this.currentLevelIndex]);
            throw new Error('Failed to load initial maze');
        }
        this.gameOver = false;
        this.gameActive = true;
        this.gameLoopId = null;
        this.isPaused = false;
        
        // Initialize WebSocket controller
        this.websocketController = null;
        
        // Set up asset loading callback
        this.assetLoader.setOnAllAssetsLoaded(() => {
            this.onAllAssetsLoaded();
        });
        
        // Set up mobile features
        this._initializeMobileFeatures();
    }

    setupResponsiveCanvas() {
        this.resizeCanvas();
        
        // Listen for window resize events
        window.addEventListener('resize', () => {
            this.resizeCanvas();
        });
        
        // Listen for orientation change on mobile
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.resizeCanvas();
            }, 100);
        });
        
        // Listen for Visual Viewport API changes (mobile browsers)
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', () => {
                this.resizeCanvas();
            });
            
            window.visualViewport.addEventListener('scroll', () => {
                this.resizeCanvas();
            });
        }
    }

    resizeCanvas() {
        const isMobile = window.innerWidth <= 768;
        
        if (isMobile) {
            // For mobile, let CSS Grid and object-fit handle everything
            this.canvas.style.width = '';
            this.canvas.style.height = '';
            this.canvas.style.maxWidth = '';
            this.canvas.style.maxHeight = '';
        } else {
            // Desktop sizing logic
            const visualViewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
            const visualViewportWidth = window.visualViewport ? window.visualViewport.width : window.innerWidth;
            
            const headerHeight = 60;
            const bottomBarHeight = 50;
            
            const availableWidth = visualViewportWidth;
            const availableHeight = Math.max(200, visualViewportHeight - headerHeight - bottomBarHeight);
            
            // Calculate the scale factor to fit the base canvas size into available space
            const scaleX = availableWidth / GAME_CONFIG.BASE_CANVAS_WIDTH;
            const scaleY = availableHeight / GAME_CONFIG.BASE_CANVAS_HEIGHT;
            const scale = Math.min(scaleX, scaleY, 1);
            
            // Update canvas dimensions
            const newWidth = GAME_CONFIG.BASE_CANVAS_WIDTH * scale;
            const newHeight = GAME_CONFIG.BASE_CANVAS_HEIGHT * scale;
            
            this.canvas.style.width = `${newWidth}px`;
            this.canvas.style.height = `${newHeight}px`;
        }
        
        // Set canvas actual size (for drawing) - always the same
        this.canvas.width = GAME_CONFIG.BASE_CANVAS_WIDTH;
        this.canvas.height = GAME_CONFIG.BASE_CANVAS_HEIGHT;
        
        // Update GAME_CONFIG for other modules
        GAME_CONFIG.CANVAS_WIDTH = GAME_CONFIG.BASE_CANVAS_WIDTH;
        GAME_CONFIG.CANVAS_HEIGHT = GAME_CONFIG.BASE_CANVAS_HEIGHT;
    }

    // Initialize the game
    async initialize() {
        // Show registration overlay first
        this.uiManager.showRegistration();
        
        // Initialize assets
        this.assetLoader.initializeAssets();
        
        // Wait for user registration
        await this._waitForRegistration();
        
        // Start the game after registration
        if (this.assetLoader.allAssetsLoaded()) {
            this.onAllAssetsLoaded();
        }
    }

    async _waitForRegistration() {
        return new Promise((resolve) => {
            const checkRegistration = () => {
                const playerData = this.uiManager.getPlayerData();
                if (playerData && playerData.isRegistered) {
                    resolve(playerData);
                } else {
                    // Check again after a short delay
                    setTimeout(checkRegistration, 100);
                }
            };
            
            // Start checking immediately
            checkRegistration();
        });
    }

    onAllAssetsLoaded() {
        this._initializeGameElements();
        this._startGame();
        
        // Initialize WebSocket controller after game is ready
        try {
            this.websocketController = new WebSocketController(this);
            this.websocketController.setGameStartTime(); // Track when game starts
            
            // Test WebSocket data after 5 seconds (for debugging)
            setTimeout(() => {
                if (this.websocketController && this.websocketController.isConnected) {
                    const testPlayerData = this.uiManager.getPlayerData();
                    const testGameState = {
                        currentCoinCount: 10,
                        shoppingBasket: [{ id: 'test', cost: 5 }],
                        currentLevel: 1
                    };
                    this.websocketController.sendGameEventData('test_connection', testPlayerData, testGameState);
                }
            }, 5000);
        } catch (error) {
            console.warn("WebSocket controller failed to initialize:", error);
        }
    }

    _initializeGameElements() {
        if (!this.currentMaze) {
            console.error('GameController: currentMaze is undefined in _initializeGameElements!');
            return;
        }
        
        // Initialize player
        this.player.initializeForLevel(this.currentMaze);
        
        // Initialize game objects
        this.gameObjectManager.initializeCoinsForMaze(
            this.currentMaze.layout, 
            this.player.gridX, 
            this.player.gridY
        );
        const coinState = this.gameObjectManager.getCurrentState();
        
        // Set game state references for all managers
        this._updateGameStateReferences();
        
        // Initialize ghost manager with level configuration
        const ghostSettings = calculateGhostSettings(this.currentLevelIndex);
        this.ghostManager.configureLevelSettings(ghostSettings);
        this.ghostManager.initialize();
        const activeGhosts = this.ghostManager.getActiveGhosts();
        
        // Update UI
        const state = this.gameObjectManager.getCurrentState();
        this.uiManager.updateGameUI(
            this.player, 
            state.currentCoinCount, 
            state.shoppingBasket.length
        );
        
        // Set input handler state
        this.inputHandler.setGameState(this.gameOver, this.gameActive);
        
        // Draw initial maze
        this.renderer.drawMaze(this.currentMaze.layout);
    }

    _updateGameStateReferences() {
        const ghosts = this.ghostManager.getActiveGhosts();
        const objectState = this.gameObjectManager.getCurrentState();
        
        this.ghostManager.setGameState(
            this.currentMaze.layout, 
            this.player, 
            objectState.coins, 
            objectState.tShirtInLevel
        );
        
        this.gameObjectManager.setGameState(
            this.currentMaze.layout, 
            this.player, 
            ghosts
        );
    }

    _startGame() {
        this.gameActive = true;
        
        // Start red hat spawning timer
        this.gameObjectManager.startRedHatSpawning();
        
        this.gameLoop();
    }

    // Main game loop
    gameLoop() {
        if (this.gameOver || this.isPaused) {
            return;
        }

        // Update game state references
        this._updateGameStateReferences();
        
        // Update input handler state
        this.inputHandler.setGameState(this.gameOver, this.gameActive);

        // Animate movements
        const playerMovementCompleted = this.player.animateMovement();
        this.ghostManager.animateAllGhostMovements();

        // Check for collectibles when player movement completes
        if (playerMovementCompleted) {
            this._checkCollectibles();
        }

        // Check ghost collisions
        this._checkGhostPlayerCollisions();

        // Check for level completion
        if (this.gameObjectManager.allCoinsCollected()) {
            this._goToNextLevel();
        }

        // Check for t-shirt spawning
        if (this.gameObjectManager.shouldSpawnTShirt()) {
            this.gameObjectManager.spawnTShirt();
        }

        // Render everything
        this._renderScene();

        // Continue game loop
        this.gameLoopId = requestAnimationFrame(() => this.gameLoop());
    }

    _checkCollectibles() {
        const playerPos = this.player.getPosition();
        
        // Check coin collections
        const coinsCollected = this.gameObjectManager.checkCoinCollections(
            playerPos.gridX, 
            playerPos.gridY
        );
        
        // Check t-shirt collection
        const tShirtResult = this.gameObjectManager.checkTShirtCollection(
            playerPos.gridX, 
            playerPos.gridY
        );


        // Check red hat collection
        const redHatResult = this.gameObjectManager.checkRedHatCollection(
            playerPos.gridX, 
            playerPos.gridY
        );
        
        if (redHatResult) {
            // Add extra life to player
            this.player.redHats++;
            
            // Show overlay message
            this.uiManager.showRedHatCollectedOverlay();
        }

        // Red hat spawning is now timer-based, not coin-based
        
        // Update UI if anything was collected
        if (coinsCollected > 0 || tShirtResult || redHatResult) {
            const state = this.gameObjectManager.getCurrentState();
            this.uiManager.updateGameUI(
                this.player, 
                state.currentCoinCount, 
                state.shoppingBasket.length
            );
        }
    }

    _checkGhostPlayerCollisions() {
        const collisionOccurred = this.ghostManager.checkPlayerCollisions();
        
        if (collisionOccurred) {
            const gameOverResult = this.player.handleGhostCollision();
            
            // Update UI for red hat count
            const state = this.gameObjectManager.getCurrentState();
            this.uiManager.updateGameUI(
                this.player, 
                state.currentCoinCount, 
                state.shoppingBasket.length
            );
            
            if (gameOverResult) {
                this._endGame("Game Over! The ghosts collected all your Red Hats.");
            }
        }
    }

    _goToNextLevel() {
        this.inputHandler.stopContinuousMovement();
        
        this.currentLevelIndex++;
        if (this.currentLevelIndex >= this.levelKeys.length) {
            this.currentLevelIndex = 0;
        }
        
        this.currentMaze = MAZE_LEVELS[this.levelKeys[this.currentLevelIndex]];
        
        if (!this.currentMaze) {
            console.error('GameController: Failed to load maze for level:', this.levelKeys[this.currentLevelIndex]);
            return; // Don't continue if maze loading failed
        }
        
        // Reset for new level
                this.player.initializeForLevel(this.currentMaze);
        this.gameObjectManager.resetForNewLevel();
        this.gameObjectManager.initializeCoinsForMaze(
            this.currentMaze.layout, 
            this.player.gridX,
            this.player.gridY
        );
        
        // Restart ghost system with level configuration
        this.ghostManager.cleanup();
        const ghostSettings = calculateGhostSettings(this.currentLevelIndex);
        this.ghostManager.configureLevelSettings(ghostSettings);
        this.ghostManager.initialize();
        
        // Update UI
        const state = this.gameObjectManager.getCurrentState();
        this.uiManager.updateGameUI(
            this.player, 
            state.currentCoinCount, 
            state.shoppingBasket.length
        );
    }

    _renderScene() {
        const ghosts = this.ghostManager.getActiveGhosts();
        const objectState = this.gameObjectManager.getCurrentState();
        
        const gameState = {
            maze: this.currentMaze,
            player: this.player,
            ghosts: ghosts,
            coins: objectState.coins,
            tShirtInLevel: objectState.tShirtInLevel,
            redHatInLevel: objectState.redHatInLevel
        };
        
        this.renderer.drawScene(gameState);
    }

    _endGame(message) {
        this.gameOver = true;
        this.gameActive = false;
        
        if (this.gameLoopId) {
            cancelAnimationFrame(this.gameLoopId);
            this.gameLoopId = null;
        }
        
        this.inputHandler.cleanup();
        this.ghostManager.cleanup();
        this.player.cleanup();
        this.gameObjectManager.stopRedHatSpawning();
        
        const state = this.gameObjectManager.getCurrentState();
        
        // Send game over data to WebSocket
        if (this.websocketController) {
            const playerData = this.uiManager.getPlayerData();
            const gameState = {
                currentCoinCount: state.currentCoinCount,
                shoppingBasket: state.shoppingBasket,
                currentLevel: this.currentLevelIndex + 1
            };
            this.websocketController.sendGameEventData('game_over', playerData, gameState);
        } else {
            console.warn('No WebSocket controller available for game over event');
        }
        
        this.uiManager.showGameOverOverlay(
            message,
            state.shoppingBasket.length > 0,
            () => this._restartGame(),
            () => this._showOrderConfirmation()
        );
    }

    _restartGame() {
        // Reset all game state
        this.gameOver = false;
        this.gameActive = true;
        this.isPaused = false;
        this.currentLevelIndex = 0;
        this.currentMaze = MAZE_LEVELS[this.levelKeys[this.currentLevelIndex]];
        
        if (!this.currentMaze) {
            console.error('GameController: Failed to load maze for level in reset:', this.levelKeys[this.currentLevelIndex]);
            return;
        }
        
        // Reset all modules
        this.player.reset();
        this.gameObjectManager.resetForNewGame();
        this.inputHandler.cleanup();
        this.ghostManager.cleanup();
        
        // Hide all overlays
        this.uiManager.hideGameOverOverlay();
        this.uiManager.hidePauseOverlay();
        
        // Reinitialize everything
        this._initializeGameElements();
        this._startGame();
    }

    _showOrderConfirmation() {
        const state = this.gameObjectManager.getCurrentState();
        if (state.shoppingBasket.length === 0) return;
        
        this.gameActive = false;
        this.inputHandler.stopContinuousMovement();
        
        this.uiManager.showOrderConfirmation(
            state.shoppingBasket,
            () => this._closeOrderConfirmation(),
            () => this._submitOrder()
        );
    }

    _closeOrderConfirmation() {
        this.uiManager.hideOrderConfirmation();
        this._restartGame();
    }

    async _submitOrder() {
        const state = this.gameObjectManager.getCurrentState();
        if (state.shoppingBasket.length === 0) return;

        // Group items by ID and sum quantities
        const groupedItems = {};
        state.shoppingBasket.forEach(item => {
            if (groupedItems[item.id]) {
                groupedItems[item.id].quantity += 1;
            } else {
                groupedItems[item.id] = {
                    id: item.id,
                    src: item.src,
                    cost: item.cost,
                    quantity: 1
                };
            }
        });

        // Prepare order data
        const playerData = this.uiManager.getPlayerData();
        const orderData = {
            customerInfo: {
                username: playerData.username,
                email: playerData.email,
                playerId: `player_${Date.now()}`
            },
            items: Object.values(groupedItems),
            orderDate: new Date().toISOString(),
            gameScore: state.currentCoinCount
        };

        try {
            const orderResponse = await this.uiManager.mockOrderSubmissionWebService(orderData);
            
            if (orderResponse.success) {
                this.uiManager.showInvoice(orderResponse.invoice);
            } else {
                console.error('Order submission failed');
                alert('Order submission failed. Please try again.');
            }
        } catch (error) {
            console.error('Order submission error:', error);
            alert('Order submission failed. Please check your connection and try again.');
        }
    }

    _initializeMobileFeatures() {
        // Mobile features are now handled by the InputHandler
    }

    // Pause the game
    pauseGame() {
        if (!this.gameOver && this.gameActive && !this.isPaused) {
            this.isPaused = true;
            this.gameActive = false;
            
            // Stop continuous movement
            this.inputHandler.stopContinuousMovement();
            
            // Cancel the game loop
            if (this.gameLoopId) {
                cancelAnimationFrame(this.gameLoopId);
                this.gameLoopId = null;
            }
            
            // Send game pause data to WebSocket
            if (this.websocketController) {
                const playerData = this.uiManager.getPlayerData();
                const state = this.gameObjectManager.getCurrentState();
                const gameState = {
                    currentCoinCount: state.currentCoinCount,
                    shoppingBasket: state.shoppingBasket,
                    currentLevel: this.currentLevelIndex + 1
                };
                this.websocketController.sendGameEventData('game_paused', playerData, gameState);
            } else {
                console.warn('No WebSocket controller available for game pause event');
            }
            
            // Show pause overlay
            this.uiManager.showPauseOverlay();
            
            return true;
        }
        return false;
    }

    // Resume the game
    resumeGame() {
        if (!this.gameOver && this.isPaused) {
            this.isPaused = false;
            this.gameActive = true;
            
            // Hide pause overlay
            this.uiManager.hidePauseOverlay();
            
            // Restart the game loop
            this.gameLoop();
            
            return true;
        }
        return false;
    }

    // Get current game status
    getGameStatus() {
        return {
            gameOver: this.gameOver,
            gameActive: this.gameActive,
            isPaused: this.isPaused,
            currentLevel: this.currentLevelIndex + 1,
            playerRedHats: this.player.redHats,
            coins: this.gameObjectManager.getCurrentState().currentCoinCount,
            basketItems: this.gameObjectManager.getCurrentState().shoppingBasket.length
        };
    }
}
