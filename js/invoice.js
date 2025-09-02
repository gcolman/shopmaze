// Invoice Management Module
// Handles invoice creation and management
export class Invoice {
    constructor() {
        this.taxRate = 0.20; // 20% VAT
        this.currency = 'GBP';
    }

    // Create an invoice object from order data
    createInvoice(orderData) {
        if (!orderData || !orderData.items || !orderData.customerInfo) {
            throw new Error('Invalid order data: missing required fields');
        }

        // Calculate totals
        const subtotal = this.calculateSubtotal(orderData.items);
        const taxAmount = this.calculateTax(subtotal);
        const total = subtotal + taxAmount;

        // Generate invoice
        const invoice = {
            invoiceNumber: this.generateInvoiceNumber(),
            invoiceDate: this.formatInvoiceDate(new Date()),
            customer: this.createCustomerInfo(orderData.customerInfo),
            items: this.createInvoiceItems(orderData.items),
            totals: {
                subtotal: subtotal,
                tax: taxAmount,
                taxRate: this.taxRate,
                total: total,
                currency: this.currency
            },
            paymentStatus: 'PAID',
            orderStatus: 'CONFIRMED',
            processedAt: new Date().toISOString()
        };

        return invoice;
    }

    // Calculate subtotal from items
    calculateSubtotal(items) {
        return items.reduce((total, item) => {
            return total + (item.cost * item.quantity);
        }, 0);
    }

    // Calculate tax amount
    calculateTax(subtotal) {
        return subtotal * this.taxRate;
    }

    // Generate unique invoice number
    generateInvoiceNumber() {
        return `INV-${Date.now().toString().slice(-6)}`;
    }

    // Format invoice date
    formatInvoiceDate(date) {
        return date.toLocaleDateString('en-GB', { 
            day: '2-digit', 
            month: 'short', 
            year: 'numeric' 
        });
    }

    // Create customer information object
    createCustomerInfo(customerInfo) {
        return {
            name: customerInfo.username,
            email: customerInfo.email,
            playerId: customerInfo.playerId
        };
    }

    // Create invoice items from order items
    createInvoiceItems(orderItems) {
        return orderItems.map(item => ({
            description: `${item.id} T-Shirt`,
            image: item.src,
            quantity: item.quantity,
            unitPrice: item.cost,
            lineTotal: item.cost * item.quantity
        }));
    }

    // Mock order submission service (async simulation)
    async processOrder(orderData) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        try {
            const invoice = this.createInvoice(orderData);
            
            return {
                success: true,
                invoice: invoice
            };
        } catch (error) {
            console.error('Error processing order:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Set custom tax rate
    setTaxRate(rate) {
        if (rate < 0 || rate > 1) {
            throw new Error('Tax rate must be between 0 and 1');
        }
        this.taxRate = rate;
    }

    // Set currency
    setCurrency(currency) {
        this.currency = currency;
    }

    // Validate order data
    validateOrderData(orderData) {
        const errors = [];

        if (!orderData) {
            errors.push('Order data is required');
            return errors;
        }

        if (!orderData.customerInfo) {
            errors.push('Customer information is required');
        } else {
            if (!orderData.customerInfo.username) {
                errors.push('Customer username is required');
            }
            if (!orderData.customerInfo.email) {
                errors.push('Customer email is required');
            }
            if (!orderData.customerInfo.playerId) {
                errors.push('Customer player ID is required');
            }
        }

        if (!orderData.items || !Array.isArray(orderData.items)) {
            errors.push('Order items must be an array');
        } else if (orderData.items.length === 0) {
            errors.push('Order must contain at least one item');
        } else {
            orderData.items.forEach((item, index) => {
                if (!item.id) {
                    errors.push(`Item ${index + 1}: ID is required`);
                }
                if (typeof item.cost !== 'number' || item.cost <= 0) {
                    errors.push(`Item ${index + 1}: Valid cost is required`);
                }
                if (typeof item.quantity !== 'number' || item.quantity <= 0) {
                    errors.push(`Item ${index + 1}: Valid quantity is required`);
                }
            });
        }

        return errors;
    }
}
