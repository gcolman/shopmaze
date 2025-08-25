// Rendering Module
// Handles all drawing and rendering operations

import { GAME_CONFIG } from './config.js';

export class Renderer {
    constructor(canvas, assetLoader) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.assetLoader = assetLoader;
        
        // Set canvas size
        this.canvas.width = GAME_CONFIG.CANVAS_WIDTH;
        this.canvas.height = GAME_CONFIG.CANVAS_HEIGHT;
    }

    // Clear the entire canvas
    clear() {
        this.ctx.clearRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);
    }

    // Draw the maze
    drawMaze(maze) {
        if (!maze) {
            console.error('Renderer: No maze data provided to drawMaze');
            return;
        }
        
        const wallTileImage = this.assetLoader.getAsset('wallTile');
        
        for (let y = 0; y < GAME_CONFIG.MAZE_HEIGHT_TILES; y++) {
            for (let x = 0; x < GAME_CONFIG.MAZE_WIDTH_TILES; x++) {
                if (maze[y] && maze[y][x] === 1) {
                    // Draw wall
                    if (wallTileImage && wallTileImage.complete && wallTileImage.naturalWidth !== 0) {
                        this.ctx.drawImage(
                            wallTileImage, 
                            x * GAME_CONFIG.TILE_SIZE, 
                            y * GAME_CONFIG.TILE_SIZE, 
                            GAME_CONFIG.TILE_SIZE, 
                            GAME_CONFIG.TILE_SIZE
                        );
                    } else {
                        // Fallback brown rectangle
                        this.ctx.fillStyle = '#663300';
                        this.ctx.fillRect(
                            x * GAME_CONFIG.TILE_SIZE, 
                            y * GAME_CONFIG.TILE_SIZE, 
                            GAME_CONFIG.TILE_SIZE, 
                            GAME_CONFIG.TILE_SIZE
                        );
                    }
                } else {
                    // Draw path
                    this.ctx.fillStyle = '#444';
                    this.ctx.fillRect(
                        x * GAME_CONFIG.TILE_SIZE, 
                        y * GAME_CONFIG.TILE_SIZE, 
                        GAME_CONFIG.TILE_SIZE, 
                        GAME_CONFIG.TILE_SIZE
                    );
                }
            }
        }
    }

    // Draw the player
    drawPlayer(player) {
        // Skip drawing if player is flashing and should blink (invincible)
        if (player.isFlashing && player.shouldBlink) {
            return; // Don't draw player during blink phase
        }

        const playerImage = this.assetLoader.getAsset('player');
        
        if (playerImage && playerImage.complete && playerImage.naturalWidth !== 0) {
            // Apply visual effect if invincible but not blinking
            if (player.invincible && !player.shouldBlink) {
                this.ctx.save();
                this.ctx.globalAlpha = 0.7; // Slightly transparent when invincible
                this.ctx.shadowColor = 'cyan';
                this.ctx.shadowBlur = 10;
            }
            
            this.ctx.drawImage(
                playerImage, 
                player.pixelX, 
                player.pixelY, 
                player.size, 
                player.size
            );
            
            if (player.invincible && !player.shouldBlink) {
                this.ctx.restore();
            }
        } else {
            // Fallback rectangle with flashing effect
            if (player.invincible && !player.shouldBlink) {
                this.ctx.fillStyle = 'cyan'; // Different color when invincible
            } else {
                this.ctx.fillStyle = 'blue';
            }
            this.ctx.fillRect(player.pixelX, player.pixelY, player.size, player.size);
        }
    }

    // Draw all ghosts
    drawGhosts(ghosts) {
        const ghostImage = this.assetLoader.getAsset('ghost');
        
        ghosts.forEach(ghost => {
            if (ghostImage && ghostImage.complete && ghostImage.naturalWidth !== 0) {
                this.ctx.drawImage(
                    ghostImage, 
                    ghost.pixelX, 
                    ghost.pixelY, 
                    ghost.size, 
                    ghost.size
                );
            } else {
                // Fallback light gray rectangle
                this.ctx.fillStyle = 'lightgray';
                this.ctx.fillRect(ghost.pixelX, ghost.pixelY, ghost.size, ghost.size);
            }
        });
    }

    // Draw all coins
    drawCoins(coins) {
        const coinImage = this.assetLoader.getAsset('coin');
        
        coins.forEach(coin => {
            if (!coin.collected) {
                const coinPxX = coin.gridX * GAME_CONFIG.TILE_SIZE + (GAME_CONFIG.TILE_SIZE - GAME_CONFIG.COIN_SIZE) / 2;
                const coinPxY = coin.gridY * GAME_CONFIG.TILE_SIZE + (GAME_CONFIG.TILE_SIZE - GAME_CONFIG.COIN_SIZE) / 2;
                
                if (coinImage && coinImage.complete && coinImage.naturalWidth !== 0) {
                    this.ctx.drawImage(
                        coinImage, 
                        coinPxX, 
                        coinPxY, 
                        GAME_CONFIG.COIN_SIZE, 
                        GAME_CONFIG.COIN_SIZE
                    );
                } else {
                    // Fallback gold circle
                    this.ctx.fillStyle = 'gold';
                    this.ctx.beginPath();
                    this.ctx.arc(
                        coinPxX + GAME_CONFIG.COIN_SIZE / 2, 
                        coinPxY + GAME_CONFIG.COIN_SIZE / 2, 
                        GAME_CONFIG.COIN_SIZE / 2, 
                        0, 
                        Math.PI * 2
                    );
                    this.ctx.fill();
                }
            }
        });
    }

    // Draw t-shirt in level
    drawTShirtInLevel(tShirt) {
        if (!tShirt || tShirt.collected) return;

        const tShirtPxX = tShirt.gridX * GAME_CONFIG.TILE_SIZE + (GAME_CONFIG.TILE_SIZE - GAME_CONFIG.T_SHIRT_SIZE) / 2;
        const tShirtPxY = tShirt.gridY * GAME_CONFIG.TILE_SIZE + (GAME_CONFIG.TILE_SIZE - GAME_CONFIG.T_SHIRT_SIZE) / 2;

        if (tShirt.img && tShirt.img.complete && tShirt.img.naturalWidth !== 0) {
            this.ctx.drawImage(
                tShirt.img, 
                tShirtPxX, 
                tShirtPxY, 
                GAME_CONFIG.T_SHIRT_SIZE, 
                GAME_CONFIG.T_SHIRT_SIZE
            );
        } else {
            // Fallback purple rectangle
            this.ctx.fillStyle = 'purple';
            this.ctx.fillRect(tShirtPxX, tShirtPxY, GAME_CONFIG.T_SHIRT_SIZE, GAME_CONFIG.T_SHIRT_SIZE);
        }
    }

    // Draw red hat in level
    drawRedHatInLevel(redHat) {
        if (!redHat || redHat.collected) {
            return;
        }

        const redHatPxX = redHat.gridX * GAME_CONFIG.TILE_SIZE + (GAME_CONFIG.TILE_SIZE - GAME_CONFIG.RED_HAT_SIZE) / 2;
        const redHatPxY = redHat.gridY * GAME_CONFIG.TILE_SIZE + (GAME_CONFIG.TILE_SIZE - GAME_CONFIG.RED_HAT_SIZE) / 2;

        const redHatImage = this.assetLoader.getAsset('redHatIcon');
        
        if (redHatImage && redHatImage.complete && redHatImage.naturalWidth !== 0) {
            this.ctx.drawImage(
                redHatImage, 
                redHatPxX, 
                redHatPxY, 
                GAME_CONFIG.RED_HAT_SIZE, 
                GAME_CONFIG.RED_HAT_SIZE
            );
        } else {
            // Fallback red rectangle
            this.ctx.fillStyle = 'red';
            this.ctx.fillRect(redHatPxX, redHatPxY, GAME_CONFIG.RED_HAT_SIZE, GAME_CONFIG.RED_HAT_SIZE);
        }
    }

    // Draw the complete game scene
    drawScene(gameState) {
        this.clear();
        
        // Draw in proper order (back to front)
        this.drawMaze(gameState.maze.layout);
        this.drawCoins(gameState.coins);
        this.drawTShirtInLevel(gameState.tShirtInLevel);
        
        this.drawRedHatInLevel(gameState.redHatInLevel);
        
        this.drawGhosts(gameState.ghosts);
        this.drawPlayer(gameState.player);
    }
}
