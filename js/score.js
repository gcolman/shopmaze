// Score Class
// Manages the running game score calculation and display

export class Score {
    constructor() {
        // Score components
        this.coinsCollected = 0;
        this.tShirtValueCollected = 0;
        this.levelsCompleted = 0;
        
        // Score multipliers and bonuses
        this.T_SHIRT_MULTIPLIER = 2;
        this.LEVEL_COMPLETION_BONUS = 10;
        
        // Display element
        this.scoreDisplay = null;
        this.initialized = false;
    }

    /**
     * Initialize the score display element
     */
    initialize() {
        this.scoreDisplay = document.getElementById('scoreDisplay');
        if (!this.scoreDisplay) {
            console.warn('Score: scoreDisplay element not found in DOM');
            return false;
        }
        this.initialized = true;
        this.updateDisplay();
        return true;
    }

    /**
     * Calculate the current total score
     * Formula: (T-shirt value * 10) + coins collected + (10 points per level completed)
     */
    calculateTotal() {
        return (this.tShirtValueCollected * this.T_SHIRT_MULTIPLIER) + 
               this.coinsCollected + 
               (this.levelsCompleted * this.LEVEL_COMPLETION_BONUS);
    }

    /**
     * Add coins to the score
     * @param {number} coinCount - Number of coins collected
     */
    addCoins(coinCount) {
        if (typeof coinCount !== 'number' || coinCount < 0) {
            console.error('Score: Invalid coin count:', coinCount);
            return;
        }
        
        this.coinsCollected += coinCount;
        this.updateDisplay();
        
        console.log(`Score: Added ${coinCount} coins. Total coins: ${this.coinsCollected}`);
    }

    /**
     * Add t-shirt value to the score
     * @param {number} tShirtValue - Value of the collected t-shirt
     */
    addTShirtValue(tShirtValue) {
        if (typeof tShirtValue !== 'number' || tShirtValue < 0) {
            console.error('Score: Invalid t-shirt value:', tShirtValue);
            return;
        }
        
        this.tShirtValueCollected += tShirtValue;
        this.updateDisplay();
        
        console.log(`Score: Added t-shirt value ${tShirtValue}. Total t-shirt value: ${this.tShirtValueCollected}`);
    }

    /**
     * Add a completed level to the score
     */
    addCompletedLevel() {
        this.levelsCompleted++;
        this.updateDisplay();
        
        console.log(`Score: Level completed. Total levels: ${this.levelsCompleted}`);
    }

    /**
     * Reset the score (for new game)
     */
    reset() {
        this.coinsCollected = 0;
        this.tShirtValueCollected = 0;
        this.levelsCompleted = 0;
        this.updateDisplay();
        
        console.log('Score: Reset to zero');
    }

    /**
     * Set score values directly (for game restoration)
     * @param {Object} scoreData - Object containing score data
     */
    setScore(scoreData) {
        if (!scoreData || typeof scoreData !== 'object') {
            console.error('Score: Invalid score data for setScore:', scoreData);
            return;
        }

        this.coinsCollected = scoreData.coinsCollected || 0;
        this.tShirtValueCollected = scoreData.tShirtValueCollected || 0;
        this.levelsCompleted = scoreData.levelsCompleted || 0;
        this.updateDisplay();
        
        console.log('Score: Set score data:', scoreData);
    }

    /**
     * Get current score data
     * @returns {Object} Current score breakdown
     */
    getScoreData() {
        console.log("Score: Getting score data ",this.calculateTotal() );

        return {
            coinsCollected: this.coinsCollected,
            tShirtValueCollected: this.tShirtValueCollected,
            levelsCompleted: this.levelsCompleted,
            totalScore: this.calculateTotal(),
            breakdown: {
                coinPoints: this.coinsCollected,
                tShirtPoints: this.tShirtValueCollected * this.T_SHIRT_MULTIPLIER,
                levelPoints: this.levelsCompleted * this.LEVEL_COMPLETION_BONUS
            }
        };
    }

    /**
     * Update the score display in the UI
     */
    updateDisplay() {
        if (!this.initialized || !this.scoreDisplay) {
            return;
        }

        const totalScore = this.calculateTotal();
        this.scoreDisplay.textContent = totalScore.toLocaleString();
        
        // Update tooltip with breakdown if available
        const breakdown = this.getScoreData().breakdown;
        const tooltip = `Score Breakdown:
• Coins: ${this.coinsCollected} points
• T-shirts: ${this.tShirtValueCollected} × ${this.T_SHIRT_MULTIPLIER} = ${breakdown.tShirtPoints} points  
• Levels: ${this.levelsCompleted} × ${this.LEVEL_COMPLETION_BONUS} = ${breakdown.levelPoints} points
• Total: ${totalScore} points`;
        
        this.scoreDisplay.title = tooltip;
    }

    /**
     * Get formatted score string for display
     * @returns {string} Formatted score
     */
    getFormattedScore() {
        return this.calculateTotal().toLocaleString();
    }

    /**
     * Get score breakdown as a formatted string
     * @returns {string} Detailed score breakdown
     */
    getScoreBreakdown() {
        const data = this.getScoreData();
        return `Total Score: ${data.totalScore}
Coins Collected: ${data.coinsCollected} points
T-shirt Value: ${data.tShirtValueCollected} × ${this.T_SHIRT_MULTIPLIER} = ${data.breakdown.tShirtPoints} points
Levels Completed: ${data.levelsCompleted} × ${this.LEVEL_COMPLETION_BONUS} = ${data.breakdown.levelPoints} points`;
    }

    /**
     * Log current score status (for debugging)
     */
    logStatus() {
        console.log('Score Status:', this.getScoreData());
    }
}
