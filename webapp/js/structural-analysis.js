// Structural Analysis module
window.StructuralAnalysis = {
    initialized: false,

    async init() {
        if (this.initialized) return;
        
        try {
            this.setupControls();
            FAOExport.attachExport('export-btn-struct','export-format-struct','structural-analysis-chart');
            await this.performAnalysis();
            this.initialized = true;
        } catch (error) {
            console.error('Fehler beim Initialisieren der Strukturanalyse:', error);
            FAOUtils.showError('structural-analysis-chart', 'Fehler beim Laden der Strukturanalyse');
        }
    },

    setupControls() {
        const analysisTypeSelect = document.getElementById('struct-analysis-type');
        analysisTypeSelect.addEventListener('change', () => this.performAnalysis());
    },

    async performAnalysis() {
        const analysisType = document.getElementById('struct-analysis-type').value;

        try {
            FAOUtils.showLoading('structural-analysis-chart');
            
            // Load multiple datasets for structural analysis
            const wheatData = await FAOUtils.loadData('data/timeseries/wheat_and_products_production.json');
            const riceData = await FAOUtils.loadData('data/timeseries/rice_and_products_production.json');
            const maizeData = await FAOUtils.loadData('data/timeseries/maize_and_products_production.json');
            
            const combinedData = {
                wheat: wheatData,
                rice: riceData,
                maize: maizeData
            };

            switch (analysisType) {
                case 'correlation':
                    this.performCorrelationAnalysis(combinedData);
                    break;
                case 'network':
                    this.performNetworkAnalysis(combinedData);
                    break;
                case 'clustering':
                    this.performClusteringAnalysis(combinedData);
                    break;
            }
        } catch (error) {
            console.error('Fehler beim Durchführen der Strukturanalyse:', error);
            FAOUtils.showError('structural-analysis-chart', 'Fehler beim Durchführen der Strukturanalyse');
        }
    },

    performCorrelationAnalysis(data) {
        const container = document.getElementById('structural-analysis-chart');
        container.innerHTML = '';

        // Calculate correlations between different crops for major countries
        const countries = ['China', 'United States of America', 'India', 'Russian Federation', 'Brazil'];
        const crops = ['wheat', 'rice', 'maize'];
        const correlationMatrix = this.calculateCorrelationMatrix(data, countries, crops);

        this.visualizeCorrelationMatrix(container, correlationMatrix, countries, crops);
    },

    calculateCorrelationMatrix(data, countries, crops) {
        const matrix = {};
        
        countries.forEach(country => {
            matrix[country] = {};
            
            // Get data for all crops for this country
            const countryData = {};
            crops.forEach(crop => {
                if (data[crop][country]) {
                    countryData[crop] = data[crop][country]
                        .filter(d => d.year >= 2010 && d.year <= 2022)
                        .sort((a, b) => a.year - b.year)
                        .map(d => d.value);
                }
            });

            // Calculate correlations between crops
            for (let i = 0; i < crops.length; i++) {
                matrix[country][crops[i]] = {};
                for (let j = 0; j < crops.length; j++) {
                    if (countryData[crops[i]] && countryData[crops[j]]) {
                        matrix[country][crops[i]][crops[j]] = this.calculateCorrelation(
                            countryData[crops[i]], 
                            countryData[crops[j]]
                        );
                    } else {
                        matrix[country][crops[i]][crops[j]] = 0;
                    }
                }
            }
        });

        return matrix;
    },

    calculateCorrelation(x, y) {
        if (x.length !== y.length || x.length === 0) return 0;

        const n = x.length;
        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
        const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
        const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

        const numerator = n * sumXY - sumX * sumY;
        const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

        return denominator === 0 ? 0 : numerator / denominator;
    },

    visualizeCorrelationMatrix(container, matrix, countries, crops) {
        const margin = { top: 50, right: 50, bottom: 100, left: 100 };
        const cellSize = 60;
        const width = crops.length * cellSize;
        const height = crops.length * cellSize;

        const grid = d3.select(container).append('div')
            .attr('class', 'correlation-grid');

        countries.forEach((country, countryIndex) => {
            const chartWrapper = grid.append('div')
                .attr('class', 'correlation-chart-wrapper');

            chartWrapper.append('h3').text(country);

            const svg = chartWrapper.append('svg')
                .attr('width', width + margin.left + margin.right)
                .attr('height', height + margin.top + margin.bottom);

            const g = svg.append('g')
                .attr('transform', `translate(${margin.left},${margin.top})`);

            // Color scale for correlations
            const colorScale = d3.scaleSequential(d3.interpolateRdBu)
                .domain([-1, 1]);

            // Create cells
            crops.forEach((crop1, i) => {
                crops.forEach((crop2, j) => {
                    const correlation = matrix[country][crop1][crop2];
                    
                    g.append('rect')
                        .attr('x', j * cellSize)
                        .attr('y', i * cellSize)
                        .attr('width', cellSize)
                        .attr('height', cellSize)
                        .attr('fill', colorScale(correlation))
                        .attr('stroke', '#fff')
                        .attr('stroke-width', 1);

                    g.append('text')
                        .attr('x', j * cellSize + cellSize / 2)
                        .attr('y', i * cellSize + cellSize / 2)
                        .attr('text-anchor', 'middle')
                        .attr('dy', '0.35em')
                        .style('fill', Math.abs(correlation) > 0.5 ? 'white' : 'black')
                        .style('font-size', '12px')
                        .text(correlation.toFixed(2));
                });
            });

            // Add labels
            g.selectAll('.row-label')
                .data(crops)
                .enter().append('text')
                .attr('class', 'row-label')
                .attr('x', -10)
                .attr('y', (d, i) => i * cellSize + cellSize / 2)
                .attr('text-anchor', 'end')
                .attr('dy', '0.35em')
                .text(d => d.charAt(0).toUpperCase() + d.slice(1));

            g.selectAll('.col-label')
                .data(crops)
                .enter().append('text')
                .attr('class', 'col-label')
                .attr('x', (d, i) => i * cellSize + cellSize / 2)
                .attr('y', -10)
                .attr('text-anchor', 'middle')
                .text(d => d.charAt(0).toUpperCase() + d.slice(1));

            // Add color legend
            const legendWidth = 200;
            const legendHeight = 20;
            
            const legend = svg.append('g')
                .attr('transform', `translate(${margin.left}, ${height + margin.top + 20})`);

            const legendScale = d3.scaleLinear()
                .domain([-1, 1])
                .range([0, legendWidth]);

            const legendAxis = d3.axisBottom(legendScale)
                .ticks(5)
                .tickFormat(d3.format('.1f'));

            // Create gradient
            const gradient = svg.append('defs')
                .append('linearGradient')
                .attr('id', `correlation-gradient-${countryIndex}`)
                .attr('x1', '0%')
                .attr('x2', '100%');

            gradient.selectAll('stop')
                .data(d3.range(-1, 1.1, 0.1))
                .enter().append('stop')
                .attr('offset', d => ((d + 1) / 2) * 100 + '%')
                .attr('stop-color', d => colorScale(d));

            legend.append('rect')
                .attr('width', legendWidth)
                .attr('height', legendHeight)
                .style('fill', `url(#correlation-gradient-${countryIndex})`);

            legend.append('g')
                .attr('transform', `translate(0, ${legendHeight})`)
                .call(legendAxis);

            legend.append('text')
                .attr('x', legendWidth / 2)
                .attr('y', -5)
                .attr('text-anchor', 'middle')
                .style('font-size', '12px')
                .text('Korrelation');
        });
    },

    performNetworkAnalysis(data) {
        const container = document.getElementById('structural-analysis-chart');
        container.innerHTML = '';

        // Create network showing trade relationships and dependencies
        const countries = ['China', 'United States of America', 'India', 'Russian Federation', 'Brazil', 'France', 'Germany'];
        const networkData = this.createNetworkData(data, countries);

        this.visualizeNetwork(container, networkData);
    },

    createNetworkData(data, countries) {
        const nodes = countries.map(country => ({
            id: country,
            name: country,
            production: this.getTotalProduction(data, country),
            group: this.getRegionGroup(country)
        }));

        const links = [];
        
        // Create links based on production similarities and geographic proximity
        for (let i = 0; i < countries.length; i++) {
            for (let j = i + 1; j < countries.length; j++) {
                const similarity = this.calculateProductionSimilarity(data, countries[i], countries[j]);
                const geographic = this.getGeographicProximity(countries[i], countries[j]);
                
                if (similarity > 0.3 || geographic > 0.5) {
                    links.push({
                        source: countries[i],
                        target: countries[j],
                        strength: similarity,
                        type: geographic > 0.5 ? 'geographic' : 'economic'
                    });
                }
            }
        }

        return { nodes, links };
    },

    getTotalProduction(data, country) {
        let total = 0;
        Object.keys(data).forEach(crop => {
            if (data[crop][country]) {
                const recent = data[crop][country].filter(d => d.year >= 2020);
                if (recent.length > 0) {
                    total += recent.reduce((sum, d) => sum + d.value, 0) / recent.length;
                }
            }
        });
        return total;
    },

    getRegionGroup(country) {
        const regions = {
            'China': 'Asia',
            'India': 'Asia',
            'United States of America': 'North America',
            'Russian Federation': 'Europe/Asia',
            'Brazil': 'South America',
            'France': 'Europe',
            'Germany': 'Europe'
        };
        return regions[country] || 'Other';
    },

    calculateProductionSimilarity(data, country1, country2) {
        const crops = ['wheat', 'rice', 'maize'];
        let similarities = [];

        crops.forEach(crop => {
            if (data[crop][country1] && data[crop][country2]) {
                const data1 = data[crop][country1].map(d => d.value);
                const data2 = data[crop][country2].map(d => d.value);
                similarities.push(Math.abs(this.calculateCorrelation(data1, data2)));
            }
        });

        return similarities.length > 0 ? similarities.reduce((a, b) => a + b, 0) / similarities.length : 0;
    },

    getGeographicProximity(country1, country2) {
        // Simplified geographic proximity based on regions
        const regions = {
            'China': ['Asia'],
            'India': ['Asia'],
            'United States of America': ['North America'],
            'Russian Federation': ['Europe', 'Asia'],
            'Brazil': ['South America'],
            'France': ['Europe'],
            'Germany': ['Europe']
        };

        const regions1 = regions[country1] || [];
        const regions2 = regions[country2] || [];

        return regions1.some(r => regions2.includes(r)) ? 0.8 : 0.2;
    },

    visualizeNetwork(container, networkData) {
        const width = container.clientWidth;
        const height = 500;

        const svg = d3.select(container)
            .append('svg')
            .attr('width', width)
            .attr('height', height);

        const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

        // Create force simulation
        const simulation = d3.forceSimulation(networkData.nodes)
            .force('link', d3.forceLink(networkData.links).id(d => d.id).distance(100))
            .force('charge', d3.forceManyBody().strength(-300))
            .force('center', d3.forceCenter(width / 2, height / 2));

        // Add links
        const link = svg.append('g')
            .selectAll('line')
            .data(networkData.links)
            .enter().append('line')
            .attr('stroke', d => d.type === 'geographic' ? '#e74c3c' : '#3498db')
            .attr('stroke-width', d => Math.sqrt(d.strength * 5))
            .attr('stroke-opacity', 0.6);

        // Add nodes
        const node = svg.append('g')
            .selectAll('circle')
            .data(networkData.nodes)
            .enter().append('circle')
            .attr('r', d => Math.sqrt(d.production / 1000000) + 5)
            .attr('fill', d => colorScale(d.group))
            .attr('stroke', '#fff')
            .attr('stroke-width', 2)
            .call(d3.drag()
                .on('start', dragstarted)
                .on('drag', dragged)
                .on('end', dragended));

        // Add labels
        const label = svg.append('g')
            .selectAll('text')
            .data(networkData.nodes)
            .enter().append('text')
            .text(d => d.name)
            .style('font-size', '10px')
            .attr('text-anchor', 'middle')
            .attr('dy', -15);

        // Update positions
        simulation.on('tick', () => {
            link
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);

            node
                .attr('cx', d => d.x)
                .attr('cy', d => d.y);

            label
                .attr('x', d => d.x)
                .attr('y', d => d.y);
        });

        function dragstarted(event, d) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }

        function dragged(event, d) {
            d.fx = event.x;
            d.fy = event.y;
        }

        function dragended(event, d) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }

        // Add legend
        const legend = svg.append('g')
            .attr('transform', 'translate(20, 20)');

        legend.append('text')
            .text('Netzwerk-Analyse: Produktionsbeziehungen')
            .style('font-size', '14px')
            .style('font-weight', 'bold');

        legend.append('text')
            .attr('y', 20)
            .text('Knotengröße: Gesamtproduktion')
            .style('font-size', '12px');

        legend.append('line')
            .attr('x1', 0)
            .attr('x2', 20)
            .attr('y1', 35)
            .attr('y2', 35)
            .attr('stroke', '#3498db')
            .attr('stroke-width', 2);

        legend.append('text')
            .attr('x', 25)
            .attr('y', 39)
            .text('Wirtschaftliche Ähnlichkeit')
            .style('font-size', '12px');

        legend.append('line')
            .attr('x1', 0)
            .attr('x2', 20)
            .attr('y1', 50)
            .attr('y2', 50)
            .attr('stroke', '#e74c3c')
            .attr('stroke-width', 2);

        legend.append('text')
            .attr('x', 25)
            .attr('y', 54)
            .text('Geografische Nähe')
            .style('font-size', '12px');
    },

    performClusteringAnalysis(data) {
        const container = document.getElementById('structural-analysis-chart');
        container.innerHTML = '';

        // Perform k-means clustering on countries based on production patterns
        const countries = Object.keys(data.wheat).filter(country => 
            data.wheat[country] && data.rice[country] && data.maize[country]
        ).slice(0, 50); // Use more countries for a better chart

        const clusterData = this.prepareClusteringData(data, countries);
        
        // Ensure we have enough data to cluster
        if (clusterData.length < 4) {
            FAOUtils.showError('structural-analysis-chart', 'Nicht genügend Daten für die Clustering-Analyse verfügbar.');
            return;
        }

        const clusters = this.performKMeansClustering(clusterData, 4);

        this.visualizeClusters(container, clusters, countries, clusterData);
    },

    prepareClusteringData(data, countries) {
        const features = [];
        
        countries.forEach(country => {
            const countryFeatures = [];
            
            ['wheat', 'rice', 'maize'].forEach(crop => {
                const cropData = data[crop][country];
                if (cropData) {
                    const recentData = cropData.filter(d => d.year >= 2018);
                    if (recentData.length > 0) {
                        const avgProduction = recentData.reduce((sum, d) => sum + d.value, 0) / recentData.length;
                        countryFeatures.push(avgProduction);
                    } else {
                        countryFeatures.push(0);
                    }
                } else {
                    countryFeatures.push(0);
                }
            });
            
            features.push(countryFeatures);
        });

        return features;
    },

    performKMeansClustering(data, k) {
        // Simple k-means implementation
        const n = data.length;
        const d = data[0].length;
        
        // Initialize centroids randomly
        let centroids = [];
        for (let i = 0; i < k; i++) {
            centroids.push(data[Math.floor(Math.random() * n)].slice());
        }

        let assignments = new Array(n);
        let changed = true;
        let iterations = 0;

        while (changed && iterations < 100) {
            changed = false;
            
            // Assign points to nearest centroid
            for (let i = 0; i < n; i++) {
                let minDist = Infinity;
                let newAssignment = 0;
                
                for (let j = 0; j < k; j++) {
                    const dist = this.euclideanDistance(data[i], centroids[j]);
                    if (dist < minDist) {
                        minDist = dist;
                        newAssignment = j;
                    }
                }
                
                if (assignments[i] !== newAssignment) {
                    changed = true;
                    assignments[i] = newAssignment;
                }
            }

            // Update centroids
            for (let j = 0; j < k; j++) {
                const clusterPoints = data.filter((_, i) => assignments[i] === j);
                if (clusterPoints.length > 0) {
                    for (let dim = 0; dim < d; dim++) {
                        centroids[j][dim] = clusterPoints.reduce((sum, point) => sum + point[dim], 0) / clusterPoints.length;
                    }
                }
            }
            
            iterations++;
        }

        return { assignments, centroids };
    },

    euclideanDistance(a, b) {
        return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0));
    },

    visualizeClusters(container, clusters, countries, clusterData) {
        const margin = { top: 60, right: 150, bottom: 80, left: 100 };
        const width = Math.max(container.clientWidth, 600) - margin.left - margin.right;
        const height = 500 - margin.top - margin.bottom;

        const svg = d3.select(container)
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom);

        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Create scatter plot (wheat vs rice production)
        const data = countries.map((country, i) => ({
            country: country,
            cluster: clusters.assignments[i],
            wheat: clusterData[i][0], // Use actual country data
            rice: clusterData[i][1],  // Use actual country data
            maize: clusterData[i][2]  // Use actual country data
        })).filter(d => !isNaN(d.wheat) && !isNaN(d.rice) && !isNaN(d.maize)); // Filter out any remaining NaNs

        if (data.length === 0) {
            FAOUtils.showError('structural-analysis-chart', 'Keine gültigen Daten für die Visualisierung des Clusters vorhanden.');
            return;
        }
        
        const xExtent = d3.extent(data, d => d.wheat);
        const yExtent = d3.extent(data, d => d.rice);

        const xScale = d3.scaleLinear()
            .domain([0, xExtent[1]])
            .range([0, width]).nice();

        const yScale = d3.scaleLinear()
            .domain([0, yExtent[1]])
            .range([height, 0]).nice();

        const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

        // Add axes
        g.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(xScale).tickFormat(d => FAOUtils.formatNumber(d, 'tonnes')));

        g.append('g')
            .call(d3.axisLeft(yScale).tickFormat(d => FAOUtils.formatNumber(d, 'tonnes')));

        // Add axis labels
        g.append('text')
            .attr('transform', `translate(${width / 2}, ${height + margin.bottom - 30})`)
            .style('text-anchor', 'middle')
            .text('Weizenproduktion (Durchschnitt 2018-2022)');

        g.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', 0 - margin.left + 25)
            .attr('x', 0 - (height / 2))
            .style('text-anchor', 'middle')
            .text('Reisproduktion (Durchschnitt 2018-2022)');

        // Add points
        g.selectAll('.cluster-point')
            .data(data)
            .enter().append('circle')
            .attr('class', 'cluster-point')
            .attr('cx', d => xScale(d.wheat))
            .attr('cy', d => yScale(d.rice))
            .attr('r', d => Math.sqrt(d.maize / 5000000) + 4) // Adjust scaling for maize
            .attr('fill', d => colorScale(d.cluster))
            .attr('stroke', '#fff')
            .attr('stroke-width', 1.5)
            .attr('opacity', 0.8);

        // Add country labels for major producers
        const majorProducers = data.filter(d => d.wheat > (xExtent[1] * 0.1) || d.rice > (yExtent[1] * 0.1));
        
        g.selectAll('.country-label')
            .data(majorProducers)
            .enter().append('text')
            .attr('class', 'country-label')
            .attr('x', d => xScale(d.wheat))
            .attr('y', d => yScale(d.rice) - 10)
            .attr('text-anchor', 'middle')
            .style('font-size', '10px')
            .text(d => d.country);

        // Add cluster legend
        const legend = svg.append('g')
            .attr('transform', `translate(${width + margin.left + 20}, ${margin.top})`);

        legend.append('text')
            .attr('y', -10)
            .text('Cluster')
            .style('font-size', '12px')
            .style('font-weight', 'bold');

        const clusterNames = ['Hohe Produktion', 'Mittlere Produktion', 'Spezialisiert', 'Niedrige Produktion'];
        
        for (let i = 0; i < 4; i++) {
            const item = legend.append('g')
                .attr('transform', `translate(0, ${i * 20})`);

            item.append('circle')
                .attr('r', 6)
                .attr('fill', colorScale(i));

            item.append('text')
                .attr('x', 15)
                .attr('y', 4)
                .style('font-size', '10px')
                .text(clusterNames[i] || `Cluster ${i + 1}`);
        }

        // Add title
        svg.append('text')
            .attr('x', (width + margin.left + margin.right) / 2)
            .attr('y', margin.top / 2)
            .attr('text-anchor', 'middle')
            .style('font-size', '16px')
            .style('font-weight', 'bold')
            .text('Clustering-Analyse: Länder nach Produktionsmustern');
    }
};

