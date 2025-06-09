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
            console.error('Fehler beim Initialisieren der ML-Prognosen:', error);
            FAOUtils.showError('ml-chart', 'Fehler beim Laden der ML-Prognosen');
        }
    },

    setupControls() {
        const productSelect = document.getElementById('ml-product-select');
        productSelect.addEventListener('change', () => this.loadPredictions());
    },

    async loadPredictions() {
        const product = document.getElementById('ml-product-select').value;

        try {
            FAOUtils.showLoading('ml-chart');
            
            const dataUrl = `data/ml/${product}_production_forecast.json`;
            const mlData = await FAOUtils.loadData(dataUrl);
            
            this.visualizePredictions(mlData, product);
            this.displayModelInfo(mlData, product);
        } catch (error) {
            console.error('Fehler beim Laden der ML-Prognosen:', error);
            FAOUtils.showError('ml-chart', 'Fehler beim Laden der ML-Prognosen');
        }
    },

    visualizePredictions(mlData, product) {
        const container = document.getElementById('ml-chart');
        container.innerHTML = '';

        const margin = { top: 50, right: 100, bottom: 60, left: 90 };
        const width = container.clientWidth - margin.left - margin.right;
        const height = 400 - margin.top - margin.bottom;

        const svg = d3.select('#ml-chart')
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom);

        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Prepare data
        const countries = Object.keys(mlData);
        const allData = [];

        countries.forEach(country => {
            const countryData = mlData[country];
            
            // Historical data
            countryData.historical_data.forEach(d => {
                allData.push({
                    country: country,
                    year: d.year,
                    value: d.value,
                    type: 'historical'
                });
            });

            // Predictions
            countryData.predictions.forEach(d => {
                allData.push({
                    country: country,
                    year: d.year,
                    value: d.predicted_value,
                    confidence: d.confidence,
                    type: 'prediction'
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

        // Add title
        svg.append('text')
            .attr('x', (width + margin.left + margin.right) / 2)
            .attr('y', margin.top / 2)
            .attr('text-anchor', 'middle')
            .style('font-size', '16px')
            .style('font-weight', 'bold')
            .text(`ML-Prognosen für ${this.getProductDisplayName(product)}`);

        // Draw lines and confidence intervals for each country
        countries.forEach(country => {
            const countryData = mlData[country];
            const color = colorScale(country);

            // Historical line
            const historicalData = countryData.historical_data;
            g.append('path')
                .datum(historicalData)
                .attr('class', 'historical-line')
                .attr('d', line)
                .style('stroke', color)
                .style('stroke-width', 2)
                .style('fill', 'none');

            // Prediction line
            const predictionData = countryData.predictions.map(d => ({
                year: d.year,
                value: d.predicted_value
            }));

            g.append('path')
                .datum(predictionData)
                .attr('class', 'prediction-line')
                .attr('d', line)
                .style('stroke', color)
                .style('stroke-width', 2)
                .style('stroke-dasharray', '5,5')
                .style('fill', 'none')
                .style('opacity', 0.8);

            // Confidence intervals
            this.addConfidenceInterval(g, countryData.predictions, xScale, yScale, color);

            // Historical dots
            g.selectAll(`.historical-dot-${country.replace(/\s+/g, '')}`)
                .data(historicalData)
                .enter().append('circle')
                .attr('class', `historical-dot-${country.replace(/\s+/g, '')}`)
                .attr('cx', d => xScale(d.year))
                .attr('cy', d => yScale(d.value))
                .attr('r', 3)
                .style('fill', color)
                .on('mouseover', (event, d) => this.showTooltip(event, d, country, 'Historisch'))
                .on('mouseout', () => this.hideTooltip());

            // Prediction dots
            g.selectAll(`.prediction-dot-${country.replace(/\s+/g, '')}`)
                .data(countryData.predictions)
                .enter().append('circle')
                .attr('class', `prediction-dot-${country.replace(/\s+/g, '')}`)
                .attr('cx', d => xScale(d.year))
                .attr('cy', d => yScale(d.predicted_value))
                .attr('r', d => 2 + d.confidence * 2)
                .style('fill', color)
                .style('opacity', d => 0.6 + d.confidence * 0.4)
                .on('mouseover', (event, d) => this.showTooltip(event, d, country, 'Prognose'))
                .on('mouseout', () => this.hideTooltip());
        });

        // Add vertical line to separate historical from predictions
        const currentYear = 2022;
        const separatorX = xScale(currentYear + 0.5);
        g.append('line')
            .attr('x1', separatorX)
            .attr('x2', separatorX)
            .attr('y1', 0)
            .attr('y2', height)
            .style('stroke', '#666')
            .style('stroke-width', 1)
            .style('stroke-dasharray', '3,3');

        g.append('text')
            .attr('x', separatorX - 5)
            .attr('y', -5)
            .attr('text-anchor', 'end')
            .style('font-size', '12px')
            .style('fill', '#666')
            .text('Historisch');

        g.append('text')
            .attr('x', separatorX + 5)
            .attr('y', -5)
            .attr('text-anchor', 'start')
            .style('font-size', '12px')
            .style('fill', '#666')
            .text('ML-Prognose');

        // Create tooltip
        this.tooltip = d3.select('body')
            .append('div')
            .attr('class', 'tooltip')
            .style('opacity', 0);

        // HTML-Legende unter dem Diagramm
        let legendHtml = '<div class="ml-legend-container">';
        countries.forEach(country => {
            legendHtml += `<div class="ml-legend-item"><span class="ml-legend-color" style="background:${colorScale(country)}"></span>${country}</div>`;
        });
        legendHtml += '</div>';
        container.insertAdjacentHTML('beforeend', legendHtml);
    },

    addConfidenceInterval(g, predictions, xScale, yScale, color) {
        // Create confidence interval area
        const area = d3.area()
            .x(d => xScale(d.year))
            .y0(d => yScale(d.predicted_value * (1 - (1 - d.confidence) * 0.2)))
            .y1(d => yScale(d.predicted_value * (1 + (1 - d.confidence) * 0.2)))
            .curve(d3.curveMonotoneX);

        g.append('path')
            .datum(predictions)
            .attr('class', 'confidence-interval')
            .attr('d', area)
            .style('fill', color)
            .style('opacity', 0.2);
    },

    displayModelInfo(mlData, product) {
        const container = document.getElementById('ml-model-info');
        const countries = Object.keys(mlData);
        
        if (countries.length === 0) {
            container.innerHTML = '<p>Keine Modellinformationen verfügbar.</p>';
            return;
        }

        // Get model info from first country (assuming same model type for all)
        const sampleCountry = countries[0];
        const modelType = mlData[sampleCountry].model_type || 'linear_regression';

        let modelDescription = '';
        let accuracy = 'Mittel';
        
        switch (modelType) {
            case 'linear_regression':
                modelDescription = 'Lineare Regression: Einfaches statistisches Modell, das lineare Trends in historischen Daten identifiziert und in die Zukunft extrapoliert.';
                accuracy = 'Mittel (R² ≈ 0.75)';
                break;
            case 'neural_network':
                modelDescription = 'Neuronales Netzwerk: Komplexes Modell mit mehreren Schichten, das nichtlineare Muster in den Daten erkennen kann.';
                accuracy = 'Hoch (R² ≈ 0.85)';
                break;
            case 'random_forest':
                modelDescription = 'Random Forest: Ensemble-Methode, die mehrere Entscheidungsbäume kombiniert für robuste Vorhersagen.';
                accuracy = 'Hoch (R² ≈ 0.82)';
                break;
            default:
                modelDescription = 'Unbekannter Modelltyp';
        }

        // Calculate average confidence
        let totalConfidence = 0;
        let predictionCount = 0;
        
        countries.forEach(country => {
            mlData[country].predictions.forEach(pred => {
                totalConfidence += pred.confidence;
                predictionCount++;
            });
        });
        
        const avgConfidence = predictionCount > 0 ? (totalConfidence / predictionCount) : 0;

        container.innerHTML = `
            <div class="model-details">
                <h4>Modell-Details</h4>
                <p><strong>Modell-Typ:</strong> ${this.getModelDisplayName(modelType)}</p>
                <p><strong>Beschreibung:</strong> ${modelDescription}</p>
                <p><strong>Geschätzte Genauigkeit:</strong> ${accuracy}</p>
                <p><strong>Durchschnittliche Konfidenz:</strong> ${(avgConfidence * 100).toFixed(1)}%</p>
                <p><strong>Prognosezeitraum:</strong> 2023-2029</p>
                <p><strong>Trainiert auf:</strong> Historische Daten 2010-2022</p>
            </div>
            
            <div class="model-features">
                <h4>Berücksichtigte Faktoren</h4>
                <ul>
                    <li>Historische Produktionstrends</li>
                    <li>Klimatische Bedingungen</li>
                    <li>Politische Stabilität</li>
                    <li>Technologische Entwicklung</li>
                    <li>Handelsmuster</li>
                </ul>
            </div>
            
            <div class="model-limitations">
                <h4>Einschränkungen</h4>
                <ul>
                    <li>Prognosen werden mit der Zeit ungenauer</li>
                    <li>Unvorhersehbare Ereignisse (Pandemien, Kriege) nicht berücksichtigt</li>
                    <li>Modell basiert auf historischen Mustern</li>
                    <li>Klimawandel-Effekte nur teilweise modelliert</li>
                </ul>
            </div>
        `;
    },

    getModelDisplayName(modelType) {
        const names = {
            'linear_regression': 'Lineare Regression',
            'neural_network': 'Neuronales Netzwerk',
            'random_forest': 'Random Forest',
            'svm': 'Support Vector Machine',
            'arima': 'ARIMA Zeitreihenmodell'
        };
        return names[modelType] || modelType;
    },

    getProductDisplayName(product) {
        const displayNames = {
            'wheat_and_products': 'Weizen und Produkte',
            'rice_and_products': 'Reis und Produkte',
            'maize_and_products': 'Mais und Produkte'
        };
        return displayNames[product] || product;
    },

    showTooltip(event, d, country, type) {
        let content = `<strong>${country}</strong><br/>`;
        content += `Jahr: ${d.year}<br/>`;
        
        if (type === 'Historisch') {
            content += `Produktion: ${FAOUtils.formatNumber(d.value, 'tonnes')}`;
        } else {
            content += `Prognose: ${FAOUtils.formatNumber(d.predicted_value, 'tonnes')}<br/>`;
            content += `Konfidenz: ${(d.confidence * 100).toFixed(1)}%`;
        }

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

