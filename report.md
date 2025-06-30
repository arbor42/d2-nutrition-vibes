# Code-Review Report für „d2-nutrition-vibes“

## Inhaltsverzeichnis
1. [Schnellstart-Schritteplan](#schnellstart-schritteplan)
2. [Projektstruktur & Build-Artefakte](#1--projektstruktur--build-artefakte)
3. [Konfigurations-Redundanzen & Inkonsistenzen](#2--konfigurations-redundanzen--inkonsistenzen)
4. [Code-Redundanzen & Komplexität](#3--code-redundanzen--komplexität)
5. [Abhängigkeits-Bloat](#4--abhängigkeits-bloat)
6. [Tests & Dokumentation](#5--tests--dokumentation)
7. [Empfehlungen](#6--empfehlungen)
8. [Konkrete Problem­stellen](#7-konkrete-problemstellen-mit-codebezug)
9. [Reaktiver Datenfluss](#8-reaktiver-datenfluss--analyse)
10. [Ungenutzte Module](#9-überflüssige--ungenutzte-module)
11. [Duplicate Code](#10-duplicate-code-muster)
12. [Legacy-Artefakte](#11-legacy-artefakte--altlasten)
13. [Aufräum-/Reorganisationsplan](#12-aufräum-reorganisationsplan-für-root-dateien)

## Schnellstart-Schritteplan
Folgende 10 Schritte können **in genau dieser Reihenfolge** abgearbeitet werden, um die Codebase zu entschlacken und konsistent aufzustellen. Die Detail­begründungen stehen in den jeweiligen Kapiteln des Reports.

| # | Aufgabe | Referenzen |
|---|---------|------------|
| 1 | **Build-Artefakte entfernen** (`dist/`, `node_modules/`) und `.gitignore` aktualisieren | §1, §12 |
| 2 | **Großdaten auslagern**: CSV/PNG via Git LFS oder externen Download integrieren | §1, §12 |
| 3 | **Python-Ordner trennen**: eigenes Repo oder Unterordner `backend/` | §11, §12 |
| 4 | **Legacy-CSS & ungenutzte Utils löschen** (siehe Tabelle §9) | §3, §9 |
| 5 | **ESLint/Tailwind/TS-Configs vereinheitlichen** (`eslint.config.js`, `tsconfig.json`) | §2 |
| 6 | **Duplicate Code konsolidieren** (Filter, loadData, Aggregationen) | §7, §10 |
| 7 | **Stores refactoren**: single Source of Truth für `selectedProduct` etc. | §7.4, §10 |
| 8 | **Tests reaktivieren**: `tests/` aus `.gitignore` holen, CI anpassen | §5, §12 |
| 9 | **Dokumentation aufräumen**: Markdown-Fix-Files in `docs/changes/` oder Issues; README aktualisieren | §5, §11, §12 |
|10 | **Optional: Storybook entscheiden & Worker-Code reaktivieren oder löschen** | §4, §9, §11 |

> Gesamtdauer geschätzt: **3–4 Personentage** bei normaler Codebase-Größe.

---

## 1  Projektstruktur & Build-Artefakte

* **`dist/`** – Kompilierte Bundle-Artefakte liegen im Repository. Diese sollten ausschließlich über CI erzeugt und per `.gitignore` ausgeschlossen werden.
* **`node_modules/`** ist trotz Eintrag in `.gitignore` im Repository vorhanden. Abhängigkeiten gehören nicht ins Versions­kontrollsystem.
* **`py/fao.csv` (≈ 582 MB) und weitere große Datendateien** stellen massiven Bloat dar. Rohdaten sollten via (Git-)LFS oder externer Download-Quelle eingebunden werden.
* **Große Bilder (z. B. `dist/logo.png`, 231 KB)** sind doppelt in `public/` und `dist/` vorhanden.
* Verzeichnisse **`tests/`** und **`dist/`** stehen gleichzeitig im Repository *und* in `.gitignore` → Inkonsistenz.

## 2  Konfigurations-Redundanzen & Inkonsistenzen

| Bereich | Gefundene Dateien | Problematik |
|---------|------------------|-------------|
| ESLint  | `.eslintrc.json` & `eslint.config.js` | Zwei verschiedene Konfig-Syntaxen (classic vs. flat). Gefahr, dass nur eine davon greift. |
| TypeScript | `tsconfig.json` & `jsconfig.json` | Doppelung; `jsconfig.json` ist unnötig, wenn TypeScript verwendet wird. |
| Tailwind/PostCSS | `tailwind.config.js`, `postcss.config.js`, sowie Utility-Dateien `cssVariables.js`, `cssOptimizer.js`, `criticalCSS.js` | Teilweise überlappende Verantwortlichkeiten; prüfen, ob Eigen-Utilities noch gebraucht werden. |
| .vscode | Projekt­spezifische Workspace-Settings gehören nicht zwangsläufig ins Repo. |

## 3  Code-Redundanzen & Komplexität

1. **Monolithische Komponenten**  
   * `src/components/visualizations/WorldMap.vue` (~2 260 Zeilen)  
   * `TimeseriesChart.vue`, `MLChart.vue` usw.  
   → Sehr große Dateien, enthalten UI-Logik, D3-Code und State-Handling in einem. Aufteilen in Präsentations- und Logik-Schichten würde Wartbarkeit erhöhen.

2. **Composables mit Funktionsüberschneidungen** (`src/composables`)
   * `useDataLoader`, `useDataSync`, `lazyDataLoader.js` zeigen ähnliche Lade-/Caching-Logik.  
   * `useCanvasRenderer`, `useProgressiveRenderer` implementieren jeweils Teile einer Rendering-Pipeline, potenziell gegenseitige Duplikate.

3. **Doppelte Hilfsfunktionen**
   * Formatierungs-Utilities wie `formatters.js` definieren Datum-/Zahl-Formate, die erneut in Komponenten auftauchen.  
   * Farbpaletten existieren in `chartColors.js` und vereinzelt hartkodiert in Charts.

4. **Store-Logik**
   * Mehrere Pinia-Stores weisen identische Getter auf (z. B. `selectedCountry`, `selectedProduct`). Zentralisieren spart Codezeilen.

## 4  Abhängigkeits-Bloat

* **Storybook-Pakete** sind zweimal aufgeführt (`storybook` und `@storybook/vue3-vite`). Konsolidieren genügt.
* `autoprefixer` ist implizit in Tailwind enthalten – individuelle Version evtl. überflüssig.
* Prüfen, ob `html2canvas` & `jspdf` in beiden, App und Worker, geladen werden; Baum-Shaking ggf. unmöglich durch CommonJS-Import der Worker.

## 5  Tests & Dokumentation

* **Cypress + Vitest** – sinnvolle Kombination, aber `tests/` ist per `.gitignore` ausgeschlossen. Entfernen des Ignore-Eintrags oder Umzug nach `e2e/` empfohlen.
* Mehrere Markdown-Fix-Notizen (`DIV_ERROR_FIX.md`, `EXPORT_BUTTON_FIX.md`, …) beschreiben alte Bug-Fixes. In Issues/PR-Beschreibung verlagern, um das Repo zu entschlacken.

## 6  Empfehlungen (keine Änderungen umgesetzt)

1. Entfernen bzw. per Git LFS auslagern: `dist/`, `node_modules/`, große CSV-/PNG-Dateien.
2. Eine einheitliche ESLint-Konfiguration wählen (Flat oder Classic).
3. `jsconfig.json` löschen; nur `tsconfig.json` pflegen.
4. Große Komponenten in kleinere Unter-Komponenten + Composables zerlegen.
5. Gemeinsame Daten-Lade-Utilities zu einem einzigen Modul konsolidieren.
6. Duplicate Tailwind-/CSS-Utilities aufräumen; wo möglich Tailwind-Funktionen nutzen.
7. Abhängigkeitsliste in `package.json` ausdünnen und Pin-Versions-Streitigkeiten klären.
8. Dokumentations-Markdowns in Issues verschieben oder in `docs/` bündeln.

## 7 Konkrete Problem­stellen mit Code­bezug

> Hinweis: Zeilen­nummern beziehen sich auf den aktuellen HEAD des Repos am Analyse­zeitpunkt. Die Schnipsel dienen nur als Kontext – es wurde **kein** Code geändert.

### 7.1 Variablen-Überschattung & fehlerhafte Cache-Nutzung
```48:55:src/composables/useDataLoader.js
// Check cache first
if (useCache && cacheKey && cache.value.has(cacheKey)) {
  return cache.value.get(cacheKey)
}
```
* In derselben Datei wird weiter oben jedoch `const cache_storage = ref(new Map())` deklariert. Alle weiteren Zugriffe nutzen aber `cache.value`, das in diesem Scope nicht existiert. Ergebnis: `ReferenceError` / ineffektives Caching.

### 7.2 Watcher ohne Aufräum­logik ⇒ Memory-Leak-Gefahr
```57:66:src/composables/useDataTransformations.js
// Auto-process when source data changes
watch(() => pipeline.source, () => {
  if (pipeline.source) {
    processTransformations()
  }
}, { deep: true, immediate: true })
```
* Der Rückgabewert des `watch`-Aufrufs wird nicht gespeichert und im `onUnmounted`-Hook nie abgemeldet. Bei häufiger Erzeugung von Pipelines bleiben Observer bestehen und feuern weiter → wachsender Speicherverbrauch.

### 7.3 Globale Tooltip-DIV auf Body ⇒ DOM-Leck & Styling-Kollisionen
```170:179:src/components/visualizations/WorldMap.vue
tooltipDiv = d3.select('body')
  .append('div')
  .attr('class', 'worldmap-tooltip')
  // … diverse .style-Aufrufe …
```
* Das Element wird global an `body` gehängt. Bei jedem Mount werden neue Instanzen erzeugt, sofern `destroy()` nicht garantiert ausgeführt wird. Zudem können Styles anderer Komponenten überschrieben werden.

### 7.4 Doppelte Source-of-Truth → Synchronisations-Overhead
```24:26:src/stores/useDataStore.js
const selectedProduct = ref('maize_and_products')
```
```11:13:src/stores/useUIStore.js
const selectedProduct = ref('Wheat and products')
```
* Zwei Stores halten denselben Domänenwert. Die komplexe **`createBidirectionalSync`**-Logik ($≈$ 200 Zeilen) existiert primär, um diese Redundanz auszugleichen. Eine einzige zentrale Quelle würde den gesamten Sync-Layer überflüssig machen.

### 7.5 Potentiell unbegrenztes Logging
```1:40:src/components/visualizations/WorldMap.vue
// hunderte console.log-Aufrufe (initializeMap u. a.)
```
* Exzessives Logging in Produktionscode verlangsamt Rendering und verschleiert reale Fehler.

### 7.6 Riesige Monolith-Dateien
* `WorldMap.vue` (~2 264 Zeilen) und `useDataLoader.js` (~1 200 Zeilen) bündeln UI, Daten­zugriff, State-Management **und** Styling. Das erschwert Testbarkeit und erhöht Bundle-Größe; Splitting in Sub-Komponenten/Composables empfohlen.

## 8 Reaktiver Datenfluss – Analyse
1. **Mehrfach gespeicherte UI-States** (siehe 7.4) führen zu komplexem Bidirektional-Sync. Dies erhöht die Latenz, weil jeder Wert-Change zweimal durch die Vue-Reaktivität läuft.
2. **Unbeschränkte Watcher** (siehe 7.2) laufen permanent weiter und evaluieren `deep`-Vergleiche großer Objekt-Graphs → CPU-Last bei umfangreichen Daten­sätzen.
3. **Polling/Auto-Refresh** in `useDataLoader` (`startAutoRefresh()`) setzt Intervall-Timer ohne sichtbares `clearInterval()` im Cleanup. Dadurch tickt der Timer auch auf inaktiven Routen.
4. **Große reaktive Objekte** wie `geoDataStatic` werden zwar als `shallowRef` gehalten, doch tief verschachtelte Objekte werden später per `watch` mit `deep: true` (Transformation-Pipeline) verarbeitet. Das negiert den Vorteil.

## 9 Überflüssige / ungenutzte Module

| Datei | Typ | Import-Treffer (`grep`) | Anmerkung |
|-------|-----|-------------------------|-----------|
| `src/utils/cssVariables.js` | Utility | 0 | Nie importiert → kann entfernt oder in Tailwind-Config überführt werden. |
| `src/utils/criticalCSS.js` | Utility | 0 | Optimiert Critical-CSS, wird aber nirgendwo aufgerufen. |
| `src/utils/cssOptimizer.js` | Utility | 0 | Überschneidet sich mit obigem, ungenutzt. |
| `src/utils/dataStreaming.js` | Utility | 0 | Streaming-Loader, wird nicht referenziert. |
| `src/utils/lazyDataLoader.js` | Utility | 0 | Singleton-Loader, nirgends verwendet. |
| `src/utils/chartColors.js` | Utility | 0 | Farbpaletten sind stattdessen in `VisualizationStore`. |
| `src/utils/productMappings.js` | Daten-Mapping | 0 | Mapping-Tabelle nie importiert. |
| `src/composables/usePerformance.js` | Composable | 0 | Performance-Messung vorgesehen, aber nicht genutzt. |
| `src/composables/useD3Cache.js` | Composable | 0 | Caching-Layer für D3, ungenutzt. |
| `src/composables/useCanvasRenderer.js` | Composable | 0 | Alternative Renderer, keine Referenzen. |
| `src/composables/useProgressiveRenderer.js` | Composable | 0 | Siehe oben. |
| `src/composables/useD3.js` | Composable | 0 | Allgemeine D3-Hilfen → ungenutzt. |
| `src/composables/usePDFExport.ts` | Composable | 0 | Eigener PDF-Export, aktuell nicht eingebunden. |
| `src/composables/useStoreComposition.js` | Composable | 0 | Wrapper, nie importiert. |
| `src/composables/useDerivedData.js` | Composable | 0 | Keine Verwendungen. |
| `src/composables/useFormValidation.js` | Composable | 0 | Formularvalidierung nicht verwendet (UI nutzt direkt vee-validate). |
| `src/composables/useVisualization.js` | Composable | 0 | Allgemeiner Wrapper, aber Panels referenzieren D3 direkt. |
| `src/composables/useWebWorker.js` & `src/workers/dataProcessor.worker.js` | Composable + Worker | 0 | Worker-Infrastruktur existiert, jedoch kein Aufrufer → Dead Code. |
| `src/types/stores.ts`, `d3.ts`, `data.ts` | Typ-Deklaration | ggf. gering | Können bleiben, aber prüfen ob wirklich von `vue-tsc` referenziert; teilweise Legacy. |
| `src/utils/urlStateManager.d.ts` | Typ-Stub | 0 | Passende Implementierungsdatei fehlt → verwaist. |
| `.d.ts`-Stubs in `components/panels/` | Typ-Stub | Fraglich | Generische Stubs ohne Inhalt; wenn nicht für Storybook o. Tests genutzt, löschen. |
| Storybook-Stories (`*.stories.js`) | Doku / Tests | optional | Falls Storybook nicht mehr betrieben wird, alle Stories + Abhängigkeiten entfernen. |

> Suche erfolgte per `grep -R "<Dateiname ohne Ext>" src/` – Trefferzahl 0 ⇒ ungenutzt.

### Einsparpotenzial
* **≈ 120 KB JS-Quellcode** (ohne Build-Artefakte) und diverse Abhängigkeiten lassen sich streichen → kleineres Bundle, schnellere Builds.
* Reduzierte kognitive Last: Weniger Fake-Abstraktionen, klarere Projektstruktur.

## 10 Duplicate-Code-Muster

| Duplikat | Fundstellen (Beispiele) | Problem |
|----------|------------------------|---------|
| **`loadData` Implementierung** | 48:60:src/composables/useDataLoader.js  
17:26:src/utils/lazyDataLoader.js | Zwei fast identische Funktionen zum Laden & Cachen von Daten. Zusammenlegen spart ~70 Zeilen und vermeidet API-Drift. |
| **Filter-Logik** | 50:70:src/stores/useDataStore.js (`filteredData`)  
120:150:src/composables/useDataTransformations.js (`transformFilter`) | Beide implementieren komplexe If-Ketten für Filter. Eine zentrale Utility würde Redundanz eliminieren. |
| **Aggregations-Berechnung** | 795:860:src/stores/useDataStore.js (`calculateAllAggregations`)  
213:250:src/composables/useDataTransformations.js (`transformAggregate`) | Gleiche Summen/Mean/Median-Logik. Kann als Shared Helper exportiert werden. |
| **Jahres-Extraction** | 924:940 und 937:950:src/stores/useDataStore.js (`getAvailableYears*`) | Zwei Varianten desselben Algorithmus; eine reicht. |
| **Color-Paletten** | 30:50:src/stores/useVisualizationStore.js (`colorSchemes`)  
`src/utils/chartColors.js` | Farblisten liegen doppelt vor. |
| **`selectedProduct` State** | 24:26:src/stores/useDataStore.js  
11:13:src/stores/useUIStore.js | Doppelte Quelle → komplexes Sync-Konstrukt (siehe §7.4). |

### Beispiel: Duplizierte Filter-Funktion
```50:70:src/stores/useDataStore.js
return currentData.value.filter(item => {
  if (item.Year < selectedYears.value.start || item.Year > selectedYears.value.end) return false
  if (dataFilters.value.countries.length > 0 && !dataFilters.value.countries.includes(item.Area)) return false
  // …
})
```
```115:135:src/composables/useDataTransformations.js
return data.filter(item => {
  switch (operator) {
    case 'equals':
      return item[field] === value
    // … gleiche Vergleichsoperatoren …
})
```
*Beide Blöcke implementieren fast identische Bedingungsüberprüfungen.*

### Auswirkungen
* Pflege-Aufwand verdoppelt: Bugfixes/Features müssen an mehreren Stellen eingearbeitet werden.
* Bundle-Größe wächst unnötig.
* Höheres Risiko divergierender Logik (z. B. abweichende Filterkriterien).

## 11 Legacy-Artefakte & Altlasten

| Pfad | Typ | Indiz für Legacy | Aktuelle Nutzung |
|------|-----|------------------|------------------|
| `css/main.css` | Plain CSS | Vor Tailwind-Migration übrig geblieben; 1 968 Zeilen Custom-Styles. | 0 Referenzen (keine `<link>`-Tags, keine `@import`) |
| `.eslintrc.json` vs. `eslint.config.js` | Konfig | Alte „Classic“-ESLint-Config blieb nach Umstieg auf Flat übrig. | Nur eine der beiden wird zur Laufzeit geladen – Konfliktgefahr. |
| `jsconfig.json` | TS/JS Config | Überrest aus reinem JS-Setup. | VS Code löst jetzt per `tsconfig.json`; `jsconfig.json` redundant. |
| Verzeichnis `tests/` | Test-Suite (Vitest & Cypress) | Befindet sich im Repo, aber `tests/**` ist in `.gitignore` eingetragen. | CI führt die Tests daher nicht aus; Ordner evtl. verwaist. |
| Python-Ordner `py/` (+ 900 MB CSVs) | frühe Daten-Pipeline/ML-Prototypen | Frontend nutzt die Dateien nicht – reine Forschungs-Artefakte. | Auslagern/LFS oder separates Repo. |
| Markdown-Fix-Files `*_FIX.md` | Bug-Notizen | entstanden während AI-Refactor. | Sollten in Issues/Wiki verschoben werden. |
| Storybook-Verzeichnis `.storybook/` + `*.stories.js` | UI-Doku | Keine Storybook-Script-Runs in CI; `npm run storybook` ungenutzt. | Entfernen oder aktivieren. |
| Legacy-Ignore-Einträge `js/**`, `css/**` | .eslint ignore | Deuten auf frühere Strukturen. | Nach Aufräumen anpassen. |
| Dist-Artefakte `dist/` | Build-Output | Früher manuell eingecheckt. | Gehört in `.gitignore` (siehe §1). |

### Risiken
* **Verwirrung neuer Entwickler**: Alte Config-Dateien und Build-Artefakte verschleiern tatsächlichen Build-Pfad.
* **Versionskontroll-Ballast**: Mehr als 1 GB an Daten (CSV, PNG, dist) verlangsamt Clones & CI.
* **Tool-Konflikte**: Zwei ESLint-Configs können unterschiedliche Regeln erzwingen.

## 12 Aufräum-/Reorganisationsplan für Root-Dateien

| Pfad/Datei | Aktion | Zielort bzw. Begründung |
|------------|--------|-------------------------|
| `dist/` | **Löschen** & dauerhaft `.gitignore` | Build-Artefakte kommen aus CI/CD; nicht versionieren. |
| `node_modules/` | `.gitignore` (bereits) | Nie einchecken. |
| `py/` | Auslagern in separates Repo **oder** Unterordner `backend/` + Git LFS für große CSVs | Trennt Frontend von Daten­science-Prototypen; reduziert Clone-Zeit. |
| `data/` (GeoJSON, JSON) | In `public/data/` oder CDN; optional LFS | So kann Frontend per HTTP laden; Repo bleibt schlank. |
| Große CSVs (`fao.csv`, `fao_slim.csv`, `fao_stichprobe_final.csv`) | Git LFS oder Download-Task (Makefile/Skript) | Vermeidet 900 MB Repo-Gewicht. |
| `css/main.css` | Entfernen | Nicht mehr referenziert (Tailwind). |
| Legacy Markdown-Fix-Files (`*_FIX.md`, `*_IMPROVEMENTS.md`) | In `docs/changes/` **oder** geschlossene GitHub-Issues | Ordnung in der Wurzel; History via Issues besser sichtbar. |
| `docs/` | Beibehalten, aber Inhalte strukturieren: `architecture/`, `usage/`, `changelog/` | Konsistente Doku-Quelle. |
| `.storybook/` + `*.stories.js` | Entscheiden: aktiv pflegen **oder** löschen & Dev-Abhängigkeiten entfernen | Storybook erhöht Build-Zeit; nur behalten, wenn genutzt. |
| `tests/` | Aus `.gitignore` nehmen, in `tests/unit/`, `tests/e2e/` unterteilen | Damit CI zuverlässig testet. |
| Shell-Scripts in `tests/run-all-tests.sh`, etc. | Umzug in `scripts/` | Klare Trennung Automations-Scripts. |
| `DIV_ERROR_FIX.md`, `events.md`, `todo.md` | In `docs/notes/` **oder** Wiki | Fokus im Root halten. |
| `.claude/`, `.vscode/` | Optional in `.gitignore` (team-abhängig) | Persönliche AI-/IDE-Settings nicht versionieren, falls unerwünscht. |
| `package-lock.json` | Beibehalten | Verankert Reproduzierbarkeit. |
| `README.md` | Aktualisieren nach Bereinigung | Aufbau & dev-Anweisungen anpassen. |
| `.gitattributes` | Anpassen für LFS-Dateien (CSV/Binary) | Richtige Diff/CRLF-Handling. |

### Empfohlene `.gitignore`-Ergänzungen
```
# Build & artefacts
/dist/
/public/assets/

# Data science / large data
*.csv
*.png
py/**

# Storybook build output
storybook-static/

# IDE/AI
.vscode/
.claude/

# Tests caches
coverage/

# Misc
*.log
``` 

### Migrations-Reihenfolge
1. **Build-Artefakte** löschen & `.gitignore` anpassen.  
2. **Große Daten** (CSV/Bilder) nach LFS oder externe Quelle verschieben.  
3. **Backend-/Python-Kram** in eigenes Repo oder `backend/`.  
4. **Docs** in `docs/` konsolidieren, Fix-Markdowns verschieben.  
5. **Legacy CSS/JS** löschen.  
6. **Tests** reaktivieren, CI-Workflow anpassen.  
7. **Storybook** Entscheidung treffen → Abhäng­keiten bereinigen.  
8. **README** und Projekt-Docs final aktualisieren.

---

*Status-Update:* Finaler Reorganisations­plan ergänzt – klare Schritte, Dateipfade und `.gitignore`-Vorschlag. Analyse abgeschlossen, weiterhin keine Codeänderungen am App-Quellcode. 