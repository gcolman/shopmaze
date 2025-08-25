// Input Handling Module
// Manages keyboard and touch input for player movement

import { GAME_CONFIG } from './config.js';

export class InputHandler {
    constructor(player) {
        this.player = player;
        this.gameOver = false;
        this.gameActive = true;
        
        // Touch controls
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchEndX = 0;
        this.touchEndY = 0;

        // Continuous movement system
        this.continuousMovement = {
            active: false,
            direction: null,
            intervalId: null,
            speed: GAME_CONFIG.CONTINUOUS_MOVEMENT_SPEED
        };

        // Swipe gesture queue system
        this.gestureQueue = {
            pendingDirection: null,
            lastGestureTime: 0,
            gestureTimeout: 3000, // 3 seconds to execute queued gesture
            checkInterval: null
        };

        this._setupEventListeners();
    }

    // Set game state references
    setGameState(gameOver, gameActive) {
        this.gameOver = gameOver;
        this.gameActive = gameActive;
    }

    _setupEventListeners() {
        this._setupKeyboardControls();
        this._setupTouchControls();
    }

    _setupKeyboardControls() {
        document.addEventListener('keydown', (e) => {
            if (e.code === 'KeyW' || e.code === 'ArrowUp') {
                this.startContinuousMovement('up');
            }
            else if (e.code === 'KeyS' || e.code === 'ArrowDown') {
                this.startContinuousMovement('down');
            }
            else if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
                this.startContinuousMovement('left');
            }
            else if (e.code === 'KeyD' || e.code === 'ArrowRight') {
                this.startContinuousMovement('right');
            }
            else if (e.code === 'Space') {
                e.preventDefault();
                this.stopContinuousMovement();
            }
        });
    }

    _setupTouchControls() {
        const canvas = document.getElementById('gameCanvas');
        const gameContainer = document.getElementById('game-container');
        
        const swipeTargets = [canvas, gameContainer].filter(el => el !== null);
        
        swipeTargets.forEach((target) => {
            target.addEventListener('touchstart', (e) => {
                e.preventDefault();
                const touch = e.touches[0];
                this.touchStartX = touch.clientX;
                this.touchStartY = touch.clientY;
            }, { passive: false });

            target.addEventListener('touchend', (e) => {
                e.preventDefault();
                const touch = e.changedTouches[0];
                this.touchEndX = touch.clientX;
                this.touchEndY = touch.clientY;
                this._handleSwipe();
            }, { passive: false });

            target.addEventListener('touchmove', (e) => {
                e.preventDefault();
            }, { passive: false });
        });
    }

    _handleSwipe() {
        const deltaX = this.touchEndX - this.touchStartX;
        const deltaY = this.touchEndY - this.touchStartY;
        const minSwipeDistance = GAME_CONFIG.MIN_SWIPE_DISTANCE || 30;

        // Check if this is a tap - use for stopping movement
        if (Math.abs(deltaX) < minSwipeDistance && Math.abs(deltaY) < minSwipeDistance) {
            this.stopContinuousMovement();
            this.clearGestureQueue();
            return;
        }

        let direction = '';
        
        // Determine swipe direction
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            direction = deltaX > 0 ? 'right' : 'left';
        } else {
            direction = deltaY > 0 ? 'down' : 'up';
        }
        
        this.handleGestureDirection(direction);
    }

    handleGestureDirection(direction) {
        // Always clear any existing queue when a new gesture is made
        this.clearGestureQueue();
        
        // Try to move immediately in the swiped direction
        const canMoveNow = this.tryMoveDirection(direction);
        
        if (canMoveNow) {
            // Path is clear, start continuous movement immediately
            this.startContinuousMovement(direction);
        } else {
            // Path blocked, queue the gesture for later
            this.queueGesture(direction);
        }
    }

    tryMoveDirection(direction) {
        // Test if movement in this direction is possible
        if (!this.player || this.gameOver || !this.gameActive) {
            return false;
        }
        
        // Don't interrupt current movement animation
        if (this.player.isMoving) {
            return false;
        }
        
        // Try the movement
        return this.player.canMove(direction);
    }

    queueGesture(direction) {
        this.gestureQueue.pendingDirection = direction;
        this.gestureQueue.lastGestureTime = Date.now();
        
        // Start checking for opportunities to execute the queued gesture
        this.startGestureQueueCheck();
    }

    clearGestureQueue() {
        this.gestureQueue.pendingDirection = null;
        this.gestureQueue.lastGestureTime = 0;
        this.stopGestureQueueCheck();
    }

    startGestureQueueCheck() {
        this.stopGestureQueueCheck(); // Clear any existing check
        
        this.gestureQueue.checkInterval = setInterval(() => {
            this.checkQueuedGesture();
        }, 100); // Check every 100ms
    }

    stopGestureQueueCheck() {
        if (this.gestureQueue.checkInterval) {
            clearInterval(this.gestureQueue.checkInterval);
            this.gestureQueue.checkInterval = null;
        }
    }

    checkQueuedGesture() {
        // Check if we have a queued gesture
        if (!this.gestureQueue.pendingDirection) {
            return;
        }
        
        // Check if gesture has expired
        const now = Date.now();
        if (now - this.gestureQueue.lastGestureTime > this.gestureQueue.gestureTimeout) {
            this.clearGestureQueue();
            return;
        }
        
        // Try to execute the queued gesture
        const direction = this.gestureQueue.pendingDirection;
        const canMove = this.tryMoveDirection(direction);
        
        if (canMove) {
            this.startContinuousMovement(direction);
            this.clearGestureQueue();
        }
    }

    startContinuousMovement(direction) {
        this.stopContinuousMovement();
        
        this.continuousMovement.direction = direction;
        this.continuousMovement.active = true;
        
        this.continuousMovement.intervalId = setInterval(() => {
            if (this.continuousMovement.active && !this.gameOver && this.gameActive) {
                this._continuousMove();
            } else {
                this.stopContinuousMovement();
            }
        }, this.continuousMovement.speed);
        
        // Make the first move immediately
        this._continuousMove();
    }

    stopContinuousMovement() {
        if (this.continuousMovement.intervalId) {
            clearInterval(this.continuousMovement.intervalId);
            this.continuousMovement.intervalId = null;
        }
        this.continuousMovement.active = false;
        this.continuousMovement.direction = null;
    }

    _continuousMove() {
        if (!this.continuousMovement.active || !this.continuousMovement.direction) {
            return;
        }
        
        // Only move if player is not currently animating
        if (this.player.isMoving) {
            return;
        }
        
        const success = this.player.move(
            this.continuousMovement.direction, 
            this.gameOver, 
            this.gameActive, 
            true
        );
        
        // If movement failed, stop continuous movement and check for queued gesture
        if (!success) {
            this.stopContinuousMovement();
            // Give queued gesture a chance when current movement stops
            setTimeout(() => this.checkQueuedGesture(), 50);
        }
    }

    // Clean up when game restarts
    cleanup() {
        this.stopContinuousMovement();
        this.clearGestureQueue();
        this.stopGestureQueueCheck();
    }
}
