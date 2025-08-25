// WebSocket Controller Module
// Handles remote game control via WebSocket commands

export class WebSocketController {
    constructor(gameController) {
        this.gameController = gameController;
        this.websocket = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 3000; // 3 seconds
        
        // Dynamic WebSocket URL based on current environment and configuration
        this.websocketUrl = this.getWebSocketUrl();
        this.connect();
    }

    // Get the WebSocket URL from configuration
    getWebSocketUrl() {
        // Check for externally configured WebSocket URL
        console.log("window.WEBSOCKET_URL " ,window.WEBSOCKET_URL);
        if (window.WEBSOCKET_URL) {
            return window.WEBSOCKET_URL;
        }
        
        // Fallback to environment-based detection
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const hostname = window.location.hostname;
        
        if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
            // Local development
            return `${protocol}//${hostname}:8080/game-control`;
        } else {
            // Production fallback - use same host with secure protocol
            return `${protocol}//${hostname.replace('game', 'websocket')}/game-control`;
        }
    }

    connect() {
        try {
            this.websocket = new WebSocket(this.websocketUrl);
            
            this.websocket.onopen = (event) => {
                this.isConnected = true;
                this.reconnectAttempts = 0;
                this.sendMessage({ type: 'client_connected', game: 'Red Hat Quest v2.1' });
            };

            this.websocket.onmessage = (event) => {
                this.handleMessage(event);
            };

            this.websocket.onclose = (event) => {
                this.isConnected = false;
                this.handleReconnection();
            };

            this.websocket.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.isConnected = false;
            };

        } catch (error) {
            console.error('Failed to create WebSocket connection:', error);
            this.handleReconnection();
        }
    }

    handleMessage(event) {
        try {
            let messageData;
            let command;
            
            // Try to parse as JSON first, fall back to plain text
            try {
                messageData = JSON.parse(event.data);
                command = messageData.command || messageData.type || messageData;
            } catch (e) {
                messageData = event.data.toString().trim();
                command = messageData.toLowerCase();
            }

            // Filter out server response messages and non-command messages
            if (typeof messageData === 'object' && messageData !== null) {
                const messageType = messageData.type;
                
                // Ignore server responses and status messages
                if (['welcome', 'received', 'response', 'error', 'status'].includes(messageType)) {
                    return;
                }
                
                // If it's not a command message, but has a command field, extract it
                if (messageData.command) {
                    command = messageData.command;
                } else if (messageData.type && !['welcome', 'received', 'response', 'error', 'status'].includes(messageData.type)) {
                    command = messageData.type;
                } else {
                    // Not a command message, ignore it
                    return;
                }
            }
            
            // Normalize command to lowercase for case-insensitive matching
            const normalizedCommand = command.toString().toLowerCase();
            
            // Only process valid game commands
            switch (normalizedCommand) {
                case 'start':
                    this.handleStartCommand();
                    break;
                    
                case 'pause':
                    this.handlePauseCommand();
                    break;
                    
                case 'new':
                case 'newgame':
                case 'new_game':
                    this.handleNewGameCommand();
                    break;
                    
                default:
                    // Only warn about unknown commands if it looks like it was intended as a command
                    if (typeof command === 'string' && command.length > 0 && command.length < 20) {
                        console.warn('Unknown WebSocket command:', command);
                        // Don't send error response to avoid loops - just log it
                    }
            }
            
        } catch (error) {
            console.error('Error handling WebSocket message:', error);
            // Don't send error response to avoid potential loops
        }
    }

    handleStartCommand() {
        try {
            // If game is paused, resume it
            if (!this.gameController.gameActive) {
                this.gameController.resumeGame(); 
            } 
        } catch (error) {
            console.error('Error starting game:', error);
            this.sendMessage({ 
                type: 'response', 
                command: 'start', 
                status: 'error', 
                message: 'Failed to start game' 
            });
        }
    }

    handlePauseCommand() {
        try {
            if (this.gameController.gameActive && !this.gameController.gameOver) {
                this.gameController.pauseGame();
            }
        } catch (error) {
            console.error('Error pausing game:', error);
            this.sendMessage({ 
                type: 'response', 
                command: 'pause', 
                status: 'error', 
                message: 'Failed to pause game' 
            });
        }
    }

    handleNewGameCommand() {
        try {
            this.gameController._restartGame();
        } catch (error) {
            console.error('Error creating new game:', error);
            this.sendMessage({ 
                type: 'response', 
                command: 'new', 
                status: 'error', 
                message: 'Failed to create new game' 
            });
        }
    }

    sendMessage(message) {
        if (this.websocket && this.isConnected && this.websocket.readyState === WebSocket.OPEN) {
            try {
                const messageString = typeof message === 'string' ? message : JSON.stringify(message);
                this.websocket.send(messageString);
            } catch (error) {
                console.error('Error sending WebSocket message:', error);
            }
        }
    }

    // Send game event data to WebSocket
    sendGameEventData(eventType, playerData, gameState) {
        if (!this.isConnected) {
            return;
        }

        try {
            // Collect T-shirt data with values
            const collectedTShirts = gameState.shoppingBasket.map(tshirt => ({
                id: tshirt.id,
                name: tshirt.id.charAt(0).toUpperCase() + tshirt.id.slice(1), // Capitalize first letter
                cost: tshirt.cost,
                collected: true
            }));

            // Calculate total T-shirt value
            const totalTShirtValue = collectedTShirts.reduce((total, tshirt) => total + tshirt.cost, 0);

            const eventData = {
                type: 'game_event',
                event: eventType, // 'game_over' or 'game_paused'
                timestamp: new Date().toISOString(),
                player: {
                    userId: playerData.playerId || 'Unknown',
                    email: playerData.email || 'unknown@example.com',
                    username: playerData.username || 'Unknown Player'
                },
                gameData: {
                    coinsRemaining: gameState.currentCoinCount,
                    tShirtsCollected: {
                        items: collectedTShirts,
                        totalValue: totalTShirtValue,
                        totalCount: collectedTShirts.length
                    },
                    currentLevel: gameState.currentLevel || 1,
                    gameSession: {
                        startTime: this.gameStartTime || new Date().toISOString(),
                        eventTime: new Date().toISOString()
                    }
                }
            };

            this.sendMessage(eventData);

        } catch (error) {
            console.error('Error preparing game event data:', error);
        }
    }

    // Set game start time for session tracking
    setGameStartTime() {
        this.gameStartTime = new Date().toISOString();
    }

    handleReconnection() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            
            setTimeout(() => {
                this.connect();
            }, this.reconnectDelay);
        } else {
            console.error('Max reconnection attempts reached. WebSocket control disabled.');
        }
    }

    disconnect() {
        if (this.websocket) {
            this.websocket.close();
            this.websocket = null;
            this.isConnected = false;
        }
    }

    // Get connection status
    getStatus() {
        return {
            connected: this.isConnected,
            url: this.websocketUrl,
            reconnectAttempts: this.reconnectAttempts
        };
    }
}
