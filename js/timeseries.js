// Time Series Analysis module
window.TimeSeries = {
    initialized: false,
    chart: null,

    async init() {
        if (this.initialized) return;
        
        try {
            this.setupControls();
            // Export-Button aktivieren
            FAOExport.attachExport('export-btn-timeseries','export-format-timeseries','timeseries-chart');
            await this.loadInitialData();
            this.initialized = true;
        } catch (error) {
            FAOUtils.showError('timeseries-chart', 'Fehler beim Laden der Zeitreihendaten');
        }
    },

    setupControls() {
        // Event listeners will be attached when the panel is visible/interacted with.
        // For now, we ensure the elements are checked for existence before use.
        const productSelect = document.getElementById('ts-product-select');
        if (productSelect) {
            productSelect.addEventListener('change', () => this.updateChart());
        }
        const countriesSelect = document.getElementById('ts-countries-select');
        if (countriesSelect) {
            countriesSelect.addEventListener('change', () => this.updateChart());
            // Set default selections
            const defaultCountries = ['China', 'United States of America', 'India'];
            Array.from(countriesSelect.options).forEach(option => {
                if (defaultCountries.includes(option.value)) {
                    option.selected = true;
                }
            });
        }
    },

    async loadInitialData() {
        // Don't render chart on initial load, wait for panel to open.
        // await this.updateChart(); 
    },

    async updateChart() {
        const productSelect = document.getElementById('ts-product-select');
        const countriesSelect = document.getElementById('ts-countries-select');
        const chartContainer = document.getElementById('timeseries-chart');

        if (!productSelect || !countriesSelect || !chartContainer) {
            return;
        }

        const product = productSelect.value;
        const selectedCountries = Array.from(countriesSelect.selectedOptions)
            .map(option => option.value);

        if (selectedCountries.length === 0) {
            chartContainer.innerHTML = 
                '<div class="error">Bitte wählen Sie mindestens ein Land aus.</div>';
            return;
        }

        try {
            FAOUtils.showLoading('timeseries-chart');
            
            const dataUrl = `data/timeseries/${product}_production.json`;
            const data = await FAOUtils.loadData(dataUrl);
            
            this.createChart(data, selectedCountries, product);
        } catch (error) {
            FAOUtils.showError('timeseries-chart', 'Fehler beim Laden der Zeitreihendaten');
        }
    },

    createChart(data, selectedCountries, product) {
        const container = document.getElementById('timeseries-chart');
        container.innerHTML = '';

        const margin = { top: 50, right: 120, bottom: 90, left: 100 };
        const width = container.clientWidth - margin.left - margin.right;
        const height = 440 - margin.top - margin.bottom;

        // SVG-Breite exakt auf Containerbreite begrenzen
        const svgWidth = container.clientWidth;
        const svgHeight = height + margin.top + margin.bottom;
        const svg = d3.select('#timeseries-chart')
            .append('svg')
            .attr('width', svgWidth)
            .attr('height', svgHeight);

        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Prepare data
        const chartData = this.prepareChartData(data, selectedCountries);
        
        if (chartData.length === 0) {
            container.innerHTML = '<div class="error">Keine Daten für die ausgewählten Länder verfügbar.</div>';
            return;
        }

        // Scales
        const xScale = d3.scaleLinear()
            .domain(d3.extent(chartData.flatMap(d => d.values), d => d.year))
            .range([0, width]);

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(chartData.flatMap(d => d.values), d => d.value)])
            .range([height, 0]);

        const colorScale = d3.scaleOrdinal(d3.schemeCategory10)
            .domain(selectedCountries);

        // Line generator
        const line = d3.line()
            .x(d => xScale(d.year))
            .y(d => yScale(d.value))
            .curve(d3.curveMonotoneX);

        // Add axes
        g.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(xScale).tickFormat(d3.format('d')));

        g.append('g')
            .call(d3.axisLeft(yScale).tickFormat(d => FAOUtils.formatNumber(d, 'tonnes')));

        // Add axis labels
        g.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', 0 - margin.left)
            .attr('x', 0 - (height / 2))
            .attr('dy', '1em')
            .style('text-anchor', 'middle')
            .text('Produktion (Tonnen)');

        g.append('text')
            .attr('transform', `translate(${width / 2}, ${height + margin.bottom})`)
            .style('text-anchor', 'middle')
            .text('Jahr');

        // Add lines
        const countries = g.selectAll('.country-line')
            .data(chartData)
            .enter().append('g')
            .attr('class', 'country-line');

        countries.append('path')
            .attr('class', 'line')
            .attr('d', d => line(d.values))
            .style('stroke', d => colorScale(d.country))
            .style('stroke-width', 2)
            .style('fill', 'none');

        // Add dots
        countries.selectAll('.dot')
            .data(d => d.values.map(v => ({ ...v, country: d.country })))
            .enter().append('circle')
            .attr('class', 'dot')
            .attr('cx', d => xScale(d.year))
            .attr('cy', d => yScale(d.value))
            .attr('r', 3)
            .style('fill', d => colorScale(d.country))
            .on('mouseover', (event, d) => this.showTooltip(event, d))
            .on('mouseout', () => this.hideTooltip());

        // Add title
        svg.append('text')
            .attr('x', svgWidth / 2)
            .attr('y', margin.top - 20)
            .attr('text-anchor', 'middle')
            .attr('class', 'd3-title')
            .style('font-size', '20px')
            .style('font-weight', 'bold')
            .text(`${this.getProductDisplayName(product)} - Produktionstrends (2010-2022)`);

        // Add political events annotations
        this.addPoliticalEventsAnnotations(g, xScale, height);

        // Create tooltip
        this.tooltip = d3.select('body')
            .append('div')
            .attr('class', 'tooltip')
            .style('opacity', 0);

        // Nach dem SVG-Chart: HTML-Legende erzeugen
        let legendHtml = '<div class="ts-legend-container"><div class="ts-legend">';
        selectedCountries.forEach((country, i) => {
            legendHtml += `<span class="ts-legend-item"><span class="ts-legend-color" style="background:${colorScale(country)}"></span>${country}</span>`;
        });
        legendHtml += '</div></div>';
        container.insertAdjacentHTML('beforeend', legendHtml);
    },

    prepareChartData(data, selectedCountries) {
        const chartData = [];

        selectedCountries.forEach(country => {
            if (data[country]) {
                const countryData = data[country]
                    .filter(d => d.value !== null && !isNaN(d.value))
                    .sort((a, b) => a.year - b.year);

                if (countryData.length > 0) {
                    chartData.push({
                        country: country,
                        values: countryData
                    });
                }
            }
        });

        return chartData;
    },

    addPoliticalEventsAnnotations(g, xScale, height) {
        const events = [
            { year: 2014, title: 'Ukraine-Konflikt', color: '#e74c3c' },
            { year: 2020, title: 'COVID-19', color: '#f39c12' },
            { year: 2022, title: 'Russland-Ukraine Krieg', color: '#e74c3c' }
        ];

        events.forEach(event => {
            const x = xScale(event.year);
            
            // Add vertical line
            g.append('line')
                .attr('x1', x)
                .attr('x2', x)
                .attr('y1', 0)
                .attr('y2', height)
                .style('stroke', event.color)
                .style('stroke-width', 1)
                .style('stroke-dasharray', '3,3')
                .style('opacity', 0.7);

            // Add label
            g.append('text')
                .attr('x', x)
                .attr('y', -5)
                .attr('text-anchor', 'middle')
                .style('font-size', '10px')
                .style('fill', event.color)
                .style('font-weight', 'bold')
                .text(event.title);
        });
    },

    getProductDisplayName(product) {
        const displayNames = {
            'wheat_and_products': 'Weizen und Produkte',
            'rice_and_products': 'Reis und Produkte',
            'maize_and_products': 'Mais und Produkte'
        };
        return displayNames[product] || product;
    },

    showTooltip(event, d) {
        const content = `
            <strong>${d.country}</strong><br/>
            Jahr: ${d.year}<br/>
            Produktion: ${FAOUtils.formatNumber(d.value, d.unit || 'tonnes')}
        `;

        this.tooltip.transition()
            .duration(200)
            .style('opacity', 0.9);
        
        this.tooltip.html(content)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 28) + 'px');
    },

    hideTooltip() {
        if (this.tooltip) {
            this.tooltip.transition()
                .duration(500)
                .style('opacity', 0);
        }
    }
};

