// Machine Learning Predictions module
window.MLPredictions = {
    initialized: false,

    async init() {
        if (this.initialized) return;
        
        try {
            this.setupControls();
            FAOExport.attachExport('export-btn-ml','export-format-ml','ml-chart');
            await this.loadPredictions();
            this.initialized = true;
        } catch (error) {
            FAOUtils.showError('ml-chart', 'Fehler beim Laden der ML-Prognosen');
        }
    },

    setupControls() {
        const productSelect = document.getElementById('ml-product-select');
        productSelect.addEventListener('change', () => this.loadPredictions());
    },

    async loadPredictions() {
        const productSelect = document.getElementById('ml-product-select');
        if (!productSelect || !productSelect.value) {
            return;
        }
        
        const product = productSelect.value;

        try {
            FAOUtils.showLoading('ml-chart');
            
            const dataUrl = `data/ml/${product}_production_forecast.json`;
            const mlData = await FAOUtils.loadData(dataUrl);
            
            if (!mlData) {
                throw new Error('No data received for ML forecast');
            }
            
            this.visualizePredictions(mlData, product);
            this.displayModelInfo(mlData, product);
        } catch (error) {
            FAOUtils.showError('ml-chart', `Fehler beim Laden der ML-Prognosen für ${this.getProductDisplayName(product)}: ${error.message}`);
        }
    },

    visualizePredictions(mlData, product) {
        const container = document.getElementById('ml-chart');
        container.innerHTML = '';

        const margin = { top: 50, right: 100, bottom: 60, left: 90 };
        const containerWidth = container.getBoundingClientRect().width || 800;
        const width = Math.max(300, containerWidth - margin.left - margin.right);
        const height = 400 - margin.top - margin.bottom;

        const svg = d3.select('#ml-chart')
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom);

        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Prepare data from new ML forecast structure
        const allData = [];
        
        // Check if we have the new format (single scenario) or old format (multiple countries)
        if (mlData.scenario || mlData.title) {
            // New format: single scenario with historical_data and forecasts
            
            // Historical data
            mlData.historical_data.forEach(d => {
                allData.push({
                    year: d.year,
                    value: d.value,
                    type: 'historical',
                    model: 'actual'
                });
            });

            // Linear forecasts
            if (mlData.forecasts && mlData.forecasts.linear) {
                mlData.forecasts.linear.forEach(d => {
                    allData.push({
                        year: d.year,
                        value: d.value,
                        confidence_lower: d.confidence_lower,
                        confidence_upper: d.confidence_upper,
                        type: 'forecast',
                        model: 'linear'
                    });
                });
            }

            // Polynomial forecasts
            if (mlData.forecasts && mlData.forecasts.polynomial) {
                mlData.forecasts.polynomial.forEach(d => {
                    allData.push({
                        year: d.year,
                        value: d.value,
                        confidence_lower: d.confidence_lower,
                        confidence_upper: d.confidence_upper,
                        type: 'forecast',
                        model: 'polynomial'
                    });
                });
            }
        } else {
            // Old format: multiple countries (fallback)
            const countries = Object.keys(mlData);
            countries.forEach(country => {
                const countryData = mlData[country];
                
                // Historical data
                if (countryData.historical_data) {
                    countryData.historical_data.forEach(d => {
                        allData.push({
                            country: country,
                            year: d.year,
                            value: d.value,
                            type: 'historical',
                            model: 'actual'
                        });
                    });
                }

                // Predictions (old format)
                if (countryData.predictions) {
                    countryData.predictions.forEach(d => {
                        allData.push({
                            country: country,
                            year: d.year,
                            value: d.predicted_value,
                            confidence: d.confidence,
                            type: 'forecast',
                            model: 'legacy'
                        });
                    });
                }
            });
        }

        // Separate data by type and model
        const historicalData = allData.filter(d => d.type === 'historical');
        const linearForecast = allData.filter(d => d.type === 'forecast' && d.model === 'linear');
        const polynomialForecast = allData.filter(d => d.type === 'forecast' && d.model === 'polynomial');
        
        // Calculate domain including confidence intervals
        const allValues = allData.map(d => d.value);
        const allConfidenceLower = allData.filter(d => d.confidence_lower).map(d => d.confidence_lower);
        const allConfidenceUpper = allData.filter(d => d.confidence_upper).map(d => d.confidence_upper);
        const minValue = d3.min([...allValues, ...allConfidenceLower]);
        const maxValue = d3.max([...allValues, ...allConfidenceUpper]);

        // Scales
        const xScale = d3.scaleLinear()
            .domain(d3.extent(allData, d => d.year))
            .range([0, width]);

        const yScale = d3.scaleLinear()
            .domain([minValue * 0.95, maxValue * 1.05])
            .range([height, 0]);

        // Color scheme for models
        const modelColors = {
            'historical': '#2c3e50',
            'linear': '#e74c3c',
            'polynomial': '#3498db'
        };

        // Line generators
        const line = d3.line()
            .x(d => xScale(d.year))
            .y(d => yScale(d.value))
            .curve(d3.curveMonotoneX);
            
        // Area generator for confidence intervals
        const area = d3.area()
            .x(d => xScale(d.year))
            .y0(d => yScale(d.confidence_lower || d.value))
            .y1(d => yScale(d.confidence_upper || d.value))
            .curve(d3.curveMonotoneX);

        // Add axes
        g.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(xScale).tickFormat(d3.format('d')));

        g.append('g')
            .call(d3.axisLeft(yScale).tickFormat(d => FAOUtils.formatNumber(d, '1000 t')));

        // Add confidence intervals first (so they appear behind lines)
        if (linearForecast.length > 0) {
            g.append('path')
                .datum(linearForecast)
                .attr('class', 'confidence-area linear')
                .attr('d', area)
                .style('fill', modelColors.linear)
                .style('opacity', 0.2);
        }
        
        if (polynomialForecast.length > 0) {
            g.append('path')
                .datum(polynomialForecast)
                .attr('class', 'confidence-area polynomial')
                .attr('d', area)
                .style('fill', modelColors.polynomial)
                .style('opacity', 0.2);
        }

        // Add lines
        // Historical data line
        if (historicalData.length > 0) {
            g.append('path')
                .datum(historicalData)
                .attr('class', 'line historical')
                .attr('d', line)
                .style('stroke', modelColors.historical)
                .style('stroke-width', 3)
                .style('fill', 'none');
        }

        // Linear forecast line
        if (linearForecast.length > 0) {
            g.append('path')
                .datum(linearForecast)
                .attr('class', 'line linear')
                .attr('d', line)
                .style('stroke', modelColors.linear)
                .style('stroke-width', 2)
                .style('stroke-dasharray', '5,5')
                .style('fill', 'none');
        }

        // Polynomial forecast line
        if (polynomialForecast.length > 0) {
            g.append('path')
                .datum(polynomialForecast)
                .attr('class', 'line polynomial')
                .attr('d', line)
                .style('stroke', modelColors.polynomial)
                .style('stroke-width', 2)
                .style('stroke-dasharray', '3,3')
                .style('fill', 'none');
        }

        // Add points for better visibility
        ['historical', 'linear', 'polynomial'].forEach(modelType => {
            const modelData = allData.filter(d => 
                (d.type === 'historical' && modelType === 'historical') ||
                (d.type === 'forecast' && d.model === modelType)
            );
            
            if (modelData.length > 0) {
                g.selectAll(`.point-${modelType}`)
                    .data(modelData)
                    .enter()
                    .append('circle')
                    .attr('class', `point-${modelType}`)
                    .attr('cx', d => xScale(d.year))
                    .attr('cy', d => yScale(d.value))
                    .attr('r', modelType === 'historical' ? 4 : 3)
                    .style('fill', modelColors[modelType === 'historical' ? 'historical' : modelType])
                    .style('stroke', 'white')
                    .style('stroke-width', 1);
            }
        });

        // Add vertical line at 2022 to separate historical from forecast
        g.append('line')
            .attr('x1', xScale(2022))
            .attr('x2', xScale(2022))
            .attr('y1', 0)
            .attr('y2', height)
            .style('stroke', '#95a5a6')
            .style('stroke-width', 1)
            .style('stroke-dasharray', '2,2');

        // Add axis labels
        g.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', 0 - margin.left)
            .attr('x', 0 - (height / 2))
            .attr('dy', '1em')
            .style('text-anchor', 'middle')
            .text('Produktion (1000 t)');

        g.append('text')
            .attr('transform', `translate(${width / 2}, ${height + margin.bottom - 5})`)
            .style('text-anchor', 'middle')
            .text('Jahr');

        // Add title
        const title = mlData.title || `ML-Prognosen für ${this.getProductDisplayName(product)}`;
        svg.append('text')
            .attr('x', (width + margin.left + margin.right) / 2)
            .attr('y', margin.top / 2)
            .attr('text-anchor', 'middle')
            .style('font-size', '16px')
            .style('font-weight', 'bold')
            .text(title);

        // Add legend
        const legend = g.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(${width - 150}, 20)`);

        const legendItems = [
            { label: 'Historische Daten', color: modelColors.historical, dash: null },
            { label: 'Linear Regression', color: modelColors.linear, dash: '5,5' },
            { label: 'Polynomial Regression', color: modelColors.polynomial, dash: '3,3' }
        ];

        legendItems.forEach((item, i) => {
            const legendItem = legend.append('g')
                .attr('transform', `translate(0, ${i * 20})`);

            legendItem.append('line')
                .attr('x1', 0)
                .attr('x2', 20)
                .attr('y1', 5)
                .attr('y2', 5)
                .style('stroke', item.color)
                .style('stroke-width', 2)
                .style('stroke-dasharray', item.dash || 'none');

            legendItem.append('text')
                .attr('x', 25)
                .attr('y', 5)
                .attr('dy', '0.35em')
                .style('font-size', '12px')
                .text(item.label);
        });
    },

    displayModelInfo(mlData, product) {
        const container = document.getElementById('ml-model-info');
        
        if (!container) return;
        
        // New format with model performance info
        if (mlData.model_performance) {
            const linear = mlData.model_performance.linear;
            const polynomial = mlData.model_performance.polynomial;
            
            container.innerHTML = `
                <div class="model-info-section">
                    <h4>Modell-Performance</h4>
                    <div class="model-comparison">
                        <div class="model-stats">
                            <h5>Linear Regression</h5>
                            <p>R² Score: ${linear.r2_score.toFixed(3)}</p>
                            <p>MAE: ${FAOUtils.formatNumber(linear.mae, '1000 t')}</p>
                        </div>
                        <div class="model-stats">
                            <h5>Polynomial Regression</h5>
                            <p>R² Score: ${polynomial.r2_score.toFixed(3)}</p>
                            <p>MAE: ${FAOUtils.formatNumber(polynomial.mae, '1000 t')}</p>
                        </div>
                    </div>
                </div>
                <div class="model-info-section">
                    <h4>Unsicherheitsanalyse</h4>
                    <p><strong>Konfidenzlevel:</strong> ${mlData.uncertainty_info.confidence_level}%</p>
                    <p><strong>Interpretation:</strong> ${mlData.uncertainty_info.interpretation.confidence_bounds}</p>
                    <p><strong>Unsicherheitswachstum:</strong> ${mlData.uncertainty_info.interpretation.uncertainty_growth}</p>
                </div>
            `;
        } else {
            // Fallback for old format
            container.innerHTML = `
                <div class="model-info-section">
                    <h4>Modell-Information</h4>
                    <p>Generische ML-Prognose basierend auf historischen Trends.</p>
                    <p><strong>Zeitraum:</strong> 2023-2035</p>
                    <p><strong>Modelle:</strong> Linear & Polynomial Regression</p>
                </div>
            `;
        }
    },

    getProductDisplayName(product) {
        // Use the ML product mapping if available (preferred for ML panel)
        if (window.mlProductMapping && window.mlProductMapping[product]) {
            return window.mlProductMapping[product];
        }
        
        // Use the global product mapping if available
        if (window.productMapping) {
            const mappedProduct = Object.keys(window.productMapping).find(key => 
                window.productMapping[key] === product || key === product
            );
            if (mappedProduct) {
                return window.productMapping[mappedProduct];
            }
        }
        
        // Fallback: create display name from product key
        return product
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase())
            .replace(' And ', ' & ')
            .replace(' Excluding ', ' - Excluding ');
    }
};

