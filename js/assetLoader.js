// Asset Loading Module
// Handles loading and management of all game assets

import { ASSET_PATHS, T_SHIRTS_CONFIG } from './config.js';

export class AssetLoader {
    constructor() {
        this.assets = {};
        this.loadedCount = 0;
        this.totalAssets = 0;
        this.onAllAssetsLoaded = null;
    }

    // Initialize all game assets
    initializeAssets() {
        // Create image objects for main assets based on ASSET_PATHS keys
        Object.keys(ASSET_PATHS).forEach(key => {
            this.assets[key] = new Image();
        });

        // Create t-shirt assets
        this.assets.tShirts = T_SHIRTS_CONFIG.map(tShirtConfig => ({
            ...tShirtConfig,
            img: new Image(),
            collected: false
        }));

        // Set total asset count
        this.totalAssets = Object.keys(ASSET_PATHS).length + T_SHIRTS_CONFIG.length;

        // Set up asset sources and loading handlers
        this._setupAssetLoading();
    }

    _setupAssetLoading() {
        // Load main assets
        Object.entries(ASSET_PATHS).forEach(([key, path]) => {
            if (!path) {
                console.error('AssetLoader: Undefined path for asset:', key);
                return;
            }
            this.assets[key].src = path;
            this.assets[key].onload = () => this._assetLoaded();
        });

        // Load t-shirt assets
        this.assets.tShirts.forEach(tShirt => {
            if (!tShirt.src) {
                console.error('AssetLoader: Undefined src for t-shirt:', tShirt);
                return;
            }
            tShirt.img.src = tShirt.src;
            tShirt.img.onload = () => this._assetLoaded();
        });
    }

    _assetLoaded() {
        this.loadedCount++;
        
        if (this.loadedCount === this.totalAssets) {
            if (this.onAllAssetsLoaded) {
                this.onAllAssetsLoaded();
            }
        }
    }

    // Get a specific asset
    getAsset(assetName) {
        return this.assets[assetName];
    }

    // Get all t-shirt assets
    getTShirts() {
        return this.assets.tShirts;
    }

    // Check if all assets are loaded
    allAssetsLoaded() {
        return this.loadedCount === this.totalAssets;
    }

    // Set callback for when all assets are loaded
    setOnAllAssetsLoaded(callback) {
        this.onAllAssetsLoaded = callback;
    }
}
