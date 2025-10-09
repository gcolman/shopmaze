// Red Hat Quest - Leaderboard JavaScript

// Debug: Verify leaderboard.js is loaded
console.log('Leaderboard JavaScript loaded successfully');

// Add error handling for uncaught errors
window.addEventListener('error', (event) => {
    console.error('Leaderboard: Uncaught error:', event.error);
    console.error('Leaderboard: Error details:', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
    });
});

// Add error handling for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('Leaderboard: Unhandled promise rejection:', event.reason);
});

let refreshInterval;
let lastDataHash = '';
let lastUpdateTime = '';

// Load leaderboard data from API
async function loadLeaderboard(silent = false) {
    try {
        if (!silent) {
            console.log('Fetching leaderboard data...');
            showUpdateIndicator();
        }
        
        // Get leaderboard URL from configuration framework with fallback
        console.log("Leaderboard: window.WEBSOCKET_URL " ,window.WEBSOCKET_URL);
        console.log("Leaderboard: window.LEADERBOARD_URL " ,window.LEADERBOARD_URL);
        console.log("Leaderboard: window.DEPLOYMENT_CONFIG ", window.DEPLOYMENT_CONFIG);
        
        // Use ConfigMap URL or fallback to same domain
        const leaderboardUrl = window.LEADERBOARD_URL || 
                             (window.DEPLOYMENT_CONFIG && window.DEPLOYMENT_CONFIG.leaderboardUrl) || 
                             `${window.location.protocol}//${window.location.hostname}/leaderboard`;
        console.log('Leaderboard: Final URL:', leaderboardUrl);
        const response = await fetch(leaderboardUrl);
        console.log('>>>>>>Response:', response);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Check if data has changed
        const dataHash = JSON.stringify(data.data);
        const hasChanged = dataHash !== lastDataHash;
        
        if (data.success) {
            // Deduplicate data for display and get the actual count
            const deduplicatedData = deduplicateLeaderboard(data.data);
            displayLeaderboard(data.data, hasChanged && silent);
            updateStats(deduplicatedData.length, data.lastUpdated);
            
            // Update tracking variables
            lastDataHash = dataHash;
            lastUpdateTime = data.lastUpdated;
            
            if (!silent) {
                console.log('Leaderboard data received:', data);
            } else if (hasChanged) {
                console.log('Leaderboard updated with new data');
                showNewDataIndicator();
            }
        } else {
            throw new Error('API returned error response');
        }
        
        if (!silent) {
            hideUpdateIndicator();
        }
        
    } catch (error) {
        console.error('Error loading leaderboard:', error);
        if (!silent) {
            displayError(`Failed to load leaderboard: ${error.message}`);
        }
        hideUpdateIndicator();
    }
}

// Deduplicate leaderboard entries - keep only the most recent entry for each player-score combination
function deduplicateLeaderboard(leaderboardData) {
    if (!leaderboardData || leaderboardData.length === 0) {
        return leaderboardData;
    }
    
    console.log('Deduplicating leaderboard data:', leaderboardData.length, 'entries');
    
    // Create a map to track unique player-score combinations
    const uniqueEntries = new Map();
    
    leaderboardData.forEach(entry => {
        // Create a unique key combining player ID and score
        const key = `${entry.userId}-${entry.score}`;
        
        // If this combination doesn't exist, or if this entry is more recent, keep it
        if (!uniqueEntries.has(key) || new Date(entry.timestamp) > new Date(uniqueEntries.get(key).timestamp)) {
            uniqueEntries.set(key, entry);
        }
    });
    
    // Convert map back to array and sort by score (descending) then by timestamp (descending)
    const deduplicatedData = Array.from(uniqueEntries.values()).sort((a, b) => {
        // First sort by score (higher scores first)
        if (b.score !== a.score) {
            return b.score - a.score;
        }
        // If scores are equal, sort by timestamp (more recent first)
        return new Date(b.timestamp) - new Date(a.timestamp);
    });
    
    console.log('Deduplicated leaderboard data:', deduplicatedData.length, 'unique entries');
    return deduplicatedData;
}

// Display leaderboard data in table
function displayLeaderboard(leaderboardData, highlightChanges = false) {
    const contentDiv = document.getElementById('leaderboardContent');
    
    if (!leaderboardData || leaderboardData.length === 0) {
        contentDiv.innerHTML = `
            <div class="no-data">
                <div class="no-data-icon">🎮</div>
                <h3>No scores yet!</h3>
                <p>Be the first to complete a game and appear on the leaderboard.</p>
            </div>
        `;
        return;
    }

    // Deduplicate the leaderboard data before displaying
    const deduplicatedData = deduplicateLeaderboard(leaderboardData);

    let tableHTML = `
        <table class="leaderboard-table">
            <thead>
                <tr>
                    <th>Rank</th>
                    <th>Player</th>
                    <th>Score</th>
                    <th>Level</th>
                    <th>T-Shirts</th>
                    <th>Date</th>
                </tr>
            </thead>
            <tbody>
    `;

    deduplicatedData.forEach((entry, index) => {
        const rank = index + 1;
        const rankClass = rank <= 3 ? `rank-${rank}` : '';
        const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '';
        const date = new Date(entry.timestamp).toLocaleDateString();
        const time = new Date(entry.timestamp).toLocaleTimeString();

        tableHTML += `
            <tr>
                <td class="rank ${rankClass}">
                    <span class="rank-medal">${medal}</span>
                    <span>${rank}</span>
                </td>
                <td>
                    <div class="player-info">
                        <div class="player-id">${escapeHtml(entry.userId)}</div>
                    </div>
                </td>
                <td>
                    <div class="score">${entry.score}</div>
                </td>
                <td>
                    <span class="level-badge">Level ${entry.level}</span>
                </td>
                <td>
                    <span class="tshirt-count">${entry.tShirtsCount} T-shirts</span>
                </td>
                <td>
                    <div class="timestamp">
                        <div>${date}</div>
                        <div>${time}</div>
                    </div>
                </td>
            </tr>
        `;
    });

    tableHTML += `
            </tbody>
        </table>
    `;

    contentDiv.innerHTML = tableHTML;
}

// Update stats in header
function updateStats(count, lastUpdated) {
    document.getElementById('playerCount').textContent = count;
    
    if (lastUpdated) {
        const date = new Date(lastUpdated);
        document.getElementById('lastUpdated').textContent = date.toLocaleTimeString();
    }
}

// Display error message
function displayError(message) {
    const contentDiv = document.getElementById('leaderboardContent');
    contentDiv.innerHTML = `
        <div class="error">
            <h3>⚠️ Error Loading Leaderboard</h3>
            <p>${escapeHtml(message)}</p>
            <button class="refresh-btn" onclick="loadLeaderboard()" style="margin-top: 15px;">
                Try Again
            </button>
        </div>
    `;
}

// Visual feedback functions
function showUpdateIndicator() {
    const refreshBtn = document.querySelector('.refresh-btn');
    if (refreshBtn) {
        refreshBtn.style.opacity = '0.6';
        refreshBtn.innerHTML = '<span>⏳</span> Updating...';
    }
}

function hideUpdateIndicator() {
    const refreshBtn = document.querySelector('.refresh-btn');
    if (refreshBtn) {
        refreshBtn.style.opacity = '1';
        refreshBtn.innerHTML = '<span>🔄</span> Refresh';
    }
}

function showNewDataIndicator() {
    // Show a brief flash to indicate new data
    const container = document.querySelector('.leaderboard-container');
    if (container) {
        container.style.boxShadow = '0 20px 40px rgba(0, 150, 105, 0.4)';
        setTimeout(() => {
            container.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.3)';
        }, 2000);
    }

    // Show notification
    showNotification('🏆 Leaderboard updated with new scores!');
}

function showNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #059669;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3);
        z-index: 10000;
        font-weight: 500;
        transform: translateX(100%);
        transition: transform 0.3s ease;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Slide in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 4000);
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Auto-refresh every 5 seconds for more immediate updates
function startAutoRefresh() {
    refreshInterval = setInterval(() => {
        loadLeaderboard(true); // Silent refresh
    }, 5000);

    // Add visual indicator
    const status = document.getElementById('autoRefreshStatus');
    if (status) {
        status.classList.add('auto-refresh-active');
    }
}

function stopAutoRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }

    // Remove visual indicator
    const status = document.getElementById('autoRefreshStatus');
    if (status) {
        status.classList.remove('auto-refresh-active');
    }
}

// Wait for configuration to be ready
function waitForConfigReady() {
    return new Promise((resolve) => {
        // Check if config is already ready
        if (window.configReady === true) {
            console.log('Leaderboard: Configuration already ready');
            resolve();
            return;
        }
        
        // Listen for config ready event
        const configReadyHandler = () => {
            console.log('Leaderboard: Configuration ready event received');
            window.removeEventListener('shopmaze-config-ready', configReadyHandler);
            resolve();
        };
        
        window.addEventListener('shopmaze-config-ready', configReadyHandler);
        
        // Set a timeout to prevent infinite waiting
        setTimeout(() => {
            console.warn('Leaderboard: Configuration timeout - proceeding without waiting');
            window.removeEventListener('shopmaze-config-ready', configReadyHandler);
            resolve();
        }, 5000); // 5 second timeout
    });
}

// Initialize when DOM and config are ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('Leaderboard: DOM loaded, waiting for configuration...');
    
    // Use .then() instead of async/await for better compatibility
    waitForConfigReady().then(() => {
        console.log('Leaderboard: Starting initialization...');
        console.log('Leaderboard: window.LEADERBOARD_URL =', window.LEADERBOARD_URL);
        console.log('Leaderboard: window.DEPLOYMENT_CONFIG =', window.DEPLOYMENT_CONFIG);
        console.log('Leaderboard: window.WEBSOCKET_URL =', window.WEBSOCKET_URL);
        
        // Set LEADERBOARD_URL from DEPLOYMENT_CONFIG if not already set
        if (!window.LEADERBOARD_URL && window.DEPLOYMENT_CONFIG && window.DEPLOYMENT_CONFIG.leaderboardUrl) {
            window.LEADERBOARD_URL = window.DEPLOYMENT_CONFIG.leaderboardUrl;
            console.log('Leaderboard: Set LEADERBOARD_URL from DEPLOYMENT_CONFIG:', window.LEADERBOARD_URL);
        }
        
        loadLeaderboard();
        startAutoRefresh();
    }).catch(error => {
        console.error('Leaderboard: Error during initialization:', error);
        // Try to load anyway
        loadLeaderboard();
        startAutoRefresh();
    });
});

// Stop auto-refresh when page is hidden
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        stopAutoRefresh();
    } else {
        startAutoRefresh();
    }
});
