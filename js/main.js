// Simplified Main Application Controller
class FAOApp {
    constructor() {
        this.data = {};
        this.init();
    }

    async init() {
        try {
            await this.loadMetadata();
            await this.populateProductSelectors();
            this.updateYearRange();
            
            // Initialize searchable selects after data is loaded
            if (window.initializeSearchableSelects) {
                window.initializeSearchableSelects();
            }
            
            this.initializeModules();
        } catch (error) {
        }
    }

    async loadMetadata() {
        try {
            const metadata = await FAOUtils.loadData('data/metadata.json');
            this.data.metadata = metadata;
        } catch (error) {
        }
    }

    async populateProductSelectors() {
        try {
            // List of regular product selector IDs
            const productSelectors = [
                'product-select',        // World map
                'ts-product-select',     // Time series
                'process-product-select' // Process mining
            ];

            // ML selector gets special treatment (only products with forecasts)
            const mlSelectors = [
                'ml-product-select'      // ML predictions
            ];

            // List of all metric selector IDs in the application
            const metricSelectors = [
                'metric-select'          // World map (main metric selector)
            ];

            // List of country selector IDs
            const countrySelectors = [
                'country-select'         // World map (main country selector)
            ];

            // Populate each regular product selector
            for (const selectorId of productSelectors) {
                await FAOUtils.populateProductSelect(selectorId);
            }

            // Populate ML product selector with only forecasted products
            for (const selectorId of mlSelectors) {
                await FAOUtils.populateMLProductSelect(selectorId);
            }

            // Populate country selectors
            for (const selectorId of countrySelectors) {
                await FAOUtils.populateCountrySelect(selectorId);
            }

            // Populate each metric selector
            for (const selectorId of metricSelectors) {
                await FAOUtils.populateMetricSelect(selectorId);
            }

        } catch (error) {
        }
    }

    updateYearRange() {
        try {
            if (this.data.metadata && this.data.metadata.data_summary && this.data.metadata.data_summary.years) {
                const years = this.data.metadata.data_summary.years;
                const minYear = Math.min(...years);
                const maxYear = Math.max(...years);
                
                const yearSlider = document.getElementById('year-slider');
                const yearDisplay = document.getElementById('year-display');
                
                if (yearSlider) {
                    yearSlider.min = minYear;
                    yearSlider.max = maxYear;
                    yearSlider.value = minYear;
                }
                
                if (yearDisplay) {
                    yearDisplay.textContent = minYear;
                }
                
            }
        } catch (error) {
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
                } catch (error) {
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
