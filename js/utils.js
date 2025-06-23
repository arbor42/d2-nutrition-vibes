// Utility functions for the FAO application
// DEPRECATED: This file is legacy code. Use /src/utils/formatters.js for new implementations.

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
            title: 'Russische Hitzewelle & Exportverbot',
            description: 'Extreme Hitzewelle führt zu 25% Produktionsrückgang bei Weizen',
            impact: 'Weizenexporte für 10 Monate gestoppt (Aug 2010 - Juni 2011), +25% globale Preise',
            affectedCountries: ['Russian Federation'],
            dataEvidence: 'wheat_production_2010: -11.6% vs 2011-2012 avg, wheat_exports_2010: -100%',
            category: 'climate'
        }
    ],
    2011: [
        {
            title: 'Thailand Fluten',
            description: 'Überschwemmungen reduzieren Reisproduktion drastisch',
            impact: '2011 Produktion: 25M → 19M Tonnen (-24%), Thailand = 2. größter Reis-Exporteur',
            affectedCountries: ['Thailand'],
            dataEvidence: 'rice_production_2011: -24%',
            category: 'climate'
        },
        {
            title: 'Arabischer Frühling',
            description: 'Politische Unruhen in Nordafrika und Nahost beeinflussen Nahrungsmittelpreise',
            impact: 'Erhöhte Nahrungsmittelimporte in betroffenen Ländern 2011-2012',
            affectedCountries: ['Egypt', 'Tunisia', 'Syria', 'Libya'],
            dataEvidence: 'increased_import_dependency_2011-2012',
            category: 'conflict'
        }
    ],
    2012: [
        {
            title: 'US Midwest Dürre',
            description: 'Schlimmste Dürre seit 1956 beeinträchtigt Mais- und Sojaproduktion',
            impact: 'Maisproduktion: -13%, Sojaproduktion: -8%, globale Preisspitzen',
            affectedCountries: ['United States of America'],
            dataEvidence: 'maize_2012: -13%, soybeans_2012: -8%',
            category: 'climate'
        }
    ],
    2014: [
        {
            title: 'Ukraine-Konflikt beginnt',
            description: 'Konflikt in der Ostukraine beeinträchtigt Getreideexporte seit 2014',
            impact: 'Reduzierte Weizenexporte, Handelsumleitungen zu EU-Märkten',
            affectedCountries: ['Ukraine'],
            dataEvidence: 'trade_diversion_to_eu_2014+',
            category: 'conflict'
        }
    ],
    2018: [
        {
            title: 'Afrikanische Schweinepest in China (Beginn)',
            description: 'ASF-Ausbruch beginnt in China - größter Schweineerzeuger weltweit',
            impact: 'Aufbau zum dramatischen Produktionsrückgang 2019',
            affectedCountries: ['China'],
            dataEvidence: 'asf_outbreak_begins_2018',
            category: 'disease'
        }
    ],
    2019: [
        {
            title: 'China ASF-Krise (Höhepunkt)',
            description: 'Schweinepest erreicht Höhepunkt: 40,5% Rückgang (225 Mio Schweine tot)',
            impact: 'Schweinefleischproduktion: -20.9% (54.984 → 43.498 Tausend Tonnen), Preise verdoppelt',
            affectedCountries: ['China', 'Vietnam', 'Philippines'],
            dataEvidence: 'pork_production_2019: -20.9%, pork_imports_2019: +70%',
            category: 'disease'
        },
        {
            title: 'Ostafrikanische Heuschreckenplage (Beginn)',
            description: 'Wüstenheuschrecken-Schwärme beginnen Erntezerstörung',
            impact: 'Aufbau zu 100% Ernteverlust in betroffenen Gebieten 2020',
            affectedCountries: ['Ethiopia', 'Kenya', 'Somalia', 'Uganda'],
            dataEvidence: 'locust_swarm_spread_2019-2021',
            category: 'climate'
        }
    ],
    2020: [
        {
            title: 'COVID-19 Pandemie',
            description: 'Globale Pandemie stört Lieferketten und Fleischverarbeitung',
            impact: 'Globale Fleischproduktion: Schwein -1.0%, Verarbeitungskapazität: 75%, 19 Länder mit Exportbeschränkungen',
            affectedCountries: ['Global'],
            dataEvidence: 'meat_production_2020: pork -1.0%, beef +2.1%, poultry +3.2%',
            category: 'pandemic'
        },
        {
            title: 'Ostafrikanische Heuschreckenplage (Höhepunkt)',
            description: 'Wüstenheuschrecken-Schwärme erreichen Höhepunkt der Zerstörung',
            impact: 'Äthiopien Getreide-Verlust 2020: 356.286 Tonnen, bis zu 100% Ernteverlust',
            affectedCountries: ['Ethiopia', 'Kenya', 'Somalia', 'Uganda'],
            dataEvidence: 'ethiopia_grain_loss_2020: 356,286_tonnes',
            category: 'climate'
        }
    ],
    2022: [
        {
            title: 'Russland-Ukraine Krieg',
            description: 'Krieg blockiert Schwarzmeer-Häfen und zerstört Anbaugebiete',
            impact: 'Ukraine Weizenproduktion: 20.729 Tausend Tonnen (-35.6% vs 2021), Schwarzmeer-Getreideexporte gestoppt (Feb 2022+)',
            affectedCountries: ['Ukraine', 'Russian Federation'],
            dataEvidence: 'ukraine_wheat_2022: -35.6%, black_sea_corridor_blocked_feb2022',
            category: 'conflict'
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
        cachedTimeseriesData = await loadDataDirect('data/timeseries.json');
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
        return {};
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
            return await loadDataDirect('data/metadata.json');
        }
        if (url === 'data/geo/geo.json') {
            return await loadDataDirect('data/geo/geo.json');
        }
        if (url.startsWith('data/timeseries/')) {
            // Parse the URL to extract product and metric
            // Handle URLs like: data/timeseries/wheat_and_products_production.json
            const fileName = url.replace('data/timeseries/', '').replace('.json', '');
            
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
                return await loadProductTimeseries(product, metric);
            } else {
            }
        }
        if (url.startsWith('data/ml/')) {
            // For ML predictions, use real ML forecast data
            const productMatch = url.match(/data\/ml\/(.+)_production_forecast\.json/);
            if (productMatch) {
                const product = productMatch[1];
                
                // Load ML index to find available forecasts
                try {
                    const index = await loadDataDirect('data/ml/index.json');
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
                            const forecastUrl = `data/ml/${targetFilename}`;
                            try {
                                const data = await loadDataDirect(forecastUrl);
                                return data;
                            } catch (loadError) {
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
                        try {
                            const data = await loadDataDirect(`data/ml/${bestMatch}`);
                            return data;
                        } catch (loadError) {
                        }
                    }
                    
                    // Last resort: generate synthetic data
                    return await generateMLForecast(product);
                    
                } catch (indexError) {
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
        const metadata = await loadDataDirect('data/metadata.json');
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
            } else {
            }
        });
        
        // Set default to production
        selectElement.value = 'production';
        
        
    } catch (error) {
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
        const index = await loadDataDirect('data/ml/index.json');
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
        
        
    } catch (error) {
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
        const metadata = await loadDataDirect('data/metadata.json');
        const foodItems = metadata.data_summary.food_items;
        
        const selectElement = document.getElementById(selectId);
        if (!selectElement) return;
        
        // Clear existing options except placeholder
        const firstOption = selectElement.firstElementChild;
        selectElement.innerHTML = '';
        if (firstOption) {
            selectElement.appendChild(firstOption);
        }
        
        // Create product mapping for internal keys
        const productMapping = {};
        const productOptions = [];
        
        foodItems.forEach(item => {
            // Create internal key from item name
            const key = item.toLowerCase()
                .replace(/[^a-z0-9\s]/g, '') // Remove special characters except spaces
                .replace(/\s+/g, '_') // Replace spaces with underscores
                .replace(/_+/g, '_') // Replace multiple underscores with single
                .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
            
            productMapping[key] = item;
            productOptions.push({ value: key, text: item });
            
            // Create option element
            const option = document.createElement('option');
            option.value = key;
            option.textContent = item;
            selectElement.appendChild(option);
        });
        
        // Store mapping for later use
        window.productMapping = productMapping;
        
        // Update searchable select if it exists
        if (window.productSearchableSelect && selectId === 'product-select') {
            window.productSearchableSelect.updateOptions(productOptions);
            
            // Set default selection to "Wheat and products" if available
            const wheatOptions = foodItems.filter(item => 
                item.toLowerCase().includes('wheat') && item.toLowerCase().includes('products')
            );
            
            if (wheatOptions.length > 0) {
                const wheatKey = wheatOptions[0].toLowerCase()
                    .replace(/[^a-z0-9\s]/g, '')
                    .replace(/\s+/g, '_')
                    .replace(/_+/g, '_')
                    .replace(/^_|_$/g, '');
                selectElement.value = wheatKey;
                window.productSearchableSelect.setValue(wheatKey);
            }
        } else {
            // Set default selection to "Wheat and products" if available (fallback for regular select)
            const wheatOptions = foodItems.filter(item => 
                item.toLowerCase().includes('wheat') && item.toLowerCase().includes('products')
            );
            
            if (wheatOptions.length > 0) {
                const wheatKey = wheatOptions[0].toLowerCase()
                    .replace(/[^a-z0-9\s]/g, '')
                    .replace(/\s+/g, '_')
                    .replace(/_+/g, '_')
                    .replace(/^_|_$/g, '');
                selectElement.value = wheatKey;
            }
        }
        
        
    } catch (error) {
        // Fallback to basic options
        const selectElement = document.getElementById(selectId);
        if (selectElement) {
            const basicOptions = [
                { value: "wheat_and_products", text: "Wheat and products" },
                { value: "rice_and_products", text: "Rice and products" },
                { value: "maize_and_products", text: "Maize and products" }
            ];
            
            selectElement.innerHTML = `
                <option value="">Lade Produkte...</option>
                <option value="wheat_and_products">Wheat and products</option>
                <option value="rice_and_products">Rice and products</option>
                <option value="maize_and_products">Maize and products</option>
            `;
            
            // Set default to Wheat and products
            selectElement.value = 'wheat_and_products';
            
            // Update searchable select if it exists
            if (window.productSearchableSelect && selectId === 'product-select') {
                window.productSearchableSelect.updateOptions(basicOptions);
                window.productSearchableSelect.setValue('wheat_and_products');
            }
        }
    }
}

// Populate country select dropdown with available countries
async function populateCountrySelect(selectId) {
    try {
        const data = await loadDataDirect('data/geo/geo.json');
        const features = data.features;
        
        const selectElement = document.getElementById(selectId);
        if (!selectElement) return;
        
        // Clear existing options except placeholder
        const firstOption = selectElement.firstElementChild;
        selectElement.innerHTML = '';
        if (firstOption) {
            selectElement.appendChild(firstOption);
        }
        
        // Extract and sort countries
        const countries = features
            .map(f => f.properties.name || f.properties.NAME)
            .filter(Boolean)
            .sort();
        
        const countryOptions = [];
        
        countries.forEach(name => {
            countryOptions.push({ value: name, text: name });
            
            // Create option element
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            selectElement.appendChild(option);
        });
        
        // Update searchable select if it exists
        if (window.countrySearchableSelect && selectId === 'country-select') {
            window.countrySearchableSelect.updateOptions(countryOptions);
            
            // Set default selection to Germany if available
            const germanyOption = countries.find(country => country === 'Germany');
            if (germanyOption) {
                selectElement.value = 'Germany';
                window.countrySearchableSelect.setValue('Germany');
            }
        } else {
            // Set default selection to Germany if available (fallback for regular select)
            const germanyOption = countries.find(country => country === 'Germany');
            if (germanyOption) {
                selectElement.value = 'Germany';
            }
        }
        
    } catch (error) {
        console.error('Error loading countries:', error);
        // Fallback to basic options
        const selectElement = document.getElementById(selectId);
        if (selectElement) {
            const basicOptions = [
                { value: "Germany", text: "Germany" },
                { value: "United States of America", text: "United States of America" },
                { value: "China", text: "China" },
                { value: "India", text: "India" }
            ];
            
            selectElement.innerHTML = `
                <option value="">Lade Länder...</option>
                <option value="Germany">Germany</option>
                <option value="United States of America">United States of America</option>
                <option value="China">China</option>
                <option value="India">India</option>
            `;
            
            // Set default to Germany
            selectElement.value = 'Germany';
            
            // Update searchable select if it exists
            if (window.countrySearchableSelect && selectId === 'country-select') {
                window.countrySearchableSelect.updateOptions(basicOptions);
                window.countrySearchableSelect.setValue('Germany');
            }
        }
    }
}

// Test function for debugging
async function testDomesticSupply() {
    try {
        const data = await loadProductTimeseries('wheat_and_products', 'domestic_supply');
        return data;
    } catch (error) {
        // Error loading domestic supply
    }
}

// =======================================
// MAJOR WORLD EVENTS ANALYSIS FUNCTIONS
// =======================================

// Calculate year-over-year change for a specific country and product
async function calculateYearOverYearChange(country, product, year, metric = 'production') {
    try {
        const timeseriesData = await loadProductTimeseries(product, metric);
        
        if (!timeseriesData || !timeseriesData[country]) {
            return null;
        }
        
        const countryData = timeseriesData[country];
        const currentYear = countryData.find(d => d.year === year);
        const previousYear = countryData.find(d => d.year === year - 1);
        
        if (!currentYear || !previousYear || currentYear.value === 0 || previousYear.value === 0) {
            return null;
        }
        
        const change = ((currentYear.value - previousYear.value) / previousYear.value) * 100;
        return {
            country,
            product,
            year,
            metric,
            currentValue: currentYear.value,
            previousValue: previousYear.value,
            changePercent: change,
            isAnomalous: Math.abs(change) > 10 // Default 10% threshold
        };
    } catch (error) {
        return null;
    }
}

// Identify anomalies in time series data based on threshold
function identifyAnomalies(data, threshold = 0.1) {
    if (!Array.isArray(data) || data.length < 3) {
        return [];
    }
    
    const anomalies = [];
    
    for (let i = 1; i < data.length; i++) {
        const current = data[i];
        const previous = data[i - 1];
        
        if (current.value && previous.value && previous.value !== 0) {
            const change = Math.abs((current.value - previous.value) / previous.value);
            
            if (change > threshold) {
                anomalies.push({
                    year: current.year,
                    value: current.value,
                    previousValue: previous.value,
                    changePercent: ((current.value - previous.value) / previous.value) * 100,
                    severity: change > 0.2 ? 'high' : change > 0.15 ? 'medium' : 'low'
                });
            }
        }
    }
    
    return anomalies;
}

// Aggregate regional data for multiple countries
async function aggregateRegionalData(countries, product, year, metric = 'production') {
    try {
        const timeseriesData = await loadProductTimeseries(product, metric);
        
        if (!timeseriesData) {
            return null;
        }
        
        let totalValue = 0;
        let validCountries = [];
        
        countries.forEach(country => {
            if (timeseriesData[country]) {
                const yearData = timeseriesData[country].find(d => d.year === year);
                if (yearData && yearData.value) {
                    totalValue += yearData.value;
                    validCountries.push({
                        country,
                        value: yearData.value
                    });
                }
            }
        });
        
        return {
            year,
            product,
            metric,
            countries: validCountries,
            totalValue,
            averageValue: validCountries.length > 0 ? totalValue / validCountries.length : 0,
            countryCount: validCountries.length
        };
    } catch (error) {
        return null;
    }
}

// Check data completeness for a country/product/year range
async function checkDataCompleteness(country, product, yearRange) {
    try {
        const timeseriesData = await loadProductTimeseries(product, 'production');
        
        if (!timeseriesData || !timeseriesData[country]) {
            return {
                country,
                product,
                completeness: 0,
                availableYears: [],
                missingYears: yearRange
            };
        }
        
        const countryData = timeseriesData[country];
        const availableYears = countryData.map(d => d.year).filter(year => yearRange.includes(year));
        const missingYears = yearRange.filter(year => !availableYears.includes(year));
        
        return {
            country,
            product,
            completeness: (availableYears.length / yearRange.length) * 100,
            availableYears,
            missingYears,
            totalYears: yearRange.length
        };
    } catch (error) {
        return {
            country,
            product,
            completeness: 0,
            availableYears: [],
            missingYears: yearRange,
            error: error.message
        };
    }
}

// Identify data gaps across multiple countries and products
async function identifyDataGaps(countries, products, years) {
    const gaps = [];
    
    for (const country of countries) {
        for (const product of products) {
            const completeness = await checkDataCompleteness(country, product, years);
            if (completeness.completeness < 100) {
                gaps.push(completeness);
            }
        }
    }
    
    return gaps.sort((a, b) => a.completeness - b.completeness);
}

// Export event analysis data for reports
function exportEventAnalysisData() {
    const eventYears = Object.keys(politicalEvents).map(year => parseInt(year));
    const analysisData = {
        eventYears,
        totalEvents: eventYears.reduce((sum, year) => sum + politicalEvents[year].length, 0),
        eventsByCategory: {},
        eventsByYear: politicalEvents,
        affectedCountries: new Set()
    };
    
    // Group by category and collect affected countries
    eventYears.forEach(year => {
        politicalEvents[year].forEach(event => {
            const category = event.category || 'unknown';
            if (!analysisData.eventsByCategory[category]) {
                analysisData.eventsByCategory[category] = [];
            }
            analysisData.eventsByCategory[category].push({
                year,
                ...event
            });
            
            if (event.affectedCountries) {
                event.affectedCountries.forEach(country => {
                    analysisData.affectedCountries.add(country);
                });
            }
        });
    });
    
    // Convert Set to Array
    analysisData.affectedCountries = Array.from(analysisData.affectedCountries);
    
    return analysisData;
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
    populateCountrySelect,
    testDomesticSupply,
    debounce,
    normalizeCountryName,
    createTooltip,
    showTooltip,
    hideTooltip,
    createLegend,
    getPoliticalEvents,
    getClimateEvents,
    // Major World Events Analysis Functions
    calculateYearOverYearChange,
    identifyAnomalies,
    aggregateRegionalData,
    checkDataCompleteness,
    identifyDataGaps,
    exportEventAnalysisData,
    COLOR_RANGE // Palette exportieren
};

