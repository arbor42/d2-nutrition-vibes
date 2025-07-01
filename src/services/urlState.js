/*
 * UrlStateService – Phase 1 Grundgerüst
 * -------------------------------------
 * Dieses Skeleton implementiert lediglich die öffentliche API,
 * ohne bereits eine echte Serialisierung/Deserialisierung vorzunehmen.
 * Das vollständige Mapping sowie die bidirektionale Synchronisierung
 * werden in späteren Phasen ergänzt.
 */

// Da wir uns in einer reinen JS-Codebasis bewegen, nutzen wir hier
// keine Typdeklarationen. Für zukünftige Erweiterungen könnte die Datei
// aber problemlos nach .ts umbenannt und typisiert werden.

import { useUIStore } from '@/stores/useUIStore'
import { useVisualizationStore } from '@/stores/useVisualizationStore'
import { watch, ref, reactive } from 'vue'

class UrlStateService {
  // Statische Property für Singleton-Referenz (ESLint/TS/TypeScript Happy)
  static _instance = null
  constructor() {
    // Singleton-Schutz: bei HMR in Vite kann die Datei mehrfach evaluiert werden.
    if (UrlStateService._instance) {
      return UrlStateService._instance
    }

    /** @type {import('vue-router').Router|null} */
    this.router = null

    /**
     * Zentrales Mapping – wird in den Folgephasen sukzessive befüllt.
     * Struktur siehe Konzeptdokument Abschnitt 3.
     *     {
     *       dark: { get: () => ui.darkMode, set: v => ui.darkMode = !!+v },
     *       ...
     *     }
     */
    this.mapping = {}

    // Merker, ob init bereits aufgerufen wurde
    this.initialized = false

    // Ready-Status & Puffer für Route-Änderungen (Phase 8)
    this._isAppReady = false
    this._pendingRouteParams = []

    // Interner Zustand für Array-basierte Parameter (Phase 4)
    this._arrayState = {
      pr: [], // selectedProducts
      cty: [], // selectedCountries
      met: [] // selectedMetrics
    }

    // Slider-Werte (Phase 5)
    this._sliderState = {
      cc: 0,
      pg: 0,
      tp: 0,
      eg: 0
    }

    // ML-Panel-Status (Phase 6)
    this._mlState = {
      ft: '',  // Forecast Type
      fc: '',  // Forecast Key
      mdl: '', // Model
      conf: false // showConfidenceInterval
    }

    // Map & Legend (Phase 7)
    this._mapState = {
      z: 1,
      lat: 0,
      lng: 0,
      cs: 'viridis',
      filt: ref([]), // number[] dezile, reaktiv als Ref
      infopanel: false
    }

    // --- Timeseries Panel -----------------------------------------
    this._tsState = reactive({
      tpr: [],   // selectedProducts[]
      tcty: [],  // selectedCountries[]
      tmet: []   // selectedMetrics[]
    })

    UrlStateService._instance = this
  }

  /**
   * Initialisierung – muss in main.js nach Erstellung des Routers erfolgen.
   * Für Phase 1 merken wir uns nur die Referenz.
   * @param {import('vue-router').Router} router
   */
  init(router) {
    if (this.initialized) {
      console.warn('[UrlStateService] init() bereits ausgeführt – zweiter Aufruf wird ignoriert')
      return
    }

    if (!router) {
      throw new Error('[UrlStateService] Ein gültiger Router muss an init() übergeben werden')
    }

    this.router = router

    // Phase-2-Mapping initialisieren (nur Read-Only Deserialisierung)
    this._buildInitialMapping()

    this.initialized = true

    console.log('🔗 UrlStateService initialisiert (Phase 2 – Read-Only)')
  }

  /**
   * Erstellt das Basismapping für Phase 2 (dark, sb, pnl)
   * Wird nur einmal beim Init aufgerufen.
   */
  _buildInitialMapping() {
    const ui = useUIStore()
    const viz = useVisualizationStore()

    this.mapping = {
      // Dark-Mode (1/0 → boolean)
      dark: {
        default: false,
        get: () => ui.darkMode,
        set: (v) => {
          const boolVal = v === '1' || v === 'true' || v === true || v === 1
          // Pinia-typisch per Patch setzen
          // @ts-ignore – Typdefinition des stores enthält $patch nicht
          ui.$patch({ darkMode: boolVal })
          if (typeof document !== 'undefined') {
            if (boolVal) document.documentElement.classList.add('dark')
            else document.documentElement.classList.remove('dark')
          }
        }
      },
      // Sidebar Open (1/0 → boolean)
      sb: {
        default: true,
        get: () => ui.sidebarOpen,
        set: (v) => {
          const boolVal = v === '1' || v === 'true' || v === true || v === 1
          // @ts-ignore – Patch nutzen um Typwarnung zu vermeiden
          ui.$patch({ sidebarOpen: boolVal })
        }
      },
      // Aktuelles Panel (string)
      pnl: {
        default: 'dashboard',
        get: () => ui.currentPanel,
        set: (v) => {
          if (typeof v === 'string' && v.length > 0) {
            ui.setCurrentPanel(v)
          }
        }
      },
      // --- Arrays ------------------------------------------------
      // Produkt (Single Select in UI)
      pr: {
        default: ui.selectedProduct,
        get: () => ui.selectedProduct,
        set: (v) => {
          if (typeof v === 'string' && v.length) ui.setSelectedProduct(decodeURIComponent(v))
        }
      },
      cty: {
        default: [],
        get: () => this._arrayState.cty,
        set: (v) => { this._arrayState.cty = Array.isArray(v) ? v : this._paramToArray(v) }
      },
      // Mehrfach-Metriken (Timeseries Panel) – behalten Array
      met: {
        default: [],
        get: () => this._arrayState.met,
        set: (v) => { this._arrayState.met = Array.isArray(v) ? v : this._paramToArray(v) }
      },
      // --- Slider (Numbers) --------------------------------------
      cc: {
        default: 0,
        get: () => this._sliderState.cc,
        set: (v) => { this._sliderState.cc = Number(v) || 0 }
      },
      pg: {
        default: 0,
        get: () => this._sliderState.pg,
        set: (v) => { this._sliderState.pg = Number(v) || 0 }
      },
      tp: {
        default: 0,
        get: () => this._sliderState.tp,
        set: (v) => { this._sliderState.tp = Number(v) || 0 }
      },
      eg: {
        default: 0,
        get: () => this._sliderState.eg,
        set: (v) => { this._sliderState.eg = Number(v) || 0 }
      },
      // --- ML-spezifisch -----------------------------------------
      ft: {
        default: '',
        get: () => this._mlState.ft,
        set: (v) => { this._mlState.ft = String(v || '') }
      },
      fc: {
        default: '',
        get: () => this._mlState.fc,
        set: (v) => { this._mlState.fc = String(v || '') }
      },
      mdl: {
        default: '',
        get: () => this._mlState.mdl,
        set: (v) => { this._mlState.mdl = String(v || '') }
      },
      conf: {
        default: false,
        get: () => this._mlState.conf,
        set: (v) => {
          const boolVal = v === '1' || v === 'true' || v === true || v === 1
          this._mlState.conf = boolVal
        }
      },
      // --- Map & Legend ------------------------------------------
      z: {
        default: 1,
        get: () => this._mapState.z,
        set: (v) => { this._mapState.z = parseFloat(v) || 1 }
      },
      lat: {
        default: 0,
        get: () => this._mapState.lat,
        set: (v) => { this._mapState.lat = parseFloat(v) || 0 }
      },
      lng: {
        default: 0,
        get: () => this._mapState.lng,
        set: (v) => { this._mapState.lng = parseFloat(v) || 0 }
      },
      cs: {
        default: viz.getVisualizationConfig('worldMap').colorScheme,
        get: () => viz.getVisualizationConfig('worldMap').colorScheme,
        set: (v) => { if (v) viz.updateMapConfig({ colorScheme: v }) }
      },
      filt: {
        default: [],
        get: () => this._mapState.filt.value,
        set: (v) => {
          const arr = Array.isArray(v) ? v : this._paramToArray(v)
          this._mapState.filt.value = arr.map(num => Number(num)).filter(n => !isNaN(n))
        }
      },
      infopanel: {
        default: false,
        get: () => this._mapState.infopanel,
        set: (v) => {
          const boolVal = v === '1' || v === 'true' || v === true || v === 1
          this._mapState.infopanel = boolVal
        }
      },
      // Jahr & Metrik (Single)
      yr: {
        default: ui.selectedYear,
        get: () => ui.selectedYear,
        set: (v) => { ui.setSelectedYear(Number(v)) }
      },
      m: {
        default: ui.selectedMetric,
        get: () => ui.selectedMetric,
        set: (v) => { if (v) ui.setSelectedMetric(String(v)) }
      },
      view: {
        /* @ts-ignore */
        default: ui.selectedVisualization,
        /* @ts-ignore */
        get: () => ui.selectedVisualization,
        /* @ts-ignore */
        set: (v) => { if (v) ui.setSelectedVisualization(String(v), false) }
      },
      // --- Timeseries spezifische Arrays ---------------------------
      tpr: {
        default: [],
        get: () => this._tsState.tpr,
        set: (v) => { this._tsState.tpr = Array.isArray(v) ? v : this._paramToArray(v) }
      },
      tcty: {
        default: [],
        get: () => this._tsState.tcty,
        set: (v) => { this._tsState.tcty = Array.isArray(v) ? v : this._paramToArray(v) }
      },
      tmet: {
        default: [],
        get: () => this._tsState.tmet,
        set: (v) => { this._tsState.tmet = Array.isArray(v) ? v : this._paramToArray(v) }
      },
    }

    // Nachdem das Mapping steht, Watcher aufsetzen (nur einmal)
    if (!this._watchersInitialized) {
      this._setupWatchers()
      this._watchersInitialized = true
    }
  }

  /**
   * Serialisiert den aktuellen Store-State in URLSearchParams (nur Primitive).
   */
  serialize() {
    const params = new URLSearchParams()

    for (const [key, cfg] of Object.entries(this.mapping)) {
      if (!cfg?.get) continue
      const val = cfg.get()
      const def = cfg.default

      // Skip default values
      if (val === def || val === undefined || val === null) continue

      // Boolean → 1/0
      if (typeof val === 'boolean') {
        params.set(key, val ? '1' : '0')
      } else if (Array.isArray(val)) {
        const p = this._arrayToParam(val)
        if (p) params.set(key, p)
      } else {
        params.set(key, String(val))
      }
    }

    return params
  }

  /**
   * Wendet die übergebenen Query-Parameter auf die Stores an.
   * Phase 1: Platzhalter – macht noch nichts, löst aber keinen Fehler aus.
   * @param {URLSearchParams} query
   */
  deserialize(query) {
    if (!(query instanceof URLSearchParams)) {
      console.warn('[UrlStateService] deserialize() erwartet ein URLSearchParams-Objekt')
      return
    }

    // Vor AppReady: Pufferung
    if (!this._isAppReady) {
      this._pendingRouteParams.push(new URLSearchParams(query))
      return
    }

    // Phase 2: Read-Only – Query-Parameter auf Stores anwenden
    for (const [key, handler] of Object.entries(this.mapping)) {
      if (!handler?.set) continue
      if (query.has(key)) {
        handler.set(query.get(key))
      }
    }
  }

  /*
   * Für Tests & Debugging: Zugriff auf Mapping ermöglichen
   */
  _getMapping() {
    return this.mapping
  }

  /**
   * Externer Resolver, der vom App-Initialisierungsprozess gesetzt wird.
   * Sobald dieser Resolver ausgelöst wird, wenden wir die aktuelle Route
   * auf die Stores an.
   * @param {Function} resolverFn
   */
  setReadyResolver(resolverFn) {
    if (typeof resolverFn !== 'function') {
      console.warn('[UrlStateService] setReadyResolver erwartet eine Funktion')
      return
    }

    // Wir wrappen die übergebene Funktion, um nach deren Ausführung
    // unsere Deserialisierung anzustoßen.
    const self = this
    this._wrappedReadyResolver = function (...args) {
      try {
        resolverFn.apply(this, args)
      } finally {
        self._onAppReady()
      }
    }

    // Geben die gewrappte Funktion zurück, falls der Aufrufer sie verwenden möchte
    return this._wrappedReadyResolver
  }

  /**
   * Wird intern aufgerufen, wenn die Anwendung bereit ist.
   */
  _onAppReady() {
    if (this._isAppReady) return
    if (!this.initialized || !this.router) return

    this._isAppReady = true

    // Convert current route query to URLSearchParams
    const qObj = this.router.currentRoute.value.query || {}
    const initialParams = new URLSearchParams()
    Object.entries(qObj).forEach(([k, v]) => {
      if (Array.isArray(v)) {
        if (v.length) initialParams.set(k, v[0])
      } else if (v != null) {
        initialParams.set(k, v)
      }
    })

    this.deserialize(initialParams)

    if (this._pendingRouteParams.length) {
      this._pendingRouteParams.forEach(p => this.deserialize(p))
      this._pendingRouteParams = []
    }
  }

  /** ------------------------------------------------------------------
   * Watcher-Setup: Route → Store & Store → Route (debounced)
   * ------------------------------------------------------------------*/
  _setupWatchers() {
    const debounce = (fn, wait = 300) => {
      let t
      return (...args) => {
        clearTimeout(t)
        t = setTimeout(() => fn(...args), wait)
      }
    }

    // ROUTE ➜ STORE ---------------------------------------------------
    watch(
      () => this.router.currentRoute.value.query,
      (newQuery) => {
        if (this._isSyncing) return
        this._isSyncing = true

        const params = new URLSearchParams()
        Object.entries(newQuery).forEach(([k, v]) => {
          if (Array.isArray(v)) {
            if (v.length) params.set(k, v[0])
          } else if (v != null) {
            params.set(k, v)
          }
        })

        this.deserialize(params)

        this._isSyncing = false
      },
      { deep: true }
    )

    // STORE ➜ ROUTE ---------------------------------------------------
    const pushStoreToRoute = () => {
      if (this._isSyncing) return
      this._isSyncing = true

      const params = this.serialize()
      const queryObj = { ...this.router.currentRoute.value.query }

      // Clear old keys that are part of mapping but now default/removed
      Object.keys(this.mapping).forEach((k) => {
        delete queryObj[k]
      })

      // Set new params
      params.forEach((value, key) => {
        queryObj[key] = value
      })

      this.router.replace({ query: queryObj })

      this._isSyncing = false
    }

    const debouncedPush = debounce(pushStoreToRoute, 300)

    // Watch each mapping get()
    Object.values(this.mapping).forEach((cfg) => {
      if (!cfg?.get) return
      watch(cfg.get, debouncedPush, { deep: false })
    })
  }

  /* --------------------------------------------------------------
   * Helper: Base64URL (ohne Padding)  & Array ↔ Param
   * ------------------------------------------------------------*/
  _encodeBase64Url(str) {
    return btoa(str).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  }

  _decodeBase64Url(b64) {
    const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4))
    const base = b64.replace(/-/g, '+').replace(/_/g, '/') + pad
    return atob(base)
  }

  _arrayToParam(arr) {
    if (!Array.isArray(arr) || arr.length === 0) return null
    if (arr.length > 20) {
      const json = JSON.stringify(arr)
      return 'b64:' + this._encodeBase64Url(json)
    }
    return arr.map(encodeURIComponent).join(',')
  }

  _paramToArray(str) {
    if (!str) return []
    if (str.startsWith('b64:')) {
      try {
        const decoded = this._decodeBase64Url(str.slice(4))
        return JSON.parse(decoded)
      } catch (e) {
        console.warn('[UrlStateService] Fehler beim Base64-Decode', e)
        return []
      }
    }
    return str.split(',').map(decodeURIComponent).filter(Boolean)
  }

  /* ----------------------------------------------------
   * Logging helper (Phase 8)
   * --------------------------------------------------*/
  _log(...args) {
    // @ts-ignore - import.meta.env in JS
    if (import.meta?.env?.DEV) {
      // eslint-disable-next-line no-console
      console.log('[UrlStateService]', ...args)
    }
  }
}

// Export als Singleton-Instanz
const instance = new UrlStateService()
export default instance 