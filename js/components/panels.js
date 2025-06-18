/* Simplified Panels Module */
window.Panels = {
    init() {
        this.createBackdrop();
        this.initNavigation();
        this.initCountryList();
        this.addEventListeners();
    },

    createBackdrop() {
        if (!document.querySelector('.panel-backdrop')) {
            const backdrop = document.createElement('div');
            backdrop.className = 'panel-backdrop';
            backdrop.addEventListener('click', () => this.closePanel());
            document.body.appendChild(backdrop);
        }
        
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                this.closePanel();
            }
        });
    },

    initNavigation() {
        // Direct panel buttons
        const directButtons = document.querySelectorAll('.nav-controls > button[data-panel]');
        directButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const panelKey = btn.getAttribute('data-panel');
                this.togglePanel(panelKey);
            });
        });

        // Analysis group toggle
        const navToggle = document.querySelector('.nav-toggle');
        const navMenu = document.querySelector('.nav-menu');

        if (navToggle && navMenu) {
            navToggle.addEventListener('click', (event) => {
                event.stopPropagation();
                const isExpanded = navToggle.getAttribute('aria-expanded') === 'true';
                navToggle.setAttribute('aria-expanded', !isExpanded);
                navMenu.hidden = isExpanded;
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', (event) => {
                if (!navMenu.contains(event.target) && !navToggle.contains(event.target)) {
                    navToggle.setAttribute('aria-expanded', 'false');
                    navMenu.hidden = true;
                }
            });

            // Handle dropdown menu items
            const menuButtons = navMenu.querySelectorAll('button[data-panel]');
            menuButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    const panelKey = btn.getAttribute('data-panel');
                    this.openPanel(panelKey);
                    navToggle.setAttribute('aria-expanded', 'false');
                    navMenu.hidden = true;
                });
            });
        }
    },

    addEventListeners() {
        // Close buttons
        document.addEventListener('click', (event) => {
            if (event.target.closest('.panel-close')) {
                this.closePanel();
            }
        });
    },

    initCountryList() {
        const searchInput = document.getElementById('country-list-search');
        const listContainer = document.getElementById('country-list-container');
        
        if (!searchInput || !listContainer) return;

        FAOUtils.loadData('data/geo/geo.json').then(data => {
            const features = data.features;
            const countries = features
                .map(f => f.properties.name || f.properties.NAME)
                .filter(Boolean)
                .sort();

            countries.forEach(name => {
                const li = document.createElement('li');
                li.textContent = name;
                li.addEventListener('click', () => {
                    this.openPanel('country-info');
                    const feature = features.find(f => (f.properties.name || f.properties.NAME) === name);
                    if (feature && window.WorldMap) {
                        window.WorldMap.onCountryClick({ pageX: 0, pageY: 0 }, feature);
                        if (typeof window.WorldMap.zoomToFeature === 'function') {
                            window.WorldMap.zoomToFeature(feature);
                        }
                    }
                });
                listContainer.appendChild(li);
            });

            // Search functionality
            searchInput.addEventListener('input', () => {
                const term = searchInput.value.toLowerCase();
                listContainer.querySelectorAll('li').forEach(li => {
                    li.style.display = li.textContent.toLowerCase().includes(term) ? '' : 'none';
                });
            });
        }).catch(err => {});
    },

    togglePanel(key) {
        const activeKey = localStorage.getItem('activePanel');
        if (activeKey === key) {
            this.closePanel();
        } else {
            this.openPanel(key);
        }
    },

    openPanel(key) {
        // Close all panels first
        this.closePanel();
        
        const panel = document.getElementById('panel-' + key);
        const backdrop = document.querySelector('.panel-backdrop');
        
        if (panel) {
            panel.classList.add('open');
            if (backdrop) backdrop.classList.add('open');
            localStorage.setItem('activePanel', key);
            
            // Trigger module-specific updates
            this.triggerPanelUpdates(key);
        }
    },

    closePanel() {
        document.querySelectorAll('.panel').forEach(panel => {
            panel.classList.remove('open');
        });
        
        const backdrop = document.querySelector('.panel-backdrop');
        if (backdrop) backdrop.classList.remove('open');
        
        localStorage.removeItem('activePanel');
    },

    triggerPanelUpdates(key) {
        // Trigger updates for specific panels
        const updates = {
            'dashboard': () => window.Dashboard?.loadGlobalTrends?.(),
            'timeseries': () => window.TimeSeries?.updateChart?.(),
            'simulation': () => window.Simulation?.runSimulation?.(),
            'ml': () => window.MLPredictions?.loadPredictions?.(),
            'process': () => window.ProcessMining?.performProcessMining?.(),
            'structural': () => window.StructuralAnalysis?.updateAnalysis?.()
        };

        if (updates[key]) {
            updates[key]();
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    window.Panels?.init?.();
});