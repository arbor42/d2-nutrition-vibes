# TODO-Liste Datenapplikation - 27. Juni 2025

## Hinweis zur Implementierung
Der Datensatz mit allen Metriken befindet sich in `py/fao.csv`. Python mit pandas steht bereits zur Verfügung und kann für die Datenverarbeitung genutzt werden.

## Datenauswahl und Filterung

- [ ] **Alle Produkte auswählen können**
  - **Position**: Oberer Bereich des Dashboards, Produkt-Dropdown-Menü
  - **Implementierung**: 
    - Erster Eintrag im Dropdown: "Alle" (formatiert wie andere Produkte)
    - Standardauswahl beim Laden der App: "Alle"
  - **Interaktion**: Auswahl von "Alle" aggregiert automatisch alle Produktdaten
  - Ermöglicht Gesamtanalysen wie globalen Kalorienkonsum über alle Produktkategorien

- [ ] **Alle Länder auswählen können**
  - **Position**: In allen Dropdown-Menüs wo Länderauswahl möglich ist (Zeitreihen, Weltkarte, etc.)
  - **Implementierung**:
    - Erster Eintrag im Dropdown: "Alle" (formatiert wie andere Länder)
    - Standardauswahl beim Laden der App: "Alle"
  - **Interaktion**: Auswahl von "Alle" zeigt globale/aggregierte Daten
  - Erweiterung für globale Analysen in allen Visualisierungen

## Metriken und Datenqualität

- [ ] **Tierfutter-Metrik prüfen und implementieren**
  - **Datei**: `py/fao.csv` - Spalten mit "feed" oder "animal" im Namen analysieren
  - **Klärungsbedarf**: 
    - Handelt es sich um die Menge, die an Tiere verfüttert wird?
    - Oder um die Menge, die für Tierfutter produziert wird?
    - Dokumentation der genauen Definition erforderlich
  - **Implementation**: Als neue Metrik in allen Visualisierungen (Weltkarte, Zeitreihen, Donut)
  - **Dashboard-Position**: Metrik-Dropdown im Header und in allen Panel-spezifischen Dropdowns

- [ ] **Tierfutter-Anteil als Prozent-Metrik**
  - **Berechnung**: (Tierfutter / Gesamtproduktion) × 100
  - **Implementation**: 
    - Zusätzliche Metrik-Option "Tierfutter-Anteil (%)"
    - Filterbar nach Produkten (z.B. "Anteil Soja für Tierfutter")
  - **Verfügbarkeit**: Weltkarte, Zeitreihen, Donut-Diagramme
  - **Use-Case**: Visualisierung der prozentualen Entwicklung des Tierfutteranteils über Zeit, z.B. Anstieg der Sojaproduktion für Tierhaltung

- [ ] **Stock Variation als Metrik implementieren**
  - **Position**: Als Metrik-Option in:
    - Weltkarten-Visualisierung
    - Zeitreihen-Panel
    - Donut-Diagramme
  - **Datenquelle**: Stock-Variation-Spalte in `py/fao.csv`
  - **Use-Case**: Visualisierung von Lagerbestandsänderungen, besonders während Krisen (COVID-19)
  - Integration als vollwertige Metrik in allen Visualisierungstypen

- [ ] **Proteinmenge und Fettmenge als Metriken**
  - **Position**: Als Metrik-Optionen in allen Visualisierungen
  - **Berechnung**: Aus `py/fao.csv` - Nährstoffgehalt × Produktmenge
  - **Verfügbarkeit**: Weltkarte, Zeitreihen, Donut-Diagramme
  - Erweiterung um Nährstoffanalysen zur Darstellung der Makronährstoffversorgung

- [ ] **Processing-Daten als Metrik integrieren**
  - **Position**: Als Metrik-Option in:
    - Weltkarten-Visualisierung (Verarbeitungsgrad nach Region)
    - Zeitreihen-Panel (Entwicklung über Zeit)
    - Donut-Diagramme (Anteil verarbeitet vs. unverarbeitet)
  - **Fokus**: Trend-Analysen für Schwellenländer (LATAM)
  - **Datenquelle**: Processing-relevante Spalten in `py/fao.csv`
  - Vollständige Integration als Metrik in allen Visualisierungstypen

## Weltkarten-Visualisierung

- [ ] **Differenz in Kalorienversorgung zwischen Regionen darstellen**
  - **Position**: Hauptvisualisierungs-Tab (Weltkarten-Ansicht)
  - **Interaktion**: Toggle-Button oder Dropdown für Ansichtswechsel zwischen absoluten Werten und regionalen Differenzen
  - Implementierung einer Vergleichsansicht zur Visualisierung regionaler Unterschiede in der Kalorienversorgung

- [ ] **Farbschema-Wechsel ermöglichen**
  - **Position**: Weltkarten-Panel, obere rechte Ecke als Einstellungs-Icon
  - **Interaktion**: Dropdown-Menü mit Farbpaletten-Vorschau
  - Implementation verschiedener Farbpaletten für unterschiedliche Darstellungspräferenzen

- [ ] **Legende auf 10%-Schritte anpassen**
  - **Position**: Rechts neben der Weltkarte
  - **Darstellung**: Vertikale Farbskala mit 10%-Intervallen
  - Änderung der Legendenintervalle für bessere Lesbarkeit und Einheitenkorrektur

- [ ] **Perzentil-Tooltip mit Wertebereich**
  - **Position**: Erscheint bei Hover über Ländern auf der Karte
  - **Interaktion**: 
    - Hover: Tooltip mit Perzentil und absoluten Werten
    - Klick: Land zur Filterauswahl hinzufügen (Mehrfachauswahl mit Strg/Cmd)
  - Erweiterte Tooltip-Funktionalität: Anzeige des dargestellten Perzentils und der absoluten Werterange

- [ ] **Zoom basierend auf Hauptstädten**
  - **Interaktion**: Doppelklick auf Land zoomt auf Hauptstadt (nicht geografischen Mittelpunkt)
  - Anpassung der Zoom-Funktionalität: Fokussierung auf Hauptstädte (GeoJSON-Integration erforderlich)

- [ ] **Detailansicht unter Info-Button**
  - **Position**: Info-Icon (i) in der oberen rechten Ecke jedes Landes bei Hover
  - **Interaktion**: Klick öffnet Modal/Seitenpanel mit detaillierten Länderdaten
  - Implementierung einer erweiterten Informationsansicht

## Zeitreihen-Visualisierung

- [ ] **Globaler Anstieg der Kalorienversorgung trotz COVID darstellen**
  - **Position**: Zeitreihen-Panel (rechte Seite des Dashboards)
  - **Darstellung**: Liniendiagramm mit hervorgehobenen COVID-Jahren (2020-2021)
  - Konfiguration der Zeitreihe zur Visualisierung des kontinuierlichen Anstiegs

- [ ] **Legende und Tooltip mit Metrik synchronisieren**
  - **Position**: Legende unterhalb des Zeitreihen-Diagramms, Tooltip bei Hover über Datenpunkte
  - **Problem**: Aktuell stimmen Metriknamen in Legende und Tooltip nicht überein
  - Konsistente Darstellung von Metriknamen erforderlich

- [ ] **Werte ab 1 Milliarde korrekt darstellen**
  - **Position**: Y-Achse des Zeitreihen-Panels und Legende
  - **Formatierung**: Verwendung von Abkürzungen (1B, 1.5B) oder wissenschaftlicher Notation
  - Anpassung der Skalierung für große Zahlenwerte bei mehreren Metriken

## Neue Visualisierungstypen

- [ ] **Kuchen-/Donutdiagramme implementieren**
  - **Position**: Neuer Tab im Dashboard (gleichberechtigt mit Weltkarte und anderen Hauptvisualisierungen)
  - **Tab-Name**: "Anteile" oder "Zusammensetzung"
  - **Interaktion**: 
    - Toggle zwischen Kuchen- und Donut-Darstellung
    - Klick auf Segmente für Details
    - Hover für Prozentanzeige und absolute Werte
  - **Anwendungsfälle**:
    - Anteil von Produktion/Konsum einzelner Produkte (z.B. Sojabohnen für Tierfutter) pro Land
    - Anteil einzelner Länder an globaler Produktion/Konsum
    - Verarbeitungsgrad (verarbeitet vs. unverarbeitet)

- [ ] **Globale vs. länderspezifische Ansicht**
  - **Position**: Radio-Buttons oberhalb des Donut-Diagramms im neuen Tab
  - **Interaktion**: Umschaltung zwischen "Global" und "Nach Land" Modi
  - **Verhalten**: Dynamische Anpassung der Segmente je nach Perspektive

## Benutzeroberfläche und Navigation

- [ ] **Ländernamen übersetzen**
  - **Position**: Alle Dropdown-Menüs, Tooltips, Legenden und Tabellen
  - **Implementierung**: Zentrale Übersetzungstabelle in der Datenverarbeitung
  - Vollständige Übersetzung aller Ländernamen in der gesamten Applikation

- [ ] **Dashboard-Verlinkung zu Zeitreihen-Presets**
  - **Position**: Quick-Links im Dashboard-Header oder als Buttons neben relevanten Metriken
  - **Implementierung**: Vordefinierte URL-Parameter-Kombinationen
  - **Beispiel-Presets**:
    - "COVID-Impact auf Lagerbestände": `?tab=zeitreihe&metrik=stock_variation&jahr_von=2019&jahr_bis=2023`
    - "Globale Proteinversorgung": `?tab=zeitreihe&metrik=protein&land=alle`
    - "Tierfutter-Entwicklung": `?tab=zeitreihe&metrik=tierfutter&produkt=soja`
  - **Interaktion**: Klick lädt die App mit entsprechenden URL-Parametern neu
  - Ermöglicht schnellen Zugriff auf häufig genutzte Analysen

- [ ] **URL-Parameter für Preset-Sharing**
  - **Implementierung**: Vollständige State-Synchronisation zwischen App und URL
  - **Parameter-Schema**:
    ```
    ?tab=weltkarte|zeitreihe|donut
    &produkt=alle|weizen|reis|soja|...
    &land=alle|DE|US|CN|...
    &metrik=kalorien|protein|fett|tierfutter|processing|stock_variation
    &jahr_von=1961
    &jahr_bis=2025
    &ansicht=global|laender
    &farbschema=standard|viridis|plasma
    &zoom_level=1.0
    &zoom_center=lat,lng
    ```
  - **Funktionalität**:
    - Automatische URL-Aktualisierung bei jeder Einstellungsänderung
    - Beim Laden der App: Alle Parameter aus URL übernehmen
    - Deep-Linking für alle Visualisierungszustände
    - Teilen-Button generiert Kurz-URL mit allen aktuellen Einstellungen
  - **Anwendungsfälle**: 
    - Teilen spezifischer Analysen mit Kollegen
    - Bookmarking von Ansichten
    - Einbettung in Präsentationen mit vordefinierten Einstellungen

- [ ] **Breite zwischen Hauptvisualisierung und Weltkarte optimieren**
  - **Position**: Layout-Container für Tab-Inhalte
  - **Problem**: Aktuell suboptimale Platzverteilung zwischen Komponenten
  - **Lösung**: 
    - Responsive Grid mit anpassbaren Spaltenbreiten
    - Optional: Verstellbarer Splitter zwischen Panels
    - Mindestbreiten definieren für Lesbarkeit
  - **Ziel**: Maximale Nutzung des verfügbaren Platzes für beide Visualisierungen

## Datenexport und externe Integration

- [ ] **Export-Button implementieren**
  - **Position**: Obere rechte Ecke des Dashboards, prominent platziert
  - **Funktionen**:
    - PDF-Export der aktuellen Ansicht
    - CSV-Export der gefilterten Daten
    - PNG/SVG-Export einzelner Visualisierungen
  - **Handout**: Automatisch generiertes Dokument mit allen relevanten Visualisierungen und Daten

- [ ] **Welthandelspreise mit weiterem Datensatz**
  - **Integration**: Neuer Tab oder erweitertes Dropdown in der Metrik-Auswahl
  - **Datenquelle**: Prüfung externer APIs oder CSV-Import für Preisdaten
  - Erweiterung der Analysemöglichkeiten um ökonomische Faktoren

---

## Implementierungs-Hinweise für den Agent

### Schrittweises Vorgehen:

1. **Planungsphase**
   - Erstelle einen detaillierten Implementierungsplan basierend auf dieser TODO-Liste
   - Priorisiere die Aufgaben nach Abhängigkeiten und Komplexität
   - Identifiziere welche Komponenten zusammen implementiert werden sollten

2. **TODO-Management**
   - Nutze ein TODO-Tool zur Fortschrittsverfolgung
   - Erstelle für jede Hauptkategorie ein eigenes TODO-Item
   - Unterteile komplexe Aufgaben in kleinere, testbare Einheiten

3. **Implementierung mit Verifikation**
   - Nach jedem implementierten Feature:
     - Deploye einen Sub-Agent zur Überprüfung
     - Der Sub-Agent soll:
       - Die Implementierung gegen die Anforderungen testen
       - Edge-Cases identifizieren
       - Performance und Usability bewerten
       - Feedback für Verbesserungen geben
   - Dokumentiere jeden Schritt und das Feedback

4. **Qualitätssicherung**
   - Verwende pandas für alle Datenoperationen mit `py/fao.csv`
   - Stelle sicher, dass alle URL-Parameter korrekt funktionieren
   - Teste die Mehrsprachigkeit (Ländernamen-Übersetzung)
   - Überprüfe die Responsiveness aller Visualisierungen

5. **Iterative Verbesserung**
   - Nach jedem Sub-Agent-Feedback:
     - Implementiere notwendige Korrekturen
     - Aktualisiere die TODO-Liste
     - Dokumentiere gelöste Probleme
   - Führe regelmäßige Integrationstests durch

### Wichtige technische Hinweise:
- Datenbasis: `py/fao.csv` enthält alle Metriken
- Python mit pandas steht zur Verfügung
- Standardauswahl bei Start: Produkte="Alle", Länder="Alle"
- Alle Metriken müssen in allen Visualisierungstypen verfügbar sein
- URL-Parameter müssen den kompletten App-State abbilden
- **Dark Mode**: Bei ALLEN Implementierungen muss der Dark Mode beachtet werden
  - Es existiert bereits Dark Mode Infrastruktur in der Applikation
  - VOR jeder Implementierung: Bestehenden Code analysieren und Dark Mode Patterns identifizieren
  - Alle neuen Komponenten müssen Dark Mode unterstützen
  - Farben, Kontraste und Visualisierungen müssen in beiden Modi optimal lesbar sein