// Global Tour Configuration
export const tourConfig = {
  // Animation settings
  animations: {
    defaultDuration: 300,
    easingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
    spotlightTransition: 'all 0.3s ease',
    tooltipTransition: 'all 0.3s ease-out',
    enableAnimations: true, // Can be disabled for performance/accessibility
  },
  
  // Tooltip positioning
  tooltip: {
    defaultWidth: 400,
    defaultHeight: 200,
    padding: 20,
    arrowSize: 8,
    preferredPositions: ['bottom', 'top', 'right', 'left'],
    autoPosition: true,
    constrainToViewport: true
  },
  
  // Spotlight settings
  spotlight: {
    defaultPadding: 8,
    borderRadius: 8,
    shadowColor: 'rgba(0, 0, 0, 0.6)',
    shadowBlur: '9999px',
    glowColor: 'rgba(59, 130, 246, 0.5)',
    glowSize: 20,
    pulseAnimation: true
  },
  
  // Navigation settings
  navigation: {
    enableKeyboardNav: true,
    enableEscapeKey: true,
    enableArrowKeys: true,
    autoAdvanceTimeout: null, // null = no auto-advance
    showProgressBar: true,
    showStepIndicators: true,
    maxStepIndicators: 10 // Only show indicators for tours with <= 10 steps
  },
  
  // Persistence settings
  persistence: {
    saveProgress: true,
    savePreferences: true,
    storagePrefix: 'tour-',
    storageKeys: {
      completed: 'completed',
      progress: 'progress',
      preferences: 'preferences',
      seenIntro: 'seen-intro',
      skipAnimations: 'skip-animations'
    }
  },
  
  // Analytics/tracking
  analytics: {
    enabled: true,
    trackEvents: [
      'tour_started',
      'tour_completed',
      'tour_skipped',
      'tour_paused',
      'tour_resumed',
      'step_changed',
      'step_skipped',
      'error_occurred'
    ],
    provider: 'console', // 'console', 'gtag', 'custom'
    customProvider: null // Function for custom analytics
  },
  
  // Performance settings
  performance: {
    debounceDelay: 250,
    elementWaitTimeout: 5000,
    routeTransitionDelay: 300,
    observerThrottling: true,
    useRequestAnimationFrame: true
  },
  
  // Accessibility settings
  accessibility: {
    respectPrefersReducedMotion: true,
    keyboardNavigation: true,
    screenReaderSupport: true,
    highContrastMode: false,
    focusManagement: true,
    ariaLabels: {
      tourOverlay: 'Interaktive Tour',
      tooltip: 'Tour-Schritt Information',
      nextButton: 'Nächster Schritt',
      previousButton: 'Vorheriger Schritt',
      closeButton: 'Tour beenden',
      skipButton: 'Tour überspringen',
      pauseButton: 'Tour pausieren',
      progressBar: 'Tour-Fortschritt'
    }
  },
  
  // Responsive settings
  responsive: {
    mobileBreakpoint: 640,
    tabletBreakpoint: 768,
    desktopBreakpoint: 1024,
    mobile: {
      tooltip: {
        maxWidth: 'calc(100vw - 2rem)',
        padding: 16,
        fontSize: '14px'
      },
      spotlight: {
        padding: 4
      }
    },
    tablet: {
      tooltip: {
        maxWidth: 350,
        padding: 20
      }
    }
  },
  
  // Error handling
  errorHandling: {
    enableRetries: true,
    maxRetries: 3,
    retryDelay: 1000,
    fallbackToNextStep: true,
    logErrors: true,
    showErrorMessages: false, // Don't show technical errors to users
    gracefulDegradation: true
  },
  
  // Customization
  customization: {
    theme: 'auto', // 'light', 'dark', 'auto'
    primaryColor: '#3b82f6',
    accentColor: '#10b981',
    borderRadius: '8px',
    fontFamily: 'inherit',
    customCSS: null
  },
  
  // Integration settings
  integration: {
    vue: {
      injectGlobally: true,
      globalProperty: '$tour',
      provideKey: 'tourService'
    },
    router: {
      enableRouteGuards: true,
      preserveQueryParams: false,
      smoothTransitions: true
    },
    stores: {
      reactToChanges: true,
      autoSyncState: true
    }
  },
  
  // Development/debugging
  debug: {
    enabled: process.env.NODE_ENV === 'development',
    verbose: false,
    logStepChanges: true,
    logErrors: true,
    showElementBounds: false,
    highlightTargetElements: false
  }
}

// Tour type definitions
export const tourTypes = {
  OVERVIEW: 'overview',
  FEATURE: 'feature',
  ONBOARDING: 'onboarding',
  ADVANCED: 'advanced',
  QUICK: 'quick'
}

// Tour difficulty levels
export const tourDifficulties = {
  BEGINNER: 'beginner',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced',
  EXPERT: 'expert'
}

// Default tour options
export const defaultTourOptions = {
  autoStart: false,
  startStep: 0,
  skipAnimations: false,
  showIntro: true,
  enableKeyboard: true,
  enableProgress: true,
  pauseOnRouteChange: false,
  resumeOnRouteComplete: true
}

// Tour event types
export const tourEventTypes = {
  STARTED: 'tour:started',
  STOPPED: 'tour:stopped',
  PAUSED: 'tour:paused',
  RESUMED: 'tour:resumed',
  STEP_CHANGED: 'tour:step_changed',
  COMPLETED: 'tour:completed',
  SKIPPED: 'tour:skipped',
  ERROR: 'tour:error'
}

export default tourConfig