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
        this._setupEventListeners();
    }

    _getUIElements() {
        return {
            // Game UI
            redHatCountersDisplay: document.getElementById('redHatCounters'),
            coinCountDisplay: document.getElementById('coinCount'),
            tshirtTotalDisplay: document.getElementById('tshirtTotal'),
            
            // Game overlay
            gameOverlay: document.getElementById('gameOverlay'),
            overlayTitle: document.getElementById('overlayTitle'),
            restartButtonElement: document.getElementById('restartButton'),
            checkoutButtonElement: document.getElementById('checkoutButton'),
            
            // Pause overlay
            pauseOverlay: document.getElementById('pauseOverlay'),
            
            // Order confirmation
            orderConfirmationOverlay: document.getElementById('orderConfirmationOverlay'),
            orderItemsList: document.getElementById('orderItemsList'),
            orderTotalDisplay: document.getElementById('orderTotal'),
            cancelOrderButton: document.getElementById('cancelOrderButton'),
            placeOrderButton: document.getElementById('placeOrderButton'),
            
            // Invoice
            invoiceOverlay: document.getElementById('invoiceOverlay'),
            invoiceItemsDisplay: document.getElementById('invoiceItems'),
            invoiceTotalDisplay: document.getElementById('invoiceTotal'),
            invoiceNumberDisplay: document.getElementById('invoiceNumber'),
            invoiceDateDisplay: document.getElementById('invoiceDate'),
            invoiceSubtotalDisplay: document.getElementById('invoiceSubtotal'),
            closeInvoiceButton: document.getElementById('closeInvoiceButton'),
            invoicePlayerName: document.getElementById('invoicePlayerName'),
            
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

        // Close invoice button
        if (this.elements.closeInvoiceButton) {
            this.elements.closeInvoiceButton.addEventListener('click', () => this.closeInvoice());
            this.elements.closeInvoiceButton.addEventListener('touchend', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.closeInvoice();
            });
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

    // Game over overlay
    showGameOverOverlay(message, hasBasketItems, onRestart, onCheckout) {
        if (this.elements.gameOverlay && this.elements.overlayTitle) {
            this.elements.overlayTitle.textContent = message || "Game Over!";
            this.elements.gameOverlay.style.display = 'flex';
            
            if (this.elements.checkoutButtonElement) {
                this.elements.checkoutButtonElement.style.display = 'inline-block';
                this.elements.checkoutButtonElement.disabled = !hasBasketItems;
                
                // Remove existing listeners and add new ones
                this.elements.checkoutButtonElement.replaceWith(this.elements.checkoutButtonElement.cloneNode(true));
                this.elements.checkoutButtonElement = document.getElementById('checkoutButton');
                
                this.elements.checkoutButtonElement.addEventListener('click', onCheckout);
                this.elements.checkoutButtonElement.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!this.elements.checkoutButtonElement.disabled) {
                        onCheckout();
                    }
                });
            }
            
            if (this.elements.restartButtonElement) {
                this.elements.restartButtonElement.style.display = 'block';
                
                // Remove existing listeners and add new ones
                this.elements.restartButtonElement.replaceWith(this.elements.restartButtonElement.cloneNode(true));
                this.elements.restartButtonElement = document.getElementById('restartButton');
                
                this.elements.restartButtonElement.addEventListener('click', onRestart);
                this.elements.restartButtonElement.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onRestart();
                });
            }
        }
    }

    hideGameOverOverlay() {
        if (this.elements.gameOverlay) {
            this.elements.gameOverlay.style.display = 'none';
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

        this.hideGameOverOverlay();
        this.elements.orderConfirmationOverlay.style.display = 'flex';

        this._populateOrderItems(shoppingBasket);
        this._setupOrderButtons(onCancel, onPlaceOrder);
    }

    _populateOrderItems(shoppingBasket) {
        if (!this.elements.orderItemsList || !this.elements.orderTotalDisplay) return;

        this.elements.orderItemsList.innerHTML = '';
        let totalCost = 0;

        // Group items by ID
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

        // Display grouped items
        Object.values(groupedItems).forEach(item => {
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

    hideOrderConfirmation() {
        if (this.elements.orderConfirmationOverlay) {
            this.elements.orderConfirmationOverlay.style.display = 'none';
        }
    }

    // Invoice display
    showInvoice(invoiceData) {
        if (!this.elements.invoiceOverlay) return;

        this.hideOrderConfirmation();
        this.elements.invoiceOverlay.style.display = 'flex';

        if (this.elements.invoiceNumberDisplay) {
            this.elements.invoiceNumberDisplay.textContent = invoiceData.invoiceNumber;
        }
        if (this.elements.invoiceDateDisplay) {
            this.elements.invoiceDateDisplay.textContent = invoiceData.invoiceDate;
        }
        if (this.elements.invoicePlayerName) {
            this.elements.invoicePlayerName.textContent = invoiceData.customer.name;
        }

        this._populateInvoiceItems(invoiceData);
    }

    _populateInvoiceItems(invoiceData) {
        if (!this.elements.invoiceItemsDisplay) return;

        this.elements.invoiceItemsDisplay.innerHTML = '';

        invoiceData.items.forEach(item => {
            const itemRow = document.createElement('tr');
            itemRow.innerHTML = `
                <td><div class="item-description"><img src="${item.image}" alt="${item.description}"> ${item.description}</div></td>
                <td>${item.quantity}</td>
                <td>£${item.unitPrice}</td>
                <td style="text-align: right;">£${item.lineTotal}</td>
            `;
            this.elements.invoiceItemsDisplay.appendChild(itemRow);
        });

        // Add tax row if applicable
        if (invoiceData.totals.tax > 0) {
            const taxRow = document.createElement('tr');
            taxRow.style.borderTop = '1px solid #ddd';
            taxRow.innerHTML = `
                <td colspan="3" style="text-align: right; padding-top: 10px;"><strong>VAT (${(invoiceData.totals.taxRate * 100).toFixed(0)}%):</strong></td>
                <td style="text-align: right; padding-top: 10px;"><strong>£${invoiceData.totals.tax.toFixed(2)}</strong></td>
            `;
            this.elements.invoiceItemsDisplay.appendChild(taxRow);
        }

        if (this.elements.invoiceSubtotalDisplay) {
            this.elements.invoiceSubtotalDisplay.textContent = `£${invoiceData.totals.subtotal}`;
        }
        if (this.elements.invoiceTotalDisplay) {
            this.elements.invoiceTotalDisplay.textContent = `£${invoiceData.totals.total.toFixed(2)}`;
        }
    }

    closeInvoice() {
        if (this.elements.invoiceOverlay) {
            this.elements.invoiceOverlay.style.display = 'none';
        }
        
        // Show game over overlay but hide checkout button
        if (this.elements.gameOverlay) {
            this.elements.gameOverlay.style.display = 'flex';
            if (this.elements.checkoutButtonElement) {
                this.elements.checkoutButtonElement.style.display = 'none';
            }
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
            'Curious', 'Adventurous', 'Bold', 'Brave', 'Clever', 'Smart', 'Witty', 'Crafty'
        ];

        const nouns = [
            'Penguin', 'Llama', 'Pineapple', 'Butterfly', 'Rainbow', 'Unicorn', 'Dragon', 'Phoenix',
            'Narwhal', 'Platypus', 'Octopus', 'Jellyfish', 'Seahorse', 'Starfish', 'Dolphin', 'Whale',
            'Giraffe', 'Elephant', 'Kangaroo', 'Koala', 'Panda', 'Tiger', 'Lion', 'Zebra',
            'Monkey', 'Parrot', 'Toucan', 'Flamingo', 'Peacock', 'Swan', 'Eagle', 'Owl',
            'Wizard', 'Knight', 'Pirate', 'Robot', 'Ninja', 'Astronaut', 'Explorer', 'Inventor',
            'Artist', 'Musician', 'Dancer', 'Chef', 'Gardener', 'Builder', 'Dreamer', 'Wanderer',
            'Cookie', 'Cupcake', 'Donut', 'Waffle', 'Pancake', 'Muffin', 'Sandwich', 'Pizza',
            'Rocket', 'Balloon', 'Kite', 'Castle', 'Bridge', 'Mountain', 'Cloud', 'Star'
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

    // Mock order submission web service
    async mockOrderSubmissionWebService(orderData) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const subtotal = orderData.items.reduce((total, item) => total + (item.cost * item.quantity), 0);
        const taxRate = 0.20;
        const taxAmount = subtotal * taxRate;
        const total = subtotal + taxAmount;
        
        return {
            success: true,
            invoice: {
                invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
                invoiceDate: new Date().toLocaleDateString('en-GB', { 
                    day: '2-digit', 
                    month: 'short', 
                    year: 'numeric' 
                }),
                customer: {
                    name: orderData.customerInfo.username,
                    email: orderData.customerInfo.email,
                    playerId: orderData.customerInfo.playerId
                },
                items: orderData.items.map(item => ({
                    description: `${item.id} T-Shirt`,
                    image: item.src,
                    quantity: item.quantity,
                    unitPrice: item.cost,
                    lineTotal: item.cost * item.quantity
                })),
                totals: {
                    subtotal: subtotal,
                    tax: taxAmount,
                    taxRate: taxRate,
                    total: total,
                    currency: 'GBP'
                },
                paymentStatus: 'PAID',
                orderStatus: 'CONFIRMED',
                processedAt: new Date().toISOString()
            }
        };
    }
}
