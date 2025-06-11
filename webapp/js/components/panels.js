/* Panels JS Modul */
window.Panels = {
    init() {
        console.log('Panels module initialisiert');
        this.initNav();
        this.initCountryList();
        this.initCloseButtons();
    },

    initNav() {
        // Panel-Navigation-Buttons mit Toggle-Funktion
        const buttons = document.querySelectorAll('.panel-nav button');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                const panelKey = btn.getAttribute('data-panel');
                const activeKey = localStorage.getItem('activePanel');
                if (activeKey === panelKey) {
                    this.closePanel();
                } else {
                    this.openPanel(panelKey);
                }
            });
        });
    },

    initCountryList() {
        const searchInput = document.getElementById('country-list-search');
        const listContainer = document.getElementById('country-list-container');
        // Lade GeoJSON
        FAOUtils.loadData('data/geo/geo.json').then(data => {
            const features = data.features;
            // Namen extrahieren und sortieren
            const countries = features.map(f => f.properties.name || f.properties.NAME).filter(Boolean).sort();
            countries.forEach(name => {
                const li = document.createElement('li');
                li.textContent = name;
                li.addEventListener('click', () => {
                    // Open country info panel
                    this.openPanel('country-info');
                    // Simuliere Klick auf Land und zoom
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
            // Filter-Logik
            searchInput.addEventListener('input', () => {
                const term = searchInput.value.toLowerCase();
                listContainer.querySelectorAll('li').forEach(li => {
                    li.style.display = li.textContent.toLowerCase().includes(term) ? '' : 'none';
                });
            });
        }).catch(err => console.error('Fehler beim Laden der Länder-Liste:', err));
    },

    openPanel(key) {
        // Schließe alle Panels
        document.querySelectorAll('#side-panels .panel').forEach(panel => {
            panel.classList.remove('open');
        });
        // Öffne ausgewähltes Panel
        let panelId = key;
        // Karte Info Panel key mapping
        if (key === 'country-info') panelId = 'country-info';
        const panel = document.getElementById('panel-' + panelId) || document.getElementById('panel-country-info');
        if (panel) {
            panel.classList.add('open');
            localStorage.setItem('activePanel', key);
        }

        // Trigger chart updates for specific panels
        if (key === 'timeseries' && window.TimeSeries) {
            window.TimeSeries.updateChart();
        }
        if (key === 'dashboard' && window.Dashboard) {
            window.Dashboard.loadGlobalTrends();
        }
        if (key === 'process' && window.ProcessMining) {
            window.ProcessMining.performProcessMining();
        }
        if (key === 'simulation' && window.Simulation) {
            window.Simulation.runSimulation();
        }
        if (key === 'ml' && window.MLPredictions) {
            window.MLPredictions.loadPredictions();
        }
    },

    closePanel() {
        document.querySelectorAll('#side-panels .panel').forEach(panel => {
            panel.classList.remove('open');
        });
        localStorage.removeItem('activePanel');
    },

    initCloseButtons() {
        const panels = document.querySelectorAll('#side-panels .panel');
        panels.forEach(panel => {
            if (!panel.querySelector('.panel-close')) {
                const btn = document.createElement('button');
                btn.className = 'panel-close';
                btn.setAttribute('aria-label', 'Schließen');
                btn.innerHTML = '<i class="material-icons">close</i>';
                btn.addEventListener('click', () => this.closePanel());
                panel.appendChild(btn);
            }
        });
    }
};

document.addEventListener('DOMContentLoaded', () => {
    if (window.Panels && typeof window.Panels.init === 'function') {
        window.Panels.init();
    }
}); 