/**
 * Intelligente Tooltip-Positionierung mit Kollisionsvermeidung
 * Implementiert dynamische Positionierung die garantiert keine Überlappung
 * mit dem zu highlightenden Element erzeugt.
 */

// Konstanten für Positionierung
const DEFAULT_SPACING = 20
const VIEWPORT_PADDING = 20
const MIN_TOOLTIP_SIZE = { width: 300, height: 200 }
const MAX_TOOLTIP_SIZE = { width: 600, height: 500 }

// Performance-Optimierungen: Memoization Cache
const positionCache = new Map()
const CACHE_MAX_SIZE = 100
const CACHE_TTL = 5000 // 5 Sekunden

/**
 * Prüft ob sich zwei Rechtecke überlappen
 * @param {Object} rect1 - Erstes Rechteck {top, left, width, height, bottom, right}
 * @param {Object} rect2 - Zweites Rechteck {top, left, width, height, bottom, right}
 * @param {number} padding - Sicherheitsabstand
 * @returns {boolean} True wenn Überlappung vorhanden
 */
export function checkBoundaryOverlap(rect1, rect2, padding = 0) {
  const r1 = {
    top: rect1.top - padding,
    left: rect1.left - padding,
    bottom: (rect1.bottom || rect1.top + rect1.height) + padding,
    right: (rect1.right || rect1.left + rect1.width) + padding
  }
  
  const r2 = {
    top: rect2.top,
    left: rect2.left,
    bottom: rect2.bottom || rect2.top + rect2.height,
    right: rect2.right || rect2.left + rect2.width
  }

  return !(r1.right < r2.left || 
           r1.left > r2.right || 
           r1.bottom < r2.top || 
           r1.top > r2.bottom)
}

/**
 * Prüft ob ein Rechteck vollständig im Viewport sichtbar ist
 * @param {Object} rect - Rechteck zum Prüfen
 * @param {Object} viewport - Viewport {width, height}
 * @param {number} padding - Mindestabstand zum Rand
 * @returns {boolean} True wenn vollständig sichtbar
 */
export function isFullyVisible(rect, viewport, padding = VIEWPORT_PADDING) {
  return rect.left >= padding &&
         rect.top >= padding &&
         rect.left + rect.width <= viewport.width - padding &&
         rect.top + rect.height <= viewport.height - padding
}

/**
 * Berechnet optimale Tooltip-Größe basierend auf Inhalt und verfügbarem Platz
 * @param {Object} contentSize - Natürliche Inhaltsgröße
 * @param {Object} availableSpace - Verfügbarer Platz im Viewport
 * @param {Object} constraints - Min/Max Größenbeschränkungen
 * @returns {Object} Optimale Größe {width, height}
 */
export function calculateAdaptiveSize(contentSize, availableSpace, constraints = {}) {
  const minSize = { ...MIN_TOOLTIP_SIZE, ...constraints.min }
  const maxSize = { ...MAX_TOOLTIP_SIZE, ...constraints.max }
  
  // Bevorzuge natürliche Größe, aber respektiere Limits
  let width = Math.max(minSize.width, Math.min(contentSize.width || 400, maxSize.width))
  let height = Math.max(minSize.height, Math.min(contentSize.height || 300, maxSize.height))
  
  // Anpassung an verfügbaren Platz
  const maxAvailableWidth = availableSpace.width - (VIEWPORT_PADDING * 2)
  const maxAvailableHeight = availableSpace.height - (VIEWPORT_PADDING * 2)
  
  if (width > maxAvailableWidth) {
    width = Math.max(minSize.width, maxAvailableWidth)
  }
  
  if (height > maxAvailableHeight) {
    height = Math.max(minSize.height, maxAvailableHeight)
  }
  
  // Aspect Ratio Anpassung bei extremen Größenänderungen
  const originalRatio = (contentSize.width || 400) / (contentSize.height || 300)
  const newRatio = width / height
  
  // Wenn Ratio zu stark abweicht, bevorzuge Höhe
  if (Math.abs(originalRatio - newRatio) > 0.5 && height < maxAvailableHeight * 0.8) {
    height = Math.min(width / originalRatio, maxAvailableHeight)
  }
  
  return { width: Math.round(width), height: Math.round(height) }
}

/**
 * Generiert alle möglichen Positionen für das Tooltip
 * @param {Object} elementBounds - Grenzen des zu highlightenden Elements  
 * @param {Object} tooltipSize - Größe des Tooltips
 * @param {number} spacing - Abstand zwischen Element und Tooltip
 * @returns {Array} Array von Position-Objekten mit Priorität
 */
export function generatePossiblePositions(elementBounds, tooltipSize, spacing = DEFAULT_SPACING) {
  const positions = []
  
  // Primäre Positionen (direkt an Element)
  // Bottom (bevorzugt)
  positions.push({
    position: 'bottom',
    priority: 1,
    top: elementBounds.bottom + spacing,
    left: elementBounds.left + (elementBounds.width / 2) - (tooltipSize.width / 2)
  })
  
  // Top
  positions.push({
    position: 'top',
    priority: 2,
    top: elementBounds.top - tooltipSize.height - spacing,
    left: elementBounds.left + (elementBounds.width / 2) - (tooltipSize.width / 2)
  })
  
  // Right
  positions.push({
    position: 'right',
    priority: 3,
    top: elementBounds.top + (elementBounds.height / 2) - (tooltipSize.height / 2),
    left: elementBounds.right + spacing
  })
  
  // Left
  positions.push({
    position: 'left',
    priority: 4,
    top: elementBounds.top + (elementBounds.height / 2) - (tooltipSize.height / 2),
    left: elementBounds.left - tooltipSize.width - spacing
  })
  
  // Eck-Positionen
  // Bottom-Right
  positions.push({
    position: 'bottom-right',
    priority: 5,
    top: elementBounds.bottom + spacing,
    left: elementBounds.right - (tooltipSize.width / 2)
  })
  
  // Bottom-Left
  positions.push({
    position: 'bottom-left',
    priority: 6,
    top: elementBounds.bottom + spacing,
    left: elementBounds.left - (tooltipSize.width / 2)
  })
  
  // Top-Right
  positions.push({
    position: 'top-right',
    priority: 7,
    top: elementBounds.top - tooltipSize.height - spacing,
    left: elementBounds.right - (tooltipSize.width / 2)
  })
  
  // Top-Left
  positions.push({
    position: 'top-left',
    priority: 8,
    top: elementBounds.top - tooltipSize.height - spacing,
    left: elementBounds.left - (tooltipSize.width / 2)
  })
  
  // Sekundäre Positionen mit größerem Abstand
  const largerSpacing = spacing * 2
  
  positions.push({
    position: 'bottom-far',
    priority: 9,
    top: elementBounds.bottom + largerSpacing,
    left: elementBounds.left + (elementBounds.width / 2) - (tooltipSize.width / 2)
  })
  
  positions.push({
    position: 'top-far',
    priority: 10,
    top: elementBounds.top - tooltipSize.height - largerSpacing,
    left: elementBounds.left + (elementBounds.width / 2) - (tooltipSize.width / 2)
  })
  
  return positions.sort((a, b) => a.priority - b.priority)
}

/**
 * Berechnet Floating-Position wenn keine andere Position funktioniert
 * @param {Object} elementBounds - Grenzen des Elements
 * @param {Object} tooltipSize - Größe des Tooltips  
 * @param {Object} viewport - Viewport-Informationen
 * @returns {Object} Floating-Position
 */
export function calculateFloatingPosition(elementBounds, tooltipSize, viewport) {
  // Finde den Quadranten mit dem meisten freien Platz
  const elementCenter = {
    x: elementBounds.left + elementBounds.width / 2,
    y: elementBounds.top + elementBounds.height / 2
  }
  
  const quadrants = [
    // Top-Left
    {
      x: VIEWPORT_PADDING,
      y: VIEWPORT_PADDING,
      space: elementCenter.x * elementCenter.y,
      position: 'floating-top-left'
    },
    // Top-Right  
    {
      x: viewport.width - tooltipSize.width - VIEWPORT_PADDING,
      y: VIEWPORT_PADDING,
      space: (viewport.width - elementCenter.x) * elementCenter.y,
      position: 'floating-top-right'
    },
    // Bottom-Left
    {
      x: VIEWPORT_PADDING,
      y: viewport.height - tooltipSize.height - VIEWPORT_PADDING,
      space: elementCenter.x * (viewport.height - elementCenter.y),
      position: 'floating-bottom-left'
    },
    // Bottom-Right
    {
      x: viewport.width - tooltipSize.width - VIEWPORT_PADDING,
      y: viewport.height - tooltipSize.height - VIEWPORT_PADDING,
      space: (viewport.width - elementCenter.x) * (viewport.height - elementCenter.y),
      position: 'floating-bottom-right'
    }
  ]
  
  // Wähle Quadrant mit dem meisten Platz
  const bestQuadrant = quadrants.reduce((best, current) => 
    current.space > best.space ? current : best
  )
  
  return {
    position: bestQuadrant.position,
    priority: 99,
    top: bestQuadrant.y,
    left: bestQuadrant.x,
    isFloating: true
  }
}

/**
 * Findet die beste Position ohne Überlappung mit dem Element
 * @param {Object} elementBounds - Grenzen des zu highlightenden Elements
 * @param {Object} tooltipSize - Gewünschte Tooltip-Größe
 * @param {Object} viewport - Viewport-Informationen {width, height}
 * @param {string} preferredPosition - Bevorzugte Position ('auto', 'top', 'bottom', etc.)
 * @returns {Object} Beste Position mit Metadaten
 */
export function findNonOverlappingPosition(elementBounds, tooltipSize, viewport, preferredPosition = 'auto') {
  const positions = generatePossiblePositions(elementBounds, tooltipSize)
  
  // Wenn bevorzugte Position angegeben, diese zuerst prüfen
  if (preferredPosition !== 'auto') {
    const preferred = positions.find(p => p.position === preferredPosition)
    if (preferred) {
      positions.unshift(preferred)
    }
  }
  
  // Prüfe jede Position auf Überlappung und Sichtbarkeit
  for (const position of positions) {
    const tooltipBounds = {
      top: position.top,
      left: position.left,
      width: tooltipSize.width,
      height: tooltipSize.height,
      bottom: position.top + tooltipSize.height,
      right: position.left + tooltipSize.width
    }
    
    // Prüfe Überlappung mit Element (mit Sicherheitsabstand)
    const hasOverlap = checkBoundaryOverlap(elementBounds, tooltipBounds, 10)
    
    // Prüfe Sichtbarkeit im Viewport
    const isVisible = isFullyVisible(tooltipBounds, viewport)
    
    if (!hasOverlap && isVisible) {
      return {
        ...position,
        bounds: tooltipBounds,
        hasOverlap: false,
        isVisible: true,
        isOptimal: true
      }
    }
  }
  
  // Fallback: Floating-Position
  const floatingPosition = calculateFloatingPosition(elementBounds, tooltipSize, viewport)
  const floatingBounds = {
    top: floatingPosition.top,
    left: floatingPosition.left,
    width: tooltipSize.width,
    height: tooltipSize.height,
    bottom: floatingPosition.top + tooltipSize.height,
    right: floatingPosition.left + tooltipSize.width
  }
  
  return {
    ...floatingPosition,
    bounds: floatingBounds,
    hasOverlap: checkBoundaryOverlap(elementBounds, floatingBounds, 10),
    isVisible: isFullyVisible(floatingBounds, viewport),
    isOptimal: false
  }
}

/**
 * Generiert Cache-Key für Positionierungsberechnungen
 * @param {Object} elementBounds - Element-Grenzen
 * @param {Object} contentSize - Content-Größe
 * @param {Object} viewport - Viewport-Informationen
 * @param {Object} options - Optionen
 * @returns {string} Cache-Key
 */
function generateCacheKey(elementBounds, contentSize, viewport, options) {
  // Runde Werte für bessere Cache-Hits
  const roundBounds = {
    top: Math.round(elementBounds.top / 5) * 5,
    left: Math.round(elementBounds.left / 5) * 5,
    width: Math.round(elementBounds.width / 5) * 5,
    height: Math.round(elementBounds.height / 5) * 5
  }
  
  const roundViewport = {
    width: Math.round(viewport.width / 10) * 10,
    height: Math.round(viewport.height / 10) * 10
  }
  
  return JSON.stringify({
    elementBounds: roundBounds,
    contentSize,
    viewport: roundViewport,
    preferredPosition: options.preferredPosition || 'auto'
  })
}

/**
 * Bereinigt abgelaufene Cache-Einträge
 */
function cleanupCache() {
  const now = Date.now()
  for (const [key, value] of positionCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      positionCache.delete(key)
    }
  }
  
  // Begrenze Cache-Größe
  if (positionCache.size > CACHE_MAX_SIZE) {
    const oldestKey = positionCache.keys().next().value
    positionCache.delete(oldestKey)
  }
}

/**
 * Hauptfunktion für intelligente Tooltip-Positionierung
 * @param {Object} elementBounds - Grenzen des zu highlightenden Elements
 * @param {Object} contentSize - Natürliche Größe des Tooltip-Inhalts
 * @param {Object} viewport - Viewport-Informationen
 * @param {Object} options - Zusätzliche Optionen
 * @returns {Object} Optimale Position und Größe
 */
export function calculateOptimalPosition(elementBounds, contentSize, viewport, options = {}) {
  const {
    preferredPosition = 'auto',
    constraints = {},
    spacing = DEFAULT_SPACING,
    adaptive = true,
    useCache = true
  } = options
  
  // Performance: Cache-Lookup
  const cacheKey = useCache ? generateCacheKey(elementBounds, contentSize, viewport, options) : null
  if (useCache && positionCache.has(cacheKey)) {
    const cached = positionCache.get(cacheKey)
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      return { ...cached.result, fromCache: true }
    }
    positionCache.delete(cacheKey)
  }
  
  // 1. Berechne optimale Tooltip-Größe
  const tooltipSize = adaptive 
    ? calculateAdaptiveSize(contentSize, viewport, constraints)
    : { ...contentSize }
  
  // 2. Finde beste Position ohne Überlappung
  const optimalPosition = findNonOverlappingPosition(
    elementBounds, 
    tooltipSize, 
    viewport, 
    preferredPosition
  )
  
  // 3. Falls immer noch Überlappung, versuche kleinere Größe
  if (optimalPosition.hasOverlap && adaptive && tooltipSize.width > MIN_TOOLTIP_SIZE.width) {
    const smallerSize = {
      width: Math.max(MIN_TOOLTIP_SIZE.width, tooltipSize.width * 0.8),
      height: Math.max(MIN_TOOLTIP_SIZE.height, tooltipSize.height * 0.8)
    }
    
    const retryPosition = findNonOverlappingPosition(
      elementBounds,
      smallerSize,
      viewport,
      preferredPosition
    )
    
    if (!retryPosition.hasOverlap) {
      const result = {
        position: { top: retryPosition.top, left: retryPosition.left },
        size: smallerSize,
        metadata: {
          ...retryPosition,
          wasResized: true,
          originalSize: tooltipSize
        }
      }
      
      // Cache das Ergebnis
      if (useCache && cacheKey) {
        cleanupCache()
        positionCache.set(cacheKey, { result, timestamp: Date.now() })
      }
      
      return result
    }
  }
  
  const result = {
    position: { top: optimalPosition.top, left: optimalPosition.left },
    size: tooltipSize,
    metadata: {
      ...optimalPosition,
      wasResized: false
    }
  }
  
  // Cache das Ergebnis
  if (useCache && cacheKey) {
    cleanupCache()
    positionCache.set(cacheKey, { result, timestamp: Date.now() })
  }
  
  return result
}

/**
 * Hilfsfunktion für Echtzeit-Updates mit RAF-Optimierung
 * @param {Function} callback - Callback für Position-Updates
 * @param {number} throttleMs - Throttle-Intervall in Millisekunden
 * @returns {Function} Optimierter Callback
 */
export function createPositionUpdateCallback(callback, throttleMs = 16) {
  let lastCall = 0
  let rafId = null
  let pendingArgs = null
  
  const executeCallback = () => {
    if (pendingArgs) {
      callback(...pendingArgs)
      pendingArgs = null
      lastCall = performance.now()
    }
    rafId = null
  }
  
  return (...args) => {
    const now = performance.now()
    pendingArgs = args
    
    // Sofortige Ausführung wenn genug Zeit vergangen
    if (now - lastCall >= throttleMs) {
      if (rafId) {
        cancelAnimationFrame(rafId)
      }
      rafId = requestAnimationFrame(executeCallback)
    } else if (!rafId) {
      // Verzögerte Ausführung
      const delay = throttleMs - (now - lastCall)
      setTimeout(() => {
        if (pendingArgs) {
          rafId = requestAnimationFrame(executeCallback)
        }
      }, delay)
    }
  }
}

/**
 * Optimierte Batch-Positionierung für mehrere Elemente
 * @param {Array} elements - Array von Element-Bounds
 * @param {Object} sharedOptions - Geteilte Optionen
 * @returns {Array} Array von Positionierungsergebnissen
 */
export function batchCalculatePositions(elements, sharedOptions = {}) {
  const results = []
  const { viewport, constraints } = sharedOptions
  
  // Sortiere Elemente nach Priorität (z.B. Größe)
  const sortedElements = elements.sort((a, b) => 
    (b.elementBounds.width * b.elementBounds.height) - 
    (a.elementBounds.width * a.elementBounds.height)
  )
  
  // Berechne Positionen in einem Batch
  for (const element of sortedElements) {
    const result = calculateOptimalPosition(
      element.elementBounds,
      element.contentSize,
      viewport,
      { ...sharedOptions, ...element.options }
    )
    
    results.push({
      ...element,
      positioning: result
    })
  }
  
  return results
}

/**
 * Cache-Management-Funktionen
 */
export const cacheManager = {
  /**
   * Leert den gesamten Cache
   */
  clearCache() {
    positionCache.clear()
  },
  
  /**
   * Cache-Statistiken
   * @returns {Object} Cache-Info
   */
  getStats() {
    return {
      size: positionCache.size,
      maxSize: CACHE_MAX_SIZE,
      entries: Array.from(positionCache.keys()).slice(0, 5) // Erste 5 Keys als Sample
    }
  },
  
  /**
   * Erzwingt Cache-Bereinigung
   */
  forceCleanup() {
    cleanupCache()
  }
}