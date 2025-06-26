// Tour Steps Configuration - "Ernährung im Wandel der Zeit"
// Integration of FAO data insights with world events

export const mainTour = {
  id: 'main',
  title: 'Ernährung im Wandel der Zeit',
  description: 'Entdecken Sie wie Weltgeschehen unsere Ernährung prägt - von COVID-19 über den Ukraine-Krieg bis zu Klimaextremen',
  estimatedDuration: '12-15 Minuten',
  category: 'overview',
  difficulty: 'beginner',
  steps: [
    {
      id: 'welcome',
      title: 'Willkommen bei D2 Nutrition Vibes',
      content: `
        Diese Tour führt Sie durch <strong>13 Jahre globaler Ernährungsdaten</strong> (2010-2022). 
        Sie werden sehen, wie Pandemien, Kriege und Klimaextreme unsere Nahrungsmittelversorgung 
        beeinflussen. Die <strong>Zeitleiste unten</strong> begleitet uns dabei durch alle wichtigen Ereignisse.
      `,
      route: '/',
      target: '[data-tour="dashboard-stats"]',
      position: 'bottom',
      fallbackPosition: { top: 200, left: window.innerWidth / 2 - 200 },
      highlightOptions: {
        padding: 12
      },
      actions: {
        onEnter: async () => {
          const { useUIStore } = await import('@/stores/useUIStore')
          const { useTourStore } = await import('@/tour/stores/useTourStore')
          const uiStore = useUIStore()
          const tourStore = useTourStore()
          uiStore.selectedProduct = 'Cereals - Excluding Beer'
          uiStore.selectedYear = 2022
          uiStore.selectedMetric = 'production'
          // Set tour mode
          tourStore.isLoading = false
        }
      },
      dataHighlight: {
        label: 'Globale Getreideproduktion 2022',
        value: 'Über 2,8 Milliarden Tonnen'
      },
      insights: [
        'Stetiger Anstieg trotz globaler Krisen',
        'Von 2.832 kcal (2010) auf 2.985 kcal (2022)',
        'Aber große regionale Unterschiede bleiben'
      ]
    },

    {
      id: 'timeline-introduction',
      title: 'Die wichtigsten Weltereignisse',
      content: `
        In unserer Datenanalyse sehen Sie die Auswirkungen wichtiger <strong>Weltereignisse</strong> 
        auf die globale Ernährung. Von El Niño 2015/16 über COVID-19 bis zum Ukraine-Krieg 2022 - 
        jedes Ereignis hinterließ messbare Spuren.
      `,
      route: '/',
      target: '[data-tour="dashboard-stats"]',
      position: 'bottom',
      highlightOptions: {
        padding: 8
      },
      actions: {
        onEnter: async () => {
          const { useUIStore } = await import('@/stores/useUIStore')
          const uiStore = useUIStore()
          uiStore.selectedProduct = 'Cereals - Excluding Beer'
          uiStore.selectedYear = 2022
        }
      },
      insights: [
        'Klimaereignisse: El Niño, Dürren, Frost',
        'Pandemie: COVID-19 ab März 2020',
        'Konflikte: Ukraine-Krieg Februar 2022'
      ]
    },
    
    {
      id: 'regional-disparities',
      title: 'Die Welt isst unterschiedlich',
      content: `
        Diese Weltkarte zeigt extreme <strong>regionale Unterschiede</strong>. Während Nordamerika 
        mit 3.880 kcal/Tag im Überfluss lebt, kämpft Afrika mit nur 2.567 kcal/Tag. 
        Die WHO empfiehlt mindestens 2.100 kcal für Erwachsene.
      `,
      route: '/',
      target: '[data-tour="world-map"]',
      position: 'right',
      fallbackPosition: { top: 300, left: window.innerWidth / 2 - 200 },
      highlightOptions: {
        padding: 8
      },
      actions: {
        onEnter: async () => {
          const { useUIStore } = await import('@/stores/useUIStore')
          const uiStore = useUIStore()
          uiStore.selectedProduct = 'Cereals - Excluding Beer'
          uiStore.selectedMetric = 'production'
          uiStore.selectedYear = 2022
        }
      },
      dataHighlight: {
        label: 'Regionale Unterschiede',
        value: 'Große Disparitäten zwischen Kontinenten'
      },
      insights: [
        'Europa & Nordamerika: Über 3.400 kcal/Tag',
        'Asien holt auf: +9% seit 2010',
        'Afrika stagniert: Nur +0,3% in 12 Jahren'
      ]
    },

    {
      id: 'covid-impact-intro',
      title: 'COVID-19: Die erste globale Krise',
      content: `
        März 2020 - die Welt steht still. <strong>Lockdowns und Grenzschließungen</strong> 
        bedrohen die globale Nahrungsmittelversorgung. Schauen wir uns die konkreten 
        Auswirkungen in den Zeitreihen an.
      `,
      route: '/timeseries',
      target: '[data-tour="timeseries-chart"]',
      position: 'top',
      highlightOptions: {
        padding: 16
      },
      actions: {
        onEnter: async () => {
          const { useUIStore } = await import('@/stores/useUIStore')
          const { useTourStore } = await import('@/tour/stores/useTourStore')
          const uiStore = useUIStore()
          const tourStore = useTourStore()
          uiStore.selectedProduct = 'Rice and products'
          uiStore.selectedCountry = 'Viet Nam'
          uiStore.selectedMetric = 'export_quantity'
          // Focus on COVID years
          // Year range selection not supported in current UI
        }
      },
      dataHighlight: {
        label: 'Vietnam Reis-Exportstopp',
        value: 'März-April 2020: Temporärer Exportstopp'
      },
      insights: [
        'Panik-Reaktionen: Exportverbote in Asien',
        'Aber: Schnelle Erholung dank guter Ernten',
        'Globale Versorgung blieb überraschend stabil'
      ]
    },

    {
      id: 'covid-stockpiling',
      title: 'Hamstern auf Staatsebene',
      content: `
        Während der Pandemie bauten viele Länder <strong>strategische Reserven</strong> auf. 
        Besonders Entwicklungsländer legten ungewöhnlich hohe Vorräte an Reis und Mais an - 
        eine Vorsichtsmaßnahme gegen unsichere Zeiten.
      `,
      route: '/timeseries',
      target: '[data-tour="metric-selector"]',
      position: 'bottom',
      actions: {
        onEnter: async () => {
          const { useUIStore } = await import('@/stores/useUIStore')
          const uiStore = useUIStore()
          uiStore.selectedProduct = 'Rice and products'
          uiStore.selectedCountry = 'Philippines'
          uiStore.selectedMetric = 'import_quantity'
          // Year range selection not supported in current UI
        }
      },
      dataHighlight: {
        label: 'Importanstieg 2020/21',
        value: 'Philippinen: Erhöhte Reisimporte'
      },
      insights: [
        'Erhöhte Importe = Vorsorgemaßnahmen',
        'Europa baute hingegen Lager ab (-9 Mio t)',
        'China hortete weiter: 50% der Weltreserven'
      ]
    },

    {
      id: 'ukraine-crisis-wheat',
      title: 'Ukraine-Krieg: Die Kornkammer brennt',
      content: `
        Februar 2022 - Russlands Invasion erschüttert die Getreidemärkte. 
        Die Ukraine exportierte vor dem Krieg <strong>10% des Weltweizens</strong>. 
        Die Auswirkungen sind dramatisch.
      `,
      route: '/timeseries',
      target: '[data-tour="timeseries-chart"]',
      position: 'top',
      actions: {
        onEnter: async () => {
          const { useUIStore } = await import('@/stores/useUIStore')
          const { useTourStore } = await import('@/tour/stores/useTourStore')
          const uiStore = useUIStore()
          const tourStore = useTourStore()
          uiStore.selectedProduct = 'Wheat and products'
          uiStore.selectedCountry = 'Ukraine'
          uiStore.selectedMetric = 'export_quantity'
          // Year range selection not supported in current UI
          // Highlight Ukraine crisis
          uiStore.selectedYear = 2022
        }
      },
      dataHighlight: {
        label: 'Weizenexport-Kollaps',
        value: 'Ukraine-Krieg führte zu Exportrückgang'
      },
      insights: [
        'Hafenblockaden im Schwarzen Meer',
        'Getreidekorridore nur teilweise wirksam',
        'Weltweite Getreidepreise explodierten'
      ]
    },

    {
      id: 'feed-problem',
      title: 'Das Tierfutter-Dilemma',
      content: `
        Ein kritischer Trend: <strong>41% des weltweiten Getreides</strong> landet in 
        Futtertrögen statt auf Tellern. Seit 2010 stieg der Futterverbrauch um 40% - 
        während Menschen hungern.
      `,
      route: '/',
      target: '[data-tour="feed-usage"]',
      position: 'left',
      highlightOptions: {
        padding: 12
      },
      actions: {
        onEnter: async () => {
          const { useUIStore } = await import('@/stores/useUIStore')
          const uiStore = useUIStore()
          uiStore.selectedProduct = 'Maize and products'
          uiStore.selectedMetric = 'feed'
          uiStore.selectedYear = 2022
        }
      },
      dataHighlight: {
        label: 'Mais als Tierfutter',
        value: '2022: 717 Mio. Tonnen (+47% seit 2010)'
      },
      insights: [
        'China verfüttert 222 Mio. t Mais (2022)',
        'USA: 138 Mio. t - gleichbleibend hoch',
        'Nur 48% des Getreides für Menschen'
      ]
    },

    {
      id: 'ml-predictions',
      title: 'KI blickt in die Zukunft',
      content: `
        Unsere <strong>Machine Learning Modelle</strong> prognostizieren die Entwicklung 
        bis 2025. Die Vorhersagen berücksichtigen Klimawandel, Bevölkerungswachstum 
        und historische Trends.
      `,
      route: '/ml-predictions',
      target: '[data-tour="ml-chart"]',
      position: 'top',
      actions: {
        onEnter: async () => {
          const { useUIStore } = await import('@/stores/useUIStore')
          const uiStore = useUIStore()
          uiStore.selectedProduct = 'Wheat and products'
          uiStore.selectedMetric = 'production'
        }
      },
      dataHighlight: {
        label: 'Weizenproduktion 2025',
        value: 'Prognose: +3,2% gegenüber 2022'
      },
      insights: [
        'Unsicherheit durch Klimaextreme steigt',
        'Technologischer Fortschritt als Hoffnung',
        'Regionale Verschiebungen erwartet'
      ]
    },

    {
      id: 'simulation-scenarios',
      title: 'Was wäre wenn...?',
      content: `
        Im <strong>Simulationspanel</strong> können Sie Szenarien durchspielen: 
        Was wenn 20% weniger Getreide verfüttert würde? Wie viele Menschen könnten 
        zusätzlich ernährt werden?
      `,
      route: '/simulation',
      target: '[data-tour="simulation-chart"]',
      position: 'right',
      actions: {
        onEnter: async () => {
          const { useUIStore } = await import('@/stores/useUIStore')
          const uiStore = useUIStore()
          uiStore.selectedProduct = 'Cereals - Excluding Beer'
          uiStore.selectedMetric = 'production'
        }
      },
      dataHighlight: {
        label: 'Szenario-Rechnung',
        value: 'Effizientere Nutzung von Getreide möglich'
      },
      insights: [
        'Enorme Effizienzpotenziale vorhanden',
        'Ernährungsumstellung als Schlüssel',
        'Politik und Verbraucher gefragt'
      ]
    },

    {
      id: 'brazil-sugar-crisis',
      title: 'Fallstudie: Brasiliens Zuckerkrise',
      content: `
        2021 traf Brasilien eine <strong>Jahrhundertdürre gefolgt von Frost</strong>. 
        Die Zuckerrohrproduktion brach um 17% ein - mit globalen Folgen, da Brasilien 
        der größte Zuckerexporteur ist.
      `,
      route: '/timeseries',
      target: '[data-tour="timeseries-chart"]',
      position: 'top',
      actions: {
        onEnter: async () => {
          const { useUIStore } = await import('@/stores/useUIStore')
          const { useTourStore } = await import('@/tour/stores/useTourStore')
          const uiStore = useUIStore()
          const tourStore = useTourStore()
          uiStore.selectedProduct = 'Sugar & Sweeteners'
          uiStore.selectedCountry = 'Brazil'
          uiStore.selectedMetric = 'production'
          // Year range selection not supported in current UI
          // Focus on Brazil frost year
          uiStore.selectedYear = 2021
        }
      },
      dataHighlight: {
        label: 'Produktionseinbruch',
        value: 'Dürre und Frost reduzierten Produktion'
      },
      insights: [
        'Niedrigste Erträge seit 2003',
        'Weltmarkt-Zuckerpreise auf 4-Jahres-Hoch',
        'Mehr Zuckerrohr musste zu Ethanol werden'
      ]
    },

    {
      id: 'palm-oil-volatility',
      title: 'Palmöl: Spielball des Klimas',
      content: `
        Palmöl aus Indonesien und Malaysia versorgt die Welt. Doch <strong>El Niño</strong> 
        und andere Klimaphänomene machen die Produktion unberechenbar. 2022 verhängte 
        Indonesien sogar einen Exportstopp.
      `,
      route: '/timeseries',
      target: '[data-tour="metric-selector"]',
      position: 'bottom',
      actions: {
        onEnter: async () => {
          const { useUIStore } = await import('@/stores/useUIStore')
          const uiStore = useUIStore()
          uiStore.selectedProduct = 'Palm Oil'
          // uiStore.selectedCountry = 'Indonesia' // Removed to prevent automatic Indonesia selection
          uiStore.selectedMetric = 'export_quantity'
          // Note: Year range is not supported in UIStore
        }
      },
      dataHighlight: {
        label: '2022 Exportstopp',
        value: 'April-Mai: Kompletter Exportstopp'
      },
      insights: [
        '2016: El Niño -10% Produktion',
        '2020: Arbeitskräftemangel durch COVID',
        'Preisvolatilität bedroht Ernährungssicherheit'
      ]
    },

    {
      id: 'conclusion',
      title: 'Lehren für die Zukunft',
      content: `
        Unsere Datenreise zeigt: Die globale Ernährung ist <strong>resilienter als gedacht</strong>, 
        aber auch verwundbarer durch Klimawandel und Konflikte. Positive Trends existieren, 
        doch die Herausforderungen wachsen.
      `,
      route: '/',
      target: '[data-tour="dashboard-overview"]',
      position: 'center',
      actions: {
        onEnter: async () => {
          const { useUIStore } = await import('@/stores/useUIStore')
          const { useTourStore } = await import('@/tour/stores/useTourStore')
          const uiStore = useUIStore()
          const tourStore = useTourStore()
          uiStore.selectedProduct = 'Cereals - Excluding Beer'
          uiStore.selectedYear = 2022
          // Reset to current year
          uiStore.selectedYear = 2022
        }
      },
      dataHighlight: {
        label: 'Kernbotschaft',
        value: 'Daten ermöglichen bessere Entscheidungen'
      },
      insights: [
        '✅ Resiliente Lieferketten bewährten sich',
        '⚠️ Klimarisiken nehmen dramatisch zu',
        '🌍 Regionale Ungleichheiten bleiben kritisch',
        '🔄 Nachhaltige Transformation ist möglich'
      ]
    }
  ]
}

// Export only the main tour
export const availableTours = [mainTour]

export default {
  mainTour,
  availableTours
}