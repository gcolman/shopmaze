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
            //console.log("!!!!return 1", window.WEBSOCKET_URL);
            return window.WEBSOCKET_URL;
        }
        
        // Fallback to environment-based detection
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const hostname = window.location.hostname;
        
        if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
            // Local development        
            console.log("!!!!return 2", `${protocol}//${hostname}:8080/game-control`);
            return `${protocol}//${hostname}:8080/game-control`;
        } else {
            //console.log("!!!!return 3", `${protocol}//${hostname.replace('game', 'websocket')}/game-control`);
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
            console.log("received message", event.data);
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
                    
                case 'endgame':
                case 'end_game':
                case 'end':
                    this.handleEndGameCommand();
                    break;
                   
                case 'showinvoice':
                case 'show_invoice':
                    this.handleShowInvoiceCommand();
                    break;
                
                    
                case 'direct_message':
                case 'directmessage':    
                    console.log("received direct-message", messageData);
                    break;

                case 'invoice_data':
                case 'invoicedata':    
                    this.handleInvoiceDataCommand(messageData);
                    break;

                case 'register_response':
                    break

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

    handleEndGameCommand() {
        try {
            // Only end the game if it's currently active
            if (this.gameController.gameActive && !this.gameController.gameOver) {
                this.gameController._endGame("Game ended remotely via WebSocket command.");
                
                // Send success response
                this.sendMessage({ 
                    type: 'response', 
                    command: 'endgame', 
                    status: 'success', 
                    message: 'Game ended successfully' 
                });
            } else {
                // Game is already over or not active
                this.sendMessage({ 
                    type: 'response', 
                    command: 'endgame', 
                    status: 'info', 
                    message: 'Game is not currently active' 
                });
            }
        } catch (error) {
            console.error('Error ending game:', error);
            this.sendMessage({ 
                type: 'response', 
                command: 'endgame', 
                status: 'error', 
                message: 'Failed to end game' 
            });
        }
    }

    handleShowInvoiceCommand() {
        try {
            // This command could trigger showing an invoice overlay or similar
            console.log('Show invoice command received');
            
            // Send response
            this.sendMessage({ 
                type: 'response', 
                command: 'showinvoice', 
                status: 'success', 
                message: 'Show invoice command processed' 
            });
        } catch (error) {
            console.error('Error processing show invoice command:', error);
            this.sendMessage({ 
                type: 'response', 
                command: 'showinvoice', 
                status: 'error', 
                message: 'Failed to process show invoice command' 
            });
        }
    }

    handleInvoiceDataCommand(messageData) {
        try {
            console.log('Invoice data received:', messageData);
            
            // Extract invoice data from the message
            let externalInvoice = null;
            if (messageData.invoice) {
                externalInvoice = messageData.invoice;
            } else if (messageData.invoiceData) {
                externalInvoice = messageData.invoiceData;
            } else if (messageData.data) {
                externalInvoice = messageData.data;
            } else {
                // If the entire messageData is the invoice
                externalInvoice = messageData;
            }
            
            if (!externalInvoice) {
                console.error('No invoice data found in message');
                this.sendMessage({ 
                    type: 'response', 
                    command: 'invoice_data', 
                    status: 'error', 
                    message: 'No invoice data found in message' 
                });
                return;
            }
            
            // Transform external invoice format to internal format
            const internalInvoice = this.transformExternalInvoice(externalInvoice);
            
            // End the game if it's currently active (similar to game over)
            if (this.gameController.gameActive && !this.gameController.gameOver) {
                this.gameController._endGame("Game ended due to remote invoice receipt");
            }
            
            // Hide any existing overlays (like order confirmation)
            this.gameController.uiManager.hideGameOverOverlay();
            this.gameController.uiManager.hideOrderConfirmation();
            
            // Display the invoice as if order was placed
            this.gameController.uiManager.showInvoice(internalInvoice);
            
            // Send success response
            this.sendMessage({ 
                type: 'response', 
                command: 'invoice_data', 
                status: 'success', 
                message: 'Invoice displayed successfully' 
            });
            
        } catch (error) {
            console.error('Error processing invoice data command:', error);
            this.sendMessage({ 
                type: 'response', 
                command: 'invoice_data', 
                status: 'error', 
                message: 'Failed to process invoice data: ' + error.message 
            });
        }
    }

    transformExternalInvoice(externalInvoice) {
        try {
            // Transform external format to internal format expected by UI
            const internalInvoice = {
                invoiceNumber: externalInvoice.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`,
                invoiceDate: this.formatInvoiceDate(externalInvoice.invoiceDate),
                customer: {
                    name: externalInvoice.username || externalInvoice.userId || 'Unknown Customer',
                    email: externalInvoice.email || `${externalInvoice.userId}@example.com`,
                    playerId: externalInvoice.userId || 'unknown-player'
                },
                items: this.transformInvoiceItems(externalInvoice.itemArray || []),
                totals: {
                    subtotal: externalInvoice.subtotal || 0,
                    tax: externalInvoice.vatTotal || 0,
                    taxRate: externalInvoice.vatTotal > 0 && externalInvoice.subtotal > 0 ? 
                             (externalInvoice.vatTotal / externalInvoice.subtotal) : 0.20,
                    total: externalInvoice.total || (externalInvoice.subtotal + externalInvoice.vatTotal),
                    currency: externalInvoice.currency || 'GBP'
                },
                paymentStatus: externalInvoice.paymentStatus || 'PAID',
                orderStatus: externalInvoice.orderStatus || 'CONFIRMED',
                processedAt: externalInvoice.processedAt || new Date().toISOString()
            };

            return internalInvoice;
        } catch (error) {
            console.error('Error transforming external invoice:', error);
            throw new Error('Failed to transform invoice format: ' + error.message);
        }
    }

    transformInvoiceItems(itemArray) {
        return itemArray.map(item => ({
            description: `${item.description} T-Shirt`,
            image: this.getImageForItem(item.description),
            quantity: item.quantity || 1,
            unitPrice: item.unitPrice || 0,
            lineTotal: item.lineTotal || (item.unitPrice * item.quantity)
        }));
    }

    getImageForItem(description) {
        // Map item descriptions to image paths
        const imageMap = {
            'ansible': 'assets/t_shirt_ansible.png',
            'openshift': 'assets/t_shirt_openshift.png',
            'rhel': 'assets/t_shirt_rhel.png'
        };
        
        const key = description.toLowerCase();
        return imageMap[key] || 'assets/t_shirt_ansible.png'; // Default fallback
    }

    formatInvoiceDate(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-GB', { 
                day: '2-digit', 
                month: 'short', 
                year: 'numeric' 
            });
        } catch (error) {
            return new Date().toLocaleDateString('en-GB', { 
                day: '2-digit', 
                month: 'short', 
                year: 'numeric' 
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

    // Send a message to a specific user
    sendTo(userId, message) {
        if (!this.isConnected) {
            console.warn('WebSocket not connected, sendTo message not sent');
            return;
        }

        if (!userId || !message) {
            console.error('sendTo requires both userId and message parameters');
            return;
        }

        try {
            // Create JSON object for send-to message
            const sendToMessage = {
                type: "send-to",
                targetUserId: userId,
                message: message
            };
            this.sendMessage(sendToMessage);
            console.log(`Sent message to user ${userId}: ${message}`);
        } catch (error) {
            console.error('Error sending sendTo message:', error);
        }
    }

    // Send player registration event to WebSocket
    sendRegistrationEvent(playerData) {
        if (!this.isConnected) {
            console.warn('WebSocket not connected, registration event not sent');
            return;
        }

        try {
            const registrationData = {
                type: 'register',
                timestamp: new Date().toISOString(),
                userId: playerData.playerId,
                player: {
                    playerId: playerData.playerId,
                    email: playerData.email,
                    username: playerData.username,
                    registeredAt: new Date().toISOString()
                }
            };

            console.log('Sending player registration event:', registrationData);
            this.sendMessage(registrationData);

        } catch (error) {
            console.error('Error sending registration event:', error);
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
                    gameScore: gameState.gameScore,
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
