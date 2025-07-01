/**
 * Unified formatting system for FAO agricultural data
 * All FAO data is in "1000 t" (thousand tonnes) base unit
 */

/**
 * Format agricultural production/trade values with consistent units
 * @param {number} value - Raw value from FAO dataset (in 1000 tonnes)
 * @param {object} [options] - Formatting options
 * @param {string} [options.unit="1000 t"] - Override unit (default: "1000 t")
 * @param {number} [options.precision] - Decimal places (default: 1 for large values, 0 for small)
 * @param {boolean} [options.showUnit=true] - Whether to show unit (default: true)
 * @param {boolean} [options.longForm=false] - Use long form units (default: false)
 * @returns {string} Formatted value with unit
 */
export function formatAgricultureValue(value, options = {}) {
  const {
    unit = "1000 t",
    precision = null,
    showUnit = true,
    longForm = false
  } = options;

  // ---------------------------------------------------------------------
  // ⚙️  Einheitliche Behandlung von Gewichts-Einheiten
  // ---------------------------------------------------------------------
  // In der gesamten Anwendung werden aktuell Mengen **in Tonnen (t)**
  // an diese Funktion übergeben, auch wenn der übergebene Unit-String
  // teilweise noch "1000 t" lautet. Um falsche Skalierungen zu vermeiden,
  // interpretieren wir den String "1000 t" daher ab sofort als Alias für
  // reguläre Tonnen und verarbeiten ihn identisch wie "t".
  // Dadurch müssen bestehende Aufrufer im Code nicht sofort angepasst
  // werden, gleichzeitig stimmt aber die Anzeige wieder.
  // ---------------------------------------------------------------------

  const normalizedUnit = unit === "1000 t" ? "t" : unit;

  if (value === null || value === undefined || isNaN(value)) {
    return showUnit ? `0 ${normalizedUnit}` : '0';
  }

  const absValue = Math.abs(value);
  let formattedNumber;
  let displayUnit = normalizedUnit;
  
  // Special handling for calorie data
  if (normalizedUnit === "kcal/capita/day") {
    formattedNumber = value.toFixed(precision ?? 0);
    displayUnit = longForm ? "kcal/Person/Tag" : "kcal";
  }
  // FAO data is in "1000 t", so we need to consider the actual scale
  else if (normalizedUnit === "t") {
    // Neue Basis: Tonnen, skaliere wie bei 1000 t nur mit 1000er-Versatz
    if (absValue >= 1_000_000_000) {
      formattedNumber = (value / 1_000_000_000).toFixed(precision ?? 1)
      displayUnit = longForm ? "Mrd. t" : "Mrd t"
    } else if (absValue >= 1_000_000) {
      formattedNumber = (value / 1_000_000).toFixed(precision ?? 1)
      displayUnit = longForm ? "Mio. t" : "Mio t"
    } else if (absValue >= 1_000) {
      formattedNumber = (value / 1_000).toFixed(precision ?? 1)
      displayUnit = longForm ? "Tsd. t" : "Tsd t"
    } else {
      formattedNumber = value.toFixed(precision ?? (absValue < 10 ? 1 : 0))
      displayUnit = "t"
    }
  } else {
    // Other units - use standard metric scaling
    if (absValue >= 1000000000) {
      formattedNumber = (value / 1000000000).toFixed(precision ?? 1);
      displayUnit = longForm ? `Mrd. ${normalizedUnit}` : `Mrd ${normalizedUnit}`;
    } else if (absValue >= 1000000) {
      formattedNumber = (value / 1000000).toFixed(precision ?? 1);
      displayUnit = longForm ? `Mio. ${normalizedUnit}` : `Mio ${normalizedUnit}`;
    } else if (absValue >= 1000) {
      formattedNumber = (value / 1000).toFixed(precision ?? 1);
      displayUnit = longForm ? `Tsd. ${normalizedUnit}` : `Tsd ${normalizedUnit}`;
    } else {
      formattedNumber = value.toFixed(precision ?? (absValue < 10 ? 1 : 0));
      displayUnit = normalizedUnit;
    }
  }

  return showUnit ? `${formattedNumber} ${displayUnit}` : formattedNumber;
}

/**
 * Format values for axis labels (shorter format)
 * @param {number} value - Raw value
 * @param {string} unit - Unit type (default: "1000 t")
 * @returns {string} Short formatted value
 */
export function formatAxisValue(value, unit = "1000 t") {
  return formatAgricultureValue(value, { 
    unit, 
    showUnit: false, 
    precision: 0 
  });
}

/**
 * Format values for tooltips (detailed format)  
 * @param {number} value - Raw value
 * @param {string} unit - Unit type (default: "1000 t")
 * @returns {string} Detailed formatted value
 */
export function formatTooltipValue(value, unit = "1000 t") {
  return formatAgricultureValue(value, { 
    unit, 
    showUnit: true, 
    longForm: true,
    precision: 1 
  });
}

/**
 * Get appropriate unit label for axis
 * @param {string} baseUnit - Base unit from data (default: "1000 t") 
 * @returns {string} Appropriate axis unit label
 */
export function getAxisUnitLabel(baseUnit = "1000 t") {
  if (baseUnit === "1000 t" || baseUnit === "t") {
    return "Produktion (Mio. t)";
  }
  return `Werte (${baseUnit})`;
}

/**
 * Format percentage values
 * @param {number} value - Percentage value (0-100 or 0-1)
 * @param {boolean} isDecimal - Whether input is decimal (0-1) or percentage (0-100)
 * @returns {string} Formatted percentage
 */
export function formatPercentage(value, isDecimal = false) {
  if (value === null || value === undefined || isNaN(value)) {
    return '0%';
  }
  
  const percentage = isDecimal ? value * 100 : value;
  return `${percentage.toFixed(1)}%`;
}

/**
 * Format large numbers with German locale
 * @param {number} value - Number to format
 * @param {number} precision - Decimal places
 * @returns {string} Locale formatted number
 */
export function formatNumber(value, precision = 0) {
  if (value === null || value === undefined || isNaN(value)) {
    return '0';
  }
  
  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision
  }).format(value);
}

/**
 * Create D3 format function for consistent axis formatting
 * @param {string} unit - Base unit
 * @returns {function} D3-compatible format function
 */
export function createD3AxisFormatter(unit = "1000 t") {
  return (value) => formatAxisValue(value, unit);
}

/**
 * Create D3 format function for consistent tooltip formatting  
 * @param {string} unit - Base unit
 * @returns {function} D3-compatible format function
 */
export function createD3TooltipFormatter(unit = "1000 t") {
  return (value) => formatTooltipValue(value, unit);
}