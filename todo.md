# D2 Nutrition Vibes - Guided Tour Implementation

## Übersicht
Implementierung einer interaktiven Tour durch die D2 Nutrition Vibes Applikation, die Nutzer durch die verschiedenen Funktionalitäten führt und dabei die Zusammenhänge zwischen den FAO-Daten und weltweiten Ereignissen (COVID-19, Ukraine-Krieg, Klimawandel) aufzeigt.

## Datenanalyse-Erkenntnisse aus FAO-Dataset

### Bestätigte Zusammenhänge mit Weltereignissen:
1. **Ukraine-Krieg (2022)**: Weizenexporte der Ukraine brachen von 19.768 (2021) auf 11.444 Tausend Tonnen (2022) ein (-42%)
2. **COVID-19 Resilienz**: Globale Kalorienversorgung stieg kontinuierlich (2019: 2.947 → 2022: 2.985 kcal/Kopf/Tag)
3. **Regionale Disparitäten**: Nordamerika (3.881 kcal) vs. Afrika (2.567 kcal) pro Kopf/Tag (2022)
4. **Feed-vs-Food Trend**: Mais-Feed/Food-Verhältnis stieg von 4,06 (2010) auf 5,28 (2022)
5. **Klimaeinflüsse**: Thailand Zuckerrohr-Produktion fiel durch Dürre von 135.074 (2018) auf 66.725 Tausend Tonnen (2021)

## Tour-Konzept: "Ernährung im Wandel der Zeit"

### Story-Arc der Tour:
**"Vom globalen Überblick zu lokalen Auswirkungen - Wie Weltgeschehen unsere Ernährung prägt"**

## 🎯 **Systemarchitektur-Prinzipien**
- **Non-Invasive Design**: Tour läuft als Overlay-System ohne Änderung der Kernfunktionalität
- **Plugin-Pattern**: Tour-System als optionales Plugin, das ein-/ausgeschaltet werden kann
- **State-Isolation**: Eigener Tour-Store, keine Interferenz mit bestehenden Stores
- **Component-Wrapping**: Bestehende Komponenten erhalten Tour-Hooks über Props/Events

## 📁 **Neue Dateistruktur**

### Core Tour Files
```
src/
├── tour/
│   ├── index.js                    # Tour-System Entry Point
│   ├── config/
│   │   ├── tourSteps.js           # Tour-Schritt-Definitionen
│   │   ├── tourConfig.js          # Globale Tour-Konfiguration
│   │   └── tourData.js            # Statische Tour-Daten & Texte
│   ├── services/
│   │   ├── TourService.js         # Haupt-Tour-Logic
│   │   ├── TourNavigationService.js # Navigation zwischen Schritten
│   │   ├── TourOverlayService.js  # Overlay-Management
│   │   └── TourDataService.js     # Tour-spezifische Datenaufbereitung
│   ├── stores/
│   │   └── useTourStore.js        # Tour-State-Management
│   ├── components/
│   │   ├── TourOverlay.vue        # Haupt-Overlay-Komponente
│   │   ├── TourTooltip.vue        # Kontextuelle Erklärungen
│   │   ├── TourProgressBar.vue    # Fortschrittsanzeige
│   │   ├── TourControls.vue       # Start/Pause/Skip-Buttons
│   │   ├── TourSpotlight.vue      # Element-Highlighting
│   │   └── TourModal.vue          # Tour-Start/Ende-Dialoge
│   ├── composables/
│   │   ├── useTour.js            # Tour-Composable für Komponenten
│   │   ├── useTourStep.js        # Einzelschritt-Logic
│   │   └── useTourHighlight.js   # Element-Highlighting-Logic
│   └── utils/
│       ├── tourHelpers.js        # Utility-Funktionen
│       ├── elementFinder.js      # DOM-Element-Lokalisierung
│       └── tourAnimations.js     # Animations-Utilities
```

## 🔧 **Detaillierte Komponentenspezifikation**

### 1. **TourService.js** - Kern-Service
```javascript
class TourService {
  // Haupt-API für Tour-Steuerung
  startTour(tourId = 'main', options = {})
  pauseTour()
  resumeTour()
  stopTour()
  nextStep()
  previousStep()
  goToStep(stepIndex)
  
  // Element-Management
  highlightElement(selector, options)
  scrollToElement(selector, behavior = 'smooth')
  waitForElement(selector, timeout = 5000)
  
  // Navigation-Integration
  navigateToPanel(panelName, callback)
  setProductSelection(product, callback)
  setYearSelection(year, callback)
}
```

### 2. **useTourStore.js** - State Management
```javascript
export const useTourStore = defineStore('tour', () => {
  // Tour-Status
  const isActive = ref(false)
  const currentTourId = ref(null)
  const currentStepIndex = ref(0)
  const totalSteps = ref(0)
  const isPaused = ref(false)
  
  // Tour-Daten
  const availableTours = ref([])
  const currentTour = ref(null)
  const stepHistory = ref([])
  
  // UI-State
  const overlayVisible = ref(false)
  const tooltipVisible = ref(false)
  const highlightedElement = ref(null)
  
  // User-Präferenzen
  const hasSeenIntro = ref(false)
  const completedTours = ref([])
  const skipAnimations = ref(false)
  
  // Tour-Progress
  const progress = computed(() => 
    totalSteps.value ? (currentStepIndex.value + 1) / totalSteps.value * 100 : 0
  )
})
```

## Implementierungs-Todos

### Phase 1: Tour-Infrastruktur
- [ ] **TourService erstellen** (`src/services/TourService.ts`)
  - Schritt-Navigation, Highlight-System, Tooltips
  - Tour-State Management (aktiver Schritt, Fortschritt)
  - Overlay-System für Element-Hervorhebung

- [ ] **Tour-Komponenten entwickeln**
  - `TourOverlay.vue` - Semi-transparentes Overlay mit Ausschnitten
  - `TourTooltip.vue` - Kontextuelle Erklärungen und Navigationshilfen
  - `TourProgressBar.vue` - Fortschrittsanzeige der Tour
  - `TourControl.vue` - Start/Pause/Neustart Funktionen

- [ ] **Tour-Store erstellen** (`src/stores/useTourStore.ts`)
  - Aktueller Tour-Schritt und Status
  - Tour-Konfiguration und verfügbare Touren
  - Nutzer-Präferenzen (bereits absolvierte Tour-Schritte)

### Phase 2: Tour-Definition
- [ ] **Tour-Schritte definieren** (`src/data/tourSteps.ts`)
  - Jeder Schritt mit: target-Element, Erklärung, Datenkontexte
  - Routing-Integration für seitenübergreifende Schritte
  - Bedingte Schritte basierend auf verfügbaren Daten

### Phase 3: Haupt-Tour "Ernährung im Wandel der Zeit"

#### Schritt 1: "Willkommen - Der große Überblick" (Dashboard)
- [ ] **Dashboard-Integration**
  - Begrüßung und Tour-Zielsetzung erklären
  - Weltkarte hervorheben → Regionale Disparitäten zeigen
  - Quick-Stats erklären (Jahre: 13, Produkte: 200+, Länder: 245)

#### Schritt 2: "Die Welt isst unterschiedlich" (Dashboard - Weltkarte)
- [ ] **Weltkarten-Fokus**
  - Interaktive Weltkarte mit Kalorienversorgung 2022
  - Nordamerika (3.881 kcal) vs. Afrika (2.567 kcal) hervorheben
  - Produkt-Selektor einführen → Weizenproduktion wählen

#### Schritt 3: "Krieg und Hunger - Ukraine-Krise" (Dashboard → Zeitreihen)
- [ ] **Navigation zu Zeitreihen-Panel**
  - Automatische Produktauswahl: "Wheat and products"
  - Ukraine-Daten hervorheben (Export-Einbruch 2022)
  - Zusammenhang Krieg → Exportrückgang → Weltmarktpreise erklären

#### Schritt 4: "Zeitreise durch die Daten" (Zeitreihen-Panel)
- [ ] **Timeseries-Chart-Integration**
  - Zeitnavigation demonstrieren (2010-2022)
  - COVID-19 Periode hervorheben (2020-2021)
  - Resilienz der globalen Versorgung zeigen

#### Schritt 5: "Tiere fressen, Menschen hungern?" (Zeitreihen → Strukturanalyse)
- [ ] **Feed-vs-Food Analyse**
  - Zu Strukturanalyse navigieren
  - Mais-Produktion aufteilen: Feed (717.511) vs. Food (135.877) Tausend Tonnen
  - Feed/Food-Verhältnis-Entwicklung seit 2010 visualisieren

#### Schritt 6: "Strukturen entdecken" (Strukturanalyse-Panel)
- [ ] **StructuralChart-Integration**
  - Hierarchy-/Network-Visualisierung der Nahrungsmittelströme
  - Produktions-/Import-/Export-Beziehungen aufzeigen
  - Interdependenzen zwischen Ländern visualisieren

#### Schritt 7: "Klima prägt Ernten" (Strukturanalyse → Simulationen)
- [ ] **Klimawandel-Simulation**
  - Thailand Zuckerrohr-Beispiel (Dürre-Einbruch 2019-2021)
  - Simulationsszenarien für Extremwetter-Ereignisse
  - "Was-wäre-wenn" Analysen demonstrieren

#### Schritt 8: "Die Zukunft vorhersagen" (Simulationen → ML-Predictions)
- [ ] **ML-Panel-Integration**
  - Machine Learning Modelle für Produktionsprognosen
  - Trend-Vorhersagen basierend auf historischen Daten
  - Unsicherheitsbereiche und Konfidenzintervalle erklären

#### Schritt 9: "Prozesse verstehen" (ML-Predictions → Process Mining)
- [ ] **Process-Mining-Demonstration**
  - Lieferketten und Handelswege analysieren
  - Engpässe und Optimierungspotenziale identifizieren
  - Von Produktion bis Verbrauch: Der Weg der Nahrung

#### Schritt 10: "Ihr Entdeckergeist" (Process Mining → Dashboard)
- [ ] **Tour-Abschluss**
  - Zurück zum Dashboard
  - Zusammenfassung der Tour-Erkenntnisse
  - Freie Exploration ermutigen
  - Tour-Wiederholung und erweiterte Features anbieten

### Phase 4: Tour-Integration in Benutzeroberfläche

#### AppHeader-Integration
- [ ] **Tour-Button hinzufügen**
  - Gut sichtbarer "Tour starten" Button
  - Tour-Status-Indikator (Fortschritt für wiederkehrende Nutzer)
  - Dropdown für verschiedene Tour-Optionen

#### NavigationSidebar-Integration  
- [ ] **Tour-Navigation**
  - Aktuelle Tour-Position in Sidebar hervorheben
  - Direkte Navigation zu Tour-Schritten ermöglichen
  - Tour-Fortschritt visuell anzeigen

#### Panel-spezifische Integration
- [ ] **DashboardPanel**
  - Tour-Hotspots für Weltkarte, Stats, Produktselektor
  - Smooth-Scrolling zu relevanten Bereichen
  - Kontextuelle Datenerklärungen

- [ ] **TimeseriesPanel**
  - Chart-Bereiche hervorheben (Krisen-Jahre)
  - Interaktive Zeitnavigation für Tour-Narrative
  - Daten-Tooltips mit Weltereignis-Kontext

- [ ] **StructuralPanel**
  - Netzwerk-/Hierarchie-Highlights
  - Animierte Übergänge zwischen Strukturelementen
  - Feed-vs-Food Visualisierungen hervorheben

- [ ] **SimulationPanel**
  - Voreingestellte Klimawandel-Szenarien
  - Interaktive "Was-wäre-wenn" Demonstrationen
  - Realitätsbezug durch Thailand/Brasilien-Beispiele

- [ ] **MLPanel**
  - Modell-Erklärungen für Laien
  - Vorhersage-Genauigkeit und Limitationen
  - Praktische Anwendungsbeispiele

- [ ] **ProcessPanel**
  - Lieferketten-Visualisierung mit Tour-Fokus
  - Kritische Pfade und Abhängigkeiten
  - Optimierungsansätze demonstrieren

### Phase 5: Erweiterte Tour-Features

#### Adaptive Tour-Inhalte
- [ ] **Datenbasierte Anpassungen**
  - Tour-Inhalte basierend auf verfügbaren Daten anpassen
  - Aktuelle Ereignisse in Tour-Narrative einbauen
  - Regionale Anpassungen für verschiedene Nutzergruppen

#### Multi-Level-Touren
- [ ] **Schnelltour** (5 Minuten)
  - Nur Kernfunktionen: Dashboard → Zeitreihen → Strukturanalyse
  - Fokus auf Ukraine-Krieg und COVID-19 Resilienz

- [ ] **Vertiefende Tour** (15 Minuten)
  - Vollständige 10-Schritt-Tour wie oben beschrieben
  - Detaillierte Erklärungen und Hintergründe

- [ ] **Experten-Tour** (20+ Minuten)
  - Zusätzliche technische Details
  - Methodische Erklärungen der Datenverarbeitung
  - Erweiterte Analysemöglichkeiten

#### Personalisierung
- [ ] **Nutzer-Interessen-Erkennung**
  - Tour-Präferenzen speichern
  - Interessensbasierte Schwerpunkte (Klimawandel, Geopolitik, Technik)
  - Wiederholte Tour-Abschnitte überspringen

### Phase 6: Qualitätssicherung und Optimierung

#### Accessibility & Usability
- [ ] **Barrierefreiheit**
  - Keyboard-Navigation für alle Tour-Elemente
  - Screen-Reader-Kompatibilität
  - Ausreichende Kontraste und Schriftgrößen

- [ ] **Responsive Design**
  - Mobile-optimierte Tour-Overlays
  - Touch-freundliche Navigation
  - Tablet-spezifische Anpassungen

#### Performance
- [ ] **Lazy Loading**
  - Tour-Komponenten nur bei Bedarf laden
  - Asynchrone Tour-Daten-Initialisierung
  - Effiziente State-Management

- [ ] **Caching**
  - Tour-Fortschritt in LocalStorage
  - Vorgenerierte Tour-Snapshots
  - Optimierte Asset-Auslieferung

### Phase 7: Testing und Deployment

#### Unit Tests
- [ ] **TourService Tests**
- [ ] **Tour-Komponenten Tests**
- [ ] **Tour-Store Tests**

#### Integration Tests  
- [ ] **End-to-End Tour-Durchlauf**
- [ ] **Cross-Browser-Kompatibilität**
- [ ] **Mobile-Device-Testing**

#### User Testing
- [ ] **Beta-Nutzer-Feedback**
- [ ] **A/B-Testing verschiedener Tour-Varianten**
- [ ] **Usability-Tests mit verschiedenen Nutzergruppen**

## Technische Implementierungsdetails

### Tour-Architektur
- **Service-Layer**: `TourService` koordiniert alle Tour-Aktivitäten
- **State-Management**: `useTourStore` verwaltet Tour-Zustand
- **Component-Layer**: Modulare Tour-UI-Komponenten
- **Data-Layer**: Tour-Konfiguration in JSON/TypeScript

### Integration mit bestehender Architektur
- **Router-Integration**: Seitenübergreifende Tour-Navigation
- **Store-Integration**: Zugriff auf DataStore und UIStore
- **Component-Integration**: Tour-Hooks in bestehende Komponenten

### Datenanbindung
- **FAO-Dataset**: Direkte Integration der analysierten Trends
- **Weltereignis-Kontext**: Einbindung der events.md Erkenntnisse
- **Real-time Updates**: Möglichkeit für datenbasierte Tour-Updates

## Erfolgskriterien
1. **Engagement**: >80% der Nutzer schließen mindestens die Schnelltour ab
2. **Verständnis**: Nutzer verstehen zentrale Datentrends nach Tour-Abschluss
3. **Exploration**: Erhöhte Nutzung aller Panel-Funktionen nach Tour
4. **Retention**: Wiederkehrende Nutzer durch erweiterte Tour-Features

## Wartung und Weiterentwicklung
- **Regelmäßige Daten-Updates**: Tour-Inhalte an neue FAO-Daten anpassen
- **Weltereignis-Integration**: Aktuelle Krisen in Tour-Narrative einbauen  
- **Feature-Evolution**: Tour-Erweiterung bei neuen App-Funktionen
- **Community-Feedback**: Nutzer-gesteuerte Tour-Verbesserungen

---

**Geschätzte Implementierungszeit**: 6-8 Wochen
**Priorität**: Hoch (Kern-Feature für Nutzererfahrung)
**Abhängigkeiten**: Vollständige FAO-Datenintegration, bestehende Panel-Funktionalitäten