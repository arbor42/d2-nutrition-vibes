## v1.1.0 – URL-State-Service Release

_2024-06-30_

### Neu
* Vollständiger `UrlStateService` (Phasen 1-8) – serialisiert **sämtliche** UI-Zustände in die URL und stellt sie beim Laden wieder her.
* Bidirektionaler Sync zwischen Pinia-Stores und Vue-Router (debounced, ohne History-Flood).
* Unterstützung komplexer Typen (Arrays mit Base64-Fallback, numerische Slider, Karten-Parameter, ML-Panel-Optionen).
* Fallback-Mechanismen & Logging für robuste Initialisierung.
* Cypress-E2E-Test "URL State Deep-Linking".
* Dokumentation im README (`Deep-Linking & URL-State-Service`).

### Geändert
* `main.js`: Integration des UrlStateService inkl. `readyResolver`.
* `vite`-Script `build:analyze` ermöglicht Bundle-Inspection.

### Behoben
* Verhinderte Ping-Pong-Loops bei Route/Store-Watcher.
* Potenzielle Race-Conditions vor App-Ready (Phasen 8).

---

Alle Details siehe `urlservice.md`. Release-Tag: **v1.1.0**. 