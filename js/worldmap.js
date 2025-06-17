// World Map module with choropleth visualization
window.WorldMap = {
    initialized: false,
    svg: null,
    g: null,
    projection: null,
    path: null,
    colorScale: null,
    tooltip: null,
    worldData: null,
    currentData: null,
    zoom: null,
    width: null,
    height: null,
    globalValues: [],
    activeFilters: [], // Array für aktive Filter-Bereiche

    async init() {
        if (this.initialized) return;
        console.log('WorldMap.init() gestartet');
        FAOUtils.showLoading('world-map');
        try {
            await this.loadWorldData();
            this.setupMap();
            this.setupControls();
            FAOExport.attachExport('export-btn-worldmap','export-format-worldmap','world-map');
            await this.loadInitialData();
            this.initialized = true;
            console.log('WorldMap.init() erfolgreich beendet');
        } catch (error) {
            console.error('Fehler beim Initialisieren der Weltkarte:', error);
            FAOUtils.showError('world-map', 'Fehler beim Laden der Weltkarte');
        }
    },

    async loadWorldData() {
        try {
            // Verwende die vom Nutzer bereitgestellte GeoJSON-Datei
            this.worldData = await FAOUtils.loadData('data/geo/geo.json');
            if (!this.worldData || !this.worldData.features) {
                console.error('loadWorldData(): geo.json geladen, aber es ist kein valides GeoJSON-Objekt mit Features.', this.worldData);
                FAOUtils.showError('world-map', 'Ungültige Geodaten geladen.');
                throw new Error('Ungültige Geodaten');
            }
            console.log('Weltkarten-Daten geladen:', this.worldData.features.length, 'Länder');
        } catch (error) {
            console.error('Fehler beim Laden der Weltkarten-Daten:', error);
            throw error;
        }
    },

    setupMap() {
        console.log('setupMap(): Container holen');
        const container = document.getElementById('world-map');
        if (!container) {
            console.error('setupMap(): Container #world-map nicht gefunden!');
            return;
        }
        container.innerHTML = ''; // Vorherigen Inhalt (z.B. Ladeindikator) entfernen
        
        const width = container.clientWidth;
        const height = container.clientHeight;

        if (width === 0 || height === 0) {
            console.error(`setupMap(): Kartencontainer #world-map hat keine validen Dimensionen: Breite=${width}, Höhe=${height}. Die Karte kann nicht gezeichnet werden.`);
            FAOUtils.showError('world-map', 'Kartencontainer hat keine Größe.');
            return;
        }
        console.log(`setupMap(): SVG wird erstellt mit Dimensionen: Breite=${width}, Höhe=${height}`);

        // Speichere Abmessungen für Zoom-Features
        this.width = width;
        this.height = height;

        // Create SVG and inner <g> for zoomable content
        this.svg = d3.select('#world-map')
            .append('svg')
            .attr('width', width)
            .attr('height', height);

        // Group, alle Länder werden hier hinein gerendert
        this.g = this.svg.append('g');

        // Projektion: NaturalEarth1 liefert eine schöne Weltansicht ohne starke Verzerrungen
        this.projection = d3.geoNaturalEarth1()
            .fitSize([width, height], this.worldData);

        this.path = d3.geoPath().projection(this.projection);

        // Zoom-Verhalten: Transformation nur auf die Gruppe anwenden
        const zoom = d3.zoom()
            .scaleExtent([1, 8])
            .on('zoom', (event) => {
                this.g.attr('transform', event.transform);
            });

        // Zoom-Instanz speichern für Buttons
        this.zoom = zoom;
        this.svg.call(zoom);

        // Create tooltip
        this.tooltip = d3.select('body')
            .append('div')
            .attr('class', 'tooltip')
            .style('opacity', 0);

        // Draw countries
        this.drawCountries();
    },

    drawCountries() {
        if (!this.worldData || !this.worldData.features || this.worldData.features.length === 0) {
            console.error('drawCountries(): Keine Features in worldData zum Zeichnen vorhanden.');
            FAOUtils.showError('world-map', 'Keine Länderdaten zum Zeichnen.');
            return;
        }
        console.log(`drawCountries(): Zeichne ${this.worldData.features.length} Länder.`);

        const paths = this.g.selectAll('.country')
            .data(this.worldData.features)
            .enter()
            .append('path')
            .attr('class', 'country')
            .attr('d', this.path)
            .attr('fill', '#ccc')
            .attr('stroke', '#333')
            .attr('stroke-width', 0.5)
            .attr('vector-effect', 'non-scaling-stroke') // Verhindert, dass der Stroke beim Zoomen dicker wird
            .on('mouseover', (event, d) => {
                d3.select(event.currentTarget).classed('country-hover', true);
                this.showTooltip(event, d);
            })
            .on('mouseout', (event, d) => {
                d3.select(event.currentTarget).classed('country-hover', false);
                this.hideTooltip();
            })
            .on('click', (event, d) => this.onCountryClick(event, d));

        if (paths.empty()) {
            console.error('drawCountries(): Es wurden keine Pfad-Elemente zum SVG hinzugefügt.');
        } else {
            console.log(`drawCountries(): ${paths.size()} Pfad-Elemente erfolgreich zum SVG hinzugefügt.`);
        }
    },

    setupControls() {
        // Product selector
        const productSelect = document.getElementById('product-select');
        if (productSelect) productSelect.addEventListener('change', () => this.updateMap());

        // Year slider
        const yearSlider = document.getElementById('year-slider');
        const yearDisplay = document.getElementById('year-display');
        
        if (yearSlider) {
            // Force green slider styling
            this.forceSliderStyling(yearSlider);
            
            // Slider-Container und Tooltip erstellen
            this.setupSliderTooltip(yearSlider);
            
            // Initiale Fortschrittsberechnung
            this.updateSliderProgress(yearSlider);
            
            // Live-Update für Display (ohne Debounce)
            yearSlider.addEventListener('input', (e) => {
                if (yearDisplay) yearDisplay.textContent = e.target.value;
                this.updateSliderProgress(e.target);
                this.updateSliderTooltip(e.target);
            });
            
            // Debounced Update für Karte
            yearSlider.addEventListener('input', FAOUtils.debounce((e) => {
                this.updateMap();
            }, 300));
        }

        // Metric selector
        const metricSelect = document.getElementById('metric-select');
        if (metricSelect) metricSelect.addEventListener('change', () => this.updateMap());

        // Zoom-Buttons implementieren
        const zoomInBtn = document.querySelector('.zoom-in');
        const zoomOutBtn = document.querySelector('.zoom-out');
        if (zoomInBtn && zoomOutBtn && this.zoom) {
            zoomInBtn.addEventListener('click', () => {
                this.svg.transition().call(this.zoom.scaleBy, 1.5);
            });
            zoomOutBtn.addEventListener('click', () => {
                this.svg.transition().call(this.zoom.scaleBy, 1/1.5);
            });
        }

        // Reset Zoom-Button
        const zoomResetBtn = document.querySelector('.zoom-reset');
        if (zoomResetBtn && this.zoom) {
            zoomResetBtn.addEventListener('click', () => {
                this.svg.transition().call(this.zoom.transform, d3.zoomIdentity);
            });
        }

        // Highlight-Ribbon Toggle
        const highlightHeader = document.querySelector('.highlight-header');
        const highlightRibbon = document.querySelector('.highlight-ribbon');
        if (highlightHeader && highlightRibbon) {
            highlightHeader.addEventListener('click', () => {
                highlightRibbon.classList.toggle('closed');
            });
        }

        // Highlight-Buttons Click-Events
        document.querySelectorAll('.highlight-list button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const hl = e.currentTarget.getAttribute('data-highlight');
                console.log('Highlight ausgewählt:', hl);
                // TODO: Highlight-Logik implementieren
            });
        });

        // Filter-Panel Toggle
        const filterHeader = document.querySelector('.filter-header');
        const filterPanel = document.querySelector('.filter-panel');
        if (filterHeader && filterPanel) {
            filterHeader.addEventListener('click', () => {
                filterPanel.classList.toggle('closed');
            });
        }
    },

    async loadInitialData() {
        await this.updateMap();
    },

    async updateMap() {
        console.log('updateMap() gestartet');
        // Aktuelle Werte aus den Steuerelementen holen
        const productSelect = document.getElementById('product-select');
        const metricSelect  = document.getElementById('metric-select');
        const yearSlider    = document.getElementById('year-slider');

        const product = productSelect ? productSelect.value : 'wheat_and_products';
        const metric  = metricSelect  ? metricSelect.value  : 'production';
        const year    = yearSlider   ? parseInt(yearSlider.value) : 2010;

        console.log(`updateMap(): ${product}, ${year}, ${metric}`);

        // Jahr-Anzeige synchronisieren, falls vorhanden
        const yearDisplay = document.getElementById('year-display');
        if (yearDisplay) yearDisplay.textContent = year;

        FAOUtils.showLoading('world-map-overlay'); // Ladeindikator für die Karte selbst

        try {
            // Timeseries laden
            const timeseriesUrl = `data/timeseries/${product}_${metric}.json`;
            const timeseriesData = await FAOUtils.loadData(timeseriesUrl);

            // Globale Werte für konsistente Skala ermitteln
            const allValues = [];
            Object.values(timeseriesData).forEach(countryArr => {
                countryArr.forEach(d => {
                    if (d.value !== null && d.value !== undefined && !isNaN(d.value)) {
                        allValues.push(d.value);
                    }
                });
            });
            this.globalValues = allValues;

            // Jahresdaten extrahieren
            this.currentData = this.extractYearData(timeseriesData, year);
            
            // Filter bei Datenänderung zurücksetzen
            this.resetLegendFilter();
        } catch (error) {
            console.error('Fehler beim Laden der Kartendaten (Timeseries):', error);
            this.currentData = {}; // Sicherstellen, dass currentData definiert ist
            this.updateMapColors(); // Karte ggf. leeren
            FAOUtils.showError('world-map-overlay', 'Fehler beim Laden der Daten für die Karte.');
        } finally {
            // Ladeindikator entfernen, egal ob Erfolg oder Fehler
            const overlay = document.getElementById('world-map-overlay');
            if (overlay) overlay.innerHTML = ''; 
        }
    },

    extractYearData(timeseriesData, year) {
        const yearData = {};
        
        Object.keys(timeseriesData).forEach(country => {
            const countryData = timeseriesData[country];
            const yearEntry = countryData.find(d => d.year === year);
            if (yearEntry) {
                yearData[country] = {
                    value: yearEntry.value,
                    unit: yearEntry.unit
                };
            }
        });

        return yearData;
    },

    updateMapColors() {
        console.log('updateMapColors() gestartet');
        if (!this.currentData) {
            console.log('updateMapColors(): Keine Daten, Abbruch.');
            return;
        }

        // Verwende globale Werte, falls vorhanden, ansonsten aktuelle
        const baseValues = (this.globalValues && this.globalValues.length) ? this.globalValues : Object.values(this.currentData).map(d=>d.value);
        const values = baseValues.filter(v => v !== null && v !== undefined && !isNaN(v));

        if (values.length === 0) {
            // Keine Daten verfügbar, alle Länder grau anzeigen
            this.g.selectAll('.country')
                .attr('fill', '#ccc');
            this.updateLegend([]); // Leere Legende
            return;
        }

        // Farbskala mit CI-Palette erzeugen
        this.colorScale = FAOUtils.createColorScale(values, 'Custom');

        // Hilfsfunktion zum Bestimmen der Länderfarbe
        const getCountryFill = (d) => {
            const countryName = this.getCountryName(d);
            const mappedName = CountryMapping.normalizeCountryNameForMapping(countryName);
            const dataEntry = this.currentData[mappedName] || this.currentData[countryName];
            if (dataEntry && dataEntry.value !== null && !isNaN(dataEntry.value)) {
                return this.colorScale(dataEntry.value);
            }
            return '#ccc'; // Keine Daten
        };

        // Länder einfärben
        this.g.selectAll('.country')
            .attr('fill', getCountryFill);

        // Legende aktualisieren
        this.updateLegend(values);
        console.log('updateMapColors() beendet');
    },

    getCountryName(feature) {
        // Try different property names for country identification
        // Bevorzugt 'name', dann 'NAME', etc.
        return feature.properties.name || 
               feature.properties.NAME || 
               feature.properties.ADMIN || 
               feature.properties.admin ||
               feature.properties.sovereignt || // Tippfehler in manchen GeoJSONs
               feature.properties.sov_a3 ||
               feature.properties.adm0_a3 ||
               feature.properties.country || 
               feature.properties.COUNTRY ||
               'Unknown';
    },

    updateLegend(values) {
        const legendContainer = document.getElementById('map-legend');
        if (!legendContainer) {
            console.error("WorldMap.updateLegend: Legend container #map-legend not found!");
            return;
        }
        legendContainer.innerHTML = ''; // Clear previous legend

        if (!this.colorScale || typeof this.colorScale.quantiles !== 'function' || typeof this.colorScale.range !== 'function') {
            console.error("WorldMap.updateLegend: Color scale is not properly initialized or not a D3 scale. Cannot create legend.", this.colorScale);
            legendContainer.innerHTML = '<p>Farbskala nicht initialisiert.</p>';
            return;
        }

        if (!values || values.length === 0) {
            console.warn("WorldMap.updateLegend: No data values provided for legend. Displaying 'Keine Daten für Legende verfügbar'.");
            legendContainer.innerHTML = '<p>Keine Daten für Legende verfügbar</p>';
            return;
        }
        console.log(`WorldMap.updateLegend: Creating legend with ${values.length} values.`);

        const legend = d3.select(legendContainer); // Use the already fetched container
        // Überschrift und Reset-Button
        legend.append('h4')
            .text('Legende')
            .style('margin-bottom', '10px');
        legend.append('button')
            .attr('class', 'legend-reset')
            .text('Reset')
            .on('click', () => this.resetLegendFilter());

        const quantiles = this.colorScale.quantiles();
        const range = this.colorScale.range();

        for (let i = 0; i < range.length; i++) {
            const min = i === 0 ? d3.min(values) : quantiles[i - 1];
            // Sicherstellen, dass max einen sinnvollen Wert hat, auch für die letzte Kategorie
            const max = (i < quantiles.length) ? quantiles[i] : d3.max(values);
            
            const item = legend.append('div')
                .attr('class', 'legend-item')
                .style('cursor', 'pointer')
                .on('click', () => this.toggleLegendFilter(min, max, item));

            item.append('div')
                .attr('class', 'legend-color')
                .style('background-color', range[i]);

            item.append('span')
                .text(`${FAOUtils.formatNumber(min)} - ${FAOUtils.formatNumber(max)}`);
        }
        console.log("WorldMap.updateLegend: Legend HTML should now be created in #map-legend.");
    },

    toggleLegendFilter(min, max, item) {
        // Prüfen, ob dieser Filter bereits aktiv ist
        const filterIndex = this.activeFilters.findIndex(f => f.min === min && f.max === max);
        
        if (filterIndex !== -1) {
            // Filter ist aktiv -> entfernen
            this.activeFilters.splice(filterIndex, 1);
            item.classed('legend-item-active', false);
        } else {
            // Filter ist nicht aktiv -> hinzufügen
            this.activeFilters.push({ min, max });
            item.classed('legend-item-active', true);
        }
        
        this.applyActiveFilters();
    },

    applyActiveFilters() {
        if (!this.currentData) return;
        
        if (this.activeFilters.length === 0) {
            // Keine Filter aktiv -> alle Länder normal anzeigen
            this.updateMapColors();
            return;
        }
        
        // Filter anwenden
        this.g.selectAll('.country')
            .attr('fill', d => {
                const countryName = this.getCountryName(d);
                const mappedName = CountryMapping.normalizeCountryNameForMapping(countryName);
                const dataEntry = this.currentData[mappedName] || this.currentData[countryName];
                
                if (dataEntry && dataEntry.value != null && !isNaN(dataEntry.value)) {
                    // Prüfen, ob der Wert in einem der aktiven Filter-Bereiche liegt
                    const inActiveFilter = this.activeFilters.some(filter => 
                        dataEntry.value >= filter.min && dataEntry.value <= filter.max
                    );
                    
                    if (inActiveFilter) {
                        return this.colorScale(dataEntry.value);
                    }
                }
                return '#ccc'; // Nicht in aktivem Filter -> grau
            });
    },

    applyLegendFilter(min, max) {
        if (!this.currentData) return;
        this.g.selectAll('.country')
            .attr('fill', d => {
                const countryName = this.getCountryName(d);
                const mappedName = CountryMapping.normalizeCountryNameForMapping(countryName);
                const dataEntry = this.currentData[mappedName] || this.currentData[countryName];
                if (dataEntry && dataEntry.value != null && !isNaN(dataEntry.value)
                    && dataEntry.value >= min && dataEntry.value <= max) {
                    return this.colorScale(dataEntry.value);
                }
                return '#ccc';
            });
    },

    updateSliderProgress(slider) {
        const min = parseFloat(slider.min);
        const max = parseFloat(slider.max);
        const value = parseFloat(slider.value);
        const progress = ((value - min) / (max - min)) * 100;
        slider.style.setProperty('--range-progress', `${progress}%`);
    },

    setupSliderTooltip(slider) {
        // Wrapper für Slider erstellen falls nicht vorhanden
        if (!slider.parentElement.classList.contains('slider-container')) {
            const wrapper = document.createElement('div');
            wrapper.className = 'slider-container';
            slider.parentNode.insertBefore(wrapper, slider);
            wrapper.appendChild(slider);
        }

        // Tooltip erstellen
        const tooltip = document.createElement('div');
        tooltip.className = 'slider-tooltip';
        tooltip.textContent = slider.value;
        slider.parentElement.appendChild(tooltip);

        // Event Listeners für Tooltip
        slider.addEventListener('mouseenter', () => {
            tooltip.classList.add('visible');
            this.updateSliderTooltip(slider);
        });

        slider.addEventListener('mouseleave', () => {
            tooltip.classList.remove('visible');
        });

        slider.addEventListener('mousemove', (e) => {
            this.updateSliderTooltip(slider, e);
        });

        // Update tooltip on input change (keyboard, programmatic)
        slider.addEventListener('input', () => {
            if (tooltip.classList.contains('visible')) {
                this.updateSliderTooltip(slider);
            }
        });

        // Show tooltip while interacting via keyboard
        slider.addEventListener('focus', () => {
            tooltip.classList.add('visible');
            this.updateSliderTooltip(slider);
        });

        slider.addEventListener('blur', () => {
            tooltip.classList.remove('visible');
        });

        // Initial position
        this.updateSliderTooltip(slider);
    },

    updateSliderTooltip(slider, event = null) {
        const tooltip = slider.parentElement.querySelector('.slider-tooltip');
        if (!tooltip) return;

        // Tooltip-Text aktualisieren
        tooltip.textContent = slider.value;

        // Position basierend auf Slider-Fortschritt berechnen
        const min = parseFloat(slider.min);
        const max = parseFloat(slider.max);
        const value = parseFloat(slider.value);
        const progress = ((value - min) / (max - min)) * 100;
        
        // Slider-Dimensionen für präzise Positionierung
        const sliderRect = slider.getBoundingClientRect();
        const thumbWidth = 20; // Approximate thumb width
        const trackPadding = thumbWidth / 2;
        
        // Berechne die tatsächliche Position des Slider-Thumbs
        const trackWidth = sliderRect.width - thumbWidth;
        const thumbPosition = (progress / 100) * trackWidth + trackPadding;
        const leftPercentage = (thumbPosition / sliderRect.width) * 100;

        // Position setzen (begrenzt auf 5% bis 95% um Overflow zu vermeiden)
        const clampedPosition = Math.max(5, Math.min(95, leftPercentage));
        tooltip.style.left = `${clampedPosition}%`;
    },

    resetLegendFilter() {
        // Alle aktiven Filter entfernen
        this.activeFilters = [];
        
        // Alle Legend-Items als inaktiv markieren
        d3.select('#map-legend').selectAll('.legend-item')
            .classed('legend-item-active', false);
        
        // Karte auf normale Farben zurücksetzen
        this.updateMapColors();
    },

    showTooltip(event, d) {
        if (!this.currentData) return;
        const countryName = this.getCountryName(d);
        const mappedName = CountryMapping.normalizeCountryNameForMapping(countryName);
        // Fallback, falls mappedName nicht in currentData ist, versuche countryName direkt
        const dataEntry = this.currentData[mappedName] || this.currentData[countryName];

        // Header
        let content = `<strong>${countryName}</strong>`;
        
        // Produktionswert
        const value = dataEntry && dataEntry.value != null && !isNaN(dataEntry.value)
            ? FAOUtils.formatNumber(dataEntry.value, dataEntry.unit || '')
            : 'Keine Daten';
        content += `<div class="tooltip-value">Wert: ${value}</div>`;

        // Add political events if available
        const yearSlider = document.getElementById('year-slider');
        if (!yearSlider) return; // Sicherstellen, dass der Slider existiert
        const year = parseInt(yearSlider.value);
        const events = FAOUtils.getPoliticalEvents(year);
        if (events.length > 0) {
            content += `<div class="tooltip-events"><strong>Ereignisse ${year}:</strong><ul>`;
            events.forEach(ev => {
                content += `<li>${ev.title}</li>`;
            });
            content += `</ul></div>`;
        }

        this.tooltip.transition()
            .duration(200)
            .style('opacity', 0.9);
        
        this.tooltip.html(content)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 28) + 'px');
    },

    hideTooltip() {
        this.tooltip.transition()
            .duration(500)
            .style('opacity', 0);
    },

    onCountryClick(event, d) {
        const countryName = this.getCountryName(d);
        // Open country info panel
        if (window.Panels && typeof window.Panels.openPanel === 'function') {
            window.Panels.openPanel('country-info');
        }
        // Update popup card content
        const mappedName = CountryMapping.normalizeCountryNameForMapping(countryName);
        const dataEntry = this.currentData[mappedName] || this.currentData[countryName] || {};
        const value = (dataEntry.value != null && !isNaN(dataEntry.value))
            ? FAOUtils.formatNumber(dataEntry.value) : 'Keine Daten';
        const unit = dataEntry.unit || '';
        const panel = document.getElementById('panel-country-info');
        if (panel) {
            const countryNameEl = panel.querySelector('.country-name');
            const countryStatsEl = panel.querySelector('.country-stats');
            const avatarEl = panel.querySelector('.country-avatar');
            
            if (countryNameEl) countryNameEl.textContent = countryName;
            if (countryStatsEl) countryStatsEl.textContent = `Wert: ${value} ${unit}`;
            if (avatarEl) {
                avatarEl.textContent = countryName.charAt(0).toUpperCase();
            }
        }
    },

    /**
     * Zoomt die Karte zum gegebenen Geo-Feature.
     */
    zoomToFeature(feature) {
        if (!feature) return;
        const bounds = this.path.bounds(feature);
        const dx = bounds[1][0] - bounds[0][0];
        const dy = bounds[1][1] - bounds[0][1];
        const x = (bounds[0][0] + bounds[1][0]) / 2;
        const y = (bounds[0][1] + bounds[1][1]) / 2;
        const scale = Math.max(1, Math.min(8, 0.8 * Math.min(this.width / dx, this.height / dy)));
        const translate = [this.width / 2 - scale * x, this.height / 2 - scale * y];
        this.svg.transition()
            .duration(750)
            .call(this.zoom.transform, d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale));
    },

    // Force green slider styling programmatically
    forceSliderStyling(slider) {
        // Add CSS classes and inline styles to ensure green styling
        slider.style.background = 'linear-gradient(90deg, #e9ecef 0%, #dee2e6 100%)';
        slider.style.borderRadius = '20px';
        slider.style.height = '8px';
        slider.style.webkitAppearance = 'none';
        slider.style.mozAppearance = 'none';
        slider.style.appearance = 'none';
        slider.style.outline = 'none';
        slider.style.cursor = 'pointer';
        
        // Force update of slider progress
        this.updateSliderProgress(slider);
        
        // Add a class for additional styling
        slider.classList.add('green-slider');
    },
};

