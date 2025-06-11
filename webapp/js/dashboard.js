// Dashboard module
window.Dashboard = {
    initialized: false,

    async init() {
        if (this.initialized) return;
        
        try {
            await this.loadOverviewStats();
            // await this.loadGlobalTrends(); // Removed to prevent rendering in hidden panel
            this.loadPoliticalEvents();
            this.loadClimateImpacts();
            this.initialized = true;
        } catch (error) {
            console.error('Fehler beim Laden der Dashboard-Daten:', error);
            FAOUtils.showError('overview-stats', 'Fehler beim Laden der Dashboard-Daten');
        }
    },

    async loadOverviewStats() {
        const container = document.getElementById('overview-stats');
        if (!container) return;
        
        FAOUtils.showLoading('overview-stats');

        try {
            // Load metadata for overview
            const metadata = await FAOUtils.loadData('data/metadata.json');
            
            container.innerHTML = `
                <div class="stat-item">
                    <h4>Verfügbare Jahre</h4>
                    <p>${metadata.years_available[0]} - ${metadata.years_available[metadata.years_available.length - 1]}</p>
                </div>
                <div class="stat-item">
                    <h4>Anzahl Länder</h4>
                    <p>${metadata.countries_count}</p>
                </div>
                <div class="stat-item">
                    <h4>Verfügbare Produkte</h4>
                    <p>${metadata.items_available.length}</p>
                </div>
                <div class="stat-item">
                    <h4>Datenquelle</h4>
                    <p class="stat-text">${metadata.data_source}</p>
                </div>
            `;
        } catch (error) {
            FAOUtils.showError('overview-stats', 'Fehler beim Laden der Übersichtsdaten');
        }
    },

    async    loadGlobalTrends() {
        const container = document.getElementById('global-trends');
        if (!container) return;
        FAOUtils.showLoading('panel-global-trends');

        try {
            // Load wheat production data for global trends
            const wheatData = await FAOUtils.loadData('data/timeseries/wheat_and_products_production.json');
            
            // Calculate global trends
            const globalTrends = this.calculateGlobalTrends(wheatData);
            
            // Create simple trend visualization
            this.createTrendChart(container, globalTrends);
        } catch (error) {
            FAOUtils.showError('global-trends', 'Fehler beim Laden der globalen Trends');
        }
    },

    calculateGlobalTrends(data) {
        const yearlyTotals = {};
        
        // Sum production for all countries by year
        Object.keys(data).forEach(country => {
            data[country].forEach(yearData => {
                if (!yearlyTotals[yearData.year]) {
                    yearlyTotals[yearData.year] = 0;
                }
                yearlyTotals[yearData.year] += yearData.value;
            });
        });

        return Object.keys(yearlyTotals)
            .sort()
            .map(year => ({
                year: parseInt(year),
                value: yearlyTotals[year]
            }));
    },

    createTrendChart(container, data) {
        container.innerHTML = '';
        const parentRect = container.getBoundingClientRect();
        const margin = { top: 40, right: 40, bottom: 40, left: 80 };
        const width = parentRect.width - margin.left - margin.right;
        const height = 300 - margin.top - margin.bottom; // Fixed height for chart area

        const svg = d3.select(container)
            .append('svg')
            .attr('width', '100%')
            .attr('height', 300)
            .attr('viewBox', `0 0 ${parentRect.width} 300`);

        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        const x = d3.scaleLinear()
            .domain(d3.extent(data, d => d.year))
            .range([0, width]);

        const y = d3.scaleLinear()
            .domain([d3.min(data, d => d.value) * 0.98, d3.max(data, d => d.value) * 1.02])
            .nice()
            .range([height, 0]);

        const line = d3.line()
            .x(d => x(d.year))
            .y(d => y(d.value))
            .curve(d3.curveMonotoneX);

        // Add axes
        g.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(x).tickFormat(d3.format('d')).ticks(Math.min(data.length, 10)));

        g.append('g')
            .call(d3.axisLeft(y).tickFormat(d => FAOUtils.formatNumber(d, 'tonnes')).ticks(5));

        // Add line
        g.append('path')
            .datum(data)
            .attr('fill', 'none')
            .attr('stroke', '#8e44ad')
            .attr('stroke-width', 2.5)
            .attr('d', line);

        // Add dots
        g.selectAll('.dot')
            .data(data)
            .enter().append('circle')
            .attr('class', 'dot')
            .attr('cx', d => x(d.year))
            .attr('cy', d => y(d.value))
            .attr('r', 4)
            .attr('fill', '#8e44ad');

        // Add title
        svg.append('text')
            .attr('x', parentRect.width / 2)
            .attr('y', margin.top / 2 + 10)
            .attr('text-anchor', 'middle')
            .style('font-size', '16px')
            .style('font-weight', 'bold')
            .text('Globale Weizenproduktion (2010-2022)');
    },

    loadPoliticalEvents() {
        const container = document.getElementById('political-events');
        if (!container) return;
        
        const currentYear = new Date().getFullYear();
        const recentEvents = [];
        
        // Get events from recent years
        for (let year = 2020; year <= 2022; year++) {
            const events = FAOUtils.getPoliticalEvents(year);
            events.forEach(event => {
                recentEvents.push({ year, ...event });
            });
        }

        if (recentEvents.length === 0) {
            container.innerHTML = '<p>Keine aktuellen politischen Ereignisse verfügbar.</p>';
            return;
        }

        const eventsHtml = recentEvents.map(event => `
            <div class="event-item">
                <h5>${event.year}: ${event.title}</h5>
                <p>${event.description}</p>
                <small>${event.impact}</small>
            </div>
        `).join('');

        container.innerHTML = eventsHtml;
    },

    loadClimateImpacts() {
        const container = document.getElementById('climate-impacts');
        if (!container) return;
        
        const climateData = [
            {
                year: 2020,
                event: 'COVID-19 Pandemie',
                impact: 'Störungen in globalen Lieferketten',
                severity: 'Hoch'
            },
            {
                year: 2021,
                event: 'Extreme Wetterereignisse',
                impact: 'Überschwemmungen und Dürren beeinträchtigen Ernten',
                severity: 'Mittel'
            },
            {
                year: 2022,
                event: 'Klimawandel-Effekte',
                impact: 'Veränderte Niederschlagsmuster',
                severity: 'Hoch'
            }
        ];

        const impactsHtml = climateData.map(item => `
            <div class="climate-item">
                <h5>${item.year}: ${item.event}</h5>
                <p>${item.impact}</p>
                <small class="severity-${item.severity.toLowerCase()}">
                    Schweregrad: ${item.severity}
                </small>
            </div>
        `).join('');

        container.innerHTML = impactsHtml;
    }
};

