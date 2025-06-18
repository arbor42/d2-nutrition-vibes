// CSS Optimization utilities
export const cssOptimizer = {
  // Track used CSS classes across the application
  usedClasses: new Set(),
  unusedClasses: new Set(),
  
  // Initialize CSS optimization
  init() {
    this.startObserving()
    this.scheduleCleanup()
  },

  // Start observing DOM mutations to track class usage
  startObserving() {
    if (!window.MutationObserver) return

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              this.trackElementClasses(node)
              this.trackDescendantClasses(node)
            }
          })
        } else if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          if (mutation.target.nodeType === Node.ELEMENT_NODE) {
            this.trackElementClasses(mutation.target)
          }
        }
      })
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    })

    // Initial scan of existing elements
    this.scanExistingElements()
  },

  // Track classes used by an element
  trackElementClasses(element) {
    if (element.className && typeof element.className === 'string') {
      element.className.split(' ')
        .filter(cls => cls.trim())
        .forEach(cls => this.usedClasses.add(cls))
    }
  },

  // Track classes used by element and its descendants
  trackDescendantClasses(element) {
    const elements = [element, ...element.querySelectorAll('*')]
    elements.forEach(el => this.trackElementClasses(el))
  },

  // Scan existing elements in the DOM
  scanExistingElements() {
    document.querySelectorAll('*').forEach(element => {
      this.trackElementClasses(element)
    })
  },

  // Get all CSS classes defined in stylesheets
  getAllDefinedClasses() {
    const definedClasses = new Set()
    
    try {
      Array.from(document.styleSheets).forEach(sheet => {
        try {
          Array.from(sheet.cssRules || sheet.rules || []).forEach(rule => {
            if (rule.type === CSSRule.STYLE_RULE) {
              const selectors = rule.selectorText.split(',')
              selectors.forEach(selector => {
                // Extract class names from selectors
                const classMatches = selector.match(/\.[a-zA-Z0-9_-]+/g)
                if (classMatches) {
                  classMatches.forEach(match => {
                    definedClasses.add(match.substring(1)) // Remove the dot
                  })
                }
              })
            }
          })
        } catch (e) {
          // Skip stylesheets that can't be accessed (e.g., cross-origin)
          console.warn('Cannot access stylesheet rules:', e)
        }
      })
    } catch (e) {
      console.warn('Error analyzing stylesheets:', e)
    }
    
    return definedClasses
  },

  // Identify unused CSS classes
  findUnusedClasses() {
    const definedClasses = this.getAllDefinedClasses()
    const unusedClasses = new Set()
    
    definedClasses.forEach(cls => {
      if (!this.usedClasses.has(cls) && !this.isClassDynamic(cls)) {
        unusedClasses.add(cls)
      }
    })
    
    this.unusedClasses = unusedClasses
    return unusedClasses
  },

  // Check if a class might be used dynamically
  isClassDynamic(className) {
    const dynamicPatterns = [
      // Vue.js scoped styles
      /^v-[a-f0-9]+$/,
      // D3.js generated classes
      /^d3-/,
      // Chart.js classes
      /^chartjs-/,
      // Animation classes
      /^animate-/,
      /^transition-/,
      // State classes that might be toggled
      /^hover:/,
      /^focus:/,
      /^active:/,
      /^disabled:/,
      // Responsive classes
      /^sm:/,
      /^md:/,
      /^lg:/,
      /^xl:/,
      /^2xl:/,
      // Dark mode classes
      /^dark:/,
      // Utility classes that might be used conditionally
      /^text-(xs|sm|base|lg|xl)/,
      /^bg-(red|green|blue|yellow|purple)-[0-9]+$/,
      /^border-(red|green|blue|yellow|purple)-[0-9]+$/
    ]
    
    return dynamicPatterns.some(pattern => pattern.test(className))
  },

  // Remove unused CSS rules from stylesheets
  removeUnusedRules() {
    const unusedClasses = this.findUnusedClasses()
    let removedCount = 0
    
    try {
      Array.from(document.styleSheets).forEach(sheet => {
        try {
          const rules = Array.from(sheet.cssRules || sheet.rules || [])
          
          for (let i = rules.length - 1; i >= 0; i--) {
            const rule = rules[i]
            
            if (rule.type === CSSRule.STYLE_RULE) {
              const hasUnusedClass = this.ruleContainsUnusedClasses(rule.selectorText, unusedClasses)
              
              if (hasUnusedClass && this.canSafelyRemoveRule(rule.selectorText)) {
                sheet.deleteRule(i)
                removedCount++
              }
            }
          }
        } catch (e) {
          console.warn('Cannot modify stylesheet:', e)
        }
      })
    } catch (e) {
      console.warn('Error removing unused rules:', e)
    }
    
    console.log(`Removed ${removedCount} unused CSS rules`)
    return removedCount
  },

  // Check if a CSS rule contains unused classes
  ruleContainsUnusedClasses(selectorText, unusedClasses) {
    const classMatches = selectorText.match(/\.[a-zA-Z0-9_-]+/g)
    if (!classMatches) return false
    
    return classMatches.some(match => {
      const className = match.substring(1)
      return unusedClasses.has(className)
    })
  },

  // Check if it's safe to remove a CSS rule
  canSafelyRemoveRule(selectorText) {
    // Don't remove rules that might affect critical functionality
    const criticalSelectors = [
      // Base HTML elements
      /^(html|body|div|span|p|h[1-6]|a|img|svg)/,
      // Pseudo-classes that might be used
      /:hover/, /:focus/, /:active/, /:disabled/,
      // Critical CSS classes
      /loading/, /error/, /success/, /warning/,
      // Accessibility classes
      /sr-only/, /screen-reader/, /visually-hidden/
    ]
    
    return !criticalSelectors.some(pattern => pattern.test(selectorText))
  },

  // Schedule periodic cleanup
  scheduleCleanup() {
    // Clean up unused CSS after initial page load
    if (document.readyState === 'loading') {
      window.addEventListener('load', () => {
        setTimeout(() => this.performCleanup(), 5000)
      })
    } else {
      setTimeout(() => this.performCleanup(), 5000)
    }
    
    // Periodic cleanup for SPAs
    setInterval(() => this.performCleanup(), 30000) // Every 30 seconds
  },

  // Perform CSS cleanup
  performCleanup() {
    console.log('Starting CSS cleanup...')
    
    const beforeSize = this.estimateStylesheetSize()
    const unusedClasses = this.findUnusedClasses()
    
    console.log(`Found ${unusedClasses.size} unused CSS classes:`, Array.from(unusedClasses))
    
    // Only remove rules if we found a significant number of unused classes
    if (unusedClasses.size > 10) {
      const removedRules = this.removeUnusedRules()
      const afterSize = this.estimateStylesheetSize()
      
      console.log(`CSS optimization complete:`)
      console.log(`- Removed ${removedRules} rules`)
      console.log(`- Estimated size reduction: ${beforeSize - afterSize} characters`)
    }
  },

  // Estimate total size of stylesheets
  estimateStylesheetSize() {
    let totalSize = 0
    
    try {
      Array.from(document.styleSheets).forEach(sheet => {
        try {
          Array.from(sheet.cssRules || sheet.rules || []).forEach(rule => {
            if (rule.cssText) {
              totalSize += rule.cssText.length
            }
          })
        } catch (e) {
          // Skip inaccessible stylesheets
        }
      })
    } catch (e) {
      console.warn('Error estimating stylesheet size:', e)
    }
    
    return totalSize
  },

  // Generate report of CSS usage
  generateUsageReport() {
    const definedClasses = this.getAllDefinedClasses()
    const unusedClasses = this.findUnusedClasses()
    const usedCount = this.usedClasses.size
    const totalCount = definedClasses.size
    const unusedCount = unusedClasses.size
    
    return {
      total: totalCount,
      used: usedCount,
      unused: unusedCount,
      usagePercentage: ((usedCount / totalCount) * 100).toFixed(2),
      unusedClasses: Array.from(unusedClasses).sort(),
      usedClasses: Array.from(this.usedClasses).sort(),
      recommendations: this.generateRecommendations(unusedCount, totalCount)
    }
  },

  // Generate optimization recommendations
  generateRecommendations(unusedCount, totalCount) {
    const recommendations = []
    
    if (unusedCount > totalCount * 0.3) {
      recommendations.push('Consider reviewing your CSS architecture - over 30% of classes are unused')
    }
    
    if (unusedCount > 50) {
      recommendations.push('High number of unused classes detected - consider using CSS purging tools')
    }
    
    if (this.usedClasses.size < 50) {
      recommendations.push('Low CSS usage detected - consider inlining critical styles')
    }
    
    recommendations.push('Use CSS-in-JS or scoped styles to avoid unused CSS')
    recommendations.push('Implement tree-shaking for your CSS framework')
    
    return recommendations
  },

  // Export unused classes for analysis
  exportUnusedClasses() {
    const report = this.generateUsageReport()
    const exportData = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      ...report
    }
    
    return JSON.stringify(exportData, null, 2)
  },

  // Force cleanup (for manual triggering)
  forceCleanup() {
    this.performCleanup()
    return this.generateUsageReport()
  }
}

// CSS optimization for Vue applications
export const vueCSSOptimizer = {
  // Track CSS classes used by Vue components
  trackComponentClasses(componentInstance) {
    if (!componentInstance.$el) return
    
    cssOptimizer.trackDescendantClasses(componentInstance.$el)
  },

  // Vue directive for tracking CSS usage
  vTrackCSS: {
    mounted(el) {
      cssOptimizer.trackDescendantClasses(el)
    },
    
    updated(el) {
      cssOptimizer.trackDescendantClasses(el)
    }
  },

  // Mixin for automatic CSS tracking
  cssTrackingMixin: {
    mounted() {
      this.$nextTick(() => {
        vueCSSOptimizer.trackComponentClasses(this)
      })
    },
    
    updated() {
      this.$nextTick(() => {
        vueCSSOptimizer.trackComponentClasses(this)
      })
    }
  }
}

// Auto-initialize if in browser environment
if (typeof window !== 'undefined') {
  // Initialize CSS optimizer after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      cssOptimizer.init()
    })
  } else {
    cssOptimizer.init()
  }
  
  // Make available globally for debugging
  window.cssOptimizer = cssOptimizer
}