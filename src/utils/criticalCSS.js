// Critical CSS loading utilities
export const criticalCSS = {
  // Extract critical CSS for above-the-fold content
  extractCriticalCSS() {
    const criticalStyles = new Set()
    
    // Get all elements that are visible on initial load
    const viewportHeight = window.innerHeight
    const criticalElements = Array.from(document.querySelectorAll('*')).filter(element => {
      const rect = element.getBoundingClientRect()
      return rect.top < viewportHeight && rect.bottom > 0
    })
    
    // Collect styles for critical elements
    criticalElements.forEach(element => {
      const computedStyles = window.getComputedStyle(element)
      const criticalProperties = [
        'display', 'position', 'top', 'left', 'right', 'bottom',
        'width', 'height', 'margin', 'padding', 'border',
        'background', 'color', 'font-family', 'font-size', 'font-weight',
        'line-height', 'text-align', 'visibility', 'opacity'
      ]
      
      const elementRules = []
      criticalProperties.forEach(prop => {
        const value = computedStyles.getPropertyValue(prop)
        if (value && value !== 'initial' && value !== 'inherit') {
          elementRules.push(`${prop}: ${value}`)
        }
      })
      
      if (elementRules.length > 0) {
        // Create a simplified selector
        const selector = this.generateSelector(element)
        criticalStyles.add(`${selector} { ${elementRules.join('; ')} }`)
      }
    })
    
    return Array.from(criticalStyles).join('\n')
  },

  // Generate a CSS selector for an element
  generateSelector(element) {
    // Start with tag name
    let selector = element.tagName.toLowerCase()
    
    // Add ID if present
    if (element.id) {
      selector += `#${element.id}`
    }
    
    // Add classes if present (limit to first 2 for specificity)
    if (element.className) {
      const classes = element.className.split(' ').filter(cls => cls.trim())
      const limitedClasses = classes.slice(0, 2)
      if (limitedClasses.length > 0) {
        selector += `.${limitedClasses.join('.')}`
      }
    }
    
    return selector
  },

  // Inline critical CSS
  inlineCriticalCSS(css) {
    const style = document.createElement('style')
    style.textContent = css
    style.setAttribute('data-critical', 'true')
    document.head.insertBefore(style, document.head.firstChild)
  },

  // Load non-critical CSS asynchronously
  loadNonCriticalCSS(href) {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = href
      link.media = 'print' // Initially load with print media to avoid blocking
      link.onload = () => {
        link.media = 'all' // Switch to all media once loaded
        resolve()
      }
      link.onerror = reject
      document.head.appendChild(link)
    })
  },

  // Preload critical fonts
  preloadFonts(fontUrls) {
    fontUrls.forEach(url => {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.href = url
      link.as = 'font'
      link.type = 'font/woff2'
      link.crossOrigin = 'anonymous'
      document.head.appendChild(link)
    })
  },

  // Critical CSS for data visualization components
  getVisualizationCriticalCSS() {
    return `
      .viz-container {
        position: relative;
        overflow: hidden;
        background-color: #ffffff;
        border-radius: 0.5rem;
        box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
        border: 1px solid #e5e7eb;
      }
      
      .chart-tooltip {
        position: absolute;
        pointer-events: none;
        background-color: #1f2937;
        color: #ffffff;
        font-size: 0.875rem;
        border-radius: 0.5rem;
        padding: 0.75rem;
        box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
        opacity: 0;
        transition: opacity 0.2s ease-in-out;
        z-index: 30;
        max-width: 200px;
      }
      
      .loading-spinner {
        display: inline-block;
        width: 2rem;
        height: 2rem;
        border: 2px solid #e5e7eb;
        border-radius: 50%;
        border-top-color: #3b82f6;
        animation: spin 1s ease-in-out infinite;
      }
      
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      
      .fade-in {
        animation: fadeIn 0.5s ease-in-out;
      }
      
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
    `
  },

  // Initialize critical CSS loading strategy
  initCriticalCSS() {
    // Check if critical CSS is already loaded
    if (document.querySelector('style[data-critical]')) {
      return
    }

    // Load critical visualization styles immediately
    this.inlineCriticalCSS(this.getVisualizationCriticalCSS())

    // Preload critical fonts
    const criticalFonts = [
      '/fonts/inter-var.woff2',
      '/fonts/jetbrains-mono-var.woff2'
    ]
    this.preloadFonts(criticalFonts)

    // Load remaining CSS after page load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.loadRemainingCSS()
      })
    } else {
      this.loadRemainingCSS()
    }
  },

  // Load remaining non-critical CSS
  async loadRemainingCSS() {
    const nonCriticalCSS = [
      // Add paths to non-critical CSS files
      '/css/components.css',
      '/css/utilities.css'
    ]

    try {
      await Promise.all(nonCriticalCSS.map(href => this.loadNonCriticalCSS(href)))
      console.log('Non-critical CSS loaded successfully')
    } catch (error) {
      console.warn('Failed to load some non-critical CSS:', error)
    }
  },

  // Remove unused CSS rules (simplified version)
  removeUnusedCSS() {
    const usedSelectors = new Set()
    
    // Collect all used selectors
    document.querySelectorAll('*').forEach(element => {
      // Add tag name
      usedSelectors.add(element.tagName.toLowerCase())
      
      // Add ID
      if (element.id) {
        usedSelectors.add(`#${element.id}`)
      }
      
      // Add classes
      if (element.className) {
        element.className.split(' ').forEach(cls => {
          if (cls.trim()) {
            usedSelectors.add(`.${cls.trim()}`)
          }
        })
      }
    })
    
    // Remove unused styles from inline critical CSS
    const criticalStyleElement = document.querySelector('style[data-critical]')
    if (criticalStyleElement) {
      const cssText = criticalStyleElement.textContent
      const rules = cssText.split('}').filter(rule => rule.trim())
      
      const usedRules = rules.filter(rule => {
        const selector = rule.split('{')[0].trim()
        return usedSelectors.has(selector) || this.isSelectorUsed(selector)
      })
      
      criticalStyleElement.textContent = usedRules.join('}') + '}'
    }
  },

  // Check if a complex selector is used
  isSelectorUsed(selector) {
    try {
      return document.querySelector(selector) !== null
    } catch (error) {
      // Invalid selector
      return false
    }
  },

  // Monitor and optimize CSS performance
  monitorCSSPerformance() {
    if (!window.PerformanceObserver) return

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'resource' && entry.name.includes('.css')) {
          console.log(`CSS loaded: ${entry.name} (${entry.duration.toFixed(2)}ms)`)
          
          if (entry.duration > 100) {
            console.warn(`Slow CSS load detected: ${entry.name}`)
          }
        }
      }
    })

    observer.observe({ entryTypes: ['resource'] })
  },

  // Generate critical CSS for a specific component
  generateComponentCriticalCSS(componentSelector) {
    const component = document.querySelector(componentSelector)
    if (!component) return ''

    const criticalStyles = []
    
    // Get all elements within the component
    const elements = [component, ...component.querySelectorAll('*')]
    
    elements.forEach(element => {
      const computedStyles = window.getComputedStyle(element)
      const selector = this.generateSelector(element)
      
      // Extract only essential styles
      const essentialStyles = [
        'display', 'position', 'width', 'height',
        'background-color', 'color', 'border'
      ].map(prop => {
        const value = computedStyles.getPropertyValue(prop)
        return value && value !== 'initial' ? `${prop}: ${value}` : null
      }).filter(Boolean)
      
      if (essentialStyles.length > 0) {
        criticalStyles.push(`${selector} { ${essentialStyles.join('; ')} }`)
      }
    })
    
    return criticalStyles.join('\n')
  }
}

// Critical CSS loading for Vue components
export const vueCriticalCSS = {
  // Extract critical CSS during component mounting
  extractForComponent(componentInstance) {
    if (!componentInstance.$el) return ''
    
    return criticalCSS.generateComponentCriticalCSS(
      `[data-v-${componentInstance.$.type.__scopeId}]`
    )
  },

  // Critical CSS directive for Vue
  vCritical: {
    mounted(el, binding) {
      const criticalCSS = criticalCSS.generateComponentCriticalCSS(
        binding.value || el.tagName.toLowerCase()
      )
      
      if (criticalCSS) {
        const style = document.createElement('style')
        style.textContent = criticalCSS
        style.setAttribute('data-component-critical', binding.value || 'anonymous')
        document.head.appendChild(style)
      }
    },
    
    unmounted(el, binding) {
      const style = document.querySelector(
        `style[data-component-critical="${binding.value || 'anonymous'}"]`
      )
      if (style) {
        style.remove()
      }
    }
  }
}

// Auto-initialize critical CSS loading
if (typeof window !== 'undefined') {
  // Initialize when the module is imported
  criticalCSS.initCriticalCSS()
  
  // Monitor CSS performance
  criticalCSS.monitorCSSPerformance()
  
  // Clean up unused CSS after page load
  window.addEventListener('load', () => {
    setTimeout(() => {
      criticalCSS.removeUnusedCSS()
    }, 2000) // Wait 2 seconds for dynamic content
  })
}