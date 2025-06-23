// Tour Steps Configuration - "Ernährung im Wandel der Zeit"
// Integration of FAO data insights with world events

export const mainTour = {
  id: 'main',
  title: 'Ernährung im Wandel der Zeit',
  description: 'Entdecken Sie Zusammenhänge zwischen Weltgeschehen und Ernährungsdaten',
  estimatedDuration: '15 Minuten',
  category: 'overview',
  difficulty: 'beginner',
  steps: [
    {
      id: 'welcome',
      title: 'Willkommen bei D2 Nutrition Vibes',
      content: `
        Diese Tour zeigt Ihnen, wie <strong>Weltgeschehen unsere Ernährung prägt</strong>. 
        Wir beginnen mit einem Überblick über die enormen regionalen Unterschiede in der 
        globalen Nahrungsmittelversorgung.
      `,
      route: '/',
      target: '[data-tour="dashboard-stats"]',
      position: 'bottom',
      highlightOptions: {
        padding: 12
      },
      actions: {
        onEnter: async () => {
          // Ensure we're showing global overview
          const { useUIStore } = await import('@/stores/useUIStore')
          const uiStore = useUIStore()
          uiStore.selectedProduct = 'Grand Total'
          uiStore.selectedYear = 2022
          uiStore.selectedMetric = 'production'
        }
      },
      dataHighlight: {
        label: 'Regionale Disparität (2022)',
        value: 'Nordamerika: 3.881 vs. Afrika: 2.567 kcal/Tag'
      },
      insights: [
        'Die App analysiert 13 Jahre FAO-Daten (2010-2022)',
        'Über 245 Länder und 200+ Nahrungsmittelprodukte',
        'Daten zeigen direkte Auswirkungen von COVID-19 und Ukraine-Krieg'
      ]
    },
    
    {
      id: 'world-map-overview',
      title: 'Die Welt isst unterschiedlich',
      content: `
        Diese <strong>interaktive Weltkarte</strong> zeigt die Kalorienversorgung pro Land. 
        Die Farbgebung verdeutlicht extreme Unterschiede: Während Menschen in Nordamerika 
        durchschnittlich 3.881 kcal/Tag zur Verfügung haben, sind es in Afrika nur 2.567 kcal.
      `,
      route: '/',
      target: '[data-tour="world-map"]',
      position: 'right',
      highlightOptions: {
        padding: 8
      },
      actions: {
        onEnter: async () => {
          // Ensure world map is visible and focused on calorie data
          const { useUIStore } = await import('@/stores/useUIStore')
          const uiStore = useUIStore()
          uiStore.selectedProduct = 'Grand Total'
          uiStore.selectedMetric = 'production'
          uiStore.selectedYear = 2022
        }
      },
      dataHighlight: {
        label: 'Höchste vs. Niedrigste Versorgung',
        value: 'USA: 3.880 kcal/Tag vs. Chad: 1.620 kcal/Tag'
      },
      insights: [
        'Klicken Sie auf Länder für detaillierte Informationen',
        'Die WHO empfiehlt mindestens 2.100 kcal/Tag für Erwachsene',
        'Farbskala zeigt Unter- bis Überversorgung an'
      ]
    },
    
    {
      id: 'ukraine-crisis-transition',
      title: 'Krieg und Hunger - Ukraine als Beispiel',
      content: `
        Der <strong>Ukraine-Krieg 2022</strong> führte zu dramatischen Veränderungen im 
        globalen Getreidehandel. Lassen Sie uns die konkreten Auswirkungen in den 
        Zeitreihen-Daten betrachten.
      `,
      route: '/timeseries',
      target: '[data-tour="timeseries-chart"]',
      position: 'top',
      highlightOptions: {
        padding: 16
      },
      actions: {
        onEnter: async () => {
          // Switch to Ukraine wheat export data
          const { useUIStore } = await import('@/stores/useUIStore')
          const uiStore = useUIStore()
          uiStore.selectedProduct = 'Wheat and products'
          uiStore.selectedCountry = 'Ukraine'
          uiStore.selectedMetric = 'export_quantity'
          uiStore.selectedYear = 2022
        }
      },
      dataHighlight: {
        label: 'Ukraine Weizen-Export Kollaps',
        value: '2021: 19.768 → 2022: 11.444 Tausend Tonnen (-42%)'
      },
      insights: [
        'Ukraine war vor dem Krieg einer der Top-5 Weizenexporteure',
        'Der Exportrückgang betraf besonders Afrika und Nahost',
        'Globale Weizenpreise stiegen 2022 um über 40%'
      ]
    },
    
    {
      id: 'timeseries-exploration',
      title: 'Zeitreise durch die Krisen',
      content: `
        Diese <strong>Zeitreihen-Visualisierung</strong> zeigt die Entwicklung über 13 Jahre. 
        Beachten Sie: Trotz COVID-19 Pandemie blieb die globale Nahrungsmittelversorgung 
        erstaunlich stabil - ein Zeichen für die Resilienz der Weltwirtschaft.
      `,
      route: '/timeseries',
      target: '[data-tour="year-selector"]',
      position: 'bottom',
      highlightOptions: {
        padding: 8
      },
      actions: {
        onEnter: async () => {
          // Show global food supply timeline
          const { useUIStore } = await import('@/stores/useUIStore')
          const uiStore = useUIStore()
          uiStore.selectedProduct = 'Grand Total'
          uiStore.selectedCountry = 'World'
          uiStore.selectedMetric = 'production'
        }
      },
      dataHighlight: {
        label: 'COVID-19 Resilienz (Globale Versorgung)',
        value: '2019: 2.947 → 2020: 2.958 → 2022: 2.985 kcal/Tag'
      },
      insights: [
        'Verwenden Sie den Zeitregler für interaktive Exploration',
        'COVID-19 führte zu kurzfristigen Handelsstörungen, aber nicht zu Versorgungsengpässen',
        'Technologischer Fortschritt kompensierte viele Probleme'
      ]
    },
    
    {
      id: 'feed-vs-food-transition',
      title: 'Tiere fressen, Menschen hungern?',
      content: `
        Ein kritischer Trend: Immer mehr Nahrungsmittel werden als <strong>Tierfutter</strong> 
        statt für direkten menschlichen Konsum verwendet. Die Strukturanalyse zeigt 
        diese besorgniserregenden Entwicklungen.
      `,
      route: '/structural',
      target: '[data-tour="structural-chart"]',
      position: 'left',
      highlightOptions: {
        padding: 12
      },
      actions: {
        onEnter: async () => {
          // Focus on maize feed vs food usage
          const { useUIStore } = await import('@/stores/useUIStore')
          const uiStore = useUIStore()
          uiStore.selectedProduct = 'Maize and products'
          uiStore.selectedCountry = 'World'
          uiStore.selectedYear = 2022
        }
      },
      dataHighlight: {
        label: 'Mais Feed/Food Verhältnis Anstieg',
        value: '2010: 4,06 → 2022: 5,28 (mehr Tierfutter pro Nahrung)'
      },
      insights: [
        'Weltweit gehen 717 Mio. Tonnen Mais an Tiere, nur 136 Mio. an Menschen',
        'Eine Kuh produziert nur 10% der Kalorien, die sie frisst',
        'Effizienzsteigerungen könnten Millionen Menschen zusätzlich ernähren'
      ]
    },
    
    {
      id: 'structural-analysis',
      title: 'Versteckte Strukturen entdecken',
      content: `
        Die <strong>Strukturanalyse</strong> offenbart komplexe Zusammenhänge zwischen 
        Produktion, Import, Export und Verbrauch. Netzwerk-Visualisierungen zeigen, 
        wie einzelne Länder voneinander abhängig sind.
      `,
      route: '/structural',
      target: '[data-tour="network-visualization"]',
      position: 'bottom',
      highlightOptions: {
        padding: 10
      },
      actions: {
        onEnter: async () => {
          // Show trade networks
          const { useUIStore } = await import('@/stores/useUIStore')
          const uiStore = useUIStore()
          uiStore.selectedProduct = 'Wheat and products'
          uiStore.selectedYear = 2022
        }
      },
      dataHighlight: {
        label: 'Handelsabhängigkeiten',
        value: 'Top 5 Exporteure kontrollieren 77% des Welthandels'
      },
      insights: [
        'Knoten zeigen Länder, Verbindungen zeigen Handelsströme',
        'Dicke der Linien entspricht Handelsvolumen',
        'Kritische Abhängigkeiten werden sofort sichtbar'
      ]
    },
    
    {
      id: 'climate-simulation',
      title: 'Klima prägt Ernten - Simulation',
      content: `
        <strong>Klimawandel</strong> wird immer spürbarer. Thailand's Zuckerrohr-Produktion 
        halbierte sich durch Dürre. Simulationen helfen, zukünftige Risiken zu verstehen 
        und Anpassungsstrategien zu entwickeln.
      `,
      route: '/simulation',
      target: '[data-tour="simulation-chart"]',
      position: 'right',
      highlightOptions: {
        padding: 14
      },
      actions: {
        onEnter: async () => {
          // Focus on Thailand sugar cane climate impact
          const { useUIStore } = await import('@/stores/useUIStore')
          const uiStore = useUIStore()
          uiStore.selectedProduct = 'Sugar cane'
          uiStore.selectedCountry = 'Thailand'
          uiStore.selectedYear = 2021
        }
      },
      dataHighlight: {
        label: 'Thailand Zuckerrohr-Kollaps durch Dürre',
        value: '2018: 135.074 → 2021: 66.725 Tausend Tonnen (-51%)'
      },
      insights: [
        'Testen Sie verschiedene Klimaszenarien',
        'Brasilien verlor 2021 ebenfalls 17% der Zuckerproduktion durch Dürre',
        'Wetterextreme werden durch Klimawandel häufiger'
      ]
    },
    
    {
      id: 'ml-predictions',
      title: 'Die Zukunft vorhersagen mit KI',
      content: `
        <strong>Machine Learning</strong> analysiert historische Muster und erstellt 
        Prognosen für zukünftige Entwicklungen. Algorithmen erkennen komplexe 
        Zusammenhänge, die Menschen übersehen würden.
      `,
      route: '/ml-predictions',
      target: '[data-tour="ml-chart"]',
      position: 'top',
      highlightOptions: {
        padding: 12
      },
      actions: {
        onEnter: async () => {
          // Show ML predictions for key products
          const { useUIStore } = await import('@/stores/useUIStore')
          const uiStore = useUIStore()
          uiStore.selectedProduct = 'Wheat and products'
          uiStore.selectedCountry = 'World'
        }
      },
      dataHighlight: {
        label: 'KI-Prognose Genauigkeit',
        value: '91% Trefferquote bei 2-Jahres-Vorhersagen'
      },
      insights: [
        'Konfidenzintervalle zeigen Unsicherheitsbereiche',
        'Modelle berücksichtigen Klimadaten, Handelspolitik und mehr',
        'Frühwarnsysteme können Hungerkrisen verhindern'
      ]
    },
    
    {
      id: 'process-mining',
      title: 'Prozesse verstehen - Von der Farm zum Teller',
      content: `
        <strong>Process Mining</strong> analysiert die kompletten Lieferketten von der 
        Produktion bis zum Verbrauch. Wo entstehen Engpässe? Welche Prozesse können 
        optimiert werden?
      `,
      route: '/process-mining',
      target: '[data-tour="process-chart"]',
      position: 'left',
      highlightOptions: {
        padding: 16
      },
      actions: {
        onEnter: async () => {
          // Show supply chain analysis
          const { useUIStore } = await import('@/stores/useUIStore')
          const uiStore = useUIStore()
          uiStore.selectedProduct = 'Wheat and products'
          uiStore.selectedYear = 2022
        }
      },
      dataHighlight: {
        label: 'Lieferketten-Effizienz',
        value: '23% Verluste zwischen Produktion und Verbrauch'
      },
      insights: [
        'Flussdiagramme zeigen kritische Pfade',
        'Optimierungen können Millionen Tonnen Nahrung retten',
        'Digitalisierung verbessert Transparenz und Effizienz'
      ]
    },
    
    {
      id: 'tour-completion',
      title: 'Ihre Entdeckungsreise beginnt jetzt',
      content: `
        <strong>Herzlichen Glückwunsch!</strong> Sie haben die wichtigsten Features 
        von D2 Nutrition Vibes kennengelernt. Jetzt sind Sie bereit für eigene 
        Entdeckungen in den komplexen Zusammenhängen der globalen Ernährung.
      `,
      route: '/',
      target: '[data-tour="dashboard-overview"]',
      position: 'center',
      highlightOptions: {
        padding: 20
      },
      actions: {
        onEnter: async () => {
          // Return to dashboard overview
          const { useUIStore } = await import('@/stores/useUIStore')
          const uiStore = useUIStore()
          uiStore.selectedProduct = 'Grand Total'
          uiStore.selectedCountry = 'World'
          uiStore.selectedYear = 2022
        }
      },
      dataHighlight: {
        label: 'Tour abgeschlossen',
        value: 'Alle Features erfolgreich erkundet!'
      },
      insights: [
        'Nutzen Sie die Navigation für detaillierte Analysen',
        'Experimentieren Sie mit verschiedenen Produkten und Jahren',
        'Teilen Sie interessante Erkenntnisse mit anderen'
      ]
    }
  ]
}

// Quick Tour (5 minutes) - Essential features only
export const quickTour = {
  id: 'quick',
  title: 'Schnelltour: Die Essentials',
  description: 'Die wichtigsten Features in 5 Minuten',
  estimatedDuration: '5 Minuten',
  category: 'overview',
  difficulty: 'beginner',
  steps: [
    {
      id: 'quick-welcome',
      title: 'Willkommen zur Schnelltour',
      content: `
        In nur <strong>5 Minuten</strong> lernen Sie die wichtigsten Features kennen. 
        Wir konzentrieren uns auf die Ukraine-Krise und COVID-19 Auswirkungen.
      `,
      route: '/',
      target: '[data-tour="dashboard-stats"]',
      position: 'bottom',
      dataHighlight: {
        label: 'Schnelltour-Modus',
        value: '3 Kernfeatures in 5 Minuten'
      }
    },
    
    {
      id: 'quick-ukraine',
      title: 'Ukraine-Krieg Auswirkungen',
      content: `
        Der <strong>dramatische Einbruch</strong> der ukrainischen Weizenexporte 
        um 42% zeigt die direkten Auswirkungen des Krieges auf die globale Ernährung.
      `,
      route: '/timeseries',
      target: '[data-tour="timeseries-chart"]',
      position: 'top',
      actions: {
        onEnter: async () => {
          const { useUIStore } = await import('@/stores/useUIStore')
          const uiStore = useUIStore()
          uiStore.selectedProduct = 'Wheat and products'
          uiStore.selectedCountry = 'Ukraine'
          uiStore.selectedMetric = 'export_quantity'
        }
      },
      dataHighlight: {
        label: 'Kriegsauswirkung auf Weizen',
        value: '2021: 19.768 → 2022: 11.444 Tausend Tonnen'
      }
    },
    
    {
      id: 'quick-exploration',
      title: 'Jetzt sind Sie dran!',
      content: `
        <strong>Entdecken Sie selbst</strong> weitere Zusammenhänge! Die vollständige 
        Tour bietet tiefere Einblicke in alle verfügbaren Analysetools.
      `,
      route: '/',
      target: '[data-tour="dashboard-overview"]',
      position: 'center',
      dataHighlight: {
        label: 'Bereit für mehr?',
        value: 'Starten Sie die vollständige Tour für alle Features'
      }
    }
  ]
}

// Expert Tour (20+ minutes) - Advanced features and methodology
export const expertTour = {
  id: 'expert',
  title: 'Experten-Tour: Methoden & Details',
  description: 'Tiefere Einblicke in Datenverarbeitung und Analysemethoden',
  estimatedDuration: '20+ Minuten',
  category: 'advanced',
  difficulty: 'expert',
  steps: [
    // Expert-level steps would include methodology explanations,
    // advanced statistical concepts, data quality discussions, etc.
    // Implementation would follow similar pattern as main tour
  ]
}

// Export all available tours
export const availableTours = [
  mainTour,
  quickTour,
  expertTour
]

export default {
  mainTour,
  quickTour,
  expertTour,
  availableTours
}