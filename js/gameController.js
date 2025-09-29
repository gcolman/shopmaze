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
import { Score } from './score.js';
import { TShirtCollection } from './tshirtCollection.js';

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
        this.score = new Score();

        this.tshirtCollection = new TShirtCollection();
        
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
        
        // Wait for configuration to be ready before initializing WebSocket
        console.log('GameController: Waiting for configuration to be ready...');
        await this._waitForConfigReady();
        
        // Initialize WebSocket controller after config is ready
        try {
            console.log('GameController: Initializing WebSocket controller with config...');
            this.websocketController = new WebSocketController(this);
            
            // Pass WebSocket controller reference to UI manager for registration events
            this.uiManager.setWebSocketController(this.websocketController);
        } catch (error) {
            console.error('Failed to initialize WebSocket controller:', error);
            // Continue without WebSocket if it fails
        }
        
        // Initialize assets
        this.assetLoader.initializeAssets();
        
        // Wait for user registration
        await this._waitForRegistration();
        
        // Start the game after registration
        if (this.assetLoader.allAssetsLoaded()) {
            this.onAllAssetsLoaded();
        }
    }

    // Wait for configuration to be ready
    async _waitForConfigReady() {
        return new Promise((resolve) => {
            // Check if config is already ready
            if (window.configReady === true) {
                console.log('GameController: Configuration already ready');
                resolve();
                return;
            }
            
            // Listen for config ready event
            const configReadyHandler = () => {
                console.log('GameController: Configuration ready event received');
                window.removeEventListener('shopmaze-config-ready', configReadyHandler);
                resolve();
            };
            
            window.addEventListener('shopmaze-config-ready', configReadyHandler);
            
            // Set a timeout to prevent infinite waiting
            setTimeout(() => {
                console.warn('GameController: Configuration timeout - proceeding without waiting');
                window.removeEventListener('shopmaze-config-ready', configReadyHandler);
                resolve();
            }, 5000); // 5 second timeout
        });
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
        
        // Set game start time for WebSocket tracking if available
        if (this.websocketController) {
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
        
        // Initialize score display
        this.score.initialize();
        
        // Initialize T-shirt collection manager
        this.tshirtCollection.initialize();
        
        // Make T-shirt collection accessible from console for debugging
        window.debugTShirtCollection = this.tshirtCollection;
        
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
        
        // Update score for collected coins
        if (coinsCollected > 0) {
            this.score.addCoins(coinsCollected);
        }
        
        // Check t-shirt collection
        const tShirtResult = this.gameObjectManager.checkTShirtCollection(
            playerPos.gridX, 
            playerPos.gridY
        );
        
        // Update score for collected t-shirt
        if (tShirtResult && tShirtResult.success) {
            this.score.addTShirtValue(tShirtResult.cost);
        }


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
                this._endGame("Game Over! The ghosts collected all your Red Hats.", 'red_hat_loss');
            }
        }
    }

    _goToNextLevel() {
        this.inputHandler.stopContinuousMovement();
        
        // Add level completion to score
        this.score.addCompletedLevel();
        
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

    _endGame(message, reason = 'normal') {
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
        
        // Add current session T-shirts to persistent collection
        console.log('Game over: Current shopping basket:', state.shoppingBasket);
        console.log('Game over: Shopping basket length:', state.shoppingBasket ? state.shoppingBasket.length : 'undefined');
        
        if (state.shoppingBasket && state.shoppingBasket.length > 0) {
            console.log(`Game over: Adding ${state.shoppingBasket.length} T-shirts to persistent collection`);
            this.tshirtCollection.addSessionTShirts(state.shoppingBasket);
            console.log(`Game over: Finished adding T-shirts to persistent collection`);
        } else {
            console.log('Game over: No T-shirts in shopping basket to add to collection');
        }
        
        // Send game over data to WebSocket
        if (this.websocketController) {
            const playerData = this.uiManager.getPlayerData();
            const scoreData = this.score.getScoreData();
            const gameState = {
                currentCoinCount: state.currentCoinCount,
                shoppingBasket: state.shoppingBasket,
                currentLevel: this.currentLevelIndex + 1,
                gameScore: scoreData.totalScore,
                scoreBreakdown: scoreData.breakdown,
                coinsCollected: scoreData.coinsCollected,
                levelsCompleted: scoreData.levelsCompleted
            };
            this.websocketController.sendGameEventData('game_over', playerData, gameState);
            console.log('Game over data sent to WebSocket - ', gameState);
        } else {
            console.warn('No WebSocket controller available for game over event');
        }
        
        // If game ended due to red hat loss, go directly to order confirmation
        if (reason === 'red_hat_loss') {
            this._showRedHatLossOrderConfirmation();
        } else if (reason === 'admin_control') {
            // Auto-submit order and show confirmation of what was submitted
            this._submitOrderAndShowConfirmation();
        } else {
            // Normal game over - automatically restart
            console.log('Game over:', message);
            this._restartGame();
        }
    }

    _restartGame() {
        // Reset all game state
        this.gameOver = false;
        this.gameActive = true;
        this.isPaused = false;
        this.currentLevelIndex = 0;
        
        // Reset score
        this.score.reset();
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
        this.uiManager.hidePauseOverlay();
        
        // Ensure canvas is properly sized
        this.resizeCanvas();
        
        // Reinitialize everything
        this._initializeGameElements();
        this._startGame();
    }

    _showOrderConfirmation() {
        // Show accumulated T-shirts from all sessions instead of just current basket
        const accumulatedTShirts = this.tshirtCollection.getGroupedCollection();
        if (accumulatedTShirts.length === 0) {
            console.log('No accumulated T-shirts to show in order confirmation');
            return;
        }
        
        this.gameActive = false;
        this.inputHandler.stopContinuousMovement();
        
        this.uiManager.showOrderConfirmation(
            accumulatedTShirts,
            () => this._closeOrderConfirmation(),
            () => this._submitOrder()
        );
    }

    _showRedHatLossOrderConfirmation() {
        // Show accumulated T-shirts from all sessions
        const accumulatedTShirts = this.tshirtCollection.getGroupedCollection();
        
        this.gameActive = false;
        this.inputHandler.stopContinuousMovement();
        
        this.uiManager.showRedHatLossOrderConfirmation(
            accumulatedTShirts,
            () => this._closeOrderConfirmation(),
            () => this._submitOrder()
        );
    }

    _showAdminControlOrderConfirmation() {
        // Show accumulated T-shirts from all sessions
        const accumulatedTShirts = this.tshirtCollection.getGroupedCollection();
        console.log('Admin end game: Showing order confirmation with accumulated T-shirts:', accumulatedTShirts);
        
        this.gameActive = false;
        this.inputHandler.stopContinuousMovement();
        
        this.uiManager.showAdminControlOrderConfirmation(
            accumulatedTShirts,
            () => this._closeAdminOrderConfirmation(),
            () => this._submitOrder()
        );
    }

    async _submitOrderAndShowConfirmation() {
        // Get accumulated T-shirts before clearing
        const accumulatedTShirts = this.tshirtCollection.getGroupedCollection();
        
        if (accumulatedTShirts.length === 0) {
            console.log('Admin end game: No T-shirts collected, showing no items message');
            // Show message that no items were collected
            this._showNoItemsMessage();
            return;
        }

        console.log('Admin end game: Auto-submitting order with T-shirts:', accumulatedTShirts);

        // Prepare order data
        const playerData = this.uiManager.getPlayerData();
        const formattedItems = accumulatedTShirts.map(tshirt => ({
            description: `${tshirt.id.charAt(0).toUpperCase() + tshirt.id.slice(1)} t-Shirt`,
            quantity: tshirt.quantity,
            unitPrice: parseFloat(tshirt.cost.toFixed(2))
        }));
        
        const orderData = {
            customerName: playerData.playerId,
            customerEmail: playerData.email,
            items: formattedItems
        };

        try {
            // Submit order via WebSocket
            if (this.websocketController && this.websocketController.isConnected) {
                this.websocketController.sendMessage({
                    type: 'order',
                    data: orderData,
                    timestamp: new Date().toISOString()
                });
                
                console.log('Admin auto-submit: Order sent via WebSocket successfully');
                
                // Clear the collection after successful submission
                this.tshirtCollection.clearCollection();
                console.log('Admin auto-submit: Cleared T-shirt collection');
                
            } else {
                console.error('WebSocket not connected - cannot auto-submit order');
            }
        } catch (error) {
            console.error('Admin auto-submit error:', error);
        }

        // Show confirmation of what was submitted (using preserved data)
        this.gameActive = false;
        this.inputHandler.stopContinuousMovement();
        
        this.uiManager.showAdminControlOrderConfirmation(
            accumulatedTShirts,
            () => this._closeAdminOrderConfirmation(),
            null // No place order button since it's already submitted
        );
    }

    _showNoItemsMessage() {
        // Show message for admin end game when no items were collected
        this.gameActive = false;
        this.inputHandler.stopContinuousMovement();
        
        // Use empty basket to trigger the "no items collected" message
        this.uiManager.showAdminControlOrderConfirmation(
            [], // Empty basket
            () => this._closeNoItemsMessage(),
            null // No place order button
        );
    }

    _closeNoItemsMessage() {
        // Close the no items message and restart game
        this.uiManager.hideOrderConfirmation();
        this._restartGame();
    }

    _closeAdminOrderConfirmation() {
        // Collection was already cleared during auto-submit, just close UI
        this.uiManager.hideOrderConfirmation();
        this._restartGame();
    }

    _closeOrderConfirmation() {
        this.uiManager.hideOrderConfirmation();
        this._restartGame();
    }

    async _submitOrder() {
        // Use accumulated T-shirts from all game sessions instead of just current basket
        const accumulatedTShirts = this.tshirtCollection.getGroupedCollection();
        
        if (accumulatedTShirts.length === 0) {
            console.log('No T-shirts in accumulated collection to submit');
            return;
        }

        console.log('Submitting order with accumulated T-shirts:', accumulatedTShirts);

        // Prepare order data using accumulated T-shirts in the specified format
        const playerData = this.uiManager.getPlayerData();
        
        // Format items to match the required JSON structure
        const formattedItems = accumulatedTShirts.map(tshirt => ({
            description: `${tshirt.id.charAt(0).toUpperCase() + tshirt.id.slice(1)} t-Shirt`,
            quantity: tshirt.quantity,
            unitPrice: parseFloat(tshirt.cost.toFixed(2))
        }));
        
        const orderData = {
            customerName: playerData.username,
            customerEmail: playerData.email,
            items: formattedItems
        };

        try {
            console.log('Sending order event via WebSocket with data:', orderData);
            
            // Send order event via WebSocket instead of processing locally
            if (this.websocketController && this.websocketController.isConnected) {
                this.websocketController.sendMessage({
                    type: 'order',
                    data: orderData,
                    timestamp: new Date().toISOString()
                });
                
                console.log('Order event sent successfully via WebSocket');
                
                // Clear the accumulated T-shirt collection after sending order
                this.tshirtCollection.clearCollection();
                console.log('Order sent: Cleared accumulated T-shirt collection');
                
                // Close the order confirmation since order was sent
                this.uiManager.hideOrderConfirmation();
                this._restartGame();
                
            } else {
                console.error('WebSocket not connected - cannot send order');
                alert('Cannot submit order: WebSocket connection not available. Please try again.');
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

    // New game with "Go!" button - triggered by WebSocket 'new' event
    newGameWithGoButton() {
        // Hide all overlays except game canvas
        this.uiManager.hideAllOverlays();
        
        // Reset game state like _restartGame but don't start immediately
        this.gameOver = false;
        this.isPaused = true;  // Start paused
        this.gameActive = false;
        this.currentLevelIndex = 0;
        
        // Reset all game modules
        this.score.reset();
        this.gameObjectManager.resetForNewGame();
        this.player.reset();
        this.ghostManager.cleanup();
        this.inputHandler.cleanup();
        
        // Load first level
        this.currentMaze = MAZE_LEVELS[this.levelKeys[this.currentLevelIndex]];
        
        if (!this.currentMaze) {
            console.error('GameController: Failed to load maze for level in newGameWithGoButton:', this.levelKeys[this.currentLevelIndex]);
            return;
        }
        
        // Ensure canvas is properly sized
        this.resizeCanvas();
        
        // Initialize game elements (this sets up player position, coins, etc.)
        this._initializeGameElements();
        
        // Render the initial game state
        const objectState = this.gameObjectManager.getCurrentState();
        const gameState = {
            maze: this.currentMaze,
            player: this.player,
            ghosts: this.ghostManager.getActiveGhosts(),
            coins: objectState.coins,
            tShirtInLevel: objectState.tShirtInLevel,
            redHatInLevel: objectState.redHatInLevel
        };
        this.renderer.drawScene(gameState);
        
        // Show "Go!" button overlay on canvas
        this.uiManager.showGoButtonOverlay(() => this._startNewGame());
    }

    _startNewGame() {
        // Hide the "Go!" button
        this.uiManager.hideGoButtonOverlay();
        
        // Start the game
        this.isPaused = false;
        this.gameActive = true;
        
        // Start red hat spawning timer
        this.gameObjectManager.startRedHatSpawning();
        
        this.gameLoop();
    }
}
