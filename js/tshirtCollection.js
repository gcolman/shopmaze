// T-Shirt Collection Manager
// Manages persistent collection of T-shirts across multiple game attempts

export class TShirtCollection {
    constructor() {
        this.storageKey = 'redhat-quest-tshirt-collection';
        this.collection = this.loadCollection();
        this.initialized = false;
    }

    /**
     * Initialize the collection manager
     */
    initialize() {
        this.initialized = true;
        console.log('TShirtCollection: Initialized with collection:', this.collection);
        return true;
    }

    /**
     * Load collection from localStorage
     * @returns {Array} Array of collected T-shirts
     */
    loadCollection() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const collection = JSON.parse(stored);
                console.log('TShirtCollection: Loaded from storage:', collection);
                return Array.isArray(collection) ? collection : [];
            }
        } catch (error) {
            console.error('TShirtCollection: Error loading from storage:', error);
        }
        return [];
    }

    /**
     * Save collection to localStorage
     */
    saveCollection() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.collection));
            console.log('TShirtCollection: Saved to storage:', this.collection);
        } catch (error) {
            console.error('TShirtCollection: Error saving to storage:', error);
        }
    }

    /**
     * Add T-shirts from current game session to the persistent collection
     * @param {Array} sessionTShirts - T-shirts collected in current session
     */
    addSessionTShirts(sessionTShirts) {
        console.log('TShirtCollection: addSessionTShirts called with:', sessionTShirts);
        console.log('TShirtCollection: Current collection before adding:', this.collection);
        
        if (!Array.isArray(sessionTShirts) || sessionTShirts.length === 0) {
            console.log('TShirtCollection: No T-shirts to add from session - array check failed');
            return;
        }

        console.log('TShirtCollection: Adding session T-shirts:', sessionTShirts);
        
        // Generate a single session ID for all T-shirts in this session
        const sessionId = Date.now();
        const sessionTimestamp = new Date().toISOString();
        
        // Add each T-shirt to the collection
        sessionTShirts.forEach((tshirt, index) => {
            console.log(`TShirtCollection: Processing T-shirt ${index}:`, tshirt);
            const newItem = {
                id: tshirt.id,
                name: tshirt.name || `${tshirt.id} T-Shirt`,
                src: tshirt.src,
                cost: tshirt.cost,
                collectedAt: sessionTimestamp,
                sessionId: sessionId // Same session identifier for all T-shirts in this batch
            };
            console.log(`TShirtCollection: Created collection item:`, newItem);
            this.collection.push(newItem);
        });

        this.saveCollection();
        console.log('TShirtCollection: Updated collection:', this.collection);
    }

    /**
     * Get all collected T-shirts grouped by type with quantities
     * @returns {Array} Array of grouped T-shirt items with quantities
     */
    getGroupedCollection() {
        console.log('TShirtCollection: getGroupedCollection called, current collection:', this.collection);
        
        const grouped = {};
        
        this.collection.forEach((tshirt, index) => {
            console.log(`TShirtCollection: Processing item ${index}:`, {
                id: tshirt.id,
                name: tshirt.name,
                cost: tshirt.cost,
                collectedAt: tshirt.collectedAt,
                sessionId: tshirt.sessionId
            });
            
            if (grouped[tshirt.id]) {
                console.log(`TShirtCollection: Found existing group for ${tshirt.id}, incrementing quantity from ${grouped[tshirt.id].quantity} to ${grouped[tshirt.id].quantity + 1}`);
                grouped[tshirt.id].quantity += 1;
            } else {
                console.log(`TShirtCollection: Creating new group for ${tshirt.id}`);
                grouped[tshirt.id] = {
                    id: tshirt.id,
                    name: tshirt.name,
                    src: tshirt.src,
                    cost: tshirt.cost,
                    quantity: 1
                };
            }
        });

        console.log('TShirtCollection: Grouped object:', grouped);
        const result = Object.values(grouped);
        console.log('TShirtCollection: Final grouped result:', result);
        return result;
    }

    /**
     * Get the current collection
     * @returns {Array} Array of all collected T-shirts
     */
    getCollection() {
        return [...this.collection]; // Return a copy
    }

    /**
     * Get collection summary for display
     * @returns {Object} Summary information about the collection
     */
    getCollectionSummary() {
        const grouped = this.getGroupedCollection();
        const totalItems = this.collection.length;
        const uniqueTypes = grouped.length;
        const totalValue = this.collection.reduce((sum, tshirt) => sum + (tshirt.cost || 0), 0);

        return {
            totalItems,
            uniqueTypes,
            totalValue,
            items: grouped
        };
    }

    /**
     * Clear the entire collection (after order completion)
     */
    clearCollection() {
        console.log('TShirtCollection: Clearing collection - before:', this.collection);
        this.collection = [];
        this.saveCollection();
        console.log('TShirtCollection: Collection cleared - after:', this.collection);
        console.log('TShirtCollection: Verifying localStorage cleared:', localStorage.getItem(this.storageKey));
    }

    /**
     * Remove specific T-shirts from collection (if needed)
     * @param {string} tshirtId - ID of T-shirt type to remove
     * @param {number} quantity - Number to remove (default: 1)
     */
    removeTShirts(tshirtId, quantity = 1) {
        let removed = 0;
        this.collection = this.collection.filter(tshirt => {
            if (tshirt.id === tshirtId && removed < quantity) {
                removed++;
                return false; // Remove this item
            }
            return true; // Keep this item
        });

        if (removed > 0) {
            this.saveCollection();
            console.log(`TShirtCollection: Removed ${removed} ${tshirtId} T-shirts`);
        }
    }

    /**
     * Check if collection has any T-shirts
     * @returns {boolean} True if collection has items
     */
    hasItems() {
        return this.collection.length > 0;
    }

    /**
     * Get collection count
     * @returns {number} Total number of T-shirts in collection
     */
    getCount() {
        return this.collection.length;
    }

    /**
     * Export collection data (for debugging or backup)
     * @returns {Object} Complete collection data
     */
    exportData() {
        return {
            collection: this.collection,
            summary: this.getCollectionSummary(),
            exportedAt: new Date().toISOString()
        };
    }

    /**
     * Import collection data (for restoration)
     * @param {Object} data - Collection data to import
     */
    importData(data) {
        if (data && Array.isArray(data.collection)) {
            this.collection = data.collection;
            this.saveCollection();
            console.log('TShirtCollection: Imported data:', data);
        } else {
            console.error('TShirtCollection: Invalid import data:', data);
        }
    }

    /**
     * Log current status (for debugging)
     */
    logStatus() {
        console.log('TShirtCollection Status:', {
            count: this.getCount(),
            summary: this.getCollectionSummary(),
            collection: this.collection
        });
    }

    /**
     * Manual clear method for debugging (accessible from browser console)
     */
    manualClear() {
        console.log('TShirtCollection: Manual clear requested');
        this.clearCollection();
        console.log('TShirtCollection: Manual clear completed');
    }
}
