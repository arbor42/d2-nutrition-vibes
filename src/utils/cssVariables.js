// CSS Variables utility for dynamic theming
export const cssVariables = {
  // Primary theme colors
  primary: {
    50: 'var(--color-primary-50, #f0f9f5)',
    100: 'var(--color-primary-100, #dcf2e8)',
    200: 'var(--color-primary-200, #bee5d4)',
    300: 'var(--color-primary-300, #8dd1b6)',
    400: 'var(--color-primary-400, #54b592)',
    500: 'var(--color-primary-500, #27ae60)',
    600: 'var(--color-primary-600, #1e8b4f)',
    700: 'var(--color-primary-700, #1a6e41)',
    800: 'var(--color-primary-800, #175736)',
    900: 'var(--color-primary-900, #14482e)',
    950: 'var(--color-primary-950, #0a291a)'
  },

  // Secondary theme colors
  secondary: {
    50: 'var(--color-secondary-50, #eff8ff)',
    100: 'var(--color-secondary-100, #daeeff)',
    200: 'var(--color-secondary-200, #bee1ff)',
    300: 'var(--color-secondary-300, #91ceff)',
    400: 'var(--color-secondary-400, #5eb0fd)',
    500: 'var(--color-secondary-500, #3498db)',
    600: 'var(--color-secondary-600, #2980b9)',
    700: 'var(--color-secondary-700, #21618c)',
    800: 'var(--color-secondary-800, #1f5274)',
    900: 'var(--color-secondary-900, #1e4460)',
    950: 'var(--color-secondary-950, #162a40)'
  },

  // Visualization specific colors
  viz: {
    production: {
      50: 'var(--color-viz-production-50, #f7fcf0)',
      100: 'var(--color-viz-production-100, #e0f3db)',
      200: 'var(--color-viz-production-200, #ccebc5)',
      300: 'var(--color-viz-production-300, #a8ddb5)',
      400: 'var(--color-viz-production-400, #7bccc4)',
      500: 'var(--color-viz-production-500, #4eb3d3)',
      600: 'var(--color-viz-production-600, #2b8cbe)',
      700: 'var(--color-viz-production-700, #0868ac)',
      800: 'var(--color-viz-production-800, #084081)',
      900: 'var(--color-viz-production-900, #08306b)'
    },
    forecast: {
      50: 'var(--color-viz-forecast-50, #fff7ec)',
      100: 'var(--color-viz-forecast-100, #fee8c8)',
      200: 'var(--color-viz-forecast-200, #fdd49e)',
      300: 'var(--color-viz-forecast-300, #fdbb84)',
      400: 'var(--color-viz-forecast-400, #fc8d59)',
      500: 'var(--color-viz-forecast-500, #ef6548)',
      600: 'var(--color-viz-forecast-600, #d7301f)',
      700: 'var(--color-viz-forecast-700, #b30000)',
      800: 'var(--color-viz-forecast-800, #7f0000)',
      900: 'var(--color-viz-forecast-900, #4a0000)'
    },
    analysis: {
      50: 'var(--color-viz-analysis-50, #f7f4f9)',
      100: 'var(--color-viz-analysis-100, #e7e1ef)',
      200: 'var(--color-viz-analysis-200, #d4c4df)',
      300: 'var(--color-viz-analysis-300, #c2a2c8)',
      400: 'var(--color-viz-analysis-400, #a876b0)',
      500: 'var(--color-viz-analysis-500, #8e4b99)',
      600: 'var(--color-viz-analysis-600, #7a2182)',
      700: 'var(--color-viz-analysis-700, #5f1a6b)',
      800: 'var(--color-viz-analysis-800, #4a1554)',
      900: 'var(--color-viz-analysis-900, #35113d)'
    }
  },

  // Spacing variables
  spacing: {
    xs: 'var(--spacing-xs, 0.25rem)',
    sm: 'var(--spacing-sm, 0.5rem)',
    md: 'var(--spacing-md, 1rem)',
    lg: 'var(--spacing-lg, 1.5rem)',
    xl: 'var(--spacing-xl, 2rem)',
    '2xl': 'var(--spacing-2xl, 3rem)',
    '3xl': 'var(--spacing-3xl, 4rem)'
  },

  // Typography
  fontSize: {
    xs: 'var(--font-size-xs, 0.75rem)',
    sm: 'var(--font-size-sm, 0.875rem)',
    base: 'var(--font-size-base, 1rem)',
    lg: 'var(--font-size-lg, 1.125rem)',
    xl: 'var(--font-size-xl, 1.25rem)',
    '2xl': 'var(--font-size-2xl, 1.5rem)',
    '3xl': 'var(--font-size-3xl, 1.875rem)',
    '4xl': 'var(--font-size-4xl, 2.25rem)'
  },

  // Border radius
  borderRadius: {
    none: 'var(--border-radius-none, 0)',
    sm: 'var(--border-radius-sm, 0.25rem)',
    md: 'var(--border-radius-md, 0.375rem)',
    lg: 'var(--border-radius-lg, 0.5rem)',
    xl: 'var(--border-radius-xl, 0.75rem)',
    '2xl': 'var(--border-radius-2xl, 1rem)',
    full: 'var(--border-radius-full, 9999px)'
  },

  // Shadows
  boxShadow: {
    sm: 'var(--shadow-sm, 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1))',
    md: 'var(--shadow-md, 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1))',
    lg: 'var(--shadow-lg, 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1))',
    xl: 'var(--shadow-xl, 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1))'
  }
}

// Theme management utilities
export const themeManager = {
  // Set CSS variables for dynamic theming
  setTheme(theme) {
    const root = document.documentElement
    
    // Apply color variables
    Object.entries(theme.colors || {}).forEach(([colorName, colorValues]) => {
      if (typeof colorValues === 'object') {
        Object.entries(colorValues).forEach(([shade, value]) => {
          root.style.setProperty(`--color-${colorName}-${shade}`, value)
        })
      } else {
        root.style.setProperty(`--color-${colorName}`, colorValues)
      }
    })

    // Apply spacing variables
    Object.entries(theme.spacing || {}).forEach(([key, value]) => {
      root.style.setProperty(`--spacing-${key}`, value)
    })

    // Apply typography variables
    Object.entries(theme.fontSize || {}).forEach(([key, value]) => {
      root.style.setProperty(`--font-size-${key}`, value)
    })

    // Apply border radius variables
    Object.entries(theme.borderRadius || {}).forEach(([key, value]) => {
      root.style.setProperty(`--border-radius-${key}`, value)
    })

    // Apply shadow variables
    Object.entries(theme.boxShadow || {}).forEach(([key, value]) => {
      root.style.setProperty(`--shadow-${key}`, value)
    })
  },

  // Get current theme
  getCurrentTheme() {
    const root = document.documentElement
    const computedStyle = getComputedStyle(root)
    
    const theme = {}
    
    // Extract all CSS variables
    const allProperties = Array.from(computedStyle).filter(prop => prop.startsWith('--'))
    
    allProperties.forEach(prop => {
      const value = computedStyle.getPropertyValue(prop).trim()
      const key = prop.substring(2) // Remove '--' prefix
      
      // Parse nested structure
      const parts = key.split('-')
      let current = theme
      
      for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) {
          current[parts[i]] = {}
        }
        current = current[parts[i]]
      }
      
      current[parts[parts.length - 1]] = value
    })
    
    return theme
  },

  // Toggle between light and dark themes
  toggleDarkMode() {
    const isDark = document.documentElement.classList.contains('dark')
    
    if (isDark) {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    } else {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    }
    
    return !isDark
  },

  // Initialize theme from localStorage or system preference
  initTheme() {
    const savedTheme = localStorage.getItem('theme')
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    
    const shouldUseDark = savedTheme === 'dark' || (!savedTheme && systemPrefersDark)
    
    if (shouldUseDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    
    return shouldUseDark ? 'dark' : 'light'
  },

  // Create custom theme variations
  createThemeVariation(baseTheme, variations) {
    const theme = JSON.parse(JSON.stringify(baseTheme)) // Deep clone
    
    Object.entries(variations).forEach(([path, value]) => {
      const keys = path.split('.')
      let current = theme
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {}
        }
        current = current[keys[i]]
      }
      
      current[keys[keys.length - 1]] = value
    })
    
    return theme
  },

  // Export theme for sharing or saving
  exportTheme() {
    const theme = this.getCurrentTheme()
    const exportData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      theme
    }
    
    return JSON.stringify(exportData, null, 2)
  },

  // Import theme from JSON
  importTheme(themeJSON) {
    try {
      const importData = JSON.parse(themeJSON)
      
      if (importData.version && importData.theme) {
        this.setTheme(importData.theme)
        return true
      }
      
      return false
    } catch (error) {
      console.error('Failed to import theme:', error)
      return false
    }
  }
}

// Predefined themes
export const themes = {
  light: {
    colors: {
      primary: {
        50: '#f0f9f5',
        100: '#dcf2e8',
        200: '#bee5d4',
        300: '#8dd1b6',
        400: '#54b592',
        500: '#27ae60',
        600: '#1e8b4f',
        700: '#1a6e41',
        800: '#175736',
        900: '#14482e'
      },
      background: '#ffffff',
      foreground: '#0f172a',
      muted: '#f8fafc',
      border: '#e2e8f0'
    }
  },
  
  dark: {
    colors: {
      primary: {
        50: '#0a291a',
        100: '#14482e',
        200: '#175736',
        300: '#1a6e41',
        400: '#1e8b4f',
        500: '#27ae60',
        600: '#54b592',
        700: '#8dd1b6',
        800: '#bee5d4',
        900: '#dcf2e8'
      },
      background: '#0f172a',
      foreground: '#f8fafc',
      muted: '#1e293b',
      border: '#334155'
    }
  },

  high_contrast: {
    colors: {
      primary: {
        500: '#000000'
      },
      background: '#ffffff',
      foreground: '#000000',
      muted: '#f0f0f0',
      border: '#000000'
    }
  }
}

// Accessibility helpers
export const a11yHelpers = {
  // Check if current theme has sufficient contrast
  checkContrast(foreground, background) {
    // This is a simplified contrast check
    // In production, you'd want to use a proper color contrast library
    const getLuminance = (color) => {
      // Convert hex to RGB and calculate relative luminance
      const rgb = parseInt(color.replace('#', ''), 16)
      const r = (rgb >> 16) & 0xff
      const g = (rgb >> 8) & 0xff
      const b = (rgb >> 0) & 0xff
      
      return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
    }
    
    const l1 = getLuminance(foreground)
    const l2 = getLuminance(background)
    
    const contrast = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
    
    return {
      ratio: contrast,
      passes: {
        AA: contrast >= 4.5,
        AAA: contrast >= 7
      }
    }
  },

  // Apply high contrast theme if needed
  applyHighContrastIfNeeded() {
    const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches
    
    if (prefersHighContrast) {
      themeManager.setTheme(themes.high_contrast)
      return true
    }
    
    return false
  }
}