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
        
        // Server game status tracking
        this.serverGameStatus = null;
        this.initialStatusReceived = false;
        this.gameStartCallback = null;
        this.registrationComplete = false;
        this.firstTimeUser = true;
        
        // Store player data for reconnection
        this.storedPlayerData = null;
        
        // Invoice storage
        this.pendingInvoice = null;
        this.receivedInvoiceData = null;
        
        // Dynamic WebSocket URL based on current environment and configuration
        this.websocketUrl = this.getWebSocketUrl();
        
        // Heartbeat mechanism to prevent HAProxy timeout (60s)
        this.heartbeatInterval = null;
        this.heartbeatDelay = 30000; // Send ping every 30 seconds
        
        this.connect();
    }

    // Get the WebSocket URL from configuration
    getWebSocketUrl() {
        // Check for externally configured WebSocket URL
        console.log("getWebSocketUrl()1 window.WEBSOCKET_URL " ,window.WEBSOCKET_URL);
        if (window.WEBSOCKET_URL) {
            console.log("!!!!return 1", window.WEBSOCKET_URL);
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
            console.log("!!!!return 3", `${protocol}//${hostname.replace('game', 'websocket')}/game-control`);
            // Production fallback - use same host with secure protocol
            return `${protocol}//${hostname.replace('game', 'websocket')}/game-control`;
        }
    }

    connect() {
        try {
            console.log("NOW CONNECTING WITH", this.websocketUrl);
            this.websocket = new WebSocket(this.websocketUrl);
            
            this.websocket.onopen = (event) => {
                this.isConnected = true;
                this.reconnectAttempts = 0;
                
                // Send appropriate connection message based on registration status
                if (this.storedPlayerData && this.storedPlayerData.playerId) {
                    // Send reconnection message for existing player
                    this.sendMessage({ 
                        type: 'register', 
                        playerId: this.storedPlayerData.playerId,
                        timestamp: new Date().toISOString()
                    });
                    console.log('Sent reconnected message for player:', this.storedPlayerData.playerId);
                } else {
                    // Send initial connection message for new client
                    this.sendMessage({ type: 'client_connected', game: 'Red Hat Quest v2.1' });
                    console.log('Sent initial client_connected message');
                }
                
                this.startHeartbeat();
            };

            this.websocket.onmessage = (event) => {
                this.handleMessage(event);
            };

            this.websocket.onclose = (event) => {
                this.isConnected = false;
                this.stopHeartbeat();
                this.handleReconnection();
            };

            this.websocket.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.isConnected = false;
                this.stopHeartbeat();
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
            console.log(">>>>received message", event.data);
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

                case 'reset':
                case 'resetcollection':
                case 'reset_collection':
                case 'clearcollection':
                case 'clear_collection':
                    this.handleResetCollectionCommand();
                    break;
                   
                case 'showinvoice':
                case 'show_invoice':
                    this.handleShowInvoiceCommand();
                    break;
                
                    
                case 'direct_message':
                case 'directmessage':    
                    console.log("received direct-message", messageData);
                    break;


                case 'invoice_pdf':
                    this.handleInvoiceCommand(messageData);
                    break;

                case 'invoice_ready':
                    this.handleInvoiceReadyCommand(messageData);
                    break;

                case 'game_status':
                    this.handleGameStatusCommand(messageData);
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
            // Clear the T-shirt collection when admin starts a new game
            if (this.gameController.tshirtCollection) {
                this.gameController.tshirtCollection.clearCollection();
                console.log('WebSocket: Cleared T-shirt collection for admin new game command');
            }
            
            // Clear invoice data for new game
            this.clearInvoiceData();
            
            this.gameController.newGameWithGoButton();
            
            // Send success response
            this.sendMessage({ 
                type: 'response', 
                command: 'new', 
                status: 'success', 
                message: 'New game started with Go button (T-shirt collection and invoice data cleared)' 
            });
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
                this.gameController._endGame("Game ended remotely via WebSocket command.", 'admin_control');
                
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

    handleResetCollectionCommand() {
        try {
            // Clear the T-shirt collection
            if (this.gameController.tshirtCollection) {
                const countBefore = this.gameController.tshirtCollection.getCount();
                this.gameController.tshirtCollection.clearCollection();
                console.log('WebSocket: Cleared T-shirt collection via admin reset command');
                
                // Send success response
                this.sendMessage({ 
                    type: 'response', 
                    command: 'reset_collection', 
                    status: 'success', 
                    message: `T-shirt collection cleared (${countBefore} items removed)` 
                });
            } else {
                this.sendMessage({ 
                    type: 'response', 
                    command: 'reset_collection', 
                    status: 'error', 
                    message: 'T-shirt collection not available' 
                });
            }
        } catch (error) {
            console.error('Error clearing T-shirt collection:', error);
            this.sendMessage({ 
                type: 'response', 
                command: 'reset_collection', 
                status: 'error', 
                message: 'Failed to clear T-shirt collection' 
            });
        }
    }

    handleGameStatusCommand(messageData) {
        try {
            // Extract the status from the message data
            const status = messageData.status || messageData.game_status;
            
            if (!status) {
                console.warn('Game status command received without status field');
                this.sendMessage({ 
                    type: 'response', 
                    command: 'game_status', 
                    status: 'error', 
                    message: 'No status provided in game_status command' 
                });
                return;
            }

            console.log(`Game status command received: ${status}`);
            
            // Update server status tracking
            this.serverGameStatus = status.toLowerCase();
            
            // If this is the first status received and we have a pending game start callback
            // BUT only process it if registration is complete
            if (!this.initialStatusReceived && this.gameStartCallback && this.registrationComplete) {
                this.initialStatusReceived = true;
                console.log(`Initial server status after registration: ${this.serverGameStatus}`);
                
                if (this.serverGameStatus === 'start') {
                    // Server says game should start, proceed with normal game start
                    console.log('Server allows game start, starting game normally');
                    this.gameStartCallback();
                    this.gameStartCallback = null;
                } else if (this.serverGameStatus === 'end') {
                    // Server says game is ended, show waiting overlay
                    console.log('Server game is ended, showing waiting overlay');
                    this.gameController.uiManager.hideAllOverlays();
                    this.gameController.uiManager.showWaitingForGameOverlay();
                    this.gameStartCallback = null;
                } else if (this.serverGameStatus === 'pause') {
                    // Server says game is paused, start but immediately pause
                    console.log('Server game is paused, starting then pausing');
                    this.gameStartCallback();
                    setTimeout(() => this.gameController.pauseGame(), 100);
                    this.gameStartCallback = null;
                }
                return;
            }
            
            // If we received status but registration isn't complete yet, just store it
            if (!this.registrationComplete) {
                console.log(`Server status received before registration: ${this.serverGameStatus} - storing for later`);
                return;
            }
            
            // Mark that we've received initial status
            this.initialStatusReceived = true;

            // Handle different game status values
            switch (status.toLowerCase()) {
                case 'start':
                    // Update server status
                    this.serverGameStatus = 'start';
                    
                    console.log('Start command received - checking current state');
                    console.log('Current game state - gameActive:', this.gameController.gameActive, 'gameOver:', this.gameController.gameOver);
                    
                    // Check if order confirmation is showing
                    const orderOverlay = this.gameController.uiManager.elements.orderConfirmationOverlay;
                    const isOrderShowing = orderOverlay && orderOverlay.style.display !== 'none';
                    
                    // Check if we're showing waiting overlay
                    const waitingOverlay = document.getElementById('waitingForGameOverlay');
                    const isWaitingShowing = waitingOverlay && waitingOverlay.style.display !== 'none';
                    
                    console.log('Overlay states - Order showing:', isOrderShowing, 'Waiting showing:', isWaitingShowing);
                    
                    if (waitingOverlay) {
                        // Hide waiting overlay and start new game
                        console.log('Hiding waiting overlay and starting new game');
                        this.gameController.uiManager.hideAllOverlays();
                        this.gameController.newGameWithGoButton();
                    } else if (isOrderShowing) {
                        // Order confirmation is showing, hide it and start new game
                        console.log('Order confirmation is showing, hiding it and starting new game');
                        this.gameController.uiManager.hideAllOverlays();
                        this.gameController.newGameWithGoButton();
                    } else if (!this.gameController.gameActive) {
                        // Check if the game is in 'end' status (game over)
                        if (this.gameController.gameOver) {
                            // Game is ended, show waiting overlay instead of starting
                            console.log('Game is in end status, showing waiting overlay');
                            this.gameController.uiManager.hideAllOverlays();
                            this.gameController.uiManager.showWaitingForGameOverlay();
                            console.log('Waiting overlay should now be visible');
                        } else {
                            // Game is just paused, resume normally
                            this.gameController.resumeGame();
                            console.log('Game started/resumed via game_status command');
                        }
                    } else {
                        console.log('Game is already active');
                    }
                    break;

                case 'pause':
                    // Pause the game
                    if (this.gameController.gameActive && !this.gameController.gameOver) {
                        this.gameController.pauseGame();
                        console.log('Game paused via game_status command');
                    } else {
                        console.log('Game is not active or already over, cannot pause');
                    }
                    break;

                case 'end':
                    // Check if order confirmation overlay is visible
                    const orderOverlayElement = document.getElementById('orderConfirmationOverlay');
                    const isOrderOverlayVisible = orderOverlayElement && orderOverlayElement.style.display !== 'none';
                    
                    console.log('End command received - Order overlay visible:', isOrderOverlayVisible);
                    console.log('Current game state - gameActive:', this.gameController.gameActive, 'gameOver:', this.gameController.gameOver);
                    
                    // Only prevent processing if game is truly ended AND no order overlay is visible
                    if (this.gameController.gameOver && !this.gameController.gameActive && !isOrderOverlayVisible) {
                        console.log('Game already in final end state - ignoring duplicate end command');
                        break;
                    }
                    
                    // Update server status
                    this.serverGameStatus = 'end';
                    
                    console.log('End command received - forcing consistent end game flow');
                    console.log('Current game state - gameActive:', this.gameController.gameActive, 'gameOver:', this.gameController.gameOver);
                    
                    // Always force the game into ended state regardless of current state
                    this.gameController.gameOver = true;
                    this.gameController.gameActive = false;
                    
                    // Stop any ongoing game activities
                    if (this.gameController.inputHandler) {
                        this.gameController.inputHandler.stopContinuousMovement();
                    }
                    
                    // Cancel any running game loop
                    if (this.gameController.gameLoopId) {
                        cancelAnimationFrame(this.gameController.gameLoopId);
                        this.gameController.gameLoopId = null;
                    }
                    
                    // If order overlay is visible, hide it first
                    if (isOrderOverlayVisible) {
                        console.log('Order overlay is visible, hiding it before ending game');
                        this.gameController.uiManager.hideOrderConfirmation();
                    }
                    
                    // Always trigger the admin control end game flow
                    console.log('Triggering admin control end game flow');
                    this.gameController._endGame("Game ended remotely via WebSocket command.", 'admin_control');
                    break;

                default:
                    console.warn(`Unknown game status: ${status}`);
                    this.sendMessage({ 
                        type: 'response', 
                        command: 'game_status', 
                        status: 'error', 
                        message: `Unknown game status: ${status}. Valid statuses are: start, pause, end` 
                    });
                    return;
            }

            // Send success response
            this.sendMessage({ 
                type: 'response', 
                command: 'game_status', 
                status: 'success', 
                message: `Game status set to: ${status}` 
            });

        } catch (error) {
            console.error('Error handling game status command:', error);
            this.sendMessage({ 
                type: 'response', 
                command: 'game_status', 
                status: 'error', 
                message: 'Failed to process game status command' 
            });
        }
    }

    // Set callback to be called when server allows game start
    setGameStartCallback(callback) {
        console.log('WebSocket: Game start callback set, waiting for server status and registration');
        this.gameStartCallback = callback;
        
        // If we already received initial status AND registration is complete, handle it immediately
        // But only if we're not a first-time user (welcome modal not shown yet)
        if (this.initialStatusReceived && this.registrationComplete && !this.firstTimeUser) {
            console.log(`WebSocket: Initial status already received after registration: ${this.serverGameStatus}`);
            if (this.serverGameStatus === 'start') {
                console.log('Server allows game start, starting game immediately');
                callback();
                this.gameStartCallback = null;
            } else if (this.serverGameStatus === 'end') {
                console.log('Server game is ended, showing waiting overlay immediately');
                this.gameController.uiManager.hideAllOverlays();
                this.gameController.uiManager.showWaitingForGameOverlay();
                this.gameStartCallback = null;
            } else if (this.serverGameStatus === 'pause') {
                console.log('Server game is paused, starting then pausing immediately');
                callback();
                setTimeout(() => this.gameController.pauseGame(), 100);
                this.gameStartCallback = null;
            }
        } else if (this.serverGameStatus && this.registrationComplete && !this.firstTimeUser) {
            // We have server status and registration is complete, but haven't processed initial status yet
            console.log(`WebSocket: Processing stored server status after registration: ${this.serverGameStatus}`);
            this.initialStatusReceived = true;
            
            if (this.serverGameStatus === 'start') {
                console.log('Server allows game start, starting game now');
                callback();
                this.gameStartCallback = null;
            } else if (this.serverGameStatus === 'end') {
                console.log('Server game is ended, showing waiting overlay now');
                this.gameController.uiManager.hideAllOverlays();
                this.gameController.uiManager.showWaitingForGameOverlay();
                this.gameStartCallback = null;
            } else if (this.serverGameStatus === 'pause') {
                console.log('Server game is paused, starting then pausing now');
                callback();
                setTimeout(() => this.gameController.pauseGame(), 100);
                this.gameStartCallback = null;
            }
        }
        // If first-time user, the callback will be handled after welcome modal is closed
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


    handleInvoiceReadyCommand(messageData) {
        try {
            console.log('Invoice ready message received:', messageData);
            
            // Extract invoice number from the message
            let invoiceNumber = null;
            if (messageData.invoiceNumber) {
                invoiceNumber = messageData.invoiceNumber;
            } else if (messageData.data && messageData.data.invoiceNumber) {
                invoiceNumber = messageData.data.invoiceNumber;
            } else if (typeof messageData === 'string') {
                // If the entire messageData is just the invoice number
                invoiceNumber = messageData;
            }
            
            if (!invoiceNumber) {
                console.error('No invoice number found in invoice_ready message');
                this.sendMessage({ 
                    type: 'response', 
                    command: 'invoice_ready', 
                    status: 'error', 
                    message: 'No invoice number found in message' 
                });
                return;
            }
            
            // Check if we already have a pending invoice
            const wasAlreadyProcessing = this.pendingInvoice !== null;
            
            // Clear any existing invoice data when new invoice is ready
            // This ensures clicking the button will request the new invoice, not show cached old one
            if (wasAlreadyProcessing) {
                console.log('📋 SECONDARY INVOICE READY - Clearing old invoice data for new invoice:', invoiceNumber);
                console.log('📋 Previous receivedInvoiceData state:', this.receivedInvoiceData ? 'EXISTS' : 'NULL');
                this.receivedInvoiceData = null; // Clear the cached PDF data
                console.log('📋 After clearing - receivedInvoiceData state:', this.receivedInvoiceData ? 'EXISTS' : 'NULL');
            } else {
                console.log('📋 FIRST INVOICE READY for invoice:', invoiceNumber);
            }
            
            // Store the pending invoice information
            this.pendingInvoice = {
                invoiceNumber: invoiceNumber,
                timestamp: new Date().toISOString()
            };
            
            console.log('Stored pending invoice:', this.pendingInvoice);
            
            // If we were already processing an invoice, show modal dialog
            if (wasAlreadyProcessing) {
                this.showNewInvoiceModal(invoiceNumber);
            }
            
            // Show/update the download invoice button
            this.showDownloadInvoiceButton(invoiceNumber);
            
            // Send success response
            this.sendMessage({ 
                type: 'response', 
                command: 'invoice_ready', 
                status: 'success', 
                message: 'Invoice ready notification processed successfully' 
            });
            
        } catch (error) {
            console.error('Error processing invoice ready command:', error);
            this.sendMessage({ 
                type: 'response', 
                command: 'invoice_ready', 
                status: 'error', 
                message: 'Failed to process invoice ready notification: ' + error.message 
            });
        }
    }

    handleInvoiceCommand(messageData) {
        try {
            console.log('Invoice PDF received:', messageData);
            
            // Validate message data structure
            if (!messageData || typeof messageData !== 'object') {
                throw new Error('Invalid message data format');
            }
            
            // Extract invoice PDF data from the message
            const invoiceData = messageData.data || messageData;
            
            if (!invoiceData.type || invoiceData.type !== 'invoice_pdf') {
                throw new Error('Expected invoice_pdf type');
            }
            
            if (!invoiceData.base64Data) {
                throw new Error('Missing base64Data field');
            }
            
            if (!invoiceData.filename) {
                throw new Error('Missing filename field');
            }
            
            if (!invoiceData.mimeType || invoiceData.mimeType !== 'application/pdf') {
                throw new Error('Expected application/pdf mimeType');
            }
            
            // Store the invoice data for future viewing
            this.receivedInvoiceData = invoiceData;
            
            // Display the PDF overlay
            this.showPdfOverlay(invoiceData);
            
            // Send success response
            this.sendMessage({ 
                type: 'response', 
                command: 'invoice', 
                status: 'success', 
                message: 'Invoice PDF displayed successfully' 
            });
            
        } catch (error) {
            console.error('Error processing invoice command:', error);
            this.sendMessage({ 
                type: 'response', 
                command: 'invoice', 
                status: 'error', 
                message: 'Failed to process invoice PDF: ' + error.message 
            });
        }
    }

    showPdfOverlay(invoiceData) {
        try {
            // Validate and debug base64 data
            console.log("Raw invoice data received:", {
                type: invoiceData.type,
                filename: invoiceData.filename,
                mimeType: invoiceData.mimeType,
                base64DataType: typeof invoiceData.base64Data,
                base64Length: invoiceData.base64Data ? invoiceData.base64Data.length : 0
            });

            // Clean up base64 data (remove any whitespace/newlines)
            let cleanBase64 = invoiceData.base64Data.replace(/\s/g, '');
            console.log("Cleaned base64 length:", cleanBase64.length);
            console.log("Base64 preview (first 100 chars):", cleanBase64.substring(0, 100));
            console.log("Base64 preview (last 50 chars):", cleanBase64.substring(cleanBase64.length - 50));

            // Validate base64 format
            const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
            const isValidBase64 = base64Regex.test(cleanBase64);
            console.log("Is valid base64 format:", isValidBase64);

            // Try to decode base64 to check if it's valid
            let decodedBytes = null;
            try {
                const binaryString = atob(cleanBase64);
                decodedBytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    decodedBytes[i] = binaryString.charCodeAt(i);
                }
                console.log("Base64 decoded successfully. Decoded length:", decodedBytes.length);
                
                // Check PDF signature (should start with %PDF)
                const pdfSignature = String.fromCharCode(...decodedBytes.slice(0, 4));
                console.log("PDF signature (first 4 bytes):", pdfSignature);
                console.log("Is valid PDF signature:", pdfSignature === '%PDF');
                
                // Check for PDF version
                const pdfHeader = String.fromCharCode(...decodedBytes.slice(0, 8));
                console.log("PDF header (first 8 bytes):", pdfHeader);
                
            } catch (decodeError) {
                console.error("Base64 decode error:", decodeError);
                throw new Error("Invalid base64 data: " + decodeError.message);
            }

            // Create PDF data URL from cleaned base64
            const pdfDataUrl = `data:${invoiceData.mimeType};base64,${cleanBase64}`;
            console.log("PDF Data URL created successfully. Total length:", pdfDataUrl.length);

            // Also create a Blob URL as alternative (sometimes works better for large files)
            let pdfBlobUrl = null;
            try {
                const byteCharacters = atob(cleanBase64);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: invoiceData.mimeType });
                pdfBlobUrl = URL.createObjectURL(blob);
                console.log("PDF Blob URL created successfully:", pdfBlobUrl);
            } catch (blobError) {
                console.error("Failed to create Blob URL:", blobError);
            }
            
            // Create overlay container
            const overlay = document.createElement('div');
            overlay.id = 'pdf-invoice-overlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background-color: rgba(0, 0, 0, 0.9);
                z-index: 10000;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                font-family: Arial, sans-serif;
            `;
            
            // Create header with filename and close button
            const header = document.createElement('div');
            header.style.cssText = `
                width: 90%;
                max-width: 800px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
                color: white;
            `;
            
            const title = document.createElement('h3');
            title.textContent = invoiceData.filename;
            title.style.cssText = `
                margin: 0;
                color: white;
                font-size: 18px;
            `;
            
            const closeButton = document.createElement('button');
            closeButton.textContent = '✕ Close';
            closeButton.style.cssText = `
                background-color: #dc3545;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
            `;
            closeButton.onclick = () => this.hidePdfOverlay();
            
            header.appendChild(title);
            header.appendChild(closeButton);
            
            // Create PDF container with multiple display options
            const pdfContainer = document.createElement('div');
            pdfContainer.style.cssText = `
                width: 90%;
                height: 80%;
                max-width: 800px;
                border: 2px solid #ccc;
                border-radius: 4px;
                background-color: white;
                position: relative;
            `;
            
                   // Simple PDF display approach
                   console.log('Displaying PDF with simple iframe');
                   
                   // Create simple iframe for PDF display
                   const pdfIframe = document.createElement('iframe');
                   pdfIframe.src = pdfBlobUrl || pdfDataUrl;
                   pdfIframe.style.cssText = `
                       width: 100%;
                       height: 100%;
                       border: none;
                       border-radius: 4px;
                   `;
            
            // Add iframe to container
            pdfContainer.appendChild(pdfIframe);
            
            overlay.appendChild(header);
            overlay.appendChild(pdfContainer);
            
            // Add to document
            document.body.appendChild(overlay);
            
            // End game if active
            if (this.gameController.gameActive && !this.gameController.gameOver) {
                this.gameController._endGame("Game ended due to invoice display");
            }
            
            console.log('PDF overlay displayed successfully');
            
        } catch (error) {
            console.error('Error creating PDF overlay:', error);
            throw new Error('Failed to create PDF overlay: ' + error.message);
        }
    }

    hidePdfOverlay() {
        const overlay = document.getElementById('pdf-invoice-overlay');
        if (overlay) {
            overlay.remove();
            console.log('PDF overlay closed');
            
            // Don't restart the game - keep the View Invoice button available
            // The button will remain in the order confirmation overlay for re-viewing
        }
    }

    showNewInvoiceModal(invoiceNumber) {
        // Remove any existing modal
        this.hideNewInvoiceModal();

        // Create modal overlay
        const modalOverlay = document.createElement('div');
        modalOverlay.id = 'newInvoiceModal';
        modalOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 2500;
            font-family: 'Roboto', sans-serif;
        `;

        // Create modal box
        const modalBox = document.createElement('div');
        modalBox.style.cssText = `
            background: #fff;
            border-radius: 12px;
            padding: 30px;
            max-width: 450px;
            width: 90%;
            box-shadow: 0 15px 40px rgba(0, 0, 0, 0.4);
            text-align: center;
            position: relative;
            animation: newInvoiceSlideIn 0.4s ease-out;
        `;

        // Create icon
        const icon = document.createElement('div');
        icon.innerHTML = '📋';
        icon.style.cssText = `
            font-size: 48px;
            margin-bottom: 20px;
        `;

        // Create title
        const title = document.createElement('h3');
        title.textContent = 'New Invoice Issued!';
        title.style.cssText = `
            margin: 0 0 15px 0;
            color: #28a745;
            font-size: 22px;
            font-weight: 600;
        `;

        // Create message
        const messageDiv = document.createElement('p');
        messageDiv.innerHTML = `A new invoice has been issued!<br><strong>Please check the new invoice carefully.</strong>`;
        messageDiv.style.cssText = `
            margin: 0 0 20px 0;
            color: #555;
            font-size: 16px;
            line-height: 1.5;
        `;

        // Create invoice number display
        const invoiceNumberDiv = document.createElement('div');
        invoiceNumberDiv.textContent = `Invoice: ${invoiceNumber}`;
        invoiceNumberDiv.style.cssText = `
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 6px;
            padding: 12px;
            margin: 0 0 25px 0;
            font-family: monospace;
            font-size: 14px;
            color: #495057;
            font-weight: 500;
        `;

        // Create OK button
        const okButton = document.createElement('button');
        okButton.textContent = 'OK';
        okButton.style.cssText = `
            background: #28a745;
            color: white;
            border: none;
            padding: 12px 35px;
            border-radius: 6px;
            font-size: 16px;
            font-weight: 500;
            cursor: pointer;
            transition: background 0.2s ease;
        `;

        okButton.onmouseover = () => {
            okButton.style.background = '#218838';
        };

        okButton.onmouseout = () => {
            okButton.style.background = '#28a745';
        };

        // Add event listeners
        const closeModal = () => {
            this.hideNewInvoiceModal();
        };

        okButton.onclick = closeModal;

        // Close on overlay click
        modalOverlay.onclick = (e) => {
            if (e.target === modalOverlay) {
                closeModal();
            }
        };

        // Close on Escape key
        const handleKeyPress = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', handleKeyPress);
            }
        };
        document.addEventListener('keydown', handleKeyPress);

        // Assemble modal
        modalBox.appendChild(icon);
        modalBox.appendChild(title);
        modalBox.appendChild(messageDiv);
        modalBox.appendChild(invoiceNumberDiv);
        modalBox.appendChild(okButton);
        modalOverlay.appendChild(modalBox);

        // Add to page
        document.body.appendChild(modalOverlay);

        // Add CSS animation keyframes if not already added
        if (!document.querySelector('#newInvoiceModalStyles')) {
            const style = document.createElement('style');
            style.id = 'newInvoiceModalStyles';
            style.textContent = `
                @keyframes newInvoiceSlideIn {
                    from {
                        transform: translateY(-50px) scale(0.9);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0) scale(1);
                        opacity: 1;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }

    hideNewInvoiceModal() {
        const existingModal = document.getElementById('newInvoiceModal');
        if (existingModal) {
            existingModal.remove();
        }
    }

    showDownloadInvoiceButton(invoiceNumber) {
        try {
            console.log('Showing download invoice button for invoice:', invoiceNumber);
            
            // Check if order confirmation overlay is visible
            const orderConfirmationOverlay = document.getElementById('orderConfirmationOverlay');
            if (!orderConfirmationOverlay || orderConfirmationOverlay.style.display === 'none') {
                console.log('Order confirmation overlay not visible, not showing download button');
                return;
            }
            
            // Remove any existing download button and waiting messages
            this.hideDownloadInvoiceButton();
            this.removeWaitingMessages();
            
            // Create download invoice button to replace waiting message
            const downloadButton = document.createElement('div');
            downloadButton.id = 'download-invoice-button';
            downloadButton.className = 'download-invoice-message';
            downloadButton.style.cssText = `
                background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
                border: 2px solid #28a745;
                color: white;
                padding: 16px 20px;
                border-radius: 12px;
                text-align: center;
                font-weight: 600;
                font-size: 16px;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 60px;
                box-shadow: 0 6px 20px rgba(40, 167, 69, 0.4);
                animation: pulse-green 2s ease-in-out infinite;
                position: relative;
                margin: 20px auto 0 auto;
                z-index: 10;
                overflow: hidden;
                white-space: nowrap;
                max-width: 300px;
                cursor: pointer;
                transition: all 0.3s ease;
                -webkit-tap-highlight-color: rgba(0,0,0,0.1);
                touch-action: manipulation;
                user-select: none;
                -webkit-user-select: none;
            `;
            
            downloadButton.innerHTML = `
                <span>${invoiceNumber} is ready - View Invoice</span>
            `;
            
            // Add pulsing animation with green theme
            if (!document.getElementById('download-invoice-styles')) {
                const style = document.createElement('style');
                style.id = 'download-invoice-styles';
                style.textContent = `
                    @keyframes pulse-green {
                        0%, 100% {
                            transform: scale(1);
                            box-shadow: 0 6px 20px rgba(40, 167, 69, 0.4);
                        }
                        50% {
                            transform: scale(1.05);
                            box-shadow: 0 8px 25px rgba(40, 167, 69, 0.6);
                        }
                    }
                    
                    .download-invoice-message:hover {
                        background: linear-gradient(135deg, #218838 0%, #1e9a5a 100%);
                        transform: scale(1.02);
                        box-shadow: 0 8px 25px rgba(40, 167, 69, 0.6);
                    }
                    
                    .download-invoice-message::before {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background: rgba(255, 255, 255, 0.1);
                        z-index: -1;
                        border-radius: 12px;
                    }
                `;
                document.head.appendChild(style);
            }
            
            // Add mobile-friendly event handlers for the invoice button
            const handleInvoiceButtonClick = (eventType) => {
                console.log(`📱 Invoice button ${eventType} for invoice:`, invoiceNumber);
                console.log('Current receivedInvoiceData state:', this.receivedInvoiceData ? 'EXISTS' : 'NULL');
                console.log('Current pendingInvoice state:', this.pendingInvoice);
                
                // Visual feedback for mobile
                downloadButton.style.backgroundColor = '#cc0000';
                setTimeout(() => {
                    downloadButton.style.backgroundColor = '';
                }, 200);
                
                // If we already have the invoice data, show it directly
                if (this.receivedInvoiceData) {
                    console.log('Reshowing stored invoice data');
                    this.showPdfOverlay(this.receivedInvoiceData);
                } else {
                    // First time or cleared - request the invoice from server
                    console.log('Requesting invoice from server for invoice:', invoiceNumber);
                    this.requestInvoice(invoiceNumber);
                }
            };
            
            // Add multiple event listeners for better mobile compatibility
            downloadButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                handleInvoiceButtonClick('clicked');
            });
            
            downloadButton.addEventListener('touchend', (e) => {
                e.preventDefault();
                e.stopPropagation();
                handleInvoiceButtonClick('touched');
            });
            
            downloadButton.addEventListener('touchstart', (e) => {
                console.log('📱 Invoice button touchstart');
                downloadButton.style.backgroundColor = '#ff6666';
            });
            
            // Find order confirmation box and append the download button
            const orderBox = orderConfirmationOverlay.querySelector('.order-confirmation-box');
            if (orderBox) {
                orderBox.appendChild(downloadButton);
                console.log('Download invoice button added to order confirmation overlay');
            } else {
                console.error('Could not find order confirmation box to add download button');
            }
            
        } catch (error) {
            console.error('Error showing download invoice button:', error);
        }
    }

    hideDownloadInvoiceButton() {
        // Remove old style overlay (if exists)
        const buttonOverlay = document.getElementById('download-invoice-overlay');
        if (buttonOverlay) {
            buttonOverlay.remove();
            console.log('Download invoice overlay removed');
        }
        
        // Remove new style button from order confirmation
        const downloadButton = document.getElementById('download-invoice-button');
        if (downloadButton) {
            downloadButton.remove();
            console.log('Download invoice button removed from order confirmation');
        }
    }

    clearInvoiceData() {
        // Clear stored invoice data when starting new game or closing order confirmation
        this.pendingInvoice = null;
        this.receivedInvoiceData = null;
        
        // Also remove any existing download invoice button and modals
        this.hideDownloadInvoiceButton();
        this.hideNewInvoiceModal();
        
        console.log('Invoice data, button, and modals cleared');
    }

    removeWaitingMessages() {
        // Remove any "waiting" messages from the order confirmation overlay
        const orderConfirmationOverlay = document.getElementById('orderConfirmationOverlay');
        if (orderConfirmationOverlay) {
            const waitingMessages = orderConfirmationOverlay.querySelectorAll('.waiting-message');
            waitingMessages.forEach(message => {
                message.remove();
                console.log('Waiting message removed');
            });
        }
    }

    requestInvoice(invoiceNumber) {
        try {
            console.log('🚀 requestInvoice() called with invoice number:', invoiceNumber);
            console.log('🚀 WebSocket connection state:', this.websocket ? this.websocket.readyState : 'NO_WEBSOCKET');
            
            // Send request_invoice message to WebSocket server
            const requestMessage = {
                type: 'request_invoice',
                invoiceNumber: invoiceNumber,
                timestamp: new Date().toISOString()
            };
            
            console.log('🚀 About to send message:', requestMessage);
            this.sendMessage(requestMessage);
            
            console.log('🚀 Invoice request sent successfully:', requestMessage);
            
            // Don't clear pendingInvoice here - keep it to detect future invoice_ready events
            // this.pendingInvoice = null;
            
            // Note: Don't hide the download button here - it will show "Requested" state
            // and persist until the order confirmation is closed
            
        } catch (error) {
            console.error('Error requesting invoice:', error);
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

    // Mark registration as complete
    setRegistrationComplete() {
        console.log('WebSocket: Registration marked as complete');
        this.registrationComplete = true;
        
        // Show welcome modal for first-time users
        if (this.firstTimeUser) {
            console.log('WebSocket: First-time user, showing welcome modal');
            this.gameController.uiManager.showWelcomeModal(() => {
                console.log('WebSocket: Welcome modal closed, proceeding with game start');
                this.firstTimeUser = false;
                this._proceedWithGameStart();
            });
        } else {
            this._proceedWithGameStart();
        }
    }

    // Proceed with game start after welcome modal (if shown)
    _proceedWithGameStart() {
        // If we have a pending game start callback and server status, process it now
        if (this.gameStartCallback && this.serverGameStatus && !this.initialStatusReceived) {
            console.log(`WebSocket: Processing stored server status after registration completion: ${this.serverGameStatus}`);
            this.initialStatusReceived = true;
            
            if (this.serverGameStatus === 'start') {
                console.log('Server allows game start, starting game after registration');
                this.gameStartCallback();
                this.gameStartCallback = null;
            } else if (this.serverGameStatus === 'end') {
                console.log('Server game is ended, showing waiting overlay after registration');
                this.gameController.uiManager.hideAllOverlays();
                this.gameController.uiManager.showWaitingForGameOverlay();
                this.gameStartCallback = null;
            } else if (this.serverGameStatus === 'pause') {
                console.log('Server game is paused, starting then pausing after registration');
                this.gameStartCallback();
                setTimeout(() => this.gameController.pauseGame(), 100);
                this.gameStartCallback = null;
            }
        }
    }

    // Send player registration event to WebSocket
    sendRegistrationEvent(playerData) {
        if (!this.isConnected) {
            console.warn('WebSocket not connected, registration event not sent');
            return;
        }

        try {
            // Store player data for reconnection use
            this.storedPlayerData = {
                playerId: playerData.playerId,
                email: playerData.email,
                username: playerData.username
            };

            const registrationData = {
                type: 'register',
                timestamp: new Date().toISOString(),
                playerId: playerData.playerId,
                player: {
                    playerId: playerData.playerId,
                    email: playerData.email,
                    username: playerData.username,
                    registeredAt: new Date().toISOString()
                }
            };

            console.log('Sending player registration event:', registrationData);
            this.sendMessage(registrationData);
            
            // Mark registration as complete
            this.setRegistrationComplete();

        } catch (error) {
            console.error('Error sending registration event:', error);
        }
    }

    // Send game event data to WebSocket
    sendGameEventData(eventType, playerData, gameState) {
        console.log(`sendGameEventData called with eventType: ${eventType}, isConnected: ${this.isConnected}`);
        if (!this.isConnected) {
            console.warn(`sendGameEventData: WebSocket not connected, cannot send ${eventType} event`);
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

    startHeartbeat() {
        this.stopHeartbeat(); // Clear any existing heartbeat
        this.heartbeatInterval = setInterval(() => {
            if (this.websocket && this.isConnected && this.websocket.readyState === WebSocket.OPEN) {
                try {
                    this.sendMessage({ 
                        type: 'ping', 
                        timestamp: new Date().toISOString() 
                    });
                    console.log('WebSocket heartbeat ping sent');
                } catch (error) {
                    console.error('Failed to send heartbeat ping:', error);
                }
            }
        }, this.heartbeatDelay);
    }

    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    disconnect() {
        this.stopHeartbeat();
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
