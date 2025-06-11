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

// Create color scale for choropleth maps
function createColorScale(data, colorScheme = 'Blues') {
    const values = data.filter(d => d !== null && !isNaN(d));
    if (values.length === 0) return d3.scaleOrdinal(['#ccc']);
    
    const extent = d3.extent(values);
    const quantiles = d3.scaleQuantile()
        .domain(values)
        .range(d3.schemeBlues[9]);
    
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

// Load JSON data with error handling
async function loadData(url) {
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

// Export functions for use in other modules
window.FAOUtils = {
    formatNumber,
    createColorScale,
    showLoading,
    showError,
    loadData,
    debounce,
    normalizeCountryName,
    createTooltip,
    showTooltip,
    hideTooltip,
    createLegend,
    getPoliticalEvents,
    getClimateEvents
};

