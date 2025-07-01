# Neue Metriken – Integrations-Plan

## 1 Ziel
Wir wollen fünf zusätzliche Metriken in **allen** bestehenden Visualisierungen (Weltkarte, Zeitreihen-Charts, Dashboards usw.) verfügbar machen:

1. Tierfutteranteil in % (`feed_share`)
2. Proteinmenge **gesamt** (`protein`, Einheit *1000 t*)
3. Proteinmenge **pro Kopf pro Tag** (`protein_gpcd`, Einheit *g/Person/Tag*)
4. Fettmenge **gesamt** (`fat`, Einheit *1000 t*)
5. Fettmenge **pro Kopf pro Tag** (`fat_gpcd`, Einheit *g/Person/Tag*)
6. Verarbeitung / Hochverarbeitete Lebensmittel (`processing`, Einheit *1000 t*)

> Dadurch erweitert sich das Metrik-Set von 6 → **12** (inkl. schon vorhandener Produktion, Importe … etc.).

## 2 Datenquellen-Analyse (Python-Stichprobe aus `fao.csv`)

> Für die schnelle Exploration greifen wir **ausschließlich** auf die Datei
> `py/fao_stichprobe_final.csv` zurück, weil sie handlicher ist. **Die eigentliche
> Verarbeitung in `parse_enhanced.py` muss jedoch zwingend mit der vollständigen
> Datei `py/fao.csv` erfolgen**, um alle Länder-/Produkt-Kombinationen abzudecken.
```python
import pandas as pd
sample = pd.read_csv('py/fao_stichprobe_final.csv', usecols=['Element'], nrows=100_000)
print(sorted(sample['Element'].unique()))
```
Gefundene relevante `Element`-Einträge:
* "Protein supply quantity (t)"
* "Protein supply quantity (g/capita/day)"
* "Fat supply quantity (t)"
* "Fat supply quantity (g/capita/day)"
* "Processing"
* "Feed" (bereits vorhanden)

## 3 Backend-Aufbereitung (Python ⇒ `timeseries.json`)
1. **`py/parse_enhanced.py` anpassen**
   * `relevant_elements` um folgende Werte erweitern
     ```python
     'Protein supply quantity (t)',            # protein (total)
     'Protein supply quantity (g/capita/day)', # protein_gpcd
     'Fat supply quantity (t)',               # fat (total)
     'Fat supply quantity (g/capita/day)',    # fat_gpcd
     'Processing',
     ```
   * In `_normalize_element_name()` Mapping ergänzen
     ```python
     'Protein supply quantity (t)': 'protein',
     'Protein supply quantity (g/capita/day)': 'protein_gpcd',
     'Fat supply quantity (t)': 'fat',
     'Fat supply quantity (g/capita/day)': 'fat_gpcd',
     'Processing': 'processing',
     ```
   * Beim Erstellen von `year_data` die Felder `protein`, `protein_gpcd`, `fat`, `fat_gpcd`, `processing` mitschreiben.
2. **Metadaten aktualisieren** (`create_metadata`)
   * Beschreibung & Einheiten der drei neuen Roh-Metriken ergänzen.
3. **Re-Export**
   ```bash
   cd py
   python parse_enhanced.py  # erzeugt neue public/data/fao/timeseries.json
   ```

⚠️  Tierfutteranteil wird **nicht** als Rohwert gespeichert, sondern erst in der Vue-App berechnet (s. Abschnitt 4).

## 4 Frontend-Logik (Vue & Pinia)
### 4.1 Datenzugriff / Berechnungen
* **`src/stores/useDataStore.js`**
  * Aggregatoren (`calculateAllAggregations`, `calculateAllCountriesForProduct`) um `protein`, `protein_gpcd`, `fat`, `fat_gpcd`, `processing` erweitern.
  * Für die beiden *g/Person/Tag*-Metriken genügt es, Durchschnittswerte zu mitteln; optional könnte später eine Bevölkerungsgewichtung ergänzt werden.
* **Feed-Share-Berechnung**
  * Neue Helper-Funktion `computeFeedShare(entry)`
    ```js
    const computeFeedShare = (entry) => {
      const ds = entry.domestic_supply || 0
      const feed = entry.feed || 0
      return ds > 0 ? (feed / ds) * 100 : 0
    }
    ```
  * **WorldMap.vue**
    * Beim Mapping `selectedMetric === 'feed_share'` ⇒ `value = computeFeedShare(yearEntry)`; `legendUnit = '%'`; `legendDomain = [0,100]`.
  * **TimeseriesPanel.vue**
    * In `updateChartData()` beim Durchlauf über `yearData` das Verhältnis berechnen, wenn `metric === 'feed_share'`.
  * **TimeseriesChart.vue**
    * `getMetricLabel()` um Fall `feed_share` ⇒ "Tierfutteranteil (%)" erweitern.
    * Achsen-Formatter für `%` einbauen (0-100).

### 4.2 UI-Komponenten
* **`src/components/ui/ProductSelector.vue`** → `metricOptions` Array ergänzen
  ```js
  { value: 'protein',       label: 'Protein (1000 t)' },
  { value: 'protein_gpcd',  label: 'Protein (g/Kopf/Tag)' },
  { value: 'fat',           label: 'Fett (1000 t)' },
  { value: 'fat_gpcd',      label: 'Fett (g/Kopf/Tag)' },
  { value: 'processing',    label: 'Verarbeitung (1000 t)' },
  { value: 'feed_share',    label: 'Tierfutteranteil (%)' },
  ```
* **`TimeseriesPanel.vue`** & evtl. weitere Selector-Komponenten analog erweitern.

### 4.3 Visualisierungsspezifische Anpassungen
* **WorldMap.vue**
  * Mapping‐Blöcke (Zeilen ~760 & ~829) um neue Metric-Keys ergänzen:
    ```js
    metric === 'protein'     ? 'protein' :
    metric === 'fat'         ? 'fat' :
    metric === 'processing'  ? 'processing' :
    metric === 'feed_share'  ? 'feed_share' :
    ```
  * `metricLabels` / `metricTitles` um deutsche Namen ergänzen.
* **MapLegend.vue**
  * `metricTitles` Dictionary erweitern und für `feed_share` `%` als Einheit setzen.
* **TimeseriesChart.vue**
  * Farbskala & Achsen bei `feed_share` auf Bereich 0-100 beschränken.

### 4.4 Einheit & Formatter
Da **Protein**, **Fett** und **Processing** als Rohwerte in *1000 t* gespeichert werden, können wir für sämtliche Ausgaben einfach die bestehende Helper‐Funktion
`formatAgricultureValue()` (sowie `formatAxisValue()`/`formatTooltipValue()`) aus
`src/utils/formatters.js` verwenden. Dadurch bleibt das Verhalten identisch zu den
bereits implementierten Metriken.

Für **feed_share** (Prozentwert) nutzen wir bereits vorhandenen Helfer
`formatPercentage()` in derselben Datei.

Es ist daher *keine* zusätzliche Formatierungs-Logik notwendig – lediglich die
Unit-Parameter (`"1000 t"` bzw. `%`) müssen an den neuen Stellen korrekt
übergeben werden.

## 5 Tests
1. **Unit-Tests (Vitest)** für `computeFeedShare()` und Aggregationsfunktionen.
2. **E2E-Tests (Cypress)**
   * Auswahl jeder neuen Metrik → prüfen, dass Karte & Chart ohne Fehler laden und Tooltip Werte anzeigen.

## 6 Dokumentation
* README anpassen (neue Metriken + Anwendungsbeispiele).
* Änderungslog (CHANGELOG.md) mit Hinweis auf Version x.y.z.

## 7 Deployment-Schritte
1. Parser laufen lassen & JSON-Files commiten.
2. Frontend-Änderungen mergen.
3. `npm run build` / CI durchlaufen lassen.
4. Staging-Smoke-Test, danach Production-Rollout.

---
Damit sind Protein-, Fett- und Processing-Mengen als **Rohmetriken** verfügbar, während der **Tierfutteranteil** dynamisch berechnet wird – ganz analog zu den bereits bestehenden "Alle"-Aggregationen.

* **"Alle"-Aggregationen**
  * Die bestehenden Helper `calculateAllAggregations` (Alle Produkte × Alle Länder) und `calculateAllCountriesForProduct` (Alle Länder je Produkt) **müssen sämtliche neuen Felder** (`protein`, `protein_gpcd`, `fat`, `fat_gpcd`, `processing`) aufnehmen.
  * Für die g/Person/Tag-Metriken wird pro Jahr der **arithmetische Mittelwert** aus allen Ländern gebildet (Population ≈ gleichverteilt). Eine bevölkerungsgewichtete Variante kann später ergänzt werden.
  * `feed_share` wird **on-the-fly** aus den bereits aggregierten Summen von `feed` und `domestic_supply` berechnet; d.h. in den Aggregations-Funktionen genügt es, `feed` & `domestic_supply` wie bisher zu summieren.

## 3. **Idempotente Verarbeitung**
   * `parse_enhanced.py` muss **jederzeit** (CI-Job, Entwickler-Laptop, Produktions-Pipeline) ausgeführt werden können und dabei **sämtliche** JSON-Artefakte (_timeseries.json_, _metadata.json_, _production_rankings.json_, _trade_balance.json_, _summary.json_, _network.json_) konsistent **überschreiben**.
   * Vor dem Überschreiben sollte — wie bereits implementiert — ein Backup der alten Dateien erstellt werden (z.B. `timeseries_backup.json`).
   * Dadurch ist sichergestellt, dass neue Rohdaten, Metriken oder Filter nur an einer Stelle angepasst werden müssen.

* **Strukturwahrung**
   * Die **äußere Struktur** von `timeseries.json` (Array von Objekten mit `country`, `item`, `unit`, `data:[…]`) bleibt **unangetastet**. Es werden lediglich zusätzliche Felder innerhalb der bestehenden `year_data`-Objekte ergänzt.
   * Damit bleibt die Rückwärtskompatibilität für alle bestehenden Komponenten der Vue-App gewahrt.

* **Deutschsprachiges Mapping**
  * Für User-Facing Labels müssen alle Dictionaries in den Komponenten aktualisiert werden, z. B.
    * `metricOptions` (Select-Komponenten)
    * `metricTitles` in `MapLegend.vue`
    * `metricLabels` in `WorldMap.vue`
    * `getMetricLabel()` in `TimeseriesChart.vue`
  * Empfohlene deutsche Bezeichnungen:
    | Key              | Deutsch                                     |
    |------------------|---------------------------------------------|
    | `protein`        | Protein (1000 t)                             |
    | `protein_gpcd`   | Protein (g/Kopf/Tag)                         |
    | `fat`            | Fett (1000 t)                                |
    | `fat_gpcd`       | Fett (g/Kopf/Tag)                            |
    | `processing`     | Verarbeitung (1000 t)                        |
    | `feed_share`     | Tierfutteranteil (%)                         |
  * Falls es ein zentrales Mapping (z. B. in `productMappings.js`) gibt, sollte dort ebenfalls ein `getMetricGermanName(key)` Helper ergänzt werden.  