// --- START script.js (2D Version with Checkout/Invoice - Final Fixes Applied) ---

// --- Game Configuration ---
const TILE_SIZE = 40; // Size of each grid cell in pixels
const MAZE_WIDTH_TILES = 15;
const MAZE_HEIGHT_TILES = 12;
const CANVAS_WIDTH = MAZE_WIDTH_TILES * TILE_SIZE;
const CANVAS_HEIGHT = MAZE_HEIGHT_TILES * TILE_SIZE;

const PLAYER_PIXEL_MOVE_SPEED = 8; // Pixels per frame during animation. Should divide TILE_SIZE evenly.
const GHOST_PIXEL_MOVE_SPEED = 4; // Ghost moves slower than player for animation

const COIN_SIZE = TILE_SIZE * 0.5; // Coins are half a tile size
const T_SHIRT_SIZE = TILE_SIZE * 0.8; // T-shirts are 80% of a tile size
const T_SHIRT_TIMEOUT_SECONDS = 15; // Time in seconds T-shirt is visible
const COINS_PER_LEVEL = 25; // Number of coins to spawn in each maze instance

const RED_HAT_COUNT_START = 3; // Player starts with 3 red hats
const GHOST_SPAWN_DELAY_SECONDS = 10; // First ghost appears after 10 seconds of game time
const GHOST_RECURRING_SPAWN_INTERVAL_SECONDS = 5; // How often a new ghost can appear after the previous is gone
const GHOST_CHASE_INTERVAL_MS = 300; // How often ghost recalculates its target tile and moves
const PLAYER_INVINCIBILITY_DURATION_MS = 2000; // 2 seconds invincibility after being hit

const MAX_GHOSTS = 3; // Maximum number of ghosts that can be active at once

// --- Maze Definitions ---
const MAZE_LEVELS = [
    // Level 1 Maze
    [
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1],
        [1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1],
        [1, 0, 1, 0, 1, 1, 1, 1, 0, 0, 1, 0, 1, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 0, 1, 0, 1],
        [1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 1, 0, 1],
        [1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 1],
        [1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ],
    // Level 2 Maze (A new, slightly different layout)
    [
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
        [1, 0, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 0, 1],
        [1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 1],
        [1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 1],
        [1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 0, 1],
        [1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1],
        [1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 1],
        [1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ]
];

// --- Game State ---
let player = {
    gridX: 0,
    gridY: 0,
    pixelX: 0,
    pixelY: 0,
    size: TILE_SIZE * 0.8,
    isMoving: false,
    targetX: 0,
    targetY: 0,
    redHats: RED_HAT_COUNT_START,
    invincible: false
};

// Array to hold all active ghost instances
let activeGhosts = []; 
let ghostSpawnTimer = null; // Timeout for initial ghost appearance
let ghostRecurringSpawnTimerId = null; // Interval for managing recurring spawns
let ghostMovementIntervalId = null; // Single global interval for ghost movement logic

let currentLevelIndex = 0;
let MAZE = MAZE_LEVELS[currentLevelIndex];

let currentCoinCount = 0; // Coins persist across levels unless reset by game over
let coins = []; // Coins for the current maze only
let tShirtsAvailable = [
    { id: 'openshift', cost: 5, spawnThreshold: 5, collected: false, img: new Image(), src: 'assets/t_shirt_openshift.png' },
    { id: 'ansible', cost: 10, spawnThreshold: 10, collected: false, img: new Image(), src: 'assets/t_shirt_ansible.png' },
    { id: 'rhel', cost: 15, spawnThreshold: 15, collected: false, img: new Image(), src: 'assets/t_shirt_rhel.png' },
];
let tShirtInLevel = null; // The currently spawned T-shirt in the 2D game world
let tShirtTimerInterval = null;
let tShirtTimeLeft = T_SHIRT_TIMEOUT_SECONDS;

let shoppingBasket = []; // Shopping basket contents persist across levels
let gameOver = false;
let gameActive = true; // Controls whether game input and loops are active

// --- HTML Elements (Grab references to all UI elements) ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const redHatCountersDisplay = document.getElementById('redHatCounters');
const coinCountDisplay = document.getElementById('coinCount');
const shoppingBasketDisplay = document.getElementById('shoppingBasket');
const gameMessageDisplay = document.getElementById('gameMessage');
const restartButtonElement = document.getElementById('restartButton'); 
const checkoutButtonElement = document.getElementById('checkoutButton'); // Get checkout button element
// Order Confirmation Elements
const orderConfirmationOverlay = document.getElementById('orderConfirmationOverlay');
const orderItemsList = document.getElementById('orderItemsList');
const orderTotalDisplay = document.getElementById('orderTotal');
const cancelOrderButton = document.getElementById('cancelOrderButton');
const placeOrderButton = document.getElementById('placeOrderButton');

// Invoice Elements
const invoiceOverlay = document.getElementById('invoiceOverlay'); 
const invoiceItemsDisplay = document.getElementById('invoiceItems'); 
const invoiceTotalDisplay = document.getElementById('invoiceTotal'); 
const invoiceNumberDisplay = document.getElementById('invoiceNumber'); 
const invoiceDateDisplay = document.getElementById('invoiceDate'); 
const invoiceSubtotalDisplay = document.getElementById('invoiceSubtotal'); 
const closeInvoiceButton = document.getElementById('closeInvoiceButton'); 




// --- Asset Loading ---
const playerImage = new Image();
playerImage.src = 'assets/player.png';
const coinImage = new Image();
coinImage.src = 'assets/coin.png';
const wallTileImage = new Image();
wallTileImage.src = 'assets/wall_tile.png';
const ghostImage = new Image();
ghostImage.src = 'assets/ghost.png';
const redHatIconImage = new Image();
redHatIconImage.src = 'assets/red_hat_icon.png';

// Assign src for T-shirt images
tShirtsAvailable.forEach(tShirt => {
    tShirt.img.src = tShirt.src;
});

// Keep track of loaded assets to start game only when ready
let assetsLoadedCount = 0;
// Total number of images that need to load:
// player, coin, wall, ghost, red_hat_icon (5) + number of T-shirts (3) = 8 assets
const totalAssets = 5 + tShirtsAvailable.length; 

function assetLoaded() {
    assetsLoadedCount++;
    if (assetsLoadedCount === totalAssets) {
        // All assets loaded, now we can safely start the core game logic
        console.log("All assets loaded. Starting game components.");
        drawMaze(); // Initial draw of the maze (static)
        initializeGameElements(); // Initialize dynamic elements and UI state
        startInitialGhostSpawnTimer(); // Set up initial ghost appearance
        ghostMovementIntervalId = setInterval(updateGhostPositions, GHOST_CHASE_INTERVAL_MS); 
        ghostRecurringSpawnTimerId = setInterval(manageRecurringGhostSpawns, GHOST_RECURRING_SPAWN_INTERVAL_SECONDS * 1000); 
        gameLoop(); // Start the main game loop
    }
}

// Attach onload handlers to all images
playerImage.onload = assetLoaded;
coinImage.onload = assetLoaded;
wallTileImage.onload = assetLoaded;
ghostImage.onload = assetLoaded;
redHatIconImage.onload = assetLoaded;

// Attach onload handlers for T-shirt images as well
tShirtsAvailable.forEach(tShirt => {
    tShirt.img.onload = assetLoaded;
});


// --- Player Movement Function (Shared between keyboard and mobile) ---
function movePlayer(direction, isContinuous = false) {
    if (gameOver || player.isMoving || !gameActive) {
        return false;
    }

    let newGridX = player.gridX;
    let newGridY = player.gridY;
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

    if (newGridX < 0 || newGridX >= MAZE_WIDTH_TILES || newGridY < 0 || newGridY >= MAZE_HEIGHT_TILES) {
        if (!isContinuous) {
            gameMessageDisplay.textContent = "You hit the shop boundary!";
            gameMessageDisplay.style.color = '#FF5722';
        }
        return false;
    }

    if (MAZE[newGridY][newGridX] === 1) {
        return false; // It's a wall, cannot move
    }

    player.gridX = newGridX;
    player.gridY = newGridY;
    player.targetX = newGridX * TILE_SIZE;
    player.targetY = newGridY * TILE_SIZE;
    player.isMoving = true;

    if (gameMessageDisplay.textContent === "You hit the shop boundary!") {
        gameMessageDisplay.textContent = "";
        gameMessageDisplay.style.color = '#00FF00';
    }
    
    return true;
}

// --- Keyboard Input Handling ---
document.addEventListener('keydown', (e) => {
    if (e.code === 'KeyW' || e.code === 'ArrowUp') {
        startContinuousMovement('up');
    }
    else if (e.code === 'KeyS' || e.code === 'ArrowDown') {
        startContinuousMovement('down');
    }
    else if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        startContinuousMovement('left');
    }
    else if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        startContinuousMovement('right');
    }
    else if (e.code === 'Space') {
        e.preventDefault();
        stopContinuousMovement();
        gameMessageDisplay.textContent = "Movement stopped. Use WASD/arrows, swipe to move, or tap to stop.";
        gameMessageDisplay.style.color = '#FFFF00';
    }
});

// --- Mobile Touch Controls ---
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;

// Continuous movement system
let continuousMovement = {
    active: false,
    direction: null,
    intervalId: null,
    speed: 150 // milliseconds between moves (faster for responsive movement)
};







// Enhanced swipe gesture support
function setupSwipeControls() {
    console.log('Setting up swipe controls...');
    
    const canvas = document.getElementById('gameCanvas');
    const gameContainer = document.getElementById('game-container');
    
    // Target multiple elements to increase swipe area
    const swipeTargets = [canvas, gameContainer].filter(el => el !== null);
    
    console.log('Swipe targets found:', swipeTargets.length);
    
    swipeTargets.forEach((target, index) => {
        console.log(`Setting up swipe target ${index + 1}:`, target.id || target.tagName);
        
        target.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
            console.log('Swipe start:', { x: touchStartX, y: touchStartY });
        }, { passive: false });

        target.addEventListener('touchend', (e) => {
            e.preventDefault();
            const touch = e.changedTouches[0];
            touchEndX = touch.clientX;
            touchEndY = touch.clientY;
            console.log('Swipe end:', { x: touchEndX, y: touchEndY });
            
            handleSwipe();
        }, { passive: false });

        // Prevent scrolling on touch move
        target.addEventListener('touchmove', (e) => {
            e.preventDefault();
        }, { passive: false });
    });
}



// Continuous movement functions
function startContinuousMovement(direction) {
    console.log('Starting continuous movement:', direction);
    
    // Stop any existing movement
    stopContinuousMovement();
    
    // Set new direction
    continuousMovement.direction = direction;
    continuousMovement.active = true;
    
    // Start the movement interval
    continuousMovement.intervalId = setInterval(() => {
        if (continuousMovement.active && !gameOver && gameActive) {
            continuousMove();
        } else {
            stopContinuousMovement();
        }
    }, continuousMovement.speed);
    
    // Make the first move immediately
    continuousMove();
}

function stopContinuousMovement() {
    if (continuousMovement.intervalId) {
        clearInterval(continuousMovement.intervalId);
        continuousMovement.intervalId = null;
    }
    continuousMovement.active = false;
    continuousMovement.direction = null;
    console.log('Continuous movement stopped');
}

function continuousMove() {
    if (!continuousMovement.active || !continuousMovement.direction) {
        return;
    }
    
    // Only move if player is not currently animating
    if (player.isMoving) {
        return;
    }
    
    const success = movePlayer(continuousMovement.direction, true);
    
    // If movement failed (hit wall), stop continuous movement
    if (!success) {
        console.log('Hit obstacle, stopping continuous movement');
        stopContinuousMovement();
    }
}

function handleSwipe() {
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    const minSwipeDistance = 30; // Minimum distance for swipe detection
    
    console.log('Swipe delta:', { deltaX, deltaY });

    // Check if this is a tap (short distance) - use for stopping movement
    if (Math.abs(deltaX) < minSwipeDistance && Math.abs(deltaY) < minSwipeDistance) {
        console.log('Tap detected - stopping movement');
        stopContinuousMovement();
        
        if (gameMessageDisplay) {
            gameMessageDisplay.textContent = "Movement stopped. Swipe to move again.";
            gameMessageDisplay.style.color = '#FFFF00';
        }
        return;
    }

    let direction = '';
    
    // Determine swipe direction (prioritize the larger movement)
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Horizontal swipe
        if (deltaX > 0) {
            direction = 'right';
            console.log('Swipe detected: RIGHT');
        } else {
            direction = 'left';
            console.log('Swipe detected: LEFT');
        }
    } else {
        // Vertical swipe
        if (deltaY > 0) {
            direction = 'down';
            console.log('Swipe detected: DOWN');
        } else {
            direction = 'up';
            console.log('Swipe detected: UP');
        }
    }
    
    // Start continuous movement in the swiped direction
    startContinuousMovement(direction);
    
    // Visual feedback for swipe detection
    showSwipeIndicator(direction.toUpperCase());
}

// Visual indicator for swipe detection
function showSwipeIndicator(direction) {
    if (gameMessageDisplay) {
        gameMessageDisplay.textContent = `Moving ${direction}! Swipe to change direction or tap to stop.`;
        gameMessageDisplay.style.color = '#00FFFF';
    }
}



// Enhanced initialization for swipe controls
function initializeMobileFeatures() {
    console.log('Initializing mobile swipe features...');
    
    try {
        setupSwipeControls();
    } catch (error) {
        console.error('Error setting up swipe controls:', error);
    }
}

// Initialize mobile controls when the page loads
document.addEventListener('DOMContentLoaded', () => {
    initializeMobileFeatures();
});

// Also try to initialize after a short delay in case DOMContentLoaded already fired
setTimeout(() => {
    console.log('Backup initialization triggered');
    initializeMobileFeatures();
}, 500);

// And another backup after game elements are loaded
setTimeout(() => {
    console.log('Late initialization triggered');
    initializeMobileFeatures();
}, 2000);

// --- Game Functions ---

function drawMaze() {
    for (let y = 0; y < MAZE_HEIGHT_TILES; y++) {
        for (let x = 0; x < MAZE_WIDTH_TILES; x++) {
            if (MAZE[y][x] === 1) {
                if (wallTileImage.complete && wallTileImage.naturalWidth !== 0) {
                    ctx.drawImage(wallTileImage, x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                } else {
                    ctx.fillStyle = '#663300';
                    ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                }
            } else {
                ctx.fillStyle = '#444';
                ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
        }
    }
}

function drawPlayer() {
    // Player blinks when invincible
    if (player.invincible && Math.floor(Date.now() / 150) % 2 === 0) {
        return; 
    }
    if (playerImage.complete && playerImage.naturalWidth !== 0) {
        ctx.drawImage(playerImage, player.pixelX, player.pixelY, player.size, player.size);
    } else {
        ctx.fillStyle = 'blue';
        ctx.fillRect(player.pixelX, player.pixelY, player.size, player.size);
    }
}

// Draw all active ghosts (2D Context)
function drawGhosts() {
    activeGhosts.forEach(ghost => {
        if (ghostImage.complete && ghostImage.naturalWidth !== 0) {
            ctx.drawImage(ghostImage, ghost.pixelX, ghost.pixelY, ghost.size, ghost.size);
        } else {
            ctx.fillStyle = 'lightgray';
            ctx.fillRect(ghost.pixelX, ghost.pixelY, ghost.size, ghost.size);
        }
    });
}

function drawCoins() {
    coins.forEach(coin => {
        if (!coin.collected) {
            const coinPxX = coin.gridX * TILE_SIZE + (TILE_SIZE - COIN_SIZE) / 2;
            const coinPxY = coin.gridY * TILE_SIZE + (TILE_SIZE - COIN_SIZE) / 2;
            if (coinImage.complete && coinImage.naturalWidth !== 0) {
                ctx.drawImage(coinImage, coinPxX, coinPxY, COIN_SIZE, COIN_SIZE); 
            } else {
                ctx.fillStyle = 'gold';
                ctx.beginPath();
                ctx.arc(coinPxX + COIN_SIZE / 2, coinPxY + COIN_SIZE / 2, COIN_SIZE / 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    });
}

function drawTShirtInLevel() { // This is for the collectible T-shirt in 2D, not fixed displays
    if (tShirtInLevel && !tShirtInLevel.collected) {
        const tShirtPxX = tShirtInLevel.gridX * TILE_SIZE + (TILE_SIZE - T_SHIRT_SIZE) / 2;
        const tShirtPxY = tShirtInLevel.gridY * TILE_SIZE + (TILE_SIZE - T_SHIRT_SIZE) / 2;

        if (tShirtInLevel.img.complete && tShirtInLevel.img.naturalWidth !== 0) {
            ctx.drawImage(tShirtInLevel.img, tShirtPxX, tShirtPxY, T_SHIRT_SIZE, T_SHIRT_SIZE);
        } else {
            ctx.fillStyle = 'purple';
            ctx.fillRect(tShirtPxX, tShirtPxY, T_SHIRT_SIZE, T_SHIRT_SIZE);
        }
    }
}

function animatePlayerMovement() {
    if (!player.isMoving) return;

    const speed = PLAYER_PIXEL_MOVE_SPEED;
    const dx = player.targetX - player.pixelX;
    const dy = player.targetY - player.pixelY;

    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < speed) { // Snap to target if very close
        player.pixelX = player.targetX;
        player.pixelY = player.targetY;
        player.isMoving = false; // Animation finished
        checkCollectibles(); // Check collectibles immediately after landing on a tile
    } else {
        if (dx !== 0) player.pixelX += Math.sign(dx) * speed;
        if (dy !== 0) player.pixelY += Math.sign(dy) * speed;
    }
}

// Animate all active ghosts (2D Context)
function animateGhostMovements() {
    activeGhosts.forEach(ghost => {
        if (!ghost.isMoving) return;

        const speed = GHOST_PIXEL_MOVE_SPEED;
        const dx = ghost.targetX - ghost.pixelX;
        const dy = ghost.targetY - ghost.pixelY;

        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < speed) {
            ghost.pixelX = ghost.targetX;
            ghost.pixelY = ghost.targetY;
            ghost.isMoving = false;
        } else {
            if (dx !== 0) ghost.pixelX += Math.sign(dx) * speed;
            if (dy !== 0) ghost.pixelY += Math.sign(dy) * speed;
        }
    });
}

// Update position for all active ghosts. This is called by the global ghostMovementIntervalId.
function updateGhostPositions() { // This function is now responsible for moving ALL ghosts
    activeGhosts.forEach(ghost => {
        if (gameOver || ghost.isMoving) return; // Only update if game isn't over and ghost isn't animating

        let targetGridX = player.gridX;
        let targetGridY = player.gridY;

        let newGhostGridX = ghost.gridX;
        let newGhostGridY = ghost.gridY;

        // Simple pathfinding: move towards player's X or Y, prioritizing the larger difference
        if (Math.abs(targetGridX - ghost.gridX) > Math.abs(targetGridY - ghost.gridY)) {
            if (targetGridX > ghost.gridX) newGhostGridX++;
            else if (targetGridX < ghost.gridX) newGhostGridX--;
        } else {
            if (targetGridY > ghost.gridY) newGhostGridY++;
            else if (targetGridY < ghost.gridY) newGhostGridY--;
        }

        // Check if new position is a wall or out of bounds. If so, try the other direction.
        if (MAZE[newGhostGridY] === undefined || MAZE[newGhostGridY][newGhostGridX] === 1) {
            newGhostGridX = ghost.gridX; // Reset X
            newGhostGridY = ghost.gridY; // Reset Y

            if (Math.abs(targetGridX - ghost.gridX) <= Math.abs(targetGridY - ghost.gridY)) {
                if (targetGridX > ghost.gridX) newGhostGridX++;
                else if (targetGridX < ghost.gridX) newGhostGridX--;
            } else {
                if (targetGridY > ghost.gridY) newGhostGridY++;
                else if (targetGridY < ghost.gridY) newGhostGridY--;
            }

            // If still a wall or out of bounds, don't move this turn
            if (MAZE[newGhostGridY] === undefined || MAZE[newGhostGridY][newGhostGridX] === 1) {
                return;
            }
        }
        
        ghost.gridX = newGhostGridX;
        ghost.gridY = newGhostGridY;
        ghost.targetX = newGhostGridX * TILE_SIZE;
        ghost.targetY = newGhostGridY * TILE_SIZE;
        ghost.isMoving = true;
    });
}


function checkCollectibles() {
    coins.forEach(coin => {
        if (!coin.collected && player.gridX === coin.gridX && player.gridY === coin.gridY) {
            coin.collected = true;
            currentCoinCount++;
            updateUI();
            gameMessageDisplay.textContent = `Collected a coin! Total: ${currentCoinCount}`;
            gameMessageDisplay.style.color = '#00FF00';
        }
    });

    if (tShirtInLevel && !tShirtInLevel.collected && player.gridX === tShirtInLevel.gridX && player.gridY === tShirtInLevel.gridY) {
        const currentCollectableTShirt = tShirtInLevel;

        if (currentCoinCount >= currentCollectableTShirt.cost) {
            currentCollectableTShirt.collected = true;
            currentCoinCount -= currentCollectableTShirt.cost;
            shoppingBasket.push({ id: currentCollectableTShirt.id, cost: currentCollectableTShirt.cost, src: currentCollectableTShirt.img.src }); // Store data for 2D assets
            updateUI();
            stopTShirtTimer();
            resetTShirtInLevel();
            gameMessageDisplay.textContent = `Congratulations! You bought the ${currentCollectableTShirt.id} T-Shirt!`;
            gameMessageDisplay.style.color = '#00FF00';

            // After collecting a T-shirt, check if all collected
            if (tShirtsAvailable.every(t => t.collected)) { // Check if ALL T-shirts in the master list are collected
                 gameMessageDisplay.textContent = "You collected all T-shirts! Great job!";
                 gameMessageDisplay.style.color = '#00FF00';
            }

        } else {
            gameMessageDisplay.textContent = `Not enough coins for the ${currentCollectableTShirt.id} T-Shirt! You need ${currentCollectableTShirt.cost}, you have ${currentCoinCount}.`;
            gameMessageDisplay.style.color = '#FFC107';
        }
    }
}

// Check collision for all active ghosts (2D Context)
function checkGhostPlayerCollisions() {
    if (gameOver || player.invincible) {
        return; // Only check if game is active and player is not invincible
    }

    // Iterate backwards when removing items from an array you're iterating
    for (let i = activeGhosts.length - 1; i >= 0; i--) {
        const ghost = activeGhosts[i]; // Correctly reference the ghost
        if (player.gridX === ghost.gridX && player.gridY === ghost.gridY) {
            player.redHats--; // Lose a red hat
            player.invincible = true; // Become temporarily invincible
            gameMessageDisplay.textContent = `Oh no! A ghost got you! Red Hats left: ${player.redHats}`;
            gameMessageDisplay.style.color = '#FF5722';

            updateUI(); // Update hat display

            // Remove the current ghost that hit the player from the active list
            activeGhosts.splice(i, 1); // Corrected: use 'i' for the index
            
            if (player.redHats <= 0) {
                endGame("Game Over! The ghosts collected all your Red Hats.");
            } else {
                // Give player short invincibility
                setTimeout(() => {
                    player.invincible = false;
                    if (!gameOver) { // Only clear message if game not over
                        gameMessageDisplay.textContent = "";
                        gameMessageDisplay.style.color = '#00FF00';
                    }
                }, PLAYER_INVINCIBILITY_DURATION_MS);
            }
            // Only one ghost can hit the player per collision frame, so break loop after first hit
            break; 
        }
    }
}


function startTShirtTimer() {
    tShirtTimeLeft = T_SHIRT_TIMEOUT_SECONDS;
    clearInterval(tShirtTimerInterval);

    if (!tShirtInLevel) {
        console.error("Attempted to start timer for a null T-shirtInLevel object!");
        return;
    }

    tShirtTimerInterval = setInterval(() => {
        tShirtTimeLeft--;
        if (tShirtTimeLeft <= 0) {
            stopTShirtTimer();
            if (tShirtInLevel && !tShirtInLevel.collected) {
                gameMessageDisplay.textContent = `The ${tShirtInLevel.id} T-Shirt timed out! Collect more coins to try again.`;
                gameMessageDisplay.style.color = '#FF5722';
                resetTShirtInLevel();
            }
        }
    }, 1000);
}

function stopTShirtTimer() {
    clearInterval(tShirtTimerInterval);
}

function resetTShirtInLevel() {
    tShirtInLevel = null;
}

// Spawns a single ghost instance and adds it to activeGhosts array (2D Context)
function spawnGhostRandomly() { 
    if (gameOver || activeGhosts.length >= MAX_GHOSTS) { // Don't spawn if game over or max ghosts reached
        return;
    }

    let spawnGridX, spawnGridY;
    let foundSpot = false;
    const maxAttempts = 100;
    let attempts = 0;

    while (!foundSpot && attempts < maxAttempts) {
        spawnGridX = Math.floor(Math.random() * MAZE_WIDTH_TILES);
        spawnGridY = Math.floor(Math.random() * MAZE_HEIGHT_TILES);

        if (MAZE[spawnGridY][spawnGridX] === 0 && // Is path
            !(spawnGridX === player.gridX && spawnGridY === player.gridY) && // Not player's spot
            !activeGhosts.some(g => g.gridX === spawnGridX && g.gridY === spawnGridY) && // Not on another ghost's spot
            !coins.some(c => !c.collected && c.gridX === spawnGridX && c.gridY === spawnGridY) && // Not a coin's spot
            !tShirtInLevel // Ensure not on T-shirt spot
           ) {
            foundSpot = true;
        }
        attempts++;
    }

    if (foundSpot) {
        const newGhost = { // Create a new ghost object for 2D
            gridX: spawnGridX,
            gridY: spawnGridY,
            pixelX: spawnGridX * TILE_SIZE,
            pixelY: spawnGridY * TILE_SIZE,
            size: TILE_SIZE * 0.9,
            isMoving: false,
            targetX: spawnGridX * TILE_SIZE,
            targetY: spawnGridY * TILE_SIZE,
        };
        
        activeGhosts.push(newGhost); // Add to the array
        
        gameMessageDisplay.textContent = "A ghost has appeared!";
        gameMessageDisplay.style.color = '#FFC107';

        // Ghost movement logic is driven by the single global ghostMovementIntervalId
    } else {
        gameMessageDisplay.textContent = "Could not find a spot to spawn Ghost.";
        gameMessageDisplay.style.color = '#FF5722';
    }
}


function spawnNextTShirt() { // This is for the 2D version where T-shirts appear in level
    // Find eligible T-shirts based on current coins and uncollected status
    const eligibleTShirts = tShirtsAvailable.filter(tShirt => 
        !tShirt.collected && currentCoinCount >= tShirt.spawnThreshold
    );

    if (eligibleTShirts.length === 0) {
        // If no T-shirts are eligible to spawn, check if all are collected (game completion)
        if (tShirtsAvailable.every(t => t.collected)) {
            gameMessageDisplay.textContent = "All T-shirts collected! Great job!";
            gameMessageDisplay.style.color = '#00FF00';
        }
        return; // Nothing to spawn yet
    }

    // If a T-shirt is already in the level, don't spawn another one this tick
    if (tShirtInLevel) {
        return;
    }

    // Choose one random T-shirt from the eligible ones to spawn
    const potentialTShirt = eligibleTShirts[Math.floor(Math.random() * eligibleTShirts.length)];

    let spawnGridX, spawnGridY;
    let foundSpot = false;
    const maxAttempts = 100;
    let attempts = 0;

    while (!foundSpot && attempts < maxAttempts) {
        spawnGridX = Math.floor(Math.random() * MAZE_WIDTH_TILES);
        spawnGridY = Math.floor(Math.random() * MAZE_HEIGHT_TILES);

        if (MAZE[spawnGridY][spawnGridX] === 0 &&
            !(spawnGridX === player.gridX && spawnGridY === player.gridY) &&
            !activeGhosts.some(g => g.gridX === spawnGridX && g.gridY === spawnGridY) && // Not on any ghost's spot
            !coins.some(c => !c.collected && c.gridX === spawnGridX && c.gridY === spawnGridY)
           ) {
            foundSpot = true;
        }
        attempts++;
    }

    if (foundSpot) {
        tShirtInLevel = { // This is for the 2D version's collectible T-shirt in level (not fixed display)
            id: potentialTShirt.id,
            cost: potentialTShirt.cost,
            img: potentialTShirt.img, // In 2D, this is the image object
            gridX: spawnGridX,
            gridY: spawnGridY,
            width: T_SHIRT_SIZE,
            height: T_SHIRT_SIZE,
            collected: false
        };
        gameMessageDisplay.textContent = `A T-Shirt (${tShirtInLevel.id}) appeared! Cost: ${tShirtInLevel.cost} coins. Find it fast!`;
        gameMessageDisplay.style.color = '#FFC107';
        startTShirtTimer();
    } else {
        gameMessageDisplay.textContent = "Could not find a spot to spawn T-shirt. Try collecting more coins.";
        gameMessageDisplay.style.color = '#FF5722';
    }
}

// Function to check if all spawned coins in the current maze are collected
function checkAllCoinsCollected() {
    return coins.every(coin => coin.collected);
}

// Resets coins and switches to next maze level
function goToNextLevel() {
    stopContinuousMovement(); // Stop continuous movement on level change
    currentLevelIndex++;
    if (currentLevelIndex >= MAZE_LEVELS.length) {
        currentLevelIndex = 0; // Loop back to first level if all are cleared
        gameMessageDisplay.textContent = "All mazes cleared! Restarting from Level 1.";
        gameMessageDisplay.style.color = '#00FF00';
    } else {
        gameMessageDisplay.textContent = `Maze cleared! Advancing to Level ${currentLevelIndex + 1}.`;
        gameMessageDisplay.style.color = '#00FF00';
    }

    MAZE = MAZE_LEVELS[currentLevelIndex];
    resetTShirtInLevel();
    stopTShirtTimer();

    player.gridX = 1;
    player.gridY = 1; // For 2D maze
    player.pixelX = 1 * TILE_SIZE;
    player.pixelY = 1 * TILE_SIZE; // For 2D maze
    player.isMoving = false;
    player.targetX = player.pixelX;
    player.targetY = player.pixelY;

    // Clear all ghosts and their intervals for new level
    activeGhosts.forEach(g => clearInterval(g.chaseInterval));
    activeGhosts = []; // Clear array of ghosts
    clearTimeout(ghostSpawnTimer);
    clearInterval(ghostRecurringSpawnTimerId);
    clearInterval(ghostMovementIntervalId); // Clear the global ghost movement interval

    // Restart ghost appearance timers for new level
    ghostSpawnTimer = setTimeout(spawnGhostRandomly, GHOST_SPAWN_DELAY_SECONDS * 1000);
    ghostRecurringSpawnTimerId = setInterval(manageRecurringGhostSpawns, GHOST_RECURRING_SPAWN_INTERVAL_SECONDS * 1000);
    // Re-start the single global ghost movement interval
    ghostMovementIntervalId = setInterval(updateGhostPositions, GHOST_CHASE_INTERVAL_MS);

    resetCoinsForCurrentMaze(); // Only re-initialize coins for the new maze, do NOT reset player's coins or shopping basket
    updateUI();
}


// --- Update UI Function (shared) ---
function updateUI() {
    // Update Red Hat counters display
    const redHatCountersDisplay = document.getElementById('redHatCounters');
    if (redHatCountersDisplay) { // Check if element exists
        redHatCountersDisplay.innerHTML = '';
        for (let i = 0; i < player.redHats; i++) {
            const img = document.createElement('img');
            img.src = 'assets/red_hat_icon.png';
            img.alt = 'Red Hat';
            img.className = 'red-hat-icon';
            redHatCountersDisplay.appendChild(img);
        }
    }

    coinCountDisplay.textContent = currentCoinCount;
    shoppingBasketDisplay.innerHTML = '';
    shoppingBasket.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'basket-item';
        const imgElement = document.createElement('img');
        
        imgElement.src = item.src; // For 2D, item.src is direct image path
        imgElement.alt = item.id;
        itemDiv.appendChild(imgElement);
        
        shoppingBasketDisplay.appendChild(itemDiv);
    });
    // Enable/disable checkout button based on basket content
    if (checkoutButtonElement) { // Check if element exists
        checkoutButtonElement.disabled = shoppingBasket.length === 0;
    }
}


// --- Game Over function ---
function endGame(message) {
    gameOver = true;
    stopContinuousMovement(); // Stop continuous movement on game over
    gameMessageDisplay.textContent = message;
    gameMessageDisplay.style.color = '#FF0000';
    // Clear all ghost-related timers/intervals
    activeGhosts.forEach(g => clearInterval(g.chaseInterval));
    activeGhosts = []; // Clear array of ghosts
    clearTimeout(ghostSpawnTimer);
    clearInterval(ghostRecurringSpawnTimerId);
    clearInterval(ghostMovementIntervalId); // Clear the global ghost movement interval
    clearInterval(tShirtTimerInterval); // Stop T-shirt timer
    restartButtonElement.style.display = 'block'; // Show restart button using the correctly scoped element
}

// --- Restart Game function (bound to button) ---
function restartGame() {
    gameOver = false;
    currentLevelIndex = 0;
    MAZE = MAZE_LEVELS[currentLevelIndex]; // Reset to Level 1 Maze
    player.redHats = RED_HAT_COUNT_START; // Reset red hats on full game restart
    player.invincible = false;
    
    // Clear all existing ghost intervals and objects
    activeGhosts.forEach(g => clearInterval(g.chaseInterval));
    activeGhosts = [];
    clearTimeout(ghostSpawnTimer);
    clearInterval(ghostRecurringSpawnTimerId);
    clearInterval(ghostMovementIntervalId);

    // Reset ghost timers to null
    ghostSpawnTimer = null;
    ghostRecurringSpawnTimerId = null;
    ghostMovementIntervalId = null;

    // Re-initialize all game elements (coins, T-shirts, player position, UI)
    initializeGameElements(); 
    
    // Restart all necessary game timers and loops
    startInitialGhostSpawnTimer(); 
    ghostRecurringSpawnTimerId = setInterval(manageRecurringGhostSpawns, GHOST_RECURRING_SPAWN_INTERVAL_SECONDS * 1000);
    ghostMovementIntervalId = setInterval(updateGhostPositions, GHOST_CHASE_INTERVAL_MS);

    gameLoop(); // Ensure game loop is running
}
// Attach restart button listener (check if element exists)
if (restartButtonElement) { 
    restartButtonElement.addEventListener('click', restartGame);
}


// --- Function to manage recurring ghost spawns ---
function manageRecurringGhostSpawns() {
    if (!gameOver && activeGhosts.length < MAX_GHOSTS && player.redHats > 0) {
        spawnGhostRandomly();
    }
}

// --- Function to start the initial ghost spawn timer ---
function startInitialGhostSpawnTimer() {
    clearTimeout(ghostSpawnTimer); // Clear any old initial timer just in case
    ghostSpawnTimer = setTimeout(() => {
        if (!gameOver && activeGhosts.length < MAX_GHOSTS) {
            spawnGhostRandomly();
        }
    }, GHOST_SPAWN_DELAY_SECONDS * 1000); 
    gameMessageDisplay.textContent = `A ghost will appear in ${GHOST_SPAWN_DELAY_SECONDS} seconds!`;
    gameMessageDisplay.style.color = '#FF5722';
}

// --- Order Confirmation Functions ---
function showOrderConfirmation() {
    // Check if the order confirmation overlay elements exist
    if (!orderConfirmationOverlay || !orderItemsList || !orderTotalDisplay || !cancelOrderButton || !placeOrderButton) {
        gameMessageDisplay.textContent = "Error: Order confirmation HTML elements not found!";
        gameMessageDisplay.style.color = '#FF5722';
        console.error("Order confirmation HTML elements missing!");
        return;
    }

    if (shoppingBasket.length === 0) {
        gameMessageDisplay.textContent = "Your basket is empty! Collect some T-shirts first.";
        gameMessageDisplay.style.color = '#FFC107';
        return;
    }

    stopContinuousMovement(); // Stop continuous movement when showing order confirmation
    gameActive = false; // Pause game loop
    orderConfirmationOverlay.style.display = 'flex'; // Show order confirmation overlay

    // Populate order items
    orderItemsList.innerHTML = ''; // Clear previous items
    let totalCost = 0;

    shoppingBasket.forEach(item => {
        const orderItemDiv = document.createElement('div');
        orderItemDiv.className = 'order-item';
        
        orderItemDiv.innerHTML = `
            <div class="order-item-info">
                <img src="${item.src}" alt="${item.id}">
                <span class="order-item-name">${item.id} T-Shirt</span>
            </div>
            <span class="order-item-price">${item.cost} coins</span>
        `;
        
        orderItemsList.appendChild(orderItemDiv);
        totalCost += item.cost;
    });

    orderTotalDisplay.textContent = totalCost + " coins";

    gameMessageDisplay.textContent = "Order confirmation displayed! Review your items.";
    gameMessageDisplay.style.color = '#00FF00';
}

function closeOrderConfirmation() {
    if (orderConfirmationOverlay) {
        orderConfirmationOverlay.style.display = 'none'; // Hide order confirmation overlay
    }
    gameActive = true; // Resume game loop
}

// --- Invoice Generation and Display Functions ---
function generateInvoice() {
    // Check if the invoice overlay elements exist
    if (!invoiceOverlay || !invoiceItemsDisplay || !invoiceTotalDisplay || !invoiceNumberDisplay || !invoiceDateDisplay || !invoiceSubtotalDisplay || !closeInvoiceButton) {
        gameMessageDisplay.textContent = "Error: Invoice HTML elements not found in index.html!";
        gameMessageDisplay.style.color = '#FF5722';
        console.error("Invoice HTML elements missing! Check index.html for invoiceOverlay and its children.");
        return;
    }

    if (shoppingBasket.length === 0) {
        gameMessageDisplay.textContent = "Your basket is empty! Collect some T-shirts first.";
        gameMessageDisplay.style.color = '#FFC107';
        return;
    }

    // Close order confirmation if it's open
    closeOrderConfirmation();
    
    stopContinuousMovement(); // Stop continuous movement when showing invoice
    gameActive = false; // Pause game loop
    invoiceOverlay.style.display = 'flex'; // Show invoice overlay

    // Populate invoice details
    const now = new Date();
    invoiceNumberDisplay.textContent = `INV-${Date.now().toString().slice(-6)}`; // Simple unique ID
    invoiceDateDisplay.textContent = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    invoiceItemsDisplay.innerHTML = ''; // Clear previous items
    let totalCost = 0;

    // Add items directly to the existing tbody element
    shoppingBasket.forEach(item => {
        const itemRow = document.createElement('tr');
        itemRow.innerHTML = `
            <td><div class="item-description"><img src="${item.src}" alt="${item.id}"> ${item.id} T-Shirt</div></td>
            <td>1</td>
            <td>${item.cost}</td>
            <td style="text-align: right;">${item.cost}</td>
        `;
        invoiceItemsDisplay.appendChild(itemRow);
        totalCost += item.cost;
    });


    invoiceSubtotalDisplay.textContent = totalCost + " coins";
    invoiceTotalDisplay.textContent = totalCost + " coins";

    gameMessageDisplay.textContent = "Invoice generated! Check your order.";
    gameMessageDisplay.style.color = '#00FF00';

    // Attach listener for close button 
    closeInvoiceButton.onclick = closeInvoice;
}

function closeInvoice() { 
    if (invoiceOverlay) { // Check if element exists
        invoiceOverlay.style.display = 'none'; // Hide invoice overlay
    }
    gameActive = true; // Resume game loop
}
// END NEW FUNCTIONS


// --- Main Game Loop ---
function gameLoop() {
    if (gameOver) {
        return;
    }

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT); // Clear the 2D canvas

    animatePlayerMovement();
    animateGhostMovements(); 

    checkCollectibles();
    checkGhostPlayerCollisions();

    if (checkAllCoinsCollected()) {
        goToNextLevel();
    }

    // T-shirt appearance logic (for 2D version where it spawns in level)
    if (!tShirtInLevel && tShirtsAvailable.some(t => !t.collected && currentCoinCount >= t.spawnThreshold)) { 
        spawnNextTShirt();
    }

    drawMaze();
    drawCoins();
    drawTShirtInLevel(); // Draw the collectible T-shirt in 2D
    drawGhosts(); // Draw all active ghosts
    drawPlayer(); // Draw player last to be on top

    requestAnimationFrame(gameLoop);
}

// --- INITIALIZATION CALLS (run once when script loads) ---
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

// Define initializeGameElements function here, BEFORE it is called
function initializeGameElements() {
    // Player initial position for the current maze
    player.gridX = 1;
    player.gridY = 1; // For 2D maze
    player.pixelX = 1 * TILE_SIZE;
    player.pixelY = 1 * TILE_SIZE; // For 2D maze
    player.isMoving = false;
    player.targetX = player.pixelX;
    player.targetY = player.pixelY;

    // Coins reset for the current maze
    resetCoinsForCurrentMaze(); 

    // T-shirt states reset (for level, but master 'collected' persists)
    tShirtsAvailable.forEach(t => t.collected = false); // All T-shirts become available again for collection
    tShirtInLevel = null; // No T-shirt spawned yet for this new maze/level
    
    // UI states reset (currentCoinCount and shoppingBasket are NOT reset here)
    currentCoinCount = 0; // NEW: Reset coins on full game restart
    shoppingBasket = []; // NEW: Clear basket on full game restart
    gameActive = true;
    updateUI(); // Initial UI update
    gameMessageDisplay.textContent = "Welcome! Collect coins, avoid ghosts!";
    gameMessageDisplay.style.color = '#00FF00';
    restartButtonElement.style.display = 'none'; // Ensure restart button is hidden at start
    
    // Attach checkout button listener when elements are guaranteed to exist
    if (checkoutButtonElement) { 
        checkoutButtonElement.addEventListener('click', showOrderConfirmation); // Show order confirmation first
        checkoutButtonElement.disabled = true; // Initially disabled if basket is empty
    }

    // Attach order confirmation button listeners
    if (cancelOrderButton) {
        cancelOrderButton.addEventListener('click', closeOrderConfirmation);
    }

    if (placeOrderButton) {
        placeOrderButton.addEventListener('click', generateInvoice);
    }
}

// Helper function to populate coins for the current maze
function resetCoinsForCurrentMaze() {
    coins = []; // Clear old coins
    const accessibleCells = [];
    for (let y = 0; y < MAZE_HEIGHT_TILES; y++) {
        for (let x = 0; x < MAZE_WIDTH_TILES; x++) {
            // Ensure cell is a path and not the player's initial spawn point
            if (MAZE[y][x] === 0 && !(x === player.gridX && y === player.gridY)) {
                accessibleCells.push({ gridX: x, gridY: y });
            }
        }
    }

    // Shuffle cells and pick COINS_PER_LEVEL number of coins
    for (let i = accessibleCells.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [accessibleCells[i], accessibleCells[j]] = [accessibleCells[j], accessibleCells[i]];
    }

    for (let i = 0; i < COINS_PER_LEVEL && i < accessibleCells.length; i++) {
        const coinPos = accessibleCells[i];
        coins.push({ ...coinPos, width: COIN_SIZE, height: COIN_SIZE, collected: false });
    }
}


// Call sequence for game start
// These functions are now defined BEFORE they are called.
drawMaze(); 
initializeGameElements(); 
startInitialGhostSpawnTimer(); 
ghostMovementIntervalId = setInterval(updateGhostPositions, GHOST_CHASE_INTERVAL_MS); 
ghostRecurringSpawnTimerId = setInterval(manageRecurringGhostSpawns, GHOST_RECURRING_SPAWN_INTERVAL_SECONDS * 1000); 
gameLoop(); 

// --- END script.js (2D Version - Final, Final, FINAL) ---