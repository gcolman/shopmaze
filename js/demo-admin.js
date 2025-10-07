/**
 * Demo Admin Interface for Invoice Testing
 * Simulates customer order confirmation with invoice fetching capabilities
 */

class DemoAdminController {
    constructor() {
        this.websocket = null;
        this.isConnected = false;
        this.pendingInvoice = null;
        this.receivedInvoiceData = null;
        this.fetchedInvoiceData = null;
        
        this.initializeEventListeners();
        this.updateConnectionStatus('Disconnected', false);
    }

    initializeEventListeners() {
        // Connection controls
        document.getElementById('connectBtn').addEventListener('click', () => this.connectWebSocket());
        document.getElementById('disconnectBtn').addEventListener('click', () => this.disconnectWebSocket());
        
        // Demo controls
        document.getElementById('fetchInvoiceBtn').addEventListener('click', () => this.fetchInvoiceAndShowOrder());
        document.getElementById('triggerInvoiceReadyBtn').addEventListener('click', () => this.triggerInvoiceReady());
        
        // Mock order controls
        document.getElementById('closeMockOrder').addEventListener('click', () => this.hideMockOrder());
        
        // View Invoice button with mobile touch support
        const viewInvoiceBtn = document.getElementById('mockViewInvoiceBtn');
        viewInvoiceBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🔘 Demo Admin - View Invoice button clicked (click event)');
            
            // Visual feedback for mobile debugging
            viewInvoiceBtn.style.backgroundColor = '#cc0000';
            setTimeout(() => {
                viewInvoiceBtn.style.backgroundColor = '';
            }, 200);
            
            this.handleViewInvoiceClick();
        });
        
        // Add touch event for mobile devices
        viewInvoiceBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🔘 Demo Admin - View Invoice button touched (touchend event)');
            
            // Visual feedback for mobile debugging
            viewInvoiceBtn.style.backgroundColor = '#cc0000';
            setTimeout(() => {
                viewInvoiceBtn.style.backgroundColor = '';
            }, 200);
            
            this.handleViewInvoiceClick();
        });
        
        // Add touchstart for immediate visual feedback
        viewInvoiceBtn.addEventListener('touchstart', (e) => {
            console.log('🔘 Demo Admin - View Invoice button touchstart');
            viewInvoiceBtn.style.backgroundColor = '#ff6666';
        });
        
        // Invoice PDF overlay
        document.getElementById('closeInvoicePdf').addEventListener('click', () => this.hideInvoicePdf());
    }

    connectWebSocket() {
        const url = document.getElementById('websocketUrlInput').value.trim();
        
        if (!url) {
            this.updateConnectionStatus('Error: Please enter WebSocket URL', false);
            return;
        }

        try {
            this.updateConnectionStatus('Connecting...', false);
            
            this.websocket = new WebSocket(url);
            
            this.websocket.onopen = () => {
                this.isConnected = true;
                this.updateConnectionStatus(`Connected to ${url}`, true);
                document.getElementById('connectBtn').disabled = true;
                document.getElementById('disconnectBtn').disabled = false;
                console.log('✅ Demo Admin WebSocket connected');
            };
            
            this.websocket.onclose = () => {
                this.isConnected = false;
                this.updateConnectionStatus('Disconnected', false);
                document.getElementById('connectBtn').disabled = false;
                document.getElementById('disconnectBtn').disabled = true;
                console.log('❌ Demo Admin WebSocket disconnected');
            };
            
            this.websocket.onerror = (error) => {
                console.error('🚨 Demo Admin WebSocket error:', error);
                this.updateConnectionStatus(`Connection error: ${error.message || 'Unknown error'}`, false);
            };
            
            this.websocket.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    this.handleWebSocketMessage(message);
                } catch (error) {
                    console.error('🚨 Error parsing WebSocket message:', error);
                }
            };
            
        } catch (error) {
            console.error('🚨 Error creating WebSocket connection:', error);
            this.updateConnectionStatus(`Connection failed: ${error.message}`, false);
        }
    }

    disconnectWebSocket() {
        if (this.websocket) {
            this.websocket.close();
            this.websocket = null;
        }
        this.isConnected = false;
        this.updateConnectionStatus('Disconnected', false);
        document.getElementById('connectBtn').disabled = false;
        document.getElementById('disconnectBtn').disabled = true;
    }

    updateConnectionStatus(message, connected) {
        const statusElement = document.getElementById('connectionStatus');
        statusElement.textContent = message;
        statusElement.style.color = connected ? '#00ff00' : '#ff6b6b';
        
        // Update button states
        document.getElementById('triggerInvoiceReadyBtn').disabled = !connected;
        document.getElementById('fetchInvoiceBtn').disabled = !connected;
    }

    handleWebSocketMessage(message) {
        console.log('📨 Demo Admin received message:', message);
        
        switch (message.type) {
            case 'invoice_ready':
                this.handleInvoiceReady(message);
                break;
            case 'invoice_pdf':
                this.handleInvoicePdf(message);
                break;
            case 'invoice_data':
                this.handleInvoiceData(message);
                break;
            default:
                console.log('📋 Demo Admin - Unhandled message type:', message.type);
                break;
        }
    }

    handleInvoiceReady(messageData) {
        console.log('📋 Demo Admin - Invoice ready:', messageData);
        
        const invoiceNumber = messageData.invoiceNumber || 'Unknown';
        
        if (this.pendingInvoice) {
            console.log('📋 SECONDARY INVOICE READY - Clearing old invoice data for new invoice:', invoiceNumber);
            this.receivedInvoiceData = null;
        } else {
            console.log('📋 FIRST INVOICE READY for invoice:', invoiceNumber);
        }
        
        this.pendingInvoice = invoiceNumber;
        this.showViewInvoiceButton(invoiceNumber);
        
        this.updateConnectionStatus(`Invoice ${invoiceNumber} ready!`, true);
    }

    handleInvoicePdf(messageData) {
        console.log('📄 Demo Admin - Invoice PDF received:', messageData);
        
        // Check if this message also contains invoice data for populating the order
        if (messageData.invoice || messageData.invoiceData) {
            console.log('📊 Demo Admin - Found invoice data in PDF message, populating order');
            this.populateOrderFromInvoice(messageData);
            this.showMockOrder();
        }
        
        if (messageData.base64Data) {
            this.receivedInvoiceData = messageData;
            // Don't auto-show PDF when fetching for order population
            console.log('📄 Demo Admin - PDF data stored for later viewing');
        } else {
            console.error('🚨 No base64Data in invoice PDF message');
        }
    }

    handleInvoiceData(messageData) {
        console.log('📊 Demo Admin - Invoice data received:', messageData);
        
        try {
            // Store the fetched invoice data
            this.fetchedInvoiceData = messageData;
            
            // Populate the order overlay with invoice data
            this.populateOrderFromInvoice(messageData);
            
            // Show the order overlay
            this.showMockOrder();
            
            this.updateConnectionStatus('Invoice data loaded successfully!', true);
            
        } catch (error) {
            console.error('🚨 Error processing invoice data:', error);
            this.updateConnectionStatus(`Error processing invoice: ${error.message}`, true);
        }
    }

    fetchInvoiceAndShowOrder() {
        if (!this.isConnected) {
            alert('Please connect to WebSocket first!');
            return;
        }
        
        const invoiceNumber = document.getElementById('invoiceNumberInput').value.trim();
        if (!invoiceNumber) {
            alert('Please enter an invoice number!');
            return;
        }
        
        console.log('🔍 Demo Admin - Fetching invoice for:', invoiceNumber);
        this.requestInvoiceData(invoiceNumber);
    }

    requestInvoiceData(invoiceNumber) {
        if (!this.isConnected || !this.websocket) {
            console.error('🚨 Demo Admin - Cannot request invoice data: not connected');
            return;
        }
        
        console.log('🚀 Demo Admin - Requesting invoice data for:', invoiceNumber);
        
        const requestMessage = {
            type: 'request_invoice',
            invoiceNumber: invoiceNumber,
            timestamp: new Date().toISOString()
        };
        
        try {
            this.websocket.send(JSON.stringify(requestMessage));
            console.log('🚀 Demo Admin - Invoice data request sent:', requestMessage);
            
            this.updateConnectionStatus(`Fetching invoice data for ${invoiceNumber}...`, true);
        } catch (error) {
            console.error('🚨 Demo Admin - Error sending invoice data request:', error);
            this.updateConnectionStatus(`Error requesting invoice: ${error.message}`, true);
        }
    }

    populateOrderFromInvoice(invoiceData) {
        console.log('📝 Demo Admin - Populating order from invoice:', invoiceData);
        
        try {
            // Extract invoice information
            const invoice = invoiceData.invoice || invoiceData;
            const playerId = invoice.customer?.playerId || invoice.playerId || invoice.userId || 'Unknown Player';
            const invoiceNumber = invoice.invoiceNumber || invoice.invoice_number || 'Unknown';
            const items = invoice.items || invoice.itemArray || [];
            const totals = invoice.totals || {};
            
            // Update customer information
            document.getElementById('mockPlayerId').textContent = playerId;
            document.getElementById('mockInvoiceNumber').textContent = invoiceNumber;
            
            // Update order items
            const orderItemsContainer = document.getElementById('mockOrderItems');
            orderItemsContainer.innerHTML = '';
            
            let subtotal = 0;
            
            if (items && items.length > 0) {
                items.forEach(item => {
                    const itemDiv = document.createElement('div');
                    itemDiv.style.cssText = 'display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #dee2e6;';
                    
                    const description = item.description || item.name || 'Unknown Item';
                    const quantity = item.quantity || 1;
                    const unitPrice = item.unitPrice || item.price || 0;
                    const itemTotal = quantity * unitPrice;
                    
                    itemDiv.innerHTML = `
                        <span>${description}</span>
                        <span>Qty: ${quantity} × $${unitPrice.toFixed(2)} = $${itemTotal.toFixed(2)}</span>
                    `;
                    
                    orderItemsContainer.appendChild(itemDiv);
                    subtotal += itemTotal;
                });
                
                // Add total
                const totalDiv = document.createElement('div');
                totalDiv.style.cssText = 'display: flex; justify-content: space-between; padding: 10px 0; font-weight: bold; border-top: 2px solid #333; margin-top: 10px;';
                
                const finalTotal = totals.total || subtotal;
                totalDiv.innerHTML = `
                    <span>Total:</span>
                    <span>$${finalTotal.toFixed(2)}</span>
                `;
                
                orderItemsContainer.appendChild(totalDiv);
            } else {
                orderItemsContainer.innerHTML = '<div style="text-align: center; color: #666; padding: 20px;">No items found in invoice</div>';
            }
            
            console.log('✅ Demo Admin - Order populated successfully');
            
        } catch (error) {
            console.error('🚨 Demo Admin - Error populating order:', error);
            document.getElementById('mockOrderItems').innerHTML = `<div style="text-align: center; color: #ff0000; padding: 20px;">Error loading invoice data: ${error.message}</div>`;
        }
    }

    showMockOrder() {
        console.log('🎭 Showing mock order confirmation');
        document.getElementById('mockOrderOverlay').style.display = 'block';
        
        // Reset invoice button state
        this.hideViewInvoiceButton();
        document.getElementById('waitingMessage').style.display = 'block';
    }

    hideMockOrder() {
        console.log('🎭 Hiding mock order confirmation');
        document.getElementById('mockOrderOverlay').style.display = 'none';
        this.clearInvoiceData();
    }

    triggerInvoiceReady() {
        if (!this.isConnected) {
            alert('Please connect to WebSocket first!');
            return;
        }
        
        const invoiceNumber = document.getElementById('invoiceNumberInput').value.trim();
        if (!invoiceNumber) {
            alert('Please enter an invoice number!');
            return;
        }
        
        console.log('🚀 Demo Admin - Triggering invoice_ready for:', invoiceNumber);
        
        // Simulate an invoice_ready message (in a real scenario, this would come from the server)
        const invoiceReadyMessage = {
            type: 'invoice_ready',
            invoiceNumber: invoiceNumber,
            message: `Your invoice ${invoiceNumber} has been processed and is ready for download`,
            timestamp: new Date().toISOString()
        };
        
        // Simulate receiving the message
        this.handleInvoiceReady(invoiceReadyMessage);
    }

    showViewInvoiceButton(invoiceNumber) {
        console.log('🔘 Demo Admin - Showing View Invoice button for:', invoiceNumber);
        
        const waitingMessage = document.getElementById('waitingMessage');
        const viewInvoiceBtn = document.getElementById('mockViewInvoiceBtn');
        
        if (waitingMessage) {
            waitingMessage.style.display = 'none';
        }
        
        if (viewInvoiceBtn) {
            viewInvoiceBtn.textContent = `Invoice ${invoiceNumber} is ready - View Invoice`;
            viewInvoiceBtn.style.display = 'inline-block';
            viewInvoiceBtn.dataset.invoiceNumber = invoiceNumber;
        }
    }

    hideViewInvoiceButton() {
        console.log('🔘 Demo Admin - Hiding View Invoice button');
        
        const viewInvoiceBtn = document.getElementById('mockViewInvoiceBtn');
        if (viewInvoiceBtn) {
            viewInvoiceBtn.style.display = 'none';
            delete viewInvoiceBtn.dataset.invoiceNumber;
        }
    }

    handleViewInvoiceClick() {
        console.log('🔘 Demo Admin - handleViewInvoiceClick() called');
        
        const viewInvoiceBtn = document.getElementById('mockViewInvoiceBtn');
        console.log('🔘 Demo Admin - Button element found:', !!viewInvoiceBtn);
        console.log('🔘 Demo Admin - Button display style:', viewInvoiceBtn?.style.display);
        console.log('🔘 Demo Admin - Button dataset:', viewInvoiceBtn?.dataset);
        
        const invoiceNumber = viewInvoiceBtn?.dataset.invoiceNumber;
        console.log('🔘 Demo Admin - Invoice number from dataset:', invoiceNumber);
        
        if (!invoiceNumber) {
            console.error('🚨 No invoice number found on button');
            console.error('🚨 Button innerHTML:', viewInvoiceBtn?.innerHTML);
            console.error('🚨 Button attributes:', viewInvoiceBtn?.attributes);
            return;
        }
        
        console.log('🔘 Demo Admin - View Invoice clicked for:', invoiceNumber);
        console.log('🔘 Demo Admin - WebSocket connected:', this.isConnected);
        console.log('🔘 Demo Admin - Cached invoice data exists:', !!this.receivedInvoiceData);
        
        if (this.receivedInvoiceData) {
            console.log('📄 Demo Admin - Using cached invoice data');
            this.showInvoicePdf(this.receivedInvoiceData);
        } else {
            console.log('🚀 Demo Admin - Requesting invoice from server:', invoiceNumber);
            this.requestInvoice(invoiceNumber);
        }
    }

    requestInvoice(invoiceNumber) {
        if (!this.isConnected || !this.websocket) {
            console.error('🚨 Demo Admin - Cannot request invoice: not connected');
            return;
        }
        
        console.log('🚀 Demo Admin - Sending request_invoice for:', invoiceNumber);
        
        const requestMessage = {
            type: 'request_invoice',
            invoiceNumber: invoiceNumber,
            timestamp: new Date().toISOString()
        };
        
        try {
            this.websocket.send(JSON.stringify(requestMessage));
            console.log('🚀 Demo Admin - Invoice request sent:', requestMessage);
            
            this.updateConnectionStatus(`Requesting invoice ${invoiceNumber}...`, true);
        } catch (error) {
            console.error('🚨 Demo Admin - Error sending invoice request:', error);
        }
    }

    showInvoicePdf(invoiceData) {
        console.log('📄 Demo Admin - Displaying PDF invoice');
        
        try {
            const { base64Data, filename } = invoiceData;
            
            if (!base64Data) {
                throw new Error('No base64Data provided');
            }
            
            // Create data URL for the PDF
            const dataUrl = `data:application/pdf;base64,${base64Data}`;
            
            // Display in iframe
            const iframe = document.getElementById('invoicePdfFrame');
            iframe.src = dataUrl;
            
            // Show the overlay
            document.getElementById('invoicePdfOverlay').style.display = 'block';
            
            console.log('📄 Demo Admin - PDF displayed successfully');
            this.updateConnectionStatus('Invoice displayed successfully!', true);
            
        } catch (error) {
            console.error('🚨 Demo Admin - Error displaying PDF:', error);
            alert('Error displaying invoice: ' + error.message);
        }
    }

    hideInvoicePdf() {
        console.log('📄 Demo Admin - Hiding PDF invoice');
        document.getElementById('invoicePdfOverlay').style.display = 'none';
        
        // Clear iframe source
        const iframe = document.getElementById('invoicePdfFrame');
        iframe.src = '';
    }

    clearInvoiceData() {
        console.log('🧹 Demo Admin - Clearing invoice data');
        this.pendingInvoice = null;
        this.receivedInvoiceData = null;
        this.fetchedInvoiceData = null;
        this.hideViewInvoiceButton();
        this.hideInvoicePdf();
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎮 Demo Admin Interface loaded');
    window.demoAdmin = new DemoAdminController();
});

// Make it globally accessible for debugging
window.DemoAdminController = DemoAdminController;
