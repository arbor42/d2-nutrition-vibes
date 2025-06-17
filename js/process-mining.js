// Process Mining module
window.ProcessMining = {
    initialized: false,

    async init() {
        if (this.initialized) return;
        
        try {
            this.setupControls();
            // await this.performProcessMining(); // Removed to prevent rendering in hidden panel
            this.initialized = true;
        } catch (error) {
            console.error('Fehler beim Initialisieren des Process Mining:', error);
            FAOUtils.showError('process-mining-chart', 'Fehler beim Laden des Process Mining');
        }
    },

    setupControls() {
        const processTypeSelect = document.getElementById('process-type');
        processTypeSelect.addEventListener('change', () => this.performProcessMining());

        const productSelect = document.getElementById('process-product-select');
        if (productSelect) {
            productSelect.addEventListener('change', () => this.performProcessMining());
        }

        // Export-Button
        FAOExport.attachExport('export-btn-process','export-format-process','process-mining-chart');
    },

    async performProcessMining() {
        const processType = document.getElementById('process-type').value;
        const product = document.getElementById('process-product-select')?.value || 'wheat_and_products';

        const productionFile = `data/timeseries/${product}_production.json`;
        const supplyFile = `data/timeseries/${product}_food_supply_quantity_kg_capita_yr.json`;

        try {
            FAOUtils.showLoading('process-mining-chart');
            
            // Load data for process mining
            const productionData = await FAOUtils.loadData(productionFile);
            const supplyData = await FAOUtils.loadData(supplyFile);
            
            switch (processType) {
                case 'supply_chain':
                    this.analyzeSupplyChain(productionData, supplyData, product);
                    break;
                case 'production_flow':
                    this.analyzeProductionFlow(productionData);
                    break;
                case 'trade_patterns':
                    this.analyzeTradePatterns(productionData, supplyData);
                    break;
            }
        } catch (error) {
            console.error('Fehler beim Process Mining:', error);
            FAOUtils.showError('process-mining-chart', 'Fehler beim Process Mining');
        }
    },

    analyzeSupplyChain(productionData, supplyData, product) {
        const container = document.getElementById('process-mining-chart');
        container.innerHTML = '';

        // Create supply chain process model
        const supplyChainSteps = this.extractSupplyChainProcess(productionData, supplyData);
        this.visualizeSupplyChainProcess(container, supplyChainSteps, product);
    },

    extractSupplyChainProcess(productionData, supplyData) {
        // Analyze the relationship between production and supply
        const countries = ['China', 'United States of America', 'India', 'Russian Federation', 'France'];
        const processes = [];

        countries.forEach(country => {
            if (productionData[country] && supplyData[country]) {
                const prodData = productionData[country].filter(d => d.year >= 2018);
                const suppData = supplyData[country].filter(d => d.year >= 2018);

                if (prodData.length > 0 && suppData.length > 0) {
                    const avgProduction = prodData.reduce((sum, d) => sum + d.value, 0) / prodData.length;
                    const avgSupply = suppData.reduce((sum, d) => sum + d.value, 0) / suppData.length;
                    
                    // Calculate efficiency (supply per unit production)
                    const efficiency = avgSupply / (avgProduction / 1000000); // kg per capita per tonne production
                    
                    processes.push({
                        country: country,
                        production: avgProduction,
                        supply: avgSupply,
                        efficiency: efficiency,
                        category: this.categorizeSupplyChain(efficiency)
                    });
                }
            }
        });

        return processes.sort((a, b) => b.production - a.production);
    },

    categorizeSupplyChain(efficiency) {
        if (efficiency > 50) return 'Hocheffizient';
        if (efficiency > 20) return 'Mitteleffizient';
        if (efficiency > 5) return 'Niedrigeffizient';
        return 'Exportorientiert';
    },

    visualizeSupplyChainProcess(container, processes, product) {
        // Create process flow diagram
        const width = container.clientWidth;
        const height = 500;

        const svg = d3.select(container)
            .append('svg')
            .attr('width', width)
            .attr('height', height);

        // Define process steps
        const steps = [
            { id: 'production', name: 'Produktion', x: 100, y: height / 2 },
            { id: 'processing', name: 'Verarbeitung', x: 250, y: height / 2 },
            { id: 'distribution', name: 'Verteilung', x: 400, y: height / 2 },
            { id: 'consumption', name: 'Verbrauch', x: 550, y: height / 2 }
        ];

        // Draw process flow
        const stepWidth = 120;
        const stepHeight = 60;

        // Draw connections
        for (let i = 0; i < steps.length - 1; i++) {
            svg.append('line')
                .attr('x1', steps[i].x + stepWidth / 2)
                .attr('y1', steps[i].y)
                .attr('x2', steps[i + 1].x - stepWidth / 2)
                .attr('y2', steps[i + 1].y)
                .attr('stroke', '#3498db')
                .attr('stroke-width', 3)
                .attr('marker-end', 'url(#arrowhead)');
        }

        // Define arrow marker
        svg.append('defs').append('marker')
            .attr('id', 'arrowhead')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 8)
            .attr('refY', 0)
            .attr('markerWidth', 6)
            .attr('markerHeight', 6)
            .attr('orient', 'auto')
            .append('path')
            .attr('d', 'M0,-5L10,0L0,5')
            .attr('fill', '#3498db');

        // Draw process steps
        const stepGroups = svg.selectAll('.process-step')
            .data(steps)
            .enter().append('g')
            .attr('class', 'process-step')
            .attr('transform', d => `translate(${d.x - stepWidth / 2}, ${d.y - stepHeight / 2})`);

        stepGroups.append('rect')
            .attr('width', stepWidth)
            .attr('height', stepHeight)
            .attr('fill', '#ecf0f1')
            .attr('stroke', '#3498db')
            .attr('stroke-width', 2)
            .attr('rx', 10);

        stepGroups.append('text')
            .attr('x', stepWidth / 2)
            .attr('y', stepHeight / 2)
            .attr('text-anchor', 'middle')
            .attr('dy', '0.35em')
            .style('font-size', '14px')
            .style('font-weight', 'bold')
            .text(d => d.name);

        // Add country-specific efficiency indicators
        const countryY = height / 2 + 150;
        processes.forEach((process, i) => {
            const x = 100 + i * 120;
            
            // Country box
            const countryGroup = svg.append('g')
                .attr('transform', `translate(${x - 50}, ${countryY - 30})`);

            countryGroup.append('rect')
                .attr('width', 100)
                .attr('height', 60)
                .attr('fill', this.getEfficiencyColor(process.category))
                .attr('stroke', '#2c3e50')
                .attr('stroke-width', 1)
                .attr('rx', 5);

            countryGroup.append('text')
                .attr('x', 50)
                .attr('y', 15)
                .attr('text-anchor', 'middle')
                .style('font-size', '10px')
                .style('font-weight', 'bold')
                .text(process.country);

            countryGroup.append('text')
                .attr('x', 50)
                .attr('y', 30)
                .attr('text-anchor', 'middle')
                .style('font-size', '9px')
                .text(`Eff: ${process.efficiency.toFixed(1)}`);

            countryGroup.append('text')
                .attr('x', 50)
                .attr('y', 45)
                .attr('text-anchor', 'middle')
                .style('font-size', '8px')
                .text(process.category);

            // Connect to main process
            svg.append('line')
                .attr('x1', x)
                .attr('y1', height / 2 + stepHeight / 2)
                .attr('x2', x)
                .attr('y2', countryY - 30)
                .attr('stroke', '#95a5a6')
                .attr('stroke-width', 1)
                .attr('stroke-dasharray', '3,3');
        });

        // Add title and legend
        svg.append('text')
            .attr('x', width / 2)
            .attr('y', 30)
            .attr('text-anchor', 'middle')
            .style('font-size', '18px')
            .style('font-weight', 'bold')
            .text(`Lieferketten-Prozessanalyse: ${this.getProductDisplayName(product)}`);

        // Add efficiency legend
        const legend = svg.append('g')
            .attr('transform', 'translate(20, 80)');

        const categories = ['Hocheffizient', 'Mitteleffizient', 'Niedrigeffizient', 'Exportorientiert'];
        
        categories.forEach((category, i) => {
            const item = legend.append('g')
                .attr('transform', `translate(0, ${i * 20})`);

            item.append('rect')
                .attr('width', 15)
                .attr('height', 15)
                .attr('fill', this.getEfficiencyColor(category));

            item.append('text')
                .attr('x', 20)
                .attr('y', 12)
                .style('font-size', '12px')
                .text(category);
        });
    },

    getEfficiencyColor(category) {
        const colors = {
            'Hocheffizient': '#27ae60',
            'Mitteleffizient': '#f39c12',
            'Niedrigeffizient': '#e67e22',
            'Exportorientiert': '#3498db'
        };
        return colors[category] || '#95a5a6';
    },

    analyzeProductionFlow(productionData) {
        const container = document.getElementById('process-mining-chart');
        container.innerHTML = '';

        // Analyze production flow patterns over time
        const flowData = this.extractProductionFlowPatterns(productionData);
        this.visualizeProductionFlow(container, flowData);
    },

    extractProductionFlowPatterns(productionData) {
        const countries = ['China', 'United States of America', 'India', 'Russian Federation', 'Brazil'];
        const flowPatterns = [];

        countries.forEach(country => {
            if (productionData[country]) {
                const countryData = productionData[country]
                    .filter(d => d.year >= 2010)
                    .sort((a, b) => a.year - b.year);

                if (countryData.length > 5) {
                    // Analyze production patterns
                    const patterns = this.identifyProductionPatterns(countryData);
                    flowPatterns.push({
                        country: country,
                        data: countryData,
                        patterns: patterns
                    });
                }
            }
        });

        return flowPatterns;
    },

    identifyProductionPatterns(data) {
        const patterns = [];
        
        for (let i = 1; i < data.length; i++) {
            const change = data[i].value - data[i - 1].value;
            const changePercent = (change / data[i - 1].value) * 100;
            
            let pattern = 'stable';
            if (changePercent > 10) pattern = 'growth';
            else if (changePercent < -10) pattern = 'decline';
            else if (Math.abs(changePercent) > 5) pattern = 'volatile';

            patterns.push({
                year: data[i].year,
                change: change,
                changePercent: changePercent,
                pattern: pattern
            });
        }

        return patterns;
    },

    visualizeProductionFlow(container, flowData) {
        // Dynamische Margins basierend auf längstem Ländernamen bestimmen
        const countries = flowData.map(d => d.country);
        const longestLabel = d3.max(countries, d => d.length);
        const dynamicLeft = Math.min(220, 20 + longestLabel * 7); // 7 px pro Zeichen, max 220 px
        const margin = { top: 50, right: 120, bottom: 50, left: dynamicLeft };

        const width = container.clientWidth - margin.left - margin.right;
        const height = 400 - margin.top - margin.bottom;

        const svg = d3.select(container)
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom);

        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Create Sankey-like flow diagram
        const years = d3.range(2010, 2023);

        // Scales
        const xScale = d3.scaleBand()
            .domain(years)
            .range([0, width])
            .padding(0.1);

        const yScale = d3.scaleBand()
            .domain(countries)
            .range([0, height])
            .padding(0.1);

        const colorScale = d3.scaleOrdinal()
            .domain(['growth', 'decline', 'volatile', 'stable'])
            .range(['#27ae60', '#e74c3c', '#f39c12', '#95a5a6']);

        // Draw flow patterns
        flowData.forEach(countryFlow => {
            const countryY = yScale(countryFlow.country);
            const bandHeight = yScale.bandwidth();

            countryFlow.patterns.forEach(pattern => {
                const x = xScale(pattern.year);
                const bandWidth = xScale.bandwidth();

                g.append('rect')
                    .attr('x', x)
                    .attr('y', countryY)
                    .attr('width', bandWidth)
                    .attr('height', bandHeight)
                    .attr('fill', colorScale(pattern.pattern))
                    .attr('opacity', 0.7)
                    .on('mouseover', (event) => this.showFlowTooltip(event, pattern, countryFlow.country))
                    .on('mouseout', () => this.hideFlowTooltip());
            });

            // Add country label
            g.append('text')
                .attr('x', -5)
                .attr('y', countryY + bandHeight / 2)
                .attr('text-anchor', 'end')
                .attr('dy', '0.35em')
                .style('font-size', '12px')
                .text(countryFlow.country);
        });

        // Add year labels
        g.selectAll('.year-label')
            .data(years)
            .enter().append('text')
            .attr('class', 'year-label')
            .attr('x', d => xScale(d) + xScale.bandwidth() / 2)
            .attr('y', height + 20)
            .attr('text-anchor', 'middle')
            .style('font-size', '10px')
            .text(d => d);

        // Add legend
        const legend = svg.append('g')
            .attr('transform', `translate(${width + margin.left + 10}, ${margin.top})`);

        legend.append('text')
            .text('Produktionsmuster')
            .style('font-size', '12px')
            .style('font-weight', 'bold');

        const patterns = ['growth', 'decline', 'volatile', 'stable'];
        const patternNames = ['Wachstum', 'Rückgang', 'Volatil', 'Stabil'];

        patterns.forEach((pattern, i) => {
            const item = legend.append('g')
                .attr('transform', `translate(0, ${20 + i * 20})`);

            item.append('rect')
                .attr('width', 15)
                .attr('height', 15)
                .attr('fill', colorScale(pattern));

            item.append('text')
                .attr('x', 20)
                .attr('y', 12)
                .style('font-size', '10px')
                .text(patternNames[i]);
        });

        // Add title
        svg.append('text')
            .attr('x', (width + margin.left + margin.right) / 2)
            .attr('y', 25)
            .attr('text-anchor', 'middle')
            .style('font-size', '16px')
            .style('font-weight', 'bold')
            .text('Produktionsfluss-Analyse: Zeitliche Muster');

        // Create tooltip
        this.flowTooltip = d3.select('body')
            .append('div')
            .attr('class', 'tooltip')
            .style('opacity', 0);
    },

    showFlowTooltip(event, pattern, country) {
        const content = `
            <strong>${country}</strong><br/>
            Jahr: ${pattern.year}<br/>
            Veränderung: ${pattern.changePercent.toFixed(1)}%<br/>
            Muster: ${this.getPatternDisplayName(pattern.pattern)}
        `;

        this.flowTooltip.transition()
            .duration(200)
            .style('opacity', 0.9);
        
        this.flowTooltip.html(content)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 28) + 'px');
    },

    hideFlowTooltip() {
        if (this.flowTooltip) {
            this.flowTooltip.transition()
                .duration(500)
                .style('opacity', 0);
        }
    },

    getPatternDisplayName(pattern) {
        const names = {
            'growth': 'Wachstum',
            'decline': 'Rückgang',
            'volatile': 'Volatil',
            'stable': 'Stabil'
        };
        return names[pattern] || pattern;
    },

    analyzeTradePatterns(productionData, supplyData) {
        const container = document.getElementById('process-mining-chart');
        container.innerHTML = '';

        // Analyze trade patterns by comparing production vs consumption
        const tradeData = this.extractTradePatterns(productionData, supplyData);
        this.visualizeTradePatterns(container, tradeData);
    },

    extractTradePatterns(productionData, supplyData) {
        const countries = ['China', 'United States of America', 'India', 'Russian Federation', 'Brazil', 'France', 'Germany'];
        const tradePatterns = [];

        countries.forEach(country => {
            if (productionData[country] && supplyData[country]) {
                const prodData = productionData[country].filter(d => d.year >= 2018);
                const suppData = supplyData[country].filter(d => d.year >= 2018);

                if (prodData.length > 0 && suppData.length > 0) {
                    const avgProduction = prodData.reduce((sum, d) => sum + d.value, 0) / prodData.length;
                    const avgSupply = suppData.reduce((sum, d) => sum + d.value, 0) / suppData.length;
                    
                    // Estimate population (simplified)
                    const estimatedPopulation = this.getEstimatedPopulation(country);
                    const totalConsumption = avgSupply * estimatedPopulation / 1000; // Convert to tonnes
                    
                    const tradeBalance = avgProduction - totalConsumption;
                    const tradeType = tradeBalance > 0 ? 'exporter' : 'importer';
                    
                    tradePatterns.push({
                        country: country,
                        production: avgProduction,
                        consumption: totalConsumption,
                        tradeBalance: tradeBalance,
                        tradeType: tradeType,
                        selfSufficiency: (avgProduction / totalConsumption) * 100
                    });
                }
            }
        });

        return tradePatterns.sort((a, b) => Math.abs(b.tradeBalance) - Math.abs(a.tradeBalance));
    },

    getEstimatedPopulation(country) {
        // Simplified population estimates (in millions)
        const populations = {
            'China': 1400,
            'United States of America': 330,
            'India': 1380,
            'Russian Federation': 146,
            'Brazil': 215,
            'France': 67,
            'Germany': 83
        };
        return populations[country] || 50;
    },

    visualizeTradePatterns(container, tradeData) {
        const margin = { top: 50, right: 100, bottom: 80, left: 100 };
        const width = container.clientWidth - margin.left - margin.right;
        const height = 400 - margin.top - margin.bottom;

        const svg = d3.select(container)
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom);

        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Scales
        const xScale = d3.scaleLinear()
            .domain(d3.extent(tradeData, d => d.production))
            .range([0, width]);

        const yScale = d3.scaleLinear()
            .domain(d3.extent(tradeData, d => d.consumption))
            .range([height, 0]);

        const colorScale = d3.scaleOrdinal()
            .domain(['exporter', 'importer'])
            .range(['#27ae60', '#e74c3c']);

        // Add diagonal line (production = consumption)
        const maxValue = Math.max(d3.max(tradeData, d => d.production), d3.max(tradeData, d => d.consumption));
        g.append('line')
            .attr('x1', xScale(0))
            .attr('y1', yScale(0))
            .attr('x2', xScale(maxValue))
            .attr('y2', yScale(maxValue))
            .attr('stroke', '#95a5a6')
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '5,5');

        g.append('text')
            .attr('x', xScale(maxValue * 0.7))
            .attr('y', yScale(maxValue * 0.7) - 10)
            .style('font-size', '12px')
            .style('fill', '#7f8c8d')
            .text('Selbstversorgung');

        // Add axes
        g.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(xScale).tickFormat(d => FAOUtils.formatNumber(d, 'tonnes')));

        g.append('g')
            .call(d3.axisLeft(yScale).tickFormat(d => FAOUtils.formatNumber(d, 'tonnes')));

        // Add axis labels
        g.append('text')
            .attr('transform', `translate(${width / 2}, ${height + margin.bottom - 10})`)
            .style('text-anchor', 'middle')
            .style('font-size', '14px')
            .text('Produktion (Tonnen)');

        g.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', 0 - margin.left + 20)
            .attr('x', 0 - (height / 2))
            .attr('dy', '1em')
            .style('text-anchor', 'middle')
            .style('font-size', '14px')
            .text('Verbrauch (Tonnen)');

        // Add points
        g.selectAll('.trade-point')
            .data(tradeData)
            .enter().append('circle')
            .attr('class', 'trade-point')
            .attr('cx', d => xScale(d.production))
            .attr('cy', d => yScale(d.consumption))
            .attr('r', d => Math.sqrt(Math.abs(d.tradeBalance) / 1000000) + 5)
            .attr('fill', d => colorScale(d.tradeType))
            .attr('stroke', '#fff')
            .attr('stroke-width', 2)
            .attr('opacity', 0.7)
            .on('mouseover', (event, d) => this.showTradeTooltip(event, d))
            .on('mouseout', () => this.hideTradeTooltip());

        // Add country labels
        g.selectAll('.country-label')
            .data(tradeData)
            .enter().append('text')
            .attr('class', 'country-label')
            .attr('x', d => xScale(d.production))
            .attr('y', d => yScale(d.consumption) - 15)
            .attr('text-anchor', 'middle')
            .style('font-size', '10px')
            .style('font-weight', 'bold')
            .text(d => d.country);

        // Add legend
        const legend = svg.append('g')
            .attr('transform', `translate(${width + margin.left - 80}, ${margin.top})`);

        legend.append('text')
            .text('Handelsmuster')
            .style('font-size', '12px')
            .style('font-weight', 'bold');

        const tradeTypes = ['exporter', 'importer'];
        const typeNames = ['Exporteur', 'Importeur'];

        tradeTypes.forEach((type, i) => {
            const item = legend.append('g')
                .attr('transform', `translate(0, ${20 + i * 20})`);

            item.append('circle')
                .attr('r', 8)
                .attr('fill', colorScale(type));

            item.append('text')
                .attr('x', 15)
                .attr('y', 4)
                .style('font-size', '10px')
                .text(typeNames[i]);
        });

        legend.append('text')
            .attr('y', 80)
            .style('font-size', '10px')
            .text('Kreisgröße:');

        legend.append('text')
            .attr('y', 95)
            .style('font-size', '10px')
            .text('Handelsbilanz');

        // Add title
        svg.append('text')
            .attr('x', (width + margin.left + margin.right) / 2)
            .attr('y', 25)
            .attr('text-anchor', 'middle')
            .style('font-size', '16px')
            .style('font-weight', 'bold')
            .text('Handelsmuster-Analyse: Produktion vs. Verbrauch');

        // Create tooltip
        this.tradeTooltip = d3.select('body')
            .append('div')
            .attr('class', 'tooltip')
            .style('opacity', 0);
    },

    showTradeTooltip(event, d) {
        const content = `
            <strong>${d.country}</strong><br/>
            Produktion: ${FAOUtils.formatNumber(d.production, 'tonnes')}<br/>
            Verbrauch: ${FAOUtils.formatNumber(d.consumption, 'tonnes')}<br/>
            Handelsbilanz: ${FAOUtils.formatNumber(d.tradeBalance, 'tonnes')}<br/>
            Selbstversorgung: ${d.selfSufficiency.toFixed(1)}%<br/>
            Typ: ${d.tradeType === 'exporter' ? 'Exporteur' : 'Importeur'}
        `;

        this.tradeTooltip.transition()
            .duration(200)
            .style('opacity', 0.9);
        
        this.tradeTooltip.html(content)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 28) + 'px');
    },

    hideTradeTooltip() {
        if (this.tradeTooltip) {
            this.tradeTooltip.transition()
                .duration(500)
                .style('opacity', 0);
        }
    },

    getProductDisplayName(productKey) {
        const names = {
            'wheat_and_products': 'Weizen',
            'rice_and_products': 'Reis',
            'maize_and_products': 'Mais',
            'milk_-_excluding_butter': 'Milch',
            'fruits_-_excluding_wine': 'Früchte',
            'vegetables': 'Gemüse',
            'sugar_and_sweeteners': 'Zucker & Süßstoffe',
            'pulses': 'Hülsenfrüchte',
            'potatoes_and_products': 'Kartoffeln',
            'cassava_and_products': 'Cassava',
            'nuts_and_products': 'Nüsse',
        };
        return names[productKey] || productKey.replace(/_/g, ' ');
    }
};

