// Lazy Data Loader - Implements progressive loading for large JSON files
import { ref } from 'vue'

class LazyDataLoader {
  constructor() {
    this.cache = new Map()
    this.loadingStates = new Map()
    this.abortControllers = new Map()
  }

  /**
   * Load data with chunked streaming for large files
   * @param {string} url - URL to load
   * @param {Object} options - Loading options
   * @returns {Promise<any>} Loaded data
   */
  async loadData(url, options = {}) {
    const {
      onProgress = () => {},
      chunkSize = 1024 * 1024, // 1MB chunks
      parseAsStream = true,
      cacheKey = url,
      forceReload = false
    } = options

    // Check cache first
    if (!forceReload && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)
    }

    // Check if already loading
    if (this.loadingStates.has(cacheKey)) {
      return this.loadingStates.get(cacheKey)
    }

    // Create abort controller for cancellation
    const abortController = new AbortController()
    this.abortControllers.set(cacheKey, abortController)

    const loadPromise = this._performLoad(url, {
      onProgress,
      chunkSize,
      parseAsStream,
      signal: abortController.signal
    })

    this.loadingStates.set(cacheKey, loadPromise)

    try {
      const data = await loadPromise
      this.cache.set(cacheKey, data)
      return data
    } finally {
      this.loadingStates.delete(cacheKey)
      this.abortControllers.delete(cacheKey)
    }
  }

  async _performLoad(url, options) {
    const { onProgress, chunkSize, parseAsStream, signal } = options

    try {
      const response = await fetch(url, { signal })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const contentLength = response.headers.get('content-length')
      const total = contentLength ? parseInt(contentLength, 10) : 0

      // For smaller files, use regular JSON parsing
      if (total < chunkSize || !parseAsStream) {
        const text = await response.text()
        onProgress({ loaded: total, total, percentage: 100 })
        return JSON.parse(text)
      }

      // For large files, use streaming
      return this._streamParseJSON(response.body, total, onProgress, signal)
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Data loading cancelled:', url)
        throw error
      }
      console.error('Error loading data:', error)
      throw error
    }
  }

  async _streamParseJSON(body, total, onProgress, signal) {
    const reader = body.getReader()
    const decoder = new TextDecoder()
    let chunks = ''
    let loaded = 0

    try {
      while (true) {
        if (signal.aborted) {
          throw new Error('Aborted')
        }

        const { done, value } = await reader.read()
        
        if (done) break

        loaded += value.length
        chunks += decoder.decode(value, { stream: true })
        
        const percentage = total ? Math.round((loaded / total) * 100) : 0
        onProgress({ loaded, total, percentage })
      }

      // Parse the complete JSON
      return JSON.parse(chunks)
    } finally {
      reader.releaseLock()
    }
  }

  /**
   * Load data in pages for very large datasets
   * @param {string} baseUrl - Base URL for paginated requests
   * @param {Object} options - Pagination options
   * @returns {AsyncGenerator} Async generator yielding data pages
   */
  async *loadPaginated(baseUrl, options = {}) {
    const {
      pageSize = 1000,
      startPage = 0,
      pageParam = 'page',
      sizeParam = 'size',
      onPageLoad = () => {}
    } = options

    let currentPage = startPage
    let hasMore = true

    while (hasMore) {
      const url = new URL(baseUrl)
      url.searchParams.set(pageParam, currentPage)
      url.searchParams.set(sizeParam, pageSize)

      try {
        const data = await this.loadData(url.toString(), {
          cacheKey: `${baseUrl}_page_${currentPage}`,
          parseAsStream: false
        })

        onPageLoad({ page: currentPage, data })
        yield data

        // Check if there's more data (customize based on API response)
        hasMore = data.length === pageSize
        currentPage++
      } catch (error) {
        console.error(`Error loading page ${currentPage}:`, error)
        hasMore = false
      }
    }
  }

  /**
   * Cancel ongoing data loading
   * @param {string} cacheKey - Cache key of the loading operation
   */
  cancelLoad(cacheKey) {
    const controller = this.abortControllers.get(cacheKey)
    if (controller) {
      controller.abort()
      this.abortControllers.delete(cacheKey)
      this.loadingStates.delete(cacheKey)
    }
  }

  /**
   * Clear cache
   * @param {string} cacheKey - Specific key to clear, or null to clear all
   */
  clearCache(cacheKey = null) {
    if (cacheKey) {
      this.cache.delete(cacheKey)
    } else {
      this.cache.clear()
    }
  }

  /**
   * Get cache size
   * @returns {number} Number of cached items
   */
  getCacheSize() {
    return this.cache.size
  }
}

// Export singleton instance
export const lazyDataLoader = new LazyDataLoader()

// Composable for Vue components
export function useLazyDataLoader() {
  const loading = ref(false)
  const progress = ref(0)
  const error = ref(null)

  const loadData = async (url, options = {}) => {
    loading.value = true
    error.value = null
    progress.value = 0

    try {
      const data = await lazyDataLoader.loadData(url, {
        ...options,
        onProgress: (state) => {
          progress.value = state.percentage
          if (options.onProgress) {
            options.onProgress(state)
          }
        }
      })
      return data
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    progress,
    error,
    loadData,
    cancelLoad: (key) => lazyDataLoader.cancelLoad(key),
    clearCache: (key) => lazyDataLoader.clearCache(key)
  }
}