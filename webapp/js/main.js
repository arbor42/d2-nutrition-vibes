// Simplified Main Application Controller
class FAOApp {
    constructor() {
        this.data = {};
        this.init();
    }

    async init() {
        try {
            await this.loadMetadata();
            this.initializeModules();
            console.log('FAO App initialized successfully');
        } catch (error) {
            console.error('Error initializing FAO App:', error);
        }
    }

    async loadMetadata() {
        try {
            const metadata = await FAOUtils.loadData('data/metadata.json');
            this.data.metadata = metadata;
        } catch (error) {
            console.error('Error loading metadata:', error);
        }
    }

    initializeModules() {
        // Initialize all modules
        const modules = [
            'WorldMap',
            'Dashboard', 
            'TimeSeries',
            'Simulation',
            'MLPredictions',
            'StructuralAnalysis',
            'ProcessMining',
            'Export'
        ];

        modules.forEach(moduleName => {
            if (window[moduleName] && typeof window[moduleName].init === 'function') {
                try {
                    window[moduleName].init();
                    console.log(`${moduleName} module initialized`);
                } catch (error) {
                    console.error(`Error initializing ${moduleName}:`, error);
                }
            }
        });
    }

    // Public API methods
    getMetadata() {
        return this.data.metadata;
    }

    getData(key) {
        return this.data[key];
    }

    setData(key, value) {
        this.data[key] = value;
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.FAOApp = new FAOApp();
});
