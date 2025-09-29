// UI Management Module
// Handles all user interface elements, overlays, and interactions

export class UIManager {
    constructor() {
        this.elements = this._getUIElements();
        this.playerData = {
            email: '',
            username: '',
            playerId: '',
            isRegistered: false
        };
        this.websocketController = null;
        this._setupEventListeners();
    }

    // Set the WebSocket controller reference
    setWebSocketController(websocketController) {
        this.websocketController = websocketController;
    }

    _getUIElements() {
        return {
            // Game UI
            redHatCountersDisplay: document.getElementById('redHatCounters'),
            coinCountDisplay: document.getElementById('coinCount'),
            tshirtTotalDisplay: document.getElementById('tshirtTotal'),
            
            
            // Pause overlay
            pauseOverlay: document.getElementById('pauseOverlay'),
            
            // Order confirmation
            orderConfirmationOverlay: document.getElementById('orderConfirmationOverlay'),
            orderItemsList: document.getElementById('orderItemsList'),
            orderTotalDisplay: document.getElementById('orderTotal'),
            cancelOrderButton: document.getElementById('cancelOrderButton'),
            placeOrderButton: document.getElementById('placeOrderButton'),
            

            
            // Registration
            registrationOverlay: document.getElementById('registrationOverlay'),
            emailInput: document.getElementById('emailInput'),
            registerButton: document.getElementById('registerButton'),
            emailError: document.getElementById('emailError'),
            registrationLoading: document.getElementById('registrationLoading'),
            gameContainer: document.getElementById('game-container'),
            
            // User ID display
            userIdDisplay: document.getElementById('userIdDisplay')
        };
    }

    _setupEventListeners() {
        // Registration
        if (this.elements.registerButton && this.elements.emailInput) {
            this.elements.registerButton.addEventListener('click', () => this.handleRegistration());
            this.elements.registerButton.addEventListener('touchend', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.handleRegistration();
            });
            
            this.elements.emailInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.handleRegistration();
                }
            });
            
            this.elements.emailInput.addEventListener('input', () => this.hideEmailError());
        }


    }

    // Update game UI elements
    updateGameUI(player, currentCoinCount, shoppingBasketLength) {
        this._updateRedHatCounters(player.redHats);
        this._updateCoinCount(currentCoinCount);
        this._updateTShirtTotal(shoppingBasketLength);
    }

    _updateRedHatCounters(redHats) {
        if (this.elements.redHatCountersDisplay) {
            this.elements.redHatCountersDisplay.innerHTML = '';
            for (let i = 0; i < redHats; i++) {
                const img = document.createElement('img');
                img.src = 'assets/red_hat_icon.png';
                img.alt = 'Red Hat';
                img.className = 'red-hat-icon';
                this.elements.redHatCountersDisplay.appendChild(img);
            }
        }
    }

    _updateCoinCount(count) {
        if (this.elements.coinCountDisplay) {
            this.elements.coinCountDisplay.textContent = count;
        }
    }

    _updateTShirtTotal(count) {
        if (this.elements.tshirtTotalDisplay) {
            this.elements.tshirtTotalDisplay.textContent = count;
        }
    }


    // Red Hat collected overlay
    showRedHatCollectedOverlay() {
        // Create overlay if it doesn't exist
        let overlay = document.getElementById('redhat-collected-overlay');
        if (!overlay) {
            overlay = document.createElement('img');
            overlay.id = 'redhat-collected-overlay';
            overlay.src = 'assets/red_hat_icon.png';
            overlay.alt = 'Red Hat Collected';
            overlay.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 64px;
                height: 64px;
                z-index: 2000;
                animation: redhat-flash 0.5s ease-in-out;
                pointer-events: none;
                display: none;
            `;
            
            // Add CSS animation
            if (!document.getElementById('redhat-overlay-styles')) {
                const style = document.createElement('style');
                style.id = 'redhat-overlay-styles';
                style.textContent = `
                    @keyframes redhat-flash {
                        0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
                        50% { opacity: 1; transform: translate(-50%, -50%) scale(1.5); }
                        100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                    }
                `;
                document.head.appendChild(style);
            }
            
            document.body.appendChild(overlay);
        }
        
        overlay.style.display = 'block';
        
        // Auto-hide after 500 milliseconds
        setTimeout(() => {
            if (overlay) {
                overlay.style.display = 'none';
            }
        }, 500);
    }

    // Pause overlay management
    showPauseOverlay() {
        if (this.elements.pauseOverlay) {
            this.elements.pauseOverlay.style.display = 'flex';
        }
    }

    hidePauseOverlay() {
        if (this.elements.pauseOverlay) {
            this.elements.pauseOverlay.style.display = 'none';
        }
    }

    // Order confirmation overlay
    showOrderConfirmation(shoppingBasket, onCancel, onPlaceOrder) {
        if (!this.elements.orderConfirmationOverlay || shoppingBasket.length === 0) {
            return;
        }

        this.elements.orderConfirmationOverlay.style.display = 'flex';

        this._populateOrderItems(shoppingBasket);
        this._setupOrderButtons(onCancel, onPlaceOrder);
    }

    // Order confirmation overlay for red hat loss scenario
    showRedHatLossOrderConfirmation(shoppingBasket, onCancel, onPlaceOrder) {
        if (!this.elements.orderConfirmationOverlay) {
            return;
        }

        this.elements.orderConfirmationOverlay.style.display = 'flex';

        if (shoppingBasket.length === 0) {
            this._populateOrderItems(shoppingBasket, "No items collected!");
            // Use buttons for empty basket (disable place order)
            this._setupOrderButtonsForEmptyBasket(onCancel);
        } else {
            this._populateOrderItems(shoppingBasket, "Game Over! Here's all of the items collected and will be ordered:");
            this._setupOrderButtons(onCancel, onPlaceOrder);
        }
    }

    // Order confirmation overlay for admin control scenario
    showAdminControlOrderConfirmation(shoppingBasket, onCancel, onPlaceOrder) {
        if (!this.elements.orderConfirmationOverlay) {
            return;
        }

        this.elements.orderConfirmationOverlay.style.display = 'flex';

        if (shoppingBasket.length === 0) {
            if (onPlaceOrder === null) {
                // Admin end game with no items - special message
                this._populateOrderItems(shoppingBasket, "The admin has ended your game. You have not collected any items to order. Please wait for the game to be restarted.");
                this._setupOrderButtonsForAutoSubmitted(onCancel);
            } else {
                // Regular no items message
                this._populateOrderItems(shoppingBasket, "No items collected!");
                this._setupOrderButtonsForEmptyBasket(onCancel);
            }
        } else {
            this._populateOrderItems(shoppingBasket, "The admin has ended your game, here's the all of the items collected and will be ordered:");
            // Use waiting message only when items are collected
            this._setupOrderButtonsForGameEnd(onPlaceOrder);
        }
    }

    _populateOrderItems(shoppingBasket, customMessage = null) {
        if (!this.elements.orderItemsList || !this.elements.orderTotalDisplay) return;

        this.elements.orderItemsList.innerHTML = '';
        let totalCost = 0;

        // Add player information at the top
        const playerInfoDiv = document.createElement('div');
        playerInfoDiv.className = 'player-info';
        playerInfoDiv.style.cssText = `
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            color: #495057;
            padding: 12px 15px;
            border-radius: 6px;
            margin-bottom: 15px;
            font-size: 14px;
            line-height: 1.4;
        `;
        playerInfoDiv.innerHTML = `
            <div><strong>Player ID:</strong> ${this.playerData.playerId || 'Not assigned'}</div>
        `;
        this.elements.orderItemsList.appendChild(playerInfoDiv);

        // Add custom message if provided
        if (customMessage) {
            const messageDiv = document.createElement('div');
            messageDiv.className = 'order-message';
            
            // Different styling for "No items collected!" message
            if (customMessage === "No items collected!") {
                messageDiv.style.cssText = `
                    background: #fef3c7;
                    border: 1px solid #f59e0b;
                    color: #d97706;
                    padding: 15px;
                    border-radius: 8px;
                    margin-bottom: 20px;
                    text-align: center;
                    font-weight: 500;
                `;
            } else {
                messageDiv.style.cssText = `
                    background: #fef2f2;
                    border: 1px solid #fecaca;
                    color: #dc2626;
                    padding: 15px;
                    border-radius: 8px;
                    margin-bottom: 20px;
                    text-align: center;
                    font-weight: 500;
                `;
            }
            
            messageDiv.textContent = customMessage;
            this.elements.orderItemsList.appendChild(messageDiv);
        }

        // Check if items are already grouped (have quantity property) or need grouping
        const isAlreadyGrouped = shoppingBasket.length > 0 && shoppingBasket[0].hasOwnProperty('quantity');
        
        let itemsToDisplay;
        
        if (isAlreadyGrouped) {
            // Items are already grouped with quantities, use them directly
            console.log('UI: Items are already grouped, using directly:', shoppingBasket);
            itemsToDisplay = shoppingBasket.map(item => ({
                id: item.id,
                src: item.src,
                cost: item.cost,
                quantity: item.quantity,
                totalCost: item.cost * item.quantity
            }));
            totalCost = itemsToDisplay.reduce((sum, item) => sum + item.totalCost, 0);
        } else {
            // Items need to be grouped (old shopping basket format)
            console.log('UI: Items need grouping, processing shopping basket:', shoppingBasket);
            const groupedItems = {};
            shoppingBasket.forEach(item => {
                if (groupedItems[item.id]) {
                    groupedItems[item.id].quantity += 1;
                    groupedItems[item.id].totalCost += item.cost;
                } else {
                    groupedItems[item.id] = {
                        id: item.id,
                        src: item.src,
                        cost: item.cost,
                        quantity: 1,
                        totalCost: item.cost
                    };
                }
                totalCost += item.cost;
            });
            itemsToDisplay = Object.values(groupedItems);
        }

        // Display items
        itemsToDisplay.forEach(item => {
            const orderItemDiv = document.createElement('div');
            orderItemDiv.className = 'order-item';
            
            orderItemDiv.innerHTML = `
                <div class="order-item-info">
                    <img src="${item.src}" alt="${item.id}">
                    <span class="order-item-name">${item.id} T-Shirt</span>
                    <span class="order-item-quantity">Qty: ${item.quantity}</span>
                </div>
                <span class="order-item-price">£${item.totalCost}</span>
            `;
            
            this.elements.orderItemsList.appendChild(orderItemDiv);
        });

        this.elements.orderTotalDisplay.textContent = "£" + totalCost;
    }

    _setupOrderButtons(onCancel, onPlaceOrder) {
        if (this.elements.cancelOrderButton) {
            this.elements.cancelOrderButton.replaceWith(this.elements.cancelOrderButton.cloneNode(true));
            this.elements.cancelOrderButton = document.getElementById('cancelOrderButton');
            
            this.elements.cancelOrderButton.addEventListener('click', onCancel);
            this.elements.cancelOrderButton.addEventListener('touchend', (e) => {
                e.preventDefault();
                e.stopPropagation();
                onCancel();
            });
        }

        if (this.elements.placeOrderButton) {
            this.elements.placeOrderButton.replaceWith(this.elements.placeOrderButton.cloneNode(true));
            this.elements.placeOrderButton = document.getElementById('placeOrderButton');
            
            this.elements.placeOrderButton.addEventListener('click', onPlaceOrder);
            this.elements.placeOrderButton.addEventListener('touchend', (e) => {
                e.preventDefault();
                e.stopPropagation();
                onPlaceOrder();
            });
        }
    }

    _setupOrderButtonsForGameEnd(onPlaceOrder) {
        // Create centered waiting message on order confirmation box
        if (this.elements.cancelOrderButton && this.elements.orderConfirmationOverlay) {
            const waitingMessage = document.createElement('div');
            waitingMessage.className = 'waiting-message';
            waitingMessage.style.cssText = `
                background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
                border: 2px solid #3b82f6;
                color: #1e40af;
                padding: 12px 16px;
                border-radius: 12px;
                text-align: center;
                font-weight: 600;
                font-size: 14px;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 50px;
                box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
                animation: pulse-glow 2s ease-in-out infinite;
                position: relative;
                margin: 20px auto 0 auto;
                z-index: 10;
                overflow: hidden;
                white-space: nowrap;
                max-width: 280px;
            `;
            
            // Add pulsing animation with CSS keyframes
            if (!document.getElementById('waiting-message-styles')) {
                const style = document.createElement('style');
                style.id = 'waiting-message-styles';
                style.textContent = `
                    @keyframes pulse-glow {
                        0%, 100% {
                            transform: scale(1);
                            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
                            border-color: #3b82f6;
                        }
                        50% {
                            transform: scale(1.02);
                            box-shadow: 0 6px 20px rgba(59, 130, 246, 0.3);
                            border-color: #2563eb;
                        }
                    }
                    
                    .waiting-message::before {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: -100%;
                        width: 100%;
                        height: 100%;
                        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
                        animation: shimmer 3s ease-in-out infinite;
                    }
                    
                    @keyframes shimmer {
                        0% { left: -100%; }
                        50%, 100% { left: 100%; }
                    }
                `;
                document.head.appendChild(style);
            }
            
            waitingMessage.innerHTML = `
                <div style="display: flex; align-items: center;">
                    <span>Your invoice will appear shortly, please wait</span>
                </div>
            `;
            
            // Add spinner animation
            if (!document.getElementById('spinner-styles')) {
                const spinnerStyle = document.createElement('style');
                spinnerStyle.id = 'spinner-styles';
                spinnerStyle.textContent = `
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `;
                document.head.appendChild(spinnerStyle);
            }
            
            // Hide the cancel button and append waiting message to order confirmation box
            this.elements.cancelOrderButton.style.display = 'none';
            const orderBox = this.elements.orderConfirmationOverlay.querySelector('.order-confirmation-box');
            if (orderBox) {
                // Make sure the order box has relative positioning for absolute children
                orderBox.style.position = 'relative';
                orderBox.appendChild(waitingMessage);
            }
        }

        // Set up place order button normally
        if (this.elements.placeOrderButton) {
            this.elements.placeOrderButton.replaceWith(this.elements.placeOrderButton.cloneNode(true));
            this.elements.placeOrderButton = document.getElementById('placeOrderButton');
            
            this.elements.placeOrderButton.addEventListener('click', onPlaceOrder);
            this.elements.placeOrderButton.addEventListener('touchend', (e) => {
                e.preventDefault();
                e.stopPropagation();
                onPlaceOrder();
            });
        }
    }

    _setupOrderButtonsForEmptyBasket(onCancel) {
        // Set up cancel button normally for restart functionality
        if (this.elements.cancelOrderButton) {
            this.elements.cancelOrderButton.replaceWith(this.elements.cancelOrderButton.cloneNode(true));
            this.elements.cancelOrderButton = document.getElementById('cancelOrderButton');
            
            // Change button text to indicate restart
            this.elements.cancelOrderButton.textContent = 'Restart Game';
            
            this.elements.cancelOrderButton.addEventListener('click', onCancel);
            this.elements.cancelOrderButton.addEventListener('touchend', (e) => {
                e.preventDefault();
                e.stopPropagation();
                onCancel();
            });
        }

        // Replace place order button with disabled message
        if (this.elements.placeOrderButton) {
            const disabledMessage = document.createElement('div');
            disabledMessage.className = 'disabled-message';
            disabledMessage.style.cssText = `
                background: #f3f4f6;
                border: 1px solid #d1d5db;
                color: #6b7280;
                padding: 12px 20px;
                border-radius: 8px;
                text-align: center;
                font-weight: 500;
                font-size: 14px;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 44px;
            `;
            disabledMessage.textContent = 'No items to order';
            
            this.elements.placeOrderButton.parentNode.replaceChild(disabledMessage, this.elements.placeOrderButton);
        }
    }

    hideOrderConfirmation() {
        if (this.elements.orderConfirmationOverlay) {
            this.elements.orderConfirmationOverlay.style.display = 'none';
            
            // Remove any waiting messages from the order confirmation box
            const waitingMessages = this.elements.orderConfirmationOverlay.querySelectorAll('.waiting-message');
            waitingMessages.forEach(message => {
                message.remove();
            });
            
            // Show the cancel button again if it was hidden
            if (this.elements.cancelOrderButton) {
                this.elements.cancelOrderButton.style.display = '';
            }
            
            // Clear invoice data when closing order confirmation
            if (this.websocketController) {
                this.websocketController.clearInvoiceData();
            }
        }
    }

    // Hide all overlays except the game canvas
    hideAllOverlays() {
        this.hidePauseOverlay();
        this.hideOrderConfirmation();
        this.hideRegistration();
        this.hideGoButtonOverlay(); // Hide Go button if it exists
        
        // Clear invoice data if WebSocket controller is available
        if (this.websocketController) {
            this.websocketController.clearInvoiceData();
        }
    }

    // Show "Go!" button overlay on canvas
    showGoButtonOverlay(onGoClick) {
        // Remove existing Go button if any
        this.hideGoButtonOverlay();
        
        const canvas = document.getElementById('gameCanvas');
        if (!canvas) return;
        
        // Create Go button overlay
        const goOverlay = document.createElement('div');
        goOverlay.id = 'goButtonOverlay';
        goOverlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            pointer-events: all;
        `;
        
        // Create the "Go!" button
        const goButton = document.createElement('button');
        goButton.textContent = 'Go!';
        goButton.style.cssText = `
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            border: none;
            color: white;
            font-size: 48px;
            font-weight: 800;
            padding: 20px 40px;
            border-radius: 20px;
            cursor: pointer;
            box-shadow: 0 8px 25px rgba(16, 185, 129, 0.4);
            transform: scale(1);
            transition: all 0.2s ease;
            text-transform: uppercase;
            letter-spacing: 2px;
            animation: go-button-pulse 2s ease-in-out infinite;
        `;
        
        // Add pulsing animation
        if (!document.getElementById('go-button-styles')) {
            const style = document.createElement('style');
            style.id = 'go-button-styles';
            style.textContent = `
                @keyframes go-button-pulse {
                    0%, 100% {
                        transform: scale(1);
                        box-shadow: 0 8px 25px rgba(16, 185, 129, 0.4);
                    }
                    50% {
                        transform: scale(1.05);
                        box-shadow: 0 12px 35px rgba(16, 185, 129, 0.6);
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        // Add hover and click effects
        goButton.addEventListener('mouseenter', () => {
            goButton.style.transform = 'scale(1.1)';
            goButton.style.boxShadow = '0 12px 35px rgba(16, 185, 129, 0.6)';
        });
        
        goButton.addEventListener('mouseleave', () => {
            goButton.style.transform = 'scale(1)';
            goButton.style.boxShadow = '0 8px 25px rgba(16, 185, 129, 0.4)';
        });
        
        // Add click handler
        goButton.addEventListener('click', onGoClick);
        goButton.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
            onGoClick();
        });
        
        goOverlay.appendChild(goButton);
        
        // Position relative to canvas
        const canvasContainer = canvas.parentElement;
        if (canvasContainer) {
            canvasContainer.style.position = 'relative';
            canvasContainer.appendChild(goOverlay);
        } else {
            document.body.appendChild(goOverlay);
        }
    }

    // Hide "Go!" button overlay
    hideGoButtonOverlay() {
        const goOverlay = document.getElementById('goButtonOverlay');
        if (goOverlay) {
            goOverlay.remove();
        }
    }


    // Registration functions
    async handleRegistration() {
        const email = this.elements.emailInput.value.trim();
        
        this.hideEmailError();
        
        if (!email) {
            this.showEmailError('Please enter an email address');
            return;
        }
        
        if (!this.validateEmail(email)) {
            this.showEmailError('Please enter a valid email address');
            return;
        }
        
        this.setRegistrationLoading(true);
        
        try {
            const registrationResponse = await this.mockRegistrationWebService(email);
            
            if (registrationResponse.success) {
                this.playerData.email = email;
                this.playerData.username = registrationResponse.username;
                this.playerData.playerId = registrationResponse.playerId;
                this.playerData.isRegistered = true;
                
                if (this.elements.invoicePlayerName) {
                    this.elements.invoicePlayerName.textContent = this.playerData.username;
                }
                
                // Update user ID display
                if (this.elements.userIdDisplay) {
                    this.elements.userIdDisplay.textContent = this.playerData.playerId;
                }
                
                this.hideRegistration();
                this.showGame();
                
                // Send registration event to WebSocket if available
                if (this.websocketController) {
                    this.websocketController.sendRegistrationEvent(this.playerData);
                }
                
                return this.playerData;
            } else {
                this.showEmailError('Registration failed. Please try again.');
            }
            
        } catch (error) {
            console.error('Registration error:', error);
            this.showEmailError('Registration failed. Please check your connection and try again.');
        } finally {
            this.setRegistrationLoading(false);
        }
        
        return null;
    }

    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    generateUsername(email) {
        const localPart = email.split('@')[0];
        const sanitizedPart = localPart.replace(/[^a-zA-Z0-9]/g, '');
        const randomNumber = Math.floor(Math.random() * 1000);
        return `${sanitizedPart}${randomNumber}`;
    }

    async mockRegistrationWebService(email) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        return {
            success: true,
            username: this.generateUsername(email),
            playerId: this.generateSillyUserId(),
            registeredAt: new Date().toISOString()
        };
    }

    // Generate silly user ID from two random words
    generateSillyUserId() {
        const adjectives = [
            'Bouncy', 'Giggling', 'Wiggly', 'Sparkly', 'Fluffy', 'Zesty', 'Bubbly', 'Quirky',
            'Snazzy', 'Jazzy', 'Fizzy', 'Dizzy', 'Wacky', 'Silly', 'Goofy', 'Funky',
            'Peppy', 'Zippy', 'Snappy', 'Happy', 'Jolly', 'Merry', 'Cheerful', 'Bouncing',
            'Dancing', 'Prancing', 'Skipping', 'Hopping', 'Flying', 'Floating', 'Glowing',
            'Shining', 'Twinkling', 'Magical', 'Mystical', 'Whimsical', 'Playful', 'Mischievous',
            'Curious', 'Adventurous', 'Bold', 'Brave', 'Clever', 'Smart', 'Witty', 'Crafty',
            'able', 'acidic', 'adorable', 'adventurous', 'affectionate', 'aged', 'agile', 'agreeable', 'ambitious', 'ancient',
            'angry', 'anxious', 'aquatic', 'arrogant', 'attractive', 'beautiful', 'bewildered', 'big', 'bitter', 'bizarre',
            'black', 'blue', 'brave', 'bright', 'brilliant', 'broad', 'busy', 'calm', 'cautious', 'charming',
            'cheerful', 'clean', 'clever', 'cloudy', 'cold', 'colorful', 'comfortable', 'courageous', 'crazy', 'creamy',
            'creepy', 'crisp', 'cruel', 'curious', 'curly', 'dangerous', 'dark', 'delicious', 'delightful', 'difficult',
            'diligent', 'dirty', 'dry', 'eager', 'easy', 'elegant', 'empty', 'enormous', 'enthusiastic', 'excellent',
            'excited', 'exotic', 'expensive', 'faint', 'fair', 'faithful', 'fancy', 'fantastic', 'fast', 'fearless',
            'filthy', 'firm', 'fluffy', 'foolish', 'fragile', 'free', 'friendly', 'frightened', 'funny', 'generous',
            'gentle', 'giant', 'gorgeous', 'graceful', 'grand', 'grateful', 'green', 'grumpy', 'happy', 'hard',
            'harsh', 'healthy', 'heavy', 'helpful', 'hilarious', 'hot', 'huge', 'humble', 'hungry', 'icy'
        ];

        const nouns = [
            'Penguin', 'Llama', 'Pineapple', 'Butterfly', 'Rainbow', 'Unicorn', 'Dragon', 'Phoenix',
            'Narwhal', 'Platypus', 'Octopus', 'Jellyfish', 'Seahorse', 'Starfish', 'Dolphin', 'Whale',
            'Giraffe', 'Elephant', 'Kangaroo', 'Koala', 'Panda', 'Tiger', 'Lion', 'Zebra',
            'Monkey', 'Parrot', 'Toucan', 'Flamingo', 'Peacock', 'Swan', 'Eagle', 'Owl',
            'Wizard', 'Knight', 'Pirate', 'Robot', 'Ninja', 'Astronaut', 'Explorer', 'Inventor',
            'Artist', 'Musician', 'Dancer', 'Chef', 'Gardener', 'Builder', 'Dreamer', 'Wanderer',
            'Cookie', 'Cupcake', 'Donut', 'Waffle', 'Pancake', 'Muffin', 'Sandwich', 'Pizza',
            'Rocket', 'Balloon', 'Kite', 'Castle', 'Bridge', 'Mountain', 'Cloud', 'Star',  'aardvark', 'albatross', 'alligator', 'alpaca', 'antelope', 'armadillo', 'badger', 'bat', 'bear', 'beaver',
            'bee', 'bird', 'bison', 'boa', 'buffalo', 'butterfly', 'camel', 'cat', 'caterpillar', 'chameleon',
            'cheetah', 'chicken', 'chimpanzee', 'chinchilla', 'cobra', 'cod', 'cow', 'coyote', 'crab', 'crane',
            'cricket', 'crocodile', 'crow', 'deer', 'dinosaur', 'dog', 'dolphin', 'donkey', 'dragonfly', 'duck',
            'eagle', 'eel', 'elephant', 'elk', 'falcon', 'ferret', 'fish', 'flamingo', 'fox', 'frog',
            'gazelle', 'gecko', 'gerbil', 'giraffe', 'goat', 'goose', 'gorilla', 'grasshopper', 'hamster', 'hawk',
            'hedgehog', 'hippopotamus', 'horse', 'hummingbird', 'iguana', 'jaguar', 'jellyfish', 'kangaroo', 'koala', 'komodo',
            'lion', 'lizard', 'llama', 'lobster', 'lynx', 'macaw', 'moose', 'mouse', 'narwhal', 'octopus',
            'ostrich', 'otter', 'owl', 'ox', 'panda', 'panther', 'parrot', 'peacock', 'pelican', 'penguin',
            'pig', 'pigeon', 'polarbear', 'pony', 'puffin', 'quail', 'rabbit', 'raccoon'
        ];

        const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
        const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
        
        return `${randomAdjective}${randomNoun}`;
    }

    showEmailError(message) {
        if (this.elements.emailError && this.elements.emailInput) {
            this.elements.emailError.textContent = message;
            this.elements.emailError.style.display = 'block';
            this.elements.emailInput.classList.add('error');
        }
    }

    hideEmailError() {
        if (this.elements.emailError && this.elements.emailInput) {
            this.elements.emailError.style.display = 'none';
            this.elements.emailInput.classList.remove('error');
        }
    }

    setRegistrationLoading(loading) {
        if (this.elements.registerButton) {
            this.elements.registerButton.disabled = loading;
        }
        if (this.elements.registrationLoading) {
            this.elements.registrationLoading.style.display = loading ? 'block' : 'none';
        }
    }

    showRegistration() {
        if (this.elements.registrationOverlay) {
            this.elements.registrationOverlay.style.display = 'flex';
        }
    }

    hideRegistration() {
        if (this.elements.registrationOverlay) {
            this.elements.registrationOverlay.style.display = 'none';
        }
    }

    showGame() {
        if (this.elements.gameContainer) {
            this.elements.gameContainer.style.display = 'block';
        }
    }

    getPlayerData() {
        return this.playerData;
    }
}
