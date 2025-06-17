// Utility functions for the FAO application

// Format numbers with appropriate units
function formatNumber(value, unit = '') {
    if (value === null || value === undefined || isNaN(value)) {
        return 'Keine Daten';
    }
    
    const num = parseFloat(value);
    
    if (num >= 1000000000) {
        return (num / 1000000000).toFixed(1) + 'B ' + unit;
    } else if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M ' + unit;
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K ' + unit;
    } else {
        return num.toFixed(1) + ' ' + unit;
    }
}

// Globale Farbpalette (angepasst an CI)
const COLOR_RANGE = ['#e8f5e9', '#c8e6c9', '#a5d6a7', '#7cb342', '#66bb6a', '#43a047', '#1b5e20'];

// Create color scale for choropleth maps
function createColorScale(data, colorScheme = 'Blues') {
    const values = data.filter(d => d !== null && !isNaN(d));
    if (values.length === 0) return d3.scaleOrdinal(['#ccc']);
    
    // Falls ein Array übergeben wurde, direkt als Range verwenden
    if (Array.isArray(colorScheme)) {
        return d3.scaleQuantile()
            .domain(values)
            .range(colorScheme);
    }
    
    // Vordefinierte Strings behandeln
    if (colorScheme === 'Custom') {
        return d3.scaleQuantile()
            .domain(values)
            .range(COLOR_RANGE);
    }

    // Fallback auf SchemeBlues (Standardverhalten)
    const extent = d3.extent(values);
    const quantiles = d3.scaleQuantile()
        .domain(values)
        .range(d3[`scheme${colorScheme}`] ? d3[`scheme${colorScheme}`][9] : d3.schemeBlues[9]);
    
    return quantiles;
}

// Show loading indicator
function showLoading(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = '<div class="loading">Lade Daten...</div>';
    }
}

// Show error message
function showError(containerId, message) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `<div class="error">Fehler: ${message}</div>`;
    }
}

// Load JSON data with error handling (direct loading)
async function loadDataDirect(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Fehler beim Laden von ${url}:`, error);
        throw error;
    }
}

// Debounce function for performance
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Get country name from various formats
function normalizeCountryName(countryName) {
    const mapping = {
        'United States of America': 'USA',
        'Russian Federation': 'Russia',
        'United Kingdom': 'UK',
        'China, mainland': 'China',
        'Iran (Islamic Republic of)': 'Iran',
        'Venezuela (Bolivarian Republic of)': 'Venezuela',
        'Bolivia (Plurinational State of)': 'Bolivia',
        'Tanzania (United Republic of)': 'Tanzania'
    };
    
    return mapping[countryName] || countryName;
}

// Create tooltip
function createTooltip() {
    return d3.select('body')
        .append('div')
        .attr('class', 'tooltip')
        .style('opacity', 0);
}

// Show tooltip
function showTooltip(tooltip, content, event) {
    tooltip.transition()
        .duration(200)
        .style('opacity', .9);
    tooltip.html(content)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 28) + 'px');
}

// Hide tooltip
function hideTooltip(tooltip) {
    tooltip.transition()
        .duration(500)
        .style('opacity', 0);
}

// Create legend for choropleth map
function createLegend(colorScale, containerId, title = 'Legende') {
    const container = d3.select(`#${containerId}`);
    container.selectAll('*').remove();
    
    const legend = container.append('div')
        .attr('class', 'legend');
    
    legend.append('h4')
        .text(title)
        .style('margin-bottom', '10px');
    
    const domain = colorScale.quantiles();
    const range = colorScale.range();
    
    for (let i = 0; i < range.length; i++) {
        const item = legend.append('div')
            .attr('class', 'legend-item');
        
        item.append('div')
            .attr('class', 'legend-color')
            .style('background-color', range[i]);
        
        const min = i === 0 ? 0 : domain[i - 1];
        const max = domain[i] || 'max';
        
        item.append('span')
            .text(`${formatNumber(min)} - ${formatNumber(max)}`);
    }
}

// Political events data
const politicalEvents = {
    2010: [
        {
            title: 'Russische Hitzewelle',
            description: 'Extreme Hitzewelle in Russland führt zu Ernteausfällen bei Weizen',
            impact: 'Weizenproduktion um 25% gesunken'
        }
    ],
    2011: [
        {
            title: 'Arabischer Frühling',
            description: 'Politische Unruhen in Nordafrika und Nahost beeinflussen Nahrungsmittelpreise',
            impact: 'Erhöhte Nahrungsmittelpreise weltweit'
        }
    ],
    2014: [
        {
            title: 'Ukraine-Konflikt beginnt',
            description: 'Konflikt in der Ukraine beeinträchtigt Getreideexporte',
            impact: 'Reduzierte Weizenexporte aus der Ukraine'
        }
    ],
    2020: [
        {
            title: 'COVID-19 Pandemie',
            description: 'Globale Pandemie stört Lieferketten und Nahrungsmittelproduktion',
            impact: 'Unterbrechungen in globalen Lieferketten'
        }
    ],
    2022: [
        {
            title: 'Russland-Ukraine Krieg',
            description: 'Krieg zwischen Russland und Ukraine beeinträchtigt globale Getreideversorgung',
            impact: 'Massive Störungen der Getreideexporte'
        }
    ]
};

// Get political events for a specific year
function getPoliticalEvents(year) {
    return politicalEvents[year] || [];
}

// Climate events data
const climateEvents = {
    2012: 'Dürre in den USA beeinträchtigt Maisproduktion',
    2015: 'El Niño-Phänomen beeinflusst globale Wettermuster',
    2018: 'Extreme Wetterereignisse in Europa',
    2019: 'Dürre in Australien reduziert Weizenproduktion',
    2021: 'Überschwemmungen in Deutschland beeinträchtigen Landwirtschaft'
};

// Get climate events for a specific year
function getClimateEvents(year) {
    return climateEvents[year] || null;
}

// Enhanced data loading functions for new FAO data structure
let cachedTimeseriesData = null;

// Load and cache timeseries data
async function loadTimeseriesData() {
    if (!cachedTimeseriesData) {
        cachedTimeseriesData = await loadDataDirect('fao_data/timeseries.json');
    }
    return cachedTimeseriesData;
}

// Extract specific product timeseries data
async function loadProductTimeseries(product, metric = 'production') {
    const timeseriesData = await loadTimeseriesData();
    
    // Use dynamic product mapping if available, otherwise fallback to static mapping
    let actualProductName;
    if (window.productMapping && window.productMapping[product]) {
        actualProductName = window.productMapping[product];
    } else {
        // Fallback static mapping for backward compatibility
        const staticMapping = {
            'wheat_and_products': 'Wheat and products',
            'rice_and_products': 'Rice and products', 
            'maize_and_products': 'Maize and products',
            'cassava_and_products': 'Cassava and products',
            'potatoes_and_products': 'Potatoes and products',
            'pulses': 'Pulses',
            'sugar_and_sweeteners': 'Sugar & Sweeteners',
            'vegetables': 'Vegetables',
            'fruits_excluding_wine': 'Fruits - Excluding Wine',
            'milk_excluding_butter': 'Milk - Excluding Butter',
            'nuts_and_products': 'Nuts and products'
        };
        actualProductName = staticMapping[product] || product;
    }
    
    // Filter data for the specific product
    const productData = timeseriesData.filter(d => d.item === actualProductName);
    
    if (productData.length === 0) {
        console.warn(`No data found for product: ${actualProductName} (searched for: ${product})`);
        console.log('Available products:', timeseriesData.map(d => d.item).slice(0, 10));
        return {};
    }
    
    console.log(`Found ${productData.length} countries for product: ${actualProductName}, metric: ${metric}`);
    
    // Quick sample of first country's data structure
    if (productData.length > 0) {
        const sampleCountry = productData[0];
        const sampleYear = sampleCountry.data[0];
        console.log(`Sample data structure from ${sampleCountry.country}:`, Object.keys(sampleYear));
    }
    
    // Transform to old format structure: {country: [{year, value, unit}]}
    const result = {};
    
    productData.forEach(countryData => {
        const countryName = countryData.country;
        result[countryName] = [];
        
        countryData.data.forEach(yearData => {
            // Map metric names to actual data fields
            const metricMapping = {
                'production': 'production',
                'imports': 'imports',
                'exports': 'exports', 
                'domestic_supply': 'domestic_supply',
                // Legacy mappings for backward compatibility
                'food_supply_quantity_kg_capita_yr': 'domestic_supply',
                'food_supply_kcal_capita_day': 'domestic_supply'
            };
            
            const actualMetric = metricMapping[metric] || metric;
            const value = yearData[actualMetric];
            
            // Debug: Log what we're looking for (only for first few items)
            if (countryName === 'Germany' && yearData.year === 2010 && metric === 'domestic_supply') {
                console.log(`Debug for Germany 2010: metric=${metric}, actualMetric=${actualMetric}, value=${value}`);
                console.log('Available keys in yearData:', Object.keys(yearData));
            }
            
            // Only include data points that have values
            if (value !== null && value !== undefined) {
                result[countryName].push({
                    year: yearData.year,
                    value: parseFloat(value) || 0,
                    unit: countryData.unit || '1000 t'
                });
            }
        });
        
        // Remove countries with no data
        if (result[countryName].length === 0) {
            delete result[countryName];
        }
    });
    
    console.log(`Returning data for ${Object.keys(result).length} countries with metric: ${metric}`);
    return result;
}

// Generate ML forecast from historical data
async function generateMLForecast(product) {
    try {
        // Get historical timeseries data
        const timeseriesData = await loadProductTimeseries(product, 'production');
        
        // Calculate global totals by year
        const yearlyTotals = {};
        Object.keys(timeseriesData).forEach(country => {
            if (country === 'World') return; // Skip world totals to avoid double counting
            
            timeseriesData[country].forEach(yearData => {
                const year = yearData.year;
                if (!yearlyTotals[year]) {
                    yearlyTotals[year] = 0;
                }
                yearlyTotals[year] += yearData.value || 0;
            });
        });
        
        // Convert to sorted array
        const historicalData = Object.keys(yearlyTotals)
            .map(year => ({
                year: parseInt(year),
                actual: yearlyTotals[year]
            }))
            .sort((a, b) => a.year - b.year);
        
        // Simple linear trend prediction for next 3 years
        const forecast = [];
        if (historicalData.length >= 2) {
            const lastYear = historicalData[historicalData.length - 1].year;
            const lastValue = historicalData[historicalData.length - 1].actual;
            const prevValue = historicalData[historicalData.length - 2].actual;
            const trend = lastValue - prevValue;
            
            for (let i = 1; i <= 3; i++) {
                forecast.push({
                    year: lastYear + i,
                    predicted: Math.max(0, lastValue + (trend * i)),
                    confidence_interval: {
                        lower: Math.max(0, lastValue + (trend * i * 0.9)),
                        upper: lastValue + (trend * i * 1.1)
                    }
                });
            }
        }
        
        return {
            product: product,
            model_info: {
                type: "Linear Trend",
                accuracy: "Estimated based on recent trend",
                last_updated: new Date().toISOString()
            },
            historical_data: historicalData,
            forecast: forecast
        };
        
    } catch (error) {
        console.error('Error generating ML forecast:', error);
        return {
            product: product,
            model_info: {
                type: "Simple Forecast",
                accuracy: "Basic trend estimation",
                last_updated: new Date().toISOString()
            },
            historical_data: [],
            forecast: []
        };
    }
}

// Load specific file with fallback to new data structure
async function loadDataWithFallback(url) {
    // Check if it's an old data path that needs to be redirected
    if (url.startsWith('data/')) {
        if (url === 'data/metadata.json') {
            return await loadDataDirect('fao_data/metadata.json');
        }
        if (url === 'data/geo/geo.json') {
            return await loadDataDirect('fao_data/geo/geo.json');
        }
        if (url.startsWith('data/timeseries/')) {
            // Parse the URL to extract product and metric
            // Handle URLs like: data/timeseries/wheat_and_products_production.json
            const fileName = url.replace('data/timeseries/', '').replace('.json', '');
            console.log(`Parsing timeseries URL: ${url} -> fileName: ${fileName}`);
            
            // Known metrics to properly split URLs with underscores
            const knownMetrics = ['production', 'imports', 'exports', 'domestic_supply', 
                                'food_supply_quantity_kg_capita_yr', 'food_supply_kcal_capita_day'];
            
            let product, metric;
            
            // Try to match against known metrics
            for (const knownMetric of knownMetrics) {
                if (fileName.endsWith('_' + knownMetric)) {
                    product = fileName.substring(0, fileName.length - knownMetric.length - 1);
                    metric = knownMetric;
                    break;
                }
            }
            
            if (product && metric) {
                console.log(`Loading timeseries for product: ${product}, metric: ${metric}`);
                return await loadProductTimeseries(product, metric);
            } else {
                console.warn(`Could not parse product and metric from fileName: ${fileName}`);
                console.warn(`Known metrics: ${knownMetrics.join(', ')}`);
            }
        }
        if (url.startsWith('data/ml/')) {
            // For ML predictions, use real ML forecast data
            const productMatch = url.match(/data\/ml\/(.+)_production_forecast\.json/);
            if (productMatch) {
                const product = productMatch[1];
                console.log(`Looking for ML forecast for product: ${product}`);
                
                // Load ML index to find available forecasts
                try {
                    const index = await loadDataDirect('fao_data/ml/index.json');
                    const availableFiles = index.all_files || [];
                    
                    // Convert product key to match filename patterns
                    let productForFilename = product
                        .replace(/_excluding_/g, '___') // Handle excluding patterns
                        .replace(/_and_/g, '_&_'); // Handle ampersands
                    
                    // Try different forecast types in order of preference
                    const prefixes = ['global', 'world', 'asia', 'europe', 'americas', 'africa', 'oceania'];
                    
                    for (const prefix of prefixes) {
                        const targetFilename = `${prefix}_${productForFilename}_forecast.json`;
                        
                        if (availableFiles.includes(targetFilename)) {
                            const forecastUrl = `fao_data/ml/${targetFilename}`;
                            console.log(`Found ML forecast: ${targetFilename}`);
                            try {
                                const data = await loadDataDirect(forecastUrl);
                                console.log(`Successfully loaded ${prefix} ML forecast for ${product}`);
                                return data;
                            } catch (loadError) {
                                console.warn(`Failed to load ${targetFilename}:`, loadError);
                                continue;
                            }
                        }
                    }
                    
                    // If exact match not found, try fuzzy matching
                    const fuzzyMatches = availableFiles.filter(filename => 
                        filename.includes(productForFilename) || 
                        productForFilename.split('_').some(part => part.length > 3 && filename.includes(part))
                    );
                    
                    if (fuzzyMatches.length > 0) {
                        const bestMatch = fuzzyMatches[0];
                        console.log(`Using fuzzy match: ${bestMatch} for ${product}`);
                        try {
                            const data = await loadDataDirect(`fao_data/ml/${bestMatch}`);
                            console.log(`Successfully loaded fuzzy match ML forecast for ${product}`);
                            return data;
                        } catch (loadError) {
                            console.warn(`Failed to load fuzzy match ${bestMatch}:`, loadError);
                        }
                    }
                    
                    // Last resort: generate synthetic data
                    console.warn(`No ML forecast found for ${product}, generating synthetic data`);
                    return await generateMLForecast(product);
                    
                } catch (indexError) {
                    console.error('Failed to load ML index:', indexError);
                    return await generateMLForecast(product);
                }
            }
        }
    }
    
    // Default loading
    return await loadDataDirect(url);
}

// Populate metric select dropdown with available metrics
async function populateMetricSelect(selectId) {
    try {
        const metadata = await loadDataDirect('fao_data/metadata.json');
        const elements = metadata.data_summary.elements;
        
        const selectElement = document.getElementById(selectId);
        if (!selectElement) return;
        
        // Clear existing options
        selectElement.innerHTML = '';
        
        // Create metric mapping based on what's actually available in timeseries data
        const metricMapping = {
            'Production': { key: 'production', label: 'Produktion (1000 t)' },
            'Import quantity': { key: 'imports', label: 'Importe (1000 t)' },
            'Export quantity': { key: 'exports', label: 'Exporte (1000 t)' },
            'Domestic supply quantity': { key: 'domestic_supply', label: 'Inländische Versorgung (1000 t)' }
        };
        
        elements.forEach(element => {
            if (metricMapping[element]) {
                const option = document.createElement('option');
                option.value = metricMapping[element].key;
                option.textContent = metricMapping[element].label;
                selectElement.appendChild(option);
                console.log(`Added metric option: ${element} -> ${metricMapping[element].key}`);
            } else {
                console.warn(`No mapping found for element: ${element}`);
            }
        });
        
        // Set default to production
        selectElement.value = 'production';
        
        console.log(`Populated ${selectId} with ${elements.length} metrics`);
        
    } catch (error) {
        console.error('Error populating metric select:', error);
        // Fallback to basic options
        const selectElement = document.getElementById(selectId);
        if (selectElement) {
            selectElement.innerHTML = `
                <option value="production">Produktion (1000 t)</option>
                <option value="imports">Importe (1000 t)</option>
                <option value="exports">Exporte (1000 t)</option>
                <option value="domestic_supply">Inländische Versorgung (1000 t)</option>
            `;
        }
    }
}

// Populate ML product select dropdown with only products that have ML forecasts
async function populateMLProductSelect(selectId) {
    try {
        const index = await loadDataDirect('fao_data/ml/index.json');
        const availableFiles = index.all_files || [];
        
        const selectElement = document.getElementById(selectId);
        if (!selectElement) return;
        
        // Clear existing options
        selectElement.innerHTML = '';
        
        // Extract unique products from ML forecast filenames
        const products = new Set();
        const productMapping = {};
        
        availableFiles.forEach(filename => {
            // Parse filenames like "global_wheat_and_products_forecast.json"
            const match = filename.match(/^(global|world|asia|europe|americas|africa|oceania|.*?)_(.+)_forecast\.json$/);
            if (match) {
                const [, region, productPart] = match;
                
                // Convert filename format to product key
                let productKey = productPart
                    .replace(/___/g, '_excluding_') // Handle triple underscores (e.g., fruits___excluding_wine)
                    .replace(/__/g, '_') // Handle double underscores
                    .replace(/&/g, 'and'); // Handle ampersands (e.g., sugar_&_sweeteners)
                
                // Create display name from the original product part
                let displayName = productPart
                    .replace(/___/g, ' - Excluding ') // Handle triple underscores
                    .replace(/_/g, ' ') // Replace underscores with spaces
                    .replace(/ & /g, ' & ') // Keep ampersands properly spaced
                    .replace(/\b\w/g, l => l.toUpperCase()); // Capitalize words
                
                products.add(productKey);
                productMapping[productKey] = displayName;
            }
        });
        
        // Sort products alphabetically by display name
        const sortedProducts = Array.from(products).sort((a, b) => 
            productMapping[a].localeCompare(productMapping[b])
        );
        
        // Add options to select
        sortedProducts.forEach(productKey => {
            const option = document.createElement('option');
            option.value = productKey;
            option.textContent = productMapping[productKey];
            selectElement.appendChild(option);
        });
        
        // Store mapping for later use
        window.mlProductMapping = productMapping;
        
        // Set default selection to wheat if available
        const wheatOptions = sortedProducts.filter(key => key.includes('wheat'));
        if (wheatOptions.length > 0) {
            selectElement.value = wheatOptions[0];
        }
        
        console.log(`Populated ${selectId} with ${sortedProducts.length} ML products from ${availableFiles.length} forecasts`);
        
    } catch (error) {
        console.error('Error populating ML product select:', error);
        // Fallback to basic options
        const selectElement = document.getElementById(selectId);
        if (selectElement) {
            selectElement.innerHTML = `
                <option value="wheat_and_products">Wheat and products</option>
                <option value="rice_and_products">Rice and products</option>
                <option value="maize_and_products">Maize and products</option>
            `;
        }
    }
}

// Populate product select dropdown with available products
async function populateProductSelect(selectId) {
    try {
        const metadata = await loadDataDirect('fao_data/metadata.json');
        const foodItems = metadata.data_summary.food_items;
        
        const selectElement = document.getElementById(selectId);
        if (!selectElement) return;
        
        // Clear existing options
        selectElement.innerHTML = '';
        
        // Create product mapping for internal keys
        const productMapping = {};
        
        foodItems.forEach(item => {
            // Create internal key from item name
            const key = item.toLowerCase()
                .replace(/[^a-z0-9\s]/g, '') // Remove special characters except spaces
                .replace(/\s+/g, '_') // Replace spaces with underscores
                .replace(/_+/g, '_') // Replace multiple underscores with single
                .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
            
            productMapping[key] = item;
            
            // Create option element
            const option = document.createElement('option');
            option.value = key;
            option.textContent = item;
            selectElement.appendChild(option);
        });
        
        // Store mapping for later use
        window.productMapping = productMapping;
        
        // Set default selection to wheat if available
        const wheatOptions = foodItems.filter(item => item.toLowerCase().includes('wheat'));
        if (wheatOptions.length > 0) {
            const wheatKey = wheatOptions[0].toLowerCase()
                .replace(/[^a-z0-9\s]/g, '')
                .replace(/\s+/g, '_')
                .replace(/_+/g, '_')
                .replace(/^_|_$/g, '');
            selectElement.value = wheatKey;
        }
        
        console.log(`Populated ${selectId} with ${foodItems.length} products`);
        
    } catch (error) {
        console.error('Error populating product select:', error);
        // Fallback to basic options
        const selectElement = document.getElementById(selectId);
        if (selectElement) {
            selectElement.innerHTML = `
                <option value="wheat_and_products">Wheat and products</option>
                <option value="rice_and_products">Rice and products</option>
                <option value="maize_and_products">Maize and products</option>
            `;
        }
    }
}

// Test function for debugging
async function testDomesticSupply() {
    console.log('Testing domestic supply data loading...');
    try {
        const data = await loadProductTimeseries('wheat_and_products', 'domestic_supply');
        console.log('Domestic supply data loaded:', Object.keys(data).length, 'countries');
        if (data.Germany) {
            console.log('Germany data sample:', data.Germany.slice(0, 3));
        }
        return data;
    } catch (error) {
        console.error('Error loading domestic supply:', error);
    }
}

// Export functions for use in other modules
window.FAOUtils = {
    formatNumber,
    createColorScale,
    showLoading,
    showError,
    loadData: loadDataWithFallback, // Replace loadData with fallback version
    loadTimeseriesData,
    loadProductTimeseries,
    generateMLForecast,
    populateProductSelect,
    populateMLProductSelect,
    populateMetricSelect,
    testDomesticSupply,
    debounce,
    normalizeCountryName,
    createTooltip,
    showTooltip,
    hideTooltip,
    createLegend,
    getPoliticalEvents,
    getClimateEvents,
    COLOR_RANGE // Palette exportieren
};

