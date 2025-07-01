# URL Service – Konzept zur vollständigen Steuerung des App-States über Query-Parameter

## 1 Zielsetzung
Die gesamte Anwendung soll sich allein über die URL rekonstruieren lassen. Jeder Schieberegler, jede Dropdown-Auswahl, alle Panel-Zustände und Oberflächen-Toggles werden dabei in Query-Parametern kodiert. Ein Benutzer kann damit einen beliebigen Zustand teilen oder per Bookmark wiederherstellen. Der URL Service synchronisiert Pinia-Stores ⇆ Router-Query bidirektional – ohne Endlosschleifen und performant.

---

## 2 Bestandsaufnahme aller Interaktionselemente
Die folgende Tabelle listet **jede** in der Codebasis gefundene Benutzereingabe. Quellen wurden über Volltextsuchen (`v-model`, `<MultiSelect`, `<RangeSlider`, `@click`, …) und manuelles Durchsehen der Komponenten ermittelt.

| Kategorie | Komponente | Reaktives Property | Beschreibung |
|-----------|------------|--------------------|--------------|
| **Global / Layout** | `useUIStore` | `darkMode` | Hell/Dunkel-Umschaltung |
|               |            | `sidebarOpen` | Seitenleiste offen / zu |
|               |            | `showAnalysisMenu` | Kontextmenü oben rechts |
|               |            | `layoutMode`, `compactMode` | Responsive Layout |
|               |            | `currentPanel`, `panelStates.*` | Sichtbarkeit, minimiert, expandiert |
|               |            | `mapZoom`, `mapCenter` | Weltkarten-Ansicht |
|               |            | `selectedCountry` | Ausgewähltes Land (Dashboard/Map) |
|               |            | `selectedYear` | Referenzjahr (Dashboard, Produkt-Selector) |
|               |            | `selectedMetric` | Globale Metrik (Dashboard) |
| **WorldMap** | `WorldMap.vue` | `showInfoPanel` (Toggle) | Info Sidebar links |
|               | `MapLegend.vue` | `selectedColorScheme` | Farbpalette |
|               |            | `selectedColors` (Set) | Gefilterte Dezile |
|               |            | `showColorSchemeMenu` | Dropdown offen/zu (nicht URL-relevant) |
| **Dashboard** | `NavigationControls.vue` | Panel-Navigation Buttons |
|               | `DashboardPanel.vue` | `selectedVisualization` | Tabs: world-map / timeseries / overview |
| **TimeseriesPanel** | `TimeseriesPanel.vue` | `selectedProducts[]` | MultiSelect |
|               |            | `selectedCountries[]` | MultiSelect |
|               |            | `selectedMetrics[]` | MultiSelect |
|               |            | `showMissingDetails` | Toggle Button |
| **SimulationPanel** | `SimulationPanel.vue` | `scenarioConfig.climateChange` | RangeSlider 0-100 % |
|               |            | `scenarioConfig.populationGrowth` | RangeSlider |
|               |            | `scenarioConfig.techProgress` | RangeSlider |
|               |            | `scenarioConfig.economicGrowth` | RangeSlider |
| **MLPanel** | `MLPanel.vue` | `selectedForecastType` | SearchableSelect |
|               |            | `selectedForecast` | SearchableSelect |
|               |            | `selectedModel` | SearchableSelect |
|               | `MLChart.vue` | `showConfidenceInterval` | Checkbox / Toggle |
| **ProductSelector (div. Panels)** | `ProductSelector.vue` | `selectedProduct` | SearchableSelect |
|               |            | `selectedYear` | SearchableSelect |
|               |            | `selectedMetric` | SearchableSelect |
| **RangeSlider-Basis** | `RangeSlider.vue` | `modelValue` | generische Slider-Komponente |
| **Inputs / Forms** | `FormInput.vue` u. a. | unterschiedliche Felder | Wird aktuell für Filter-Eingaben verwendet |
|               |            | `selectedCountry` | SearchableSelect |
|               |            | `selectedYear` | SearchableSelect |
|               |            | `selectedMetric` | SearchableSelect |

*(Sollten zukünftig weitere Eingaben hinzukommen, genügt es, ein Mapping-Eintrag in Abschnitt 3 anzulegen.)*

---

## 3 Parameter-Schema
Kurze, sprechende Keys halten die URLs kompakt. Arrays werden kommasepariert, Objekte JSON-serialisiert und Base64-url-safe codiert, Booleans als `1/0`.

| Query-Key | Typ | Quelle | Default | Beispielwert |
|-----------|-----|--------|---------|--------------|
| `dark` | bool | `ui.darkMode` | 0 | `dark=1` |
| `sb` | bool | `ui.sidebarOpen` | 0 | `sb=1` |
| `pnl` | string | `ui.currentPanel` | `dashboard` | `pnl=simulation` |
| `viz` | string[] | sichtbare Panels (`panelStates`) | … | `viz=dashboard,timeseries` |
| `pr` | string[] | `selectedProducts` | `[]` | `pr=Wheat%20and%20products,Rice` |
| `cty` | string[] | `selectedCountries` | `[]` | `cty=DEU,BRA` |
| `c` | string | `selectedCountry` | '' | `c=DEU` |
| `yr` | number | `selectedYear` | aktuelles Jahr | `yr=2022` |
| `m` | string | `selectedMetric` | `production` | `m=imports` |
| `met` | string[] | `selectedMetrics` | `[]` | `met=production,imports` |
| `cc` | number | `scenarioConfig.climateChange` | 0 | `cc=35` |
| `pg` | number | `scenarioConfig.populationGrowth` | 0 | `pg=20` |
| `tp` | number | `scenarioConfig.techProgress` | 0 | `tp=12` |
| `eg` | number | `scenarioConfig.economicGrowth` | 0 | `eg=25` |
| `ft` | string | `selectedForecastType` | – | `ft=DNN` |
| `fc` | string | `selectedForecast` | – | `fc=Yield2030` |
| `mdl` | string | `selectedModel` | – | `mdl=LSTM` |
| `conf` | bool | `showConfidenceInterval` | 0 | `conf=1` |
| `cs` | string | `selectedColorScheme` | `viridis` | `cs=blues` |
| `filt` | number[] | `selectedColors` | `[]` | `filt=0,1,2` |
| `z` | number | `mapZoom` | 1 | `z=2.5` |
| `lat` | number | `mapCenter[1]` | 0 | `lat=52` |
| `lng` | number | `mapCenter[0]` | 0 | `lng=13` |
| `infopanel` | bool | `showInfoPanel` | 0 | `infopanel=1` |
| `mdtl` | bool | `showMissingDetails` | 0 | `mdtl=1` |
| `view` | string | `selectedVisualization` | `world-map` | `view=timeseries` |

> Anmerkung: Für komplexere Daten (z. B. mehrfach verschachtelte Objekte) wird `b64(json(x))` als Wert gespeichert (`state=`-Parameter). Dadurch bleibt das Standard-Schema schlank und erweiterbar.

---

## 4 Serialisierung & Deserialisierung
1. **Primitive Werte** werden direkt in `URLSearchParams` geschrieben.
2. **Boolean** → `1/0` (keine Strings, spart Zeichen).
3. **Arrays** → durch Komma getrennt, URL-encodiert (`encodeURIComponent`).
4. **Objekte** → `JSON.stringify` → `btoa` mit `base64url` Alphabet.
5. Werte mit Default werden **weggelassen**, um die URL kurz zu halten.

---

## 5 Reaktivitäts-Strategie
### 5.1 Bidirektionaler Datenfluss
```
Store  ← watcher (route→state)  ←  Route
   ↓                                 ↑
watcher (state→route, debounce)  →  Router.replace()
```

* Ein **`isSyncing`-Flag** verhindert Ping-Pong.
* Beim **Initial Load** wird _einmal_ `applyRouteToStores()` ausgeführt.
* Danach:
  * **Route-Watcher**: auf `route.query` → Stores patchen (ohne Debounce, da externe Quelle).
  * **Store-Watcher**: auf relevante `computed`-Getter → `debounce(200 ms)` → `router.replace()`.
* **Back/Forward-Navigation** wird automatisch vom Route-Watcher abgedeckt.

### 5.2 Fehler- und Edge-Case-Handling
* Ungültige/fehlende Parameter → Ignorieren + Fallback auf Default.
* `try/catch` beim JSON-Parse/Base64-Decode.
* Versions-Tag (z. B. `v=1`) optional, um künftige Breaking Changes abzufangen.

---

## 6 API-Entwurf `UrlStateService`
```ts
init(router: Router): void          // im main.js aufrufen
register<T>(key: string, opts): void // optional für dynamische Mappings
serialize(): URLSearchParams        // Store → Query
deserialize(q: URLSearchParams): void// Query → Store
```
**Intern** wird ein zentrales Mapping-Objekt genutzt:
```ts
{
  dark:   {get: () => ui.darkMode,            set: v => ui.darkMode = !!+v},
  c:      {get: () => ui.selectedCountry,     set: v => ui.setSelectedCountry(v, false)},
  yr:     {get: () => ui.selectedYear,        set: v => ui.setSelectedYear(+v, false)},
  m:      {get: () => ui.selectedMetric,      set: v => ui.setSelectedMetric(v, false)},
  view:   {get: () => dash.selectedVisualization, set: v => dash.selectedVisualization = v},
  cs:     {get: () => viz.getVisualizationConfig('worldMap').colorScheme, set: v => viz.updateMapConfig({ colorScheme: v })},
  filt:   {get: () => dash.activeColorFilter.selectedIndices.join(','), set: v => dash.activeColorFilter = { selectedIndices: v.split(',').map(Number), selectedColors: [] }},
  pr:     {get: () => ts.selectedProducts,    set: v => ts.selectedProducts = v.split(',')},
  // … usw.
}
```

---

## 7 Integrationsschritte
1. **Datei `src/services/urlState.js` anlegen** – enthält Service + Mapping.
2. **In `main.js`** nach Erstellung des Routers: `UrlStateService.init(router)`.
3. **App-Ready Promise**: In `main.js` **vor** `mount()` alle Preload-Funktionen (z. B. `dataStore.init()`), dann `await UrlStateService.waitUntilReady(appReady)`;
   ```ts
   // main.js
   const appReady = createAppReady() // {promise, resolve}
   // Preload Stores
   await dataStore.initialize()      // Lädt FAO-Metadaten etc.
   // Danach URL anwenden & Watcher einschalten
   UrlStateService.setReadyResolver(appReady.resolve)
   appReady.resolve()
   ```
4. UrlStateService führt `deserialize()` **nur** aus, wenn `ready == true`. Bis dahin werden Route-Änderungen gepuffert.
5. **Stores erweitern** (falls nötig) – öffentliche Mutations / Set-Methoden, damit der Service nicht direkt interne Refs beschreibt.
6. **Unit-Tests**:
   * serialize ⇆ deserialize Roundtrip.
   * Service ignoriert Route-Query vor `appReady`.
   * Spezifische Szenarien (zwei Slider ändern → URL aktualisiert).
7. **E2E-Tests** (Cypress): Zustand herstellen → URL kopieren → neuer Tab → Zustand identisch.

---

## 8 Open Points & Weiterentwicklung
* **Komprimierung**: Für sehr große Zustände könnte `lz-string` angewandt werden.
* **Rechteverwaltung**: Sensible Nutzereinstellungen (z. B. debug-Flags) nicht serialisieren.
* **Deep-Links**: Sub-Komponenten könnten eigene Namenräume nutzen (`ts.pr`, `sim.cc`, …).
* **Versionierung** wie oben erwähnt.
* **SSR/Prerender**: Service muss auch serverseitig laufen können → keine Zugriffe auf `window`.

---

## 9 Fazit
Mit dem beschriebenen Konzept lässt sich **jeder** interaktive Zustand der Anwendung verlustfrei in die URL schreiben und wiederherstellen. Durch klare Paramater-Namen, schlanke Serialisierung und saubere Watcher ist der Service performant und wartbar. Zukünftige UI-Erweiterungen erfordern lediglich einen weiteren Eintrag im Mapping – der Kern bleibt unverändert. 

---

## 10 Reaktivitäts-Risiken & Lösungsansätze

| # | Risiko | Ursache(n) | Mögliche Folgen | Gegenmaßnahmen |
|---|--------|------------|-----------------|----------------|
| 1 | **Ping-Pong-Schleifen** | Route-Watcher → Store-Update → Store-Watcher → Router.replace() | Endlose Navigation, Stack Overflow, Browser-Freeze | `isSyncing`-Flag + getrennte "Direction Tokens" (route→state / state→route) + `watchEffect({flush:'post'})` für Store→Route Updates |
| 2 | **Initiale Defaults überschreiben Query** | Service startet vor dem Laden gespeicherter Query-Params | Falscher Zustand beim Page-Load | Reihenfolge erzwingen: `applyRouteToStores()` erst **nach** `router.isReady()` und vor `app.mount()`, danach Store-Watcher aktivieren |
| 3 | **Asynchrone Store-Mutationen** | Daten-Fetches im Store ändern z. B. `selectedYear` | Plötzlicher URL-Sprung während Ladephase | a) Setter in Stores mit `isUser = false` kennzeichnen → Store-Watcher ignoriert nicht-user-basierte Änderungen b) Nur "User-Interaktions"-Events serialisieren |
| 4 | **Häufige Slider-Änderungen** | RangeSlider `@update` feuert bei jedem Pixel | Dutzende `router.replace()` Aufrufe/sec → Performance | `debounce` (200-300 ms) + `immediate:false` |
| 5 | **Große Arrays in Query** | MultiSelect mit vielen Ländern/Produkten | Überlange URLs (>2 KB) | Automatisch auf Base64-JSON umschalten ab N>20 Werten, Hinweis im UI |
| 6 | **Objekt-Identität** | `Set`, `Map` oder mutierte Arrays (push) | Watcher erkennt Änderung nicht bzw. doch zu oft | Verwendung von `toRaw`, `JSON.stringify` Comparison oder eigene `serializeKey()` Helper |
| 7 | **Router-Navigationinterrupt** | Parallele `router.push()` aus anderen Features | Verlorene Query-Params | Service nutzt `router.replace()` **ohne** Path-Änderung; bei externer Navigation `mergeQuery()` Methode einsetzen |
| 8 | **SSR / Prerender** | Kein `window.location` | Hydration-Mismatch | Service kapselt alle `window` Zugriffe in Guard `if (typeof window !== 'undefined')` |
| 9 | **History-Flooding** | Jede Store-Änderung erzeugt Geschichte | Zurück-Button unbrauchbar | Immer `router.replace()`, niemals `router.push()` für Sync |
| 10 | **Komponenten-Unmount** | Watcher leben weiter | Memory-Leak | Service-Watcher global, aber entfernt mit `router.isReady().then(()=>stopFns)`, Komponentenspezifische Watchers onUnmounted |
| 11 | **Frühzeitige URL-Anwendung** | Stores/Daten noch nicht geladen, aber `deserialize()` läuft bereits | Fehlerhafte Defaults, Fetch Errors, inkonsistente UI | Externes **`appReady` Promise**: UrlStateService wartet mit `deserialize()` & Aktivieren der Watcher bis `appReady.resolve()` (wird nach `await preloadData()` und `router.isReady()` aufgerufen). Außerdem Fallback-Timer (5 s) mit Warn-Log |

> **Implementations-Tipp:** Watcher-Registrierung in `UrlStateService.init()` mit Rückgabefunktion `stop()` speichern und beim Hot-Reload oder App-Unmount ausführen, sonst entstehen doppelte Listener im Vite-HMR.

---

## 11 Phasenplan – Schrittweise Umsetzung

| Phase | Ziel | Enthaltene Tasks | Exit-Kriterium |
|-------|------|------------------|----------------|
| **1 – Grundgerüst** | Minimale Klasse `UrlStateService` | • Datei `src/services/urlState.js` erzeugen  
• Singleton-Pattern + `init(router)`  
• leeres Mapping-Objekt, simple `serialize/deserialize` Platzhalter  
• Unit-Test skeleton mittels Vitest | Service lässt sich importieren & Tests laufen |
| **2 – Read-Only Deserialisierung** | URL → Store | • `deserialize()` implementiert  
• Mapping nur für `dark`, `sidebarOpen`, `currentPanel`  
• `appReady` Promise Workflow (#11)  
• Manuelles Testen mit Query-Parametern | App startet korrekt mit Parametern |
| **3 – Bidirektionaler Sync (Kern)** | Store ↔ URL | • Store-Watcher mit debounce  
• `isSyncing` Flag  
• `router.replace()` ohne History-Flood (#9)  
• Serialisierung für primitive Typen | Änderung von `darkMode` spiegelt sich sofort in URL |
| **4 – Komplexe Datentypen** | Arrays & Sets | • Array-Serializer/Parser  
• MultiSelect Felder (`pr`, `cty`, `met`)  
• Base64-Fallback >20 Werte (#5)  
• Tests für Rundtrip-Konsistenz | MultiSelect Roundtrip OK |
| **5 – Slider & Debounce-Optimierung** | Performance | • RangeSlider Integration mit 300 ms Debounce (#4)  
• Edge-Case Tests (schnelles Ziehen) | Keine spürbaren Lags, <4 URL-Updates/s |
| **6 – ML-Spezifische Parameter** | Prognosen | • Mapping für `ft`, `fc`, `mdl`, `conf`  
• Laden von ML-Daten basierend auf Query  
• Validation (existiert gewähltes Modell?) | ML-Panel startet aus URL |
| **7 – Kartenspezifisch** | Map & Legend | • `mapZoom`, `mapCenter`, `selectedColors`, `selectedColorScheme`, `infopanel`  
• Set/Map Serialisierung (#6) | Weltkarte stellt identischen Zustand wieder her |
| **8 – Fehler- & RaceHandling** | Robustheit | • Timeouts, Fallbacks (#1–#3, #11)  
• Pufferung von Route-Änderungen vor `ready`  
• Logging-Utility | 100 % Unit-Tests grün |
| **9 – E2E & Dokumentation** | Qualität & DX | • Cypress-Szenarien  
• README-Abschnitt „Deep-Linking“  
• Changelog-Eintrag | PR Review bestanden |
| **10 – Refinement & Release** | Feinschliff | • Bundle-Analyse (kb-Zuwachs?)  
• SSR-Smoke-Test (#8)  
• Merge in `main` + Tag `vX.Y` | Feature live & dokumentiert |

Jede Phase baut streng auf der vorhergehenden auf. So kann der Service schrittweise verprobt und bei Bedarf gestoppt werden, ohne unvollständige Funktionalität in `main` zu haben. 

> **Kurzüberblick**
>
> Der geplante URL State Service serialisiert den kompletten Zustand der Anwendung – von globalen UI-Einstellungen über Panel-Tabs, Drop-downs und Slider-Werte bis hin zu Karten-Farbschemata und ML-Modellauswahlen – in die Query-Parameter der Adresseleiste.  
> Dadurch lassen sich beliebige Ansichten als Deep-Link teilen, per Bookmark erneut aufrufen oder per automatisierter Test-Suite wiederherstellen.  
> Eine bidirektionale Synchronisation (Pinia Store ⇆ Vue Router) sorgt dafür, dass Änderungen aus der UI sofort die URL aktualisieren und umgekehrt.  
> Dank eines phasenweisen Implementierungsplans, umfangreicher Risiko-Analyse und granularem Parameter-Schema ist der Service performant, wartbar und einfach erweiterbar. 