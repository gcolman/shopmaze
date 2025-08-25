// Main Entry Point
// Initializes and starts the game

import { GameController } from './gameController.js';

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const gameController = new GameController();
        await gameController.initialize();
    } catch (error) {
        console.error('Failed to initialize game:', error);
    }
});

// Export for potential external access
window.RedHatQuest = { GameController };
