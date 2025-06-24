# Tour Interface Überarbeitung - Implementierungsplan

## Zusammenfassung
Dieses Dokument beschreibt die grundlegende Überarbeitung des Tour-Interfaces, bei der der obere Zeitstrahl entfernt wird und ein intelligentes, dynamisches Tooltip-Positionierungssystem implementiert wird.

## Hauptziele
1. **Entfernung des oberen Zeitstrahls** (TourProgressBar)
2. **Dynamische Tooltip-Positionierung** mit Kollisionsvermeidung
3. **Adaptives Tooltip-Resizing** basierend auf verfügbarem Platz
4. **Echtzeit-Anpassung** bei Viewport-Änderungen und Element-Bewegungen

## Detaillierter Implementierungsplan

### Phase 1: Entfernung des Zeitstrahls
1. **TourOverlay.vue anpassen**:
   - TourProgressBar-Import entfernen
   - TourProgressBar-Komponente aus dem Template entfernen
   - Event-Handler `@step-click` entfernen

2. **Fortschrittsanzeige im Tooltip integrieren**:
   - Die Fortschrittsanzeige (X von Y Schritten) ist bereits im Tooltip vorhanden
   - Der kleine Progress-Balken im Tooltip bleibt bestehen

### Phase 2: Intelligente Tooltip-Positionierung

#### 2.1 Neue Positionierungs-Engine
Erstelle eine neue Datei `src/tour/utils/tooltipPositioning.js`:

```javascript
// Hauptfunktion für intelligente Positionierung
export function calculateOptimalPosition(elementBounds, tooltipBounds, viewport) {
  // 1. Definiere mögliche Positionen (8 Richtungen + Floating)
  // 2. Bewerte jede Position nach:
  //    - Überlappung mit Element (muss 0 sein)
  //    - Sichtbarkeit im Viewport
  //    - Abstand zum Element
  //    - Präferierte Position
  // 3. Wähle beste Position
  // 4. Falls keine Position ohne Überlappung: Floating-Position berechnen
}

// Hilfsfunktion für Boundary-Überlappung
export function checkBoundaryOverlap(rect1, rect2, padding = 20) {
  // Prüft ob sich zwei Rechtecke überlappen (mit Sicherheitsabstand)
}

// Adaptive Größenanpassung
export function calculateAdaptiveSize(contentSize, availableSpace, minSize, maxSize) {
  // Berechnet optimale Tooltip-Größe basierend auf:
  // - Inhaltsgröße
  // - Verfügbarem Platz
  // - Min/Max Constraints
}
```

#### 2.2 TourService.js Erweiterung
Erweitere die `updateTooltipPosition` Methode:

```javascript
async updateTooltipPosition(element = null, preferredPosition = 'auto') {
  // 1. Element und Viewport-Größen ermitteln
  // 2. Tooltip-Content analysieren für optimale Größe
  // 3. Intelligente Positionierung aufrufen
  // 4. Tooltip-Größe und Position setzen
  // 5. Kontinuierliches Tracking für Echtzeit-Updates
}
```

#### 2.3 Echtzeit-Tracking Integration
Erweitere `useHighlightTracker.js`:

```javascript
// Neuer Callback für Tooltip-Updates
const trackingCallback = (bounds, element) => {
  // 1. Store mit neuen Element-Bounds aktualisieren
  // 2. Tooltip-Position neu berechnen
  // 3. Sanfte Animation für Positionsänderungen
}
```

### Phase 3: Dynamisches Tooltip-Resizing

#### 3.1 TourTooltip.vue Anpassungen
1. **Flexible Größenanpassung**:
   ```vue
   <div 
     ref="tooltipRef"
     class="tour-tooltip"
     :style="{
       ...tooltipStyle,
       width: tooltipDimensions.width + 'px',
       height: tooltipDimensions.height + 'px',
       maxWidth: 'none', // Entferne feste max-width
       maxHeight: '80vh'
     }"
   >
   ```

2. **Content-basierte Größenberechnung**:
   - ResizeObserver für Tooltip-Content
   - Automatische Anpassung basierend auf Textlänge
   - Responsive Breakpoints für verschiedene Viewport-Größen

#### 3.2 Neue Tooltip-States im Store
Erweitere `useTourStore.js`:
```javascript
// Neue States
const tooltipDimensions = ref({ width: 400, height: 'auto' })
const tooltipConstraints = ref({ minWidth: 300, maxWidth: 600, minHeight: 200 })
const floatingMode = ref(false) // Wenn keine Position ohne Überlappung möglich
```

### Phase 4: Kollisionsvermeidungs-Algorithmus

#### 4.1 Positionierungs-Prioritäten
1. **Primäre Positionen** (direkt an Element):
   - top, bottom, left, right
   - top-left, top-right, bottom-left, bottom-right

2. **Sekundäre Positionen** (mit Offset):
   - Gleiche Positionen aber mit größerem Abstand

3. **Floating-Position** (letzte Option):
   - Nächstgelegene freie Position im Viewport
   - Kann weiter vom Element entfernt sein

#### 4.2 Implementierung
```javascript
// In tooltipPositioning.js
export function findNonOverlappingPosition(elementBounds, tooltipSize, viewport) {
  const positions = generatePossiblePositions(elementBounds, tooltipSize);
  
  for (const position of positions) {
    const tooltipBounds = {
      top: position.top,
      left: position.left,
      width: tooltipSize.width,
      height: tooltipSize.height,
      bottom: position.top + tooltipSize.height,
      right: position.left + tooltipSize.width
    };
    
    if (!checkBoundaryOverlap(elementBounds, tooltipBounds) && 
        isFullyVisible(tooltipBounds, viewport)) {
      return position;
    }
  }
  
  // Fallback: Floating-Position
  return calculateFloatingPosition(elementBounds, tooltipSize, viewport);
}
```

### Phase 5: Performance-Optimierungen

1. **Debouncing/Throttling**:
   - Position-Updates auf 60fps limitieren
   - Resize-Events debounced (250ms)

2. **Memoization**:
   - Cache für berechnete Positionen
   - Nur neu berechnen bei tatsächlichen Änderungen

3. **RAF (RequestAnimationFrame)**:
   - Alle DOM-Updates in RAF wrappen
   - Smooth transitions mit CSS

### Phase 6: UI/UX Verbesserungen

1. **Visuelle Indikatoren**:
   - Subtile Linie vom Tooltip zum Element (optional)
   - Sanfte Übergänge bei Positionswechsel
   - Highlight-Effekt verstärken

2. **Mobile Optimierungen**:
   - Touch-friendly Größen
   - Vereinfachte Positionierung auf kleinen Screens
   - Swipe-Gesten für Navigation

3. **Accessibility**:
   - Focus-Management verbessern
   - ARIA-Labels aktualisieren
   - Keyboard-Navigation beibehalten

## Implementierungsreihenfolge

1. **Tag 1**: Zeitstrahl entfernen, Grundstruktur für neue Positionierung
2. **Tag 2**: Intelligente Positionierungs-Engine implementieren
3. **Tag 3**: Dynamisches Resizing und Echtzeit-Updates
4. **Tag 4**: Testing, Performance-Optimierung, Edge-Cases
5. **Tag 5**: Polish, Animationen, finale Anpassungen

## Testing-Strategie

1. **Unit Tests**:
   - Positionierungs-Algorithmus
   - Kollisionserkennung
   - Größenberechnung

2. **Integration Tests**:
   - Tour-Flow mit verschiedenen Element-Größen
   - Responsive Behavior
   - Performance unter Last

3. **Manuelle Tests**:
   - Alle Tour-Schritte durchgehen
   - Verschiedene Viewport-Größen
   - Element-Interaktionen während Tour

## Potenzielle Herausforderungen

1. **Performance bei vielen DOM-Updates**
   - Lösung: Batching, RAF, Virtual Positioning

2. **Edge-Cases bei sehr großen Elementen**
   - Lösung: Spezielle Behandlung, Floating-Mode

3. **Mobile Touch-Interaktionen**
   - Lösung: Touch-Event-Handler, größere Touch-Targets

## Erweiterte Features (Optional)

1. **Smart Content Adaptation**:
   - Kürzere Texte bei wenig Platz
   - Collapsible Sections
   - Progressive Disclosure

2. **Multi-Element Highlighting**:
   - Mehrere Elemente gleichzeitig
   - Gruppen-Boundaries

3. **3D-Transformationen**:
   - Perspektivische Anpassung
   - Depth-based Layering

## Erfolgsmetriken

1. **Keine Überlappungen** zwischen Tooltip und Element (100% der Fälle)
2. **Tooltip immer vollständig sichtbar** im Viewport
3. **Smooth Performance** (60fps bei Position-Updates)
4. **Verbesserte User Experience** (weniger Ablenkung, klarerer Fokus)