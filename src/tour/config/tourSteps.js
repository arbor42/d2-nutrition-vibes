// Tour Steps Configuration - "Ernährung im Wandel der Zeit"
// Datenbasierte Erzählung globaler Ernährungstrends durch Weltereignisse (basierend auf events.md)

export const mainTour = {
  id: 'main',
  title: 'Ernährung im Wandel der Zeit',
  description: 'Eine datengetriebene Reise durch 13 Jahre globaler Ernährungsgeschichte - von Pandemien über Kriege bis zu Klimaextremen',
  estimatedDuration: '14-17 Minuten',
  category: 'overview',
  difficulty: 'beginner',
  steps: [
    {
      id: 'tour-welcome',
      title: 'Willkommen zur Datenreise',
      content: `
        <h2 class="text-xl font-bold mb-2">Willkommen bei der interaktiven Ernährungstour!</h2>
        <p>In den nächsten Minuten erlebst du, wie <strong>globale Krisen, Dürren und Trends</strong>
        unsere Nahrungsmittelströme beeinflussen. Lass uns gemeinsam fünf spannende
        Datengeschichten entdecken – von der Ukraine bis nach China.</p>
        <p class="mt-2 italic text-sm">Klicke auf „Weiter“, um zu starten.</p>
      `,
      route: '/?pnl=dashboard',
      target: '[data-tour="dashboard-overview"]',
      position: 'center',
      fallbackPosition: { top: window.innerHeight / 2 - 80, left: window.innerWidth / 2 - 200 },
      highlightOptions: { padding: 10 },
      dataHighlight: {
        label: 'Los geht‘s',
        value: 'Tour starten'
      },
      insights: []
    },
    {
      id: 'ukraine-wheat-2022',
      title: 'Ukraine-Krieg 2022: Kollaps der Weizenexporte',
      content: `
        <strong>Februar 2022:</strong> Russlands Invasion legt die Schwarzmeerhäfen lahm.
        Die Ukraine exportierte zuvor rund <strong>19,8&nbsp;Mio.&nbsp;t Weizen</strong> pro Jahr.
        2022 sinken die Ausfuhren um <strong>−42&nbsp;%</strong> auf nur 11,4&nbsp;Mio.&nbsp;t.
        Beobachte, wie die Zeitreihe in die Tiefe stürzt.
      `,
      route: '/?pnl=timeseries&tpr=Wheat%20and%20products&tcty=Ukraine&tmet=export_quantity',
      target: '[data-tour="timeseries-chart"]',
      position: 'top',
      highlightOptions: { padding: 16 },
      dataHighlight: {
        label: 'Weizenexporte Ukraine',
        value: '19,8 → 11,4 Mio. t'
      },
      insights: [
        'Vor Krieg: ≈30 % des Weltweizenhandels (mit Russland)',
        'Schwarzmeer-Blockade & Logistikschäden',
        'Getreidekorridore mindern, aber lösen das Problem nicht'
      ]
    },

    {
      id: 'covid-vietnam-rice-2020',
      title: 'COVID-19 2020: Vietnams Reis-Exportstopp',
      content: `
        In der ersten Pandemie-Welle <strong>März 2020</strong> stoppt Vietnam
        kurzfristig alle Reisexporte, um die eigene Bevölkerung zu versorgen.
        Der globale Markt reagiert mit Panikkäufen – doch schon wenige Wochen
        später normalisiert sich die Lage.
      `,
      route: '/?pnl=timeseries&tpr=Rice%20and%20products&tcty=Viet%20Nam&tmet=Export%20quantity&yr=2020',
      target: '[data-tour="timeseries-chart"]',
      position: 'bottom',
      highlightOptions: { padding: 14 },
      dataHighlight: {
        label: 'Reisexporte Vietnam',
        value: 'März 2020: 0 t'
      },
      insights: [
        'Kurzfristiger Lieferstopp → Preissprung',
        'Philippinen & Co. stocken Lager sofort auf',
        'Globale Kalorienversorgung bleibt dennoch stabil (≈2 957 kcal/Tag)'
      ]
    },

    {
      id: 'thailand-drought-sugar-2019',
      title: 'Dürre 2019/20: Thailands Zuckerrohr halbiert sich',
      content: `
        Eine schwere Dürre reduziert Thailands Zuckerrohrernte fast um die Hälfte:
        von <strong>≈130&nbsp;Mio.&nbsp;t</strong> (2018) auf nur
        <strong>75&nbsp;Mio.&nbsp;t</strong> (2020). Entsprechend brechen die
        Zuckerexporte ein und treiben die Weltmarktpreise.
      `,
      route: '/?pnl=timeseries&tpr=Sugar%20cane&tcty=Thailand&tmet=Production&yr=2020',
      target: '[data-tour="timeseries-chart"]',
      position: 'top',
      dataHighlight: {
        label: 'Zuckerrohr-Produktion',
        value: '130 → 75 Mio. t'
      },
      insights: [
        'Stärkste Ernteausfälle seit Jahrzehnten',
        'Zuckerexporte −30 %',
        'Importländer müssen andere Quellen suchen'
      ]
    },

    {
      id: 'brazil-drought-frost-sugar-2021',
      title: 'Dürre & Frost 2021: Zuckerkrise in Brasilien',
      content: `
        <strong>2021</strong> treffen Dürre und ungewöhnliche Spätfröste das
        Zentrum-Süd-Brasiliens. Die verarbeitete Zuckerrohrmenge fällt um
        <strong>−13 %</strong> auf 525 Mio.&nbsp;t, die Zuckerproduktion sinkt
        ähnlich stark – ein Schock für den größten Exporteur der Welt.
      `,
      route: '/?pnl=timeseries&tpr=Sugar%20cane&tcty=Brazil&tmet=Production&yr=2021',
      target: '[data-tour="timeseries-chart"]',
      position: 'bottom',
      dataHighlight: {
        label: 'Zuckerrohr Brasilien',
        value: '−13 % 2021'
      },
      insights: [
        'Kombination Dürre + Frost beispiellos',
        'Weltzuckerpreise erreichen 4-Jahres-Hoch',
        'Erholung erst ab 2023 erwartet'
      ]
    },

    {
      id: 'china-feed-boom-2010-2022',
      title: 'Chinas Tierfutter-Boom 2010-2022',
      content: `
        Die rapide wachsende Fleischproduktion lässt Chinas
        <strong>Mais-Futterverbrauch</strong> von 130 auf
        <strong>222&nbsp;Mio.&nbsp;t</strong> steigen – ein Plus von 71 %.
        Weltweit wandern inzwischen <strong>41 %</strong> des Getreides in
        Futtertröge.
      `,
      route: '/?pnl=timeseries&tpr=Maize%20and%20products&tcty=China&tmet=Feed&yr=2022',
      target: '[data-tour="timeseries-chart"]',
      position: 'top',
      highlightOptions: { padding: 12 },
      dataHighlight: {
        label: 'Mais → Futter (China)',
        value: '130 → 222 Mio. t'
      },
      insights: [
        'Chinas Schweine- & Geflügelhaltung boomt',
        'USA bleiben bei ≈138 Mio. t',
        'Nur 48 % des Getreides wird direkt gegessen'
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