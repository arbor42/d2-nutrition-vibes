// Simulation module for future scenarios
window.Simulation = {
    initialized: false,
    currentScenario: 'baseline',

    async init() {
        if (this.initialized) return;
        
        try {
            this.setupControls();
            await this.runSimulation();
            this.initialized = true;
        } catch (error) {
            FAOUtils.showError('simulation-results', 'Fehler beim Laden der Simulation');
        }
    },

    setupControls() {
        const scenarioSelect = document.getElementById('sim-scenario');
        const yearsSlider = document.getElementById('sim-years');
        const yearsDisplay = document.getElementById('sim-years-display');

        // Initial Anzeige der Jahre und Fortschritt
        if (yearsDisplay) {
            yearsDisplay.textContent = yearsSlider.value;
        }
        
        // Force green slider styling
        this.forceSliderStyling(yearsSlider);
        
        // Slider-Tooltip setup
        this.setupSliderTooltip(yearsSlider);
        
        // Initiale Fortschrittsberechnung für Simulation Slider
        this.updateSliderProgress(yearsSlider);

        scenarioSelect.addEventListener('change', (e) => {
            this.currentScenario = e.target.value;
            this.runSimulation();
        });

        // Live-Update für Display (ohne Debounce)
        yearsSlider.addEventListener('input', (e) => {
            yearsDisplay.textContent = e.target.value;
            this.updateSliderProgress(e.target);
            this.updateSliderTooltip(e.target);
        });

        // Debounced Update für Simulation
        yearsSlider.addEventListener('input', FAOUtils.debounce((e) => {
            this.runSimulation();
        }, 300));
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

    async runSimulation() {
        const scenario = document.getElementById('sim-scenario').value;
        const years = parseInt(document.getElementById('sim-years').value);

        try {
            FAOUtils.showLoading('simulation-results');
            
            // Load historical data for baseline
            const wheatData = await FAOUtils.loadData('data/timeseries/wheat_and_products_production.json');
            
            // Generate simulation results
            const simulationResults = this.generateScenarioData(wheatData, scenario, years);
            
            this.visualizeResults(simulationResults, scenario, years);
        } catch (error) {
            FAOUtils.showError('simulation-results', 'Fehler beim Ausführen der Simulation');
        }
    },

    generateScenarioData(historicalData, scenario, years) {
        const baseYear = 2022;
        const countries = ['China', 'United States of America', 'India', 'Russian Federation', 'France'];
        const results = {};

        countries.forEach(country => {
            if (!historicalData[country]) return;

            const countryData = historicalData[country]
                .filter(d => d.year >= 2018 && d.year <= 2022)
                .sort((a, b) => a.year - b.year);

            if (countryData.length === 0) return;

            // Calculate baseline trend
            const lastValue = countryData[countryData.length - 1].value;
            const avgGrowthRate = this.calculateGrowthRate(countryData);

            // Apply scenario modifiers
            const scenarioModifier = this.getScenarioModifier(scenario, country);
            const modifiedGrowthRate = avgGrowthRate * scenarioModifier;

            // Generate future projections
            const projections = [];
            for (let i = 1; i <= years; i++) {
                const projectedValue = lastValue * Math.pow(1 + modifiedGrowthRate, i);
                projections.push({
                    year: baseYear + i,
                    value: Math.max(0, projectedValue), // Ensure non-negative values
                    scenario: scenario,
                    confidence: Math.max(0.5, 1 - (i * 0.1)) // Decreasing confidence over time
                });
            }

            results[country] = {
                historical: countryData,
                projections: projections,
                baseline_growth_rate: avgGrowthRate,
                scenario_growth_rate: modifiedGrowthRate
            };
        });

        return results;
    },

    calculateGrowthRate(data) {
        if (data.length < 2) return 0;

        const growthRates = [];
        for (let i = 1; i < data.length; i++) {
            const rate = (data[i].value - data[i-1].value) / data[i-1].value;
            if (!isNaN(rate) && isFinite(rate)) {
                growthRates.push(rate);
            }
        }

        return growthRates.length > 0 ? 
            growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length : 0;
    },

    getScenarioModifier(scenario, country) {
        const modifiers = {
            baseline: 1.0,
            climate_change: {
                'China': 0.85,
                'United States of America': 0.90,
                'India': 0.80,
                'Russian Federation': 0.75,
                'France': 0.88
            },
            population_growth: {
                'China': 1.05,
                'United States of America': 1.03,
                'India': 1.15,
                'Russian Federation': 0.98,
                'France': 1.02
            },
            conflict: {
                'China': 0.95,
                'United States of America': 0.98,
                'India': 0.92,
                'Russian Federation': 0.70,
                'France': 0.93
            }
        };

        if (scenario === 'baseline') return 1.0;
        return modifiers[scenario][country] || 0.9;
    },

    visualizeResults(results, scenario, years) {
        const container = document.getElementById('simulation-results');
        container.innerHTML = '';

        // Create scenario description
        const description = this.getScenarioDescription(scenario);
        const descDiv = document.createElement('div');
        descDiv.className = 'scenario-description';
        descDiv.innerHTML = `
            <h3>Szenario: ${this.getScenarioDisplayName(scenario)}</h3>
            <p>${description}</p>
        `;
        container.appendChild(descDiv);

        // Create chart
        const margin = { top: 20, right: 80, bottom: 40, left: 80 };
        // Fallback-Breite, falls Panel beim ersten Aufruf noch verborgen ist
        const containerWidth = container.getBoundingClientRect().width || 800;
        const width = containerWidth - margin.left - margin.right;
        const height = 400 - margin.top - margin.bottom;

        const svg = d3.select('#simulation-results')
            .append('svg')
            .attr('width', '100%')
            .attr('height', height + margin.top + margin.bottom)
            .attr('viewBox', `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
            .attr('preserveAspectRatio', 'xMinYMin meet');

        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Prepare combined data
        const allData = [];
        const countries = Object.keys(results);

        countries.forEach(country => {
            const countryResults = results[country];
            
            // Add historical data
            countryResults.historical.forEach(d => {
                allData.push({
                    country: country,
                    year: d.year,
                    value: d.value,
                    type: 'historical'
                });
            });

            // Add projections
            countryResults.projections.forEach(d => {
                allData.push({
                    country: country,
                    year: d.year,
                    value: d.value,
                    type: 'projection',
                    confidence: d.confidence
                });
            });
        });

        // Scales
        const xScale = d3.scaleLinear()
            .domain(d3.extent(allData, d => d.year))
            .range([0, width]);

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(allData, d => d.value)])
            .range([height, 0]);

        const colorScale = d3.scaleOrdinal(d3.schemeCategory10)
            .domain(countries);

        // Line generators
        const historicalLine = d3.line()
            .x(d => xScale(d.year))
            .y(d => yScale(d.value))
            .curve(d3.curveMonotoneX);

        const projectionLine = d3.line()
            .x(d => xScale(d.year))
            .y(d => yScale(d.value))
            .curve(d3.curveMonotoneX);

        // Add axes
        g.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(xScale).tickFormat(d3.format('d')));

        g.append('g')
            .call(d3.axisLeft(yScale).tickFormat(d => FAOUtils.formatNumber(d, 'tonnes')));

        // Draw lines for each country
        countries.forEach(country => {
            const countryData = results[country];
            const color = colorScale(country);

            // Historical line
            g.append('path')
                .datum(countryData.historical)
                .attr('class', 'historical-line')
                .attr('d', historicalLine)
                .style('stroke', color)
                .style('stroke-width', 2)
                .style('fill', 'none');

            // Projection line
            g.append('path')
                .datum(countryData.projections)
                .attr('class', 'projection-line')
                .attr('d', projectionLine)
                .style('stroke', color)
                .style('stroke-width', 2)
                .style('stroke-dasharray', '5,5')
                .style('fill', 'none')
                .style('opacity', 0.8);

            // Historical dots
            g.selectAll(`.historical-dot-${country.replace(/\s+/g, '')}`)
                .data(countryData.historical)
                .enter().append('circle')
                .attr('class', `historical-dot-${country.replace(/\s+/g, '')}`)
                .attr('cx', d => xScale(d.year))
                .attr('cy', d => yScale(d.value))
                .attr('r', 3)
                .style('fill', color);

            // Projection dots with confidence
            g.selectAll(`.projection-dot-${country.replace(/\s+/g, '')}`)
                .data(countryData.projections)
                .enter().append('circle')
                .attr('class', `projection-dot-${country.replace(/\s+/g, '')}`)
                .attr('cx', d => xScale(d.year))
                .attr('cy', d => yScale(d.value))
                .attr('r', d => 2 + d.confidence * 2)
                .style('fill', color)
                .style('opacity', d => d.confidence);
        });

        // Add vertical line to separate historical from projections
        const separatorX = xScale(2022.5);
        g.append('line')
            .attr('x1', separatorX)
            .attr('x2', separatorX)
            .attr('y1', 0)
            .attr('y2', height)
            .style('stroke', '#666')
            .style('stroke-width', 1)
            .style('stroke-dasharray', '3,3');

        // Add summary statistics
        this.addSummaryStatistics(container, results, scenario);

        // Nach dem SVG-Chart: HTML-Legende für Länder
        let legendHtml = '<div class="ts-legend-container"><div class="ts-legend">';
        countries.forEach((country, i) => {
            legendHtml += `<span class="ts-legend-item"><span class="ts-legend-color" style="background:${colorScale(country)}"></span>${country}</span>`;
        });
        legendHtml += '</div></div>';
        // Linienarten-Legende
        legendHtml += `<div class="ts-legend-container"><div class="ts-legend ts-legend-lines">
            <span class="ts-legend-line-item"><span class="ts-legend-line ts-legend-hist"></span> Historisch</span>
            <span class="ts-legend-line-item"><span class="ts-legend-line ts-legend-prog"></span> Prognose</span>
        </div></div>`;
        container.insertAdjacentHTML('beforeend', legendHtml);
    },

    addSummaryStatistics(container, results, scenario) {
        const summaryDiv = document.createElement('div');
        summaryDiv.className = 'simulation-summary';
        summaryDiv.innerHTML = '<h3>Zusammenfassung der Simulationsergebnisse</h3>';

        const countries = Object.keys(results);
        let totalChange = 0;
        let countryCount = 0;

        countries.forEach(country => {
            const countryResults = results[country];
            if (countryResults.projections.length > 0) {
                const lastHistorical = countryResults.historical[countryResults.historical.length - 1].value;
                const lastProjection = countryResults.projections[countryResults.projections.length - 1].value;
                const change = ((lastProjection - lastHistorical) / lastHistorical) * 100;
                
                totalChange += change;
                countryCount++;

                const changeDiv = document.createElement('div');
                changeDiv.className = 'country-change';
                changeDiv.innerHTML = `
                    <strong>${country}:</strong> 
                    ${change > 0 ? '+' : ''}${change.toFixed(1)}% 
                    (${FAOUtils.formatNumber(lastHistorical)} → ${FAOUtils.formatNumber(lastProjection)})
                `;
                summaryDiv.appendChild(changeDiv);
            }
        });

        if (countryCount > 0) {
            const avgChange = totalChange / countryCount;
            const avgDiv = document.createElement('div');
            avgDiv.className = 'average-change';
            avgDiv.innerHTML = `<strong>Durchschnittliche Veränderung: ${avgChange > 0 ? '+' : ''}${avgChange.toFixed(1)}%</strong>`;
            summaryDiv.appendChild(avgDiv);
        }

        container.appendChild(summaryDiv);
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

    getScenarioDisplayName(scenario) {
        const names = {
            baseline: 'Baseline-Szenario',
            climate_change: 'Klimawandel-Szenario',
            population_growth: 'Bevölkerungswachstum-Szenario',
            conflict: 'Konflikt-Szenario'
        };
        return names[scenario] || scenario;
    },

    getScenarioDescription(scenario) {
        const descriptions = {
            baseline: 'Fortsetzung der aktuellen Trends ohne größere Störungen.',
            climate_change: 'Berücksichtigt die Auswirkungen des Klimawandels auf die Landwirtschaft, einschließlich extremer Wetterereignisse und veränderte Niederschlagsmuster.',
            population_growth: 'Modelliert die Auswirkungen des Bevölkerungswachstums auf die Nahrungsmittelproduktion und -nachfrage.',
            conflict: 'Simuliert die Auswirkungen geopolitischer Konflikte und Handelsstörungen auf die globale Nahrungsmittelversorgung.'
        };
        return descriptions[scenario] || 'Unbekanntes Szenario';
    }
};

