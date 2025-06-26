// Tour Steps Configuration - "Ernährung im Wandel der Zeit"
// Datenbasierte Erzählung globaler Ernährungstrends durch Weltereignisse (basierend auf events.md)

export const mainTour = {
  id: 'main',
  title: 'Ernährung im Wandel der Zeit',
  description: 'Eine datengetriebene Reise durch 13 Jahre globaler Ernährungsgeschichte - von Pandemien über Kriege bis zu Klimaextremen',
  estimatedDuration: '12-15 Minuten',
  category: 'overview',
  difficulty: 'beginner',
  steps: [
    {
      id: 'global-trends-intro',
      title: 'Der große Aufwärtstrend trotz aller Krisen',
      content: `
        Seit 2010 stieg die <strong>globale Kalorienversorgung kontinuierlich</strong> von 2.832 auf 
        2.985 kcal pro Person/Tag (2022). Selbst COVID-19 und Ukrainekrieg konnten diesen 
        Trend nicht stoppen. Die Daten zeigen: <strong>Unsere Ernährungssysteme sind resilient</strong>.
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
          const uiStore = useUIStore()
          // Globale Übersicht - Getreideproduktion zeigen
          uiStore.selectedProduct = 'Cereals - Excluding Beer'
          uiStore.selectedCountry = null // Global anzeigen
          uiStore.selectedYear = 2022
          uiStore.selectedMetric = 'Production'
        }
      },
      dataHighlight: {
        label: 'Globaler Kalorienanstieg',
        value: '+153 kcal/Person/Tag seit 2010'
      },
      insights: [
        '2010: 2.832 kcal → 2022: 2.985 kcal (+5%)',
        'Auch 2020/21 (COVID) blieb Versorgung stabil',
        'Resiliente Lieferketten bewährten sich'
      ]
    },

    {
      id: 'regional-inequality',
      title: 'Die gespaltene Welt: 3.880 vs 2.567 Kalorien',
      content: `
        Hinter den globalen Mittelwerten verbergen sich <strong>extreme regionale Unterschiede</strong>. 
        Während Nordamerika mit 3.880 kcal/Tag im Überfluss schwelgt, kämpft Afrika mit nur 
        2.567 kcal/Tag. Asien holt auf (+9% seit 2010), Afrika stagniert (+0,3%).
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
          // Zeige regionale Unterschiede - Afrika vs Europa/Nordamerika
          uiStore.selectedProduct = 'Cereals - Excluding Beer'
          uiStore.selectedCountry = 'Africa' // Fokus auf Afrika für Kontrast
          uiStore.selectedYear = 2022
          uiStore.selectedMetric = 'Domestic supply quantity'
        }
      },
      dataHighlight: {
        label: 'Globale Ernährungslücke',
        value: '1.313 kcal Unterschied Nord-Süd'
      },
      insights: [
        'Nordamerika: 3.880 kcal (Spitze)',
        'Europa: ~3.470 kcal (sehr hoch)',
        'Afrika: 2.567 kcal (unter WHO-Minimum)'
      ]
    },
    
    {
      id: 'covid-vietnam-rice-shock',
      title: 'COVID-Schock: Vietnam stoppt Reisexporte',
      content: `
        März 2020 - Panik am Reismarkt! <strong>Vietnam verhängt Exportstopp</strong> für Reis, 
        um die Inlandsversorgung zu sichern. Philippinen und andere Importländer reagieren 
        sofort mit Hamsterkäufen. Die Zeitreihe zeigt: Nach wenigen Wochen Normalisierung.
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
          const uiStore = useUIStore()
          // Vietnam Reis Export während COVID - zeige Einbruch 2020
          uiStore.selectedProduct = 'Rice and products'
          uiStore.selectedCountry = 'Viet Nam'
          uiStore.selectedMetric = 'Export quantity'
          uiStore.selectedYear = 2020
        }
      },
      dataHighlight: {
        label: 'Vietnam Reisexport-Stopp',
        value: 'März 2020: Temporärer Exportstopp'
      },
      insights: [
        'März/April 2020: Kompletter Lieferstopp',
        'Andere Länder stockten sofort Reserven auf',
        'Mai 2020: Vietnam hebt Stopp wieder auf'
      ]
    },

    {
      id: 'covid-philippines-hoarding',
      title: 'Hamsterkäufe auf Staatsebene: Philippinen',
      content: `
        Die Philippinen reagierten auf Vietnams Exportstopp mit <strong>massiven Reisimporten</strong>. 
        2020/21 kaufte das Land ungewöhnlich viel Reis ein - eine klassische Vorsichtsmaßnahme 
        gegen drohende Versorgungsengpässe. Andere Entwicklungsländer handelten ähnlich.
      `,
      route: '/timeseries',
      target: '[data-tour="metric-selector"]',
      position: 'bottom',
      actions: {
        onEnter: async () => {
          const { useUIStore } = await import('@/stores/useUIStore')
          const uiStore = useUIStore()
          // Philippinen Reisimporte - strategische Bevorratung 2021
          uiStore.selectedProduct = 'Rice and products'
          uiStore.selectedCountry = 'Philippines'
          uiStore.selectedMetric = 'Import quantity'
          uiStore.selectedYear = 2021
        }
      },
      dataHighlight: {
        label: 'Strategische Bevorratung',
        value: 'Philippinen: Erhöhte Reisimporte 2020/21'
      },
      insights: [
        'Vorsorgliche Lagerauffüllung gegen Unsicherheit',
        'China hortete parallel 50% der Weltreserven',
        'Europa baute hingegen Lager ab (-9 Mio t)'
      ]
    },

    {
      id: 'ukraine-wheat-collapse',
      title: 'Ukraine-Krieg: Die Kornkammer brennt',
      content: `
        Februar 2022 - Russlands Invasion erschüttert die Getreidemärkte. Die Ukraine 
        exportierte vor dem Krieg <strong>19,8 Millionen Tonnen Weizen</strong> jährlich. 
        2022 brachen die Ausfuhren um 42% auf nur 11,4 Mio. t ein. Schwarzmeer-Blockade!
      `,
      route: '/timeseries',
      target: '[data-tour="timeseries-chart"]',
      position: 'top',
      actions: {
        onEnter: async () => {
          const { useUIStore } = await import('@/stores/useUIStore')
          const uiStore = useUIStore()
          // Ukraine Weizenexport-Kollaps 2022 - zeige dramatischen Rückgang
          uiStore.selectedProduct = 'Wheat and products'
          uiStore.selectedCountry = 'Ukraine'
          uiStore.selectedMetric = 'Export quantity'
          uiStore.selectedYear = 2022
        }
      },
      dataHighlight: {
        label: 'Weizenexport-Kollaps',
        value: '19,8 → 11,4 Mio. t (-42%)'
      },
      insights: [
        'Vor Krieg: 10% des Weltweizen-Exports',
        'Hafenblockaden im Schwarzen Meer',
        'Getreidekorridore nur teilweise wirksam'
      ]
    },

    {
      id: 'china-feed-explosion',
      title: 'Das Tierfutter-Dilemma: China verfüttert 222 Mio. t',
      content: `
        Ein kritischer Trend: <strong>41% des weltweiten Getreides</strong> landet in 
        Futtertögen statt auf Tellern. China allein verfütterte 2022 schon 222 Millionen 
        Tonnen Mais - ein Anstieg von 130 auf 222 Mio. t seit 2010 (+71%)!
      `,
      route: '/timeseries',
      target: '[data-tour="timeseries-chart"]',
      position: 'top',
      highlightOptions: {
        padding: 12
      },
      actions: {
        onEnter: async () => {
          const { useUIStore } = await import('@/stores/useUIStore')
          const uiStore = useUIStore()
          // China Mais als Tierfutter - enormer Anstieg seit 2010
          uiStore.selectedProduct = 'Maize and products'
          uiStore.selectedCountry = 'China'
          uiStore.selectedMetric = 'Feed'
          uiStore.selectedYear = 2022
        }
      },
      dataHighlight: {
        label: 'China Mais-Futter Explosion',
        value: '2010: 130 Mio. t → 2022: 222 Mio. t'
      },
      insights: [
        'Wachsende Fleischnachfrage treibt Futterbedarf',
        'USA stabil bei ~138 Mio. t verfüttert',
        'Nur 48% des Getreides für Menschen direkt'
      ]
    },


    {
      id: 'ml-future-predictions',
      title: 'KI blickt in die klimaunsichere Zukunft',
      content: `
        Unsere <strong>Machine Learning Modelle</strong> prognostizieren bis 2025: Weizenproduktion 
        +3,2%, aber Unsicherheit steigt. Nach den Schocks 2020-2022 zeigen die Daten: 
        Klimaextreme werden häufiger, Vorhersagen schwieriger.
      `,
      route: '/ml-predictions',
      target: '[data-tour="ml-chart"]',
      position: 'top',
      actions: {
        onEnter: async () => {
          const { useUIStore } = await import('@/stores/useUIStore')
          const uiStore = useUIStore()
          // ML Prognosen für globale Weizenproduktion
          uiStore.selectedProduct = 'Wheat and products'
          uiStore.selectedCountry = null // Global
          uiStore.selectedMetric = 'Production'
          uiStore.selectedYear = 2025
        }
      },
      dataHighlight: {
        label: 'Weizenprognose 2025',
        value: '+3,2% aber höhere Volatilität'
      },
      insights: [
        'Technischer Fortschritt vs. Klimarisiken',
        'Ukraine-Erholung noch ungewiss',
        'Regionale Verschiebungen zu erwarten'
      ]
    },

    {
      id: 'simulation-feed-reduction',
      title: 'Simulation: 20% weniger Tierfutter',
      content: `
        Die Daten zeigen: <strong>41% des Getreides wird verfüttert</strong>. Was wäre, wenn wir 
        nur 20% weniger an Tiere verfüttern würden? Die Simulation zeigt: Millionen mehr 
        Menschen könnten ernährt werden. Effizienz statt Mengenwachstum!
      `,
      route: '/simulation',
      target: '[data-tour="simulation-chart"]',
      position: 'right',
      actions: {
        onEnter: async () => {
          const { useUIStore } = await import('@/stores/useUIStore')
          const uiStore = useUIStore()
          // Getreide Feed-Reduktion Szenario - globale Simulation
          uiStore.selectedProduct = 'Cereals - Excluding Beer'
          uiStore.selectedCountry = null // Global 
          uiStore.selectedMetric = 'Feed'
          uiStore.selectedYear = 2022
        }
      },
      dataHighlight: {
        label: 'Feed-Effizienz Szenario',
        value: '20% weniger verfüttern = mehr Menschen ernähren'
      },
      insights: [
        'Von 717 auf 574 Mio. t Mais-Futter',
        'Gesparte Kalorien für 200+ Mio. Menschen',
        'Nachhaltigkeit durch Effizienz'
      ]
    },



    {
      id: 'conclusion-lessons-learned',
      title: 'Lehren einer datengetriebenen Zeitreise',
      content: `
        Unsere Datenreise durch 13 Jahre zeigt: Die globale Ernährung ist <strong>resilienter 
        als gedacht</strong>, aber verwundbarer durch Klimawandel und Konflikte. Von COVID-Panik 
        bis Ukraine-Schock - die Daten erzählen Geschichten menschlicher Anpassungsfähigkeit.
      `,
      route: '/',
      target: '[data-tour="dashboard-overview"]',
      position: 'center',
      actions: {
        onEnter: async () => {
          const { useUIStore } = await import('@/stores/useUIStore')
          const uiStore = useUIStore()
          // Zurück zur globalen Übersicht - Gesamtbild
          uiStore.selectedProduct = 'Cereals - Excluding Beer'
          uiStore.selectedCountry = null // Global
          uiStore.selectedYear = 2022
          uiStore.selectedMetric = 'Production'
        }
      },
      dataHighlight: {
        label: 'Datenbasierte Erkenntnisse',
        value: '2010-2022: Eine Geschichte der Resilienz'
      },
      insights: [
        '✅ Globale Versorgung stieg trotz aller Krisen',
        '⚠️ Regionale Ungleichheit bleibt dramatisch',
        '🌍 Klimaextreme werden zur neuen Normalität',
        '🔄 Effizienz wichtiger als reines Mengenwachstum'
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