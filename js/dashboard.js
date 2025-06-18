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
        
        // Phase 1 Priority Events (2010-2022)
        const phaseOneYears = [2010, 2018, 2019, 2020, 2022];
        const priorityEvents = [];
        
        // Get Phase 1 priority events
        phaseOneYears.forEach(year => {
            const events = FAOUtils.getPoliticalEvents(year);
            events.forEach(event => {
                priorityEvents.push({ year, ...event });
            });
        });

        if (priorityEvents.length === 0) {
            container.innerHTML = '<p>Keine Major World Events verfügbar.</p>';
            return;
        }

        // Group events by category
        const eventsByCategory = {};
        priorityEvents.forEach(event => {
            const category = event.category || 'unknown';
            if (!eventsByCategory[category]) {
                eventsByCategory[category] = [];
            }
            eventsByCategory[category].push(event);
        });

        // Create category-based HTML
        let eventsHtml = '<div class="major-events-header"><h4>🌍 Major World Events Analysis (2010-2022)</h4></div>';
        
        Object.keys(eventsByCategory).forEach(category => {
            const categoryClass = this.getCategoryClass(category);
            const categoryTitle = this.getCategoryTitle(category);
            
            eventsHtml += `
                <div class="event-category ${categoryClass}">
                    <h5 class="category-title">${categoryTitle}</h5>
                    ${eventsByCategory[category].map(event => `
                        <div class="event-item priority-event" data-year="${event.year}" data-category="${event.category}">
                            <div class="event-header">
                                <span class="event-year">${event.year}</span>
                                <span class="event-title">${event.title}</span>
                            </div>
                            <p class="event-description">${event.description}</p>
                            <div class="event-impact">${event.impact}</div>
                            ${event.affectedCountries ? `
                                <div class="affected-countries">
                                    <small>Betroffene Länder: ${event.affectedCountries.join(', ')}</small>
                                </div>
                            ` : ''}
                            ${event.dataEvidence ? `
                                <div class="data-evidence">
                                    <small>📊 Datenbeleg: ${event.dataEvidence}</small>
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            `;
        });

        container.innerHTML = eventsHtml;
        
        // Add event listeners for interactive exploration
        this.addEventInteractions();
    },

    getCategoryClass(category) {
        const categoryMap = {
            'climate': 'category-climate',
            'conflict': 'category-conflict', 
            'disease': 'category-disease',
            'pandemic': 'category-pandemic',
            'unknown': 'category-unknown'
        };
        return categoryMap[category] || 'category-unknown';
    },

    getCategoryTitle(category) {
        const titleMap = {
            'climate': '🌡️ Klimaereignisse',
            'conflict': '⚔️ Konflikte', 
            'disease': '🦠 Krankheitsausbrüche',
            'pandemic': '🌍 Pandemie',
            'unknown': '❓ Andere Ereignisse'
        };
        return titleMap[category] || '❓ Andere Ereignisse';
    },

    addEventInteractions() {
        const eventItems = document.querySelectorAll('.event-item.priority-event');
        
        eventItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const year = parseInt(item.dataset.year);
                const category = item.dataset.category;
                
                // Highlight event
                eventItems.forEach(el => el.classList.remove('event-selected'));
                item.classList.add('event-selected');
                
                // Trigger map update to show event year
                if (window.WorldMap && window.WorldMap.updateYear) {
                    window.WorldMap.updateYear(year);
                }
                
                // Show additional analysis for this event
                this.showEventAnalysis(year, category);
            });
        });
    },

    async showEventAnalysis(year, category) {
        // Optional: Show detailed analysis for the selected event
        // This could trigger additional visualizations or data loading
        try {
            // Get event-specific analysis
            const events = FAOUtils.getPoliticalEvents(year);
            if (events.length > 0) {
                // Could trigger specific analysis functions here
                // For now, just update the year slider
                const yearSlider = document.getElementById('year-slider');
                if (yearSlider) {
                    yearSlider.value = year;
                    // Trigger change event to update visualizations
                    yearSlider.dispatchEvent(new Event('input'));
                }
            }
        } catch (error) {
            // Error in event analysis
        }
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

