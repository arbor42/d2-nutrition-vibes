// Main application controller
class FAOApp {
    constructor() {
        this.currentSection = 'dashboard';
        this.data = {};
        this.init();
    }

    async init() {
        this.setupNavigation();
        await this.loadMetadata();
        this.initializeSections();
    }

    setupNavigation() {
        const navButtons = document.querySelectorAll('.nav-btn');
        navButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const section = e.target.dataset.section;
                this.showSection(section);
            });
        });
    }

    showSection(sectionName) {
        // Hide all sections
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });

        // Remove active class from all nav buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        // Show selected section
        const targetSection = document.getElementById(sectionName);
        if (targetSection) {
            targetSection.classList.add('active');
        }

        // Add active class to clicked nav button
        const targetBtn = document.querySelector(`[data-section="${sectionName}"]`);
        if (targetBtn) {
            targetBtn.classList.add('active');
        }

        this.currentSection = sectionName;

        // Initialize section if needed
        this.initializeSection(sectionName);
    }

    async loadMetadata() {
        try {
            this.data.metadata = await FAOUtils.loadData('data/metadata.json');
            console.log('Metadata geladen:', this.data.metadata);
        } catch (error) {
            console.error('Fehler beim Laden der Metadata:', error);
        }
    }

    initializeSections() {
        // Initialize dashboard by default
        this.initializeSection('dashboard');
    }

    initializeSection(sectionName) {
        switch (sectionName) {
            case 'dashboard':
                if (window.Dashboard) {
                    window.Dashboard.init();
                }
                break;
            case 'worldmap':
                if (window.WorldMap) {
                    window.WorldMap.init();
                }
                break;
            case 'timeseries':
                if (window.TimeSeries) {
                    window.TimeSeries.init();
                }
                break;
            case 'simulation':
                if (window.Simulation) {
                    window.Simulation.init();
                }
                break;
            case 'ml-predictions':
                if (window.MLPredictions) {
                    window.MLPredictions.init();
                }
                break;
            case 'structural-analysis':
                if (window.StructuralAnalysis) {
                    window.StructuralAnalysis.init();
                }
                break;
            case 'process-mining':
                if (window.ProcessMining) {
                    window.ProcessMining.init();
                }
                break;
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.faoApp = new FAOApp();
});

