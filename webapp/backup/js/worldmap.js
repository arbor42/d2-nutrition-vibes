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

    async init() {
        if (this.initialized) return;
        
        try {
            FAOUtils.showLoading('world-map');
            await this.loadWorldData();
            this.setupMap();
            this.setupControls();
            FAOExport.attachExport('export-btn-worldmap','export-format-worldmap','world-map');
            await this.loadInitialData();
            this.initialized = true;
        } catch (error) {
            console.error('Fehler beim Initialisieren der Weltkarte:', error);
            FAOUtils.showError('world-map', 'Fehler beim Laden der Weltkarte');
        }
    },

    async loadWorldData() {
        try {
            // Lade die vom Benutzer bereitgestellte GeoJSON-Datei.
            this.worldData = await FAOUtils.loadData('data/geo/geo.json');
            console.log('Weltkarten-Daten geladen:', this.worldData.features.length, 'Länder');
        } catch (error) {
            console.error('Fehler beim Laden der Weltkarten-Daten:', error);
            throw error;
        }
    },

    setupMap() {
        const container = document.getElementById('world-map');
        container.innerHTML = '';

        const width = container.clientWidth;
        const height = container.clientHeight;

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
        this.g.selectAll('.country')
            .data(this.worldData.features)
            .enter()
            .append('path')
            .attr('class', 'country')
            .attr('d', this.path)
            .attr('fill', '#ccc')
            .attr('stroke', '#333')
            .attr('stroke-width', 0.5)
            .on('mouseover', (event, d) => this.showTooltip(event, d))
            .on('mouseout', () => this.hideTooltip())
            .on('click', (event, d) => this.onCountryClick(event, d));
    },

    setupControls() {
        // Product selector
        const productSelect = document.getElementById('product-select');
        productSelect.addEventListener('change', () => this.updateMap());

        // Year slider
        const yearSlider = document.getElementById('year-slider');
        const yearDisplay = document.getElementById('year-display');
        
        yearSlider.addEventListener('input', (e) => {
            yearDisplay.textContent = e.target.value;
            this.updateMap();
        });

        // Metric selector
        const metricSelect = document.getElementById('metric-select');
        metricSelect.addEventListener('change', () => this.updateMap());

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
        const product = document.getElementById('product-select').value;
        const year = parseInt(document.getElementById('year-slider').value);
        const metric = document.getElementById('metric-select').value;

        try {
            let dataUrl;
            if (metric === 'production') {
                dataUrl = `data/geo/${product}_production_${year}.json`;
            } else {
                // For timeseries data, we need to extract the specific year
                const timeseriesUrl = `data/timeseries/${product}_${metric}.json`;
                const timeseriesData = await FAOUtils.loadData(timeseriesUrl);
                this.currentData = this.extractYearData(timeseriesData, year);
                this.updateMapColors();
                return;
            }

            this.currentData = await FAOUtils.loadData(dataUrl);
            this.updateMapColors();
        } catch (error) {
            console.error('Fehler beim Laden der Kartendaten:', error);
            // Show map without data
            this.currentData = {};
            this.updateMapColors();
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
        if (!this.currentData) return;

        // Extract values for color scale
        const values = Object.values(this.currentData)
            .map(d => d.value)
            .filter(v => v !== null && v !== undefined && !isNaN(v));

        if (values.length === 0) {
            // No data available, show all countries in gray
            this.svg.selectAll('.country')
                .attr('fill', '#ccc');
            this.updateLegend([]);
            return;
        }

        // Create color scale
        this.colorScale = d3.scaleQuantile()
            .domain(values)
            .range(d3.schemeBlues[9]);

        // Update country colors
        this.g.selectAll('.country')
            .attr('fill', (d) => {
                const countryName = this.getCountryName(d);
                const mappedName = CountryMapping.normalizeCountryNameForMapping(countryName);
                const dataEntry = this.currentData[mappedName] || this.currentData[countryName];
                
                if (dataEntry && dataEntry.value !== null && !isNaN(dataEntry.value)) {
                    return this.colorScale(dataEntry.value);
                }
                return '#ccc'; // No data color
            });

        this.updateLegend(values);
    },

    getCountryName(feature) {
        // Try different property names for country identification
        return feature.properties.name || 
               feature.properties.NAME || 
               feature.properties.country || 
               feature.properties.COUNTRY ||
               'Unknown';
    },

    updateLegend(values) {
        const legendContainer = document.getElementById('map-legend');
        legendContainer.innerHTML = '';

        if (values.length === 0) {
            legendContainer.innerHTML = '<p>Keine Daten verfügbar</p>';
            return;
        }

        const legend = d3.select('#map-legend');
        
        legend.append('h4')
            .text('Legende')
            .style('margin-bottom', '10px');

        const quantiles = this.colorScale.quantiles();
        const range = this.colorScale.range();

        for (let i = 0; i < range.length; i++) {
            const item = legend.append('div')
                .style('display', 'flex')
                .style('align-items', 'center')
                .style('margin-bottom', '5px');

            item.append('div')
                .style('width', '20px')
                .style('height', '15px')
                .style('background-color', range[i])
                .style('margin-right', '8px')
                .style('border', '1px solid #ccc');

            const min = i === 0 ? d3.min(values) : quantiles[i - 1];
            const max = quantiles[i] || d3.max(values);

            item.append('span')
                .text(`${FAOUtils.formatNumber(min)} - ${FAOUtils.formatNumber(max)}`);
        }
    },

    showTooltip(event, d) {
        const countryName = this.getCountryName(d);
        const mappedName = CountryMapping.normalizeCountryNameForMapping(countryName);
        const dataEntry = this.currentData[mappedName] || this.currentData[countryName];

        let content = `<strong>${countryName}</strong><br/>`;
        
        if (dataEntry && dataEntry.value !== null && !isNaN(dataEntry.value)) {
            content += `Wert: ${FAOUtils.formatNumber(dataEntry.value, dataEntry.unit || '')}`;
        } else {
            content += 'Keine Daten verfügbar';
        }

        // Add political events if available
        const year = parseInt(document.getElementById('year-slider').value);
        const events = FAOUtils.getPoliticalEvents(year);
        if (events.length > 0) {
            content += `<br/><br/><strong>Ereignisse ${year}:</strong>`;
            events.forEach(event => {
                content += `<br/>• ${event.title}`;
            });
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
        console.log('Land angeklickt:', countryName);
        
        // Here you could implement country selection for comparison
        // or navigate to detailed country view
    }
};

