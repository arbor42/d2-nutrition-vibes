/**
 * Data streaming utilities for handling large files
 * Provides efficient loading and processing of large datasets
 */

/**
 * Stream reader for chunked data loading
 */
export class DataStreamReader {
  constructor(options = {}) {
    this.chunkSize = options.chunkSize || 64 * 1024 // 64KB chunks
    this.onProgress = options.onProgress || null
    this.onChunk = options.onChunk || null
    this.onComplete = options.onComplete || null
    this.onError = options.onError || null
    
    this.abortController = null
    this.totalSize = 0
    this.loadedSize = 0
  }

  /**
   * Stream JSON data from URL
   */
  async streamJSON(url) {
    try {
      this.abortController = new AbortController()
      
      const response = await fetch(url, {
        signal: this.abortController.signal
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      this.totalSize = parseInt(response.headers.get('content-length') || '0')
      
      if (!response.body) {
        throw new Error('Response body is not readable')
      }

      const reader = response.body.getReader()
      let chunks = []
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break

        this.loadedSize += value.length
        
        // Convert chunk to text
        const chunkText = new TextDecoder().decode(value)
        buffer += chunkText

        // Try to parse complete JSON objects
        const parsedData = this.parseJSONChunks(buffer)
        
        if (parsedData.parsed.length > 0) {
          chunks.push(...parsedData.parsed)
          buffer = parsedData.remaining
          
          if (this.onChunk) {
            this.onChunk(parsedData.parsed)
          }
        }

        if (this.onProgress) {
          this.onProgress({
            loaded: this.loadedSize,
            total: this.totalSize,
            progress: this.totalSize > 0 ? (this.loadedSize / this.totalSize) * 100 : 0
          })
        }
      }

      // Handle any remaining buffer
      if (buffer.trim()) {
        try {
          const remaining = JSON.parse(buffer)
          chunks.push(remaining)
        } catch (e) {
          console.warn('Could not parse remaining buffer:', buffer)
        }
      }

      if (this.onComplete) {
        this.onComplete(chunks)
      }

      return chunks

    } catch (error) {
      if (this.onError) {
        this.onError(error)
      }
      throw error
    }
  }

  /**
   * Parse JSON chunks from streaming data
   */
  parseJSONChunks(buffer) {
    const parsed = []
    let remaining = buffer
    let depth = 0
    let startIndex = 0
    let inString = false
    let escape = false

    for (let i = 0; i < buffer.length; i++) {
      const char = buffer[i]
      
      if (escape) {
        escape = false
        continue
      }
      
      if (char === '\\') {
        escape = true
        continue
      }
      
      if (char === '"') {
        inString = !inString
        continue
      }
      
      if (inString) continue
      
      if (char === '{' || char === '[') {
        if (depth === 0) {
          startIndex = i
        }
        depth++
      } else if (char === '}' || char === ']') {
        depth--
        
        if (depth === 0) {
          const jsonStr = buffer.slice(startIndex, i + 1)
          try {
            const obj = JSON.parse(jsonStr)
            parsed.push(obj)
            remaining = buffer.slice(i + 1)
          } catch (e) {
            // Invalid JSON, skip
          }
        }
      }
    }

    return { parsed, remaining }
  }

  /**
   * Stream CSV data
   */
  async streamCSV(url, options = {}) {
    const {
      delimiter = ',',
      hasHeader = true,
      batchSize = 1000
    } = options

    try {
      this.abortController = new AbortController()
      
      const response = await fetch(url, {
        signal: this.abortController.signal
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      this.totalSize = parseInt(response.headers.get('content-length') || '0')
      
      const reader = response.body.getReader()
      let buffer = ''
      let headers = null
      let rows = []
      let rowCount = 0

      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break

        this.loadedSize += value.length
        buffer += new TextDecoder().decode(value)

        // Parse complete lines
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.trim()) {
            if (!headers && hasHeader) {
              headers = this.parseCSVLine(line, delimiter)
            } else {
              const row = this.parseCSVLine(line, delimiter)
              
              if (headers) {
                const obj = {}
                headers.forEach((header, index) => {
                  obj[header] = row[index] || ''
                })
                rows.push(obj)
              } else {
                rows.push(row)
              }
              
              rowCount++
              
              // Process batch
              if (rows.length >= batchSize) {
                if (this.onChunk) {
                  this.onChunk(rows)
                }
                rows = []
              }
            }
          }
        }

        if (this.onProgress) {
          this.onProgress({
            loaded: this.loadedSize,
            total: this.totalSize,
            progress: this.totalSize > 0 ? (this.loadedSize / this.totalSize) * 100 : 0,
            rows: rowCount
          })
        }
      }

      // Process remaining rows
      if (rows.length > 0 && this.onChunk) {
        this.onChunk(rows)
      }

      if (this.onComplete) {
        this.onComplete({ totalRows: rowCount, headers })
      }

      return { totalRows: rowCount, headers }

    } catch (error) {
      if (this.onError) {
        this.onError(error)
      }
      throw error
    }
  }

  /**
   * Parse CSV line with proper escaping
   */
  parseCSVLine(line, delimiter = ',') {
    const result = []
    let current = ''
    let inQuotes = false
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"'
          i++ // Skip next quote
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    
    result.push(current.trim())
    return result
  }

  /**
   * Cancel ongoing stream
   */
  cancel() {
    if (this.abortController) {
      this.abortController.abort()
    }
  }
}

/**
 * Composable for data streaming
 */
export function useDataStreaming(options = {}) {
  const isStreaming = ref(false)
  const progress = ref(0)
  const loadedSize = ref(0)
  const totalSize = ref(0)
  const streamedData = ref([])
  const error = ref(null)

  let currentStream = null

  const startStream = async (url, type = 'json', streamOptions = {}) => {
    if (isStreaming.value) {
      throw new Error('Stream already in progress')
    }

    // Reset state
    isStreaming.value = true
    progress.value = 0
    loadedSize.value = 0
    totalSize.value = 0
    streamedData.value = []
    error.value = null

    try {
      currentStream = new DataStreamReader({
        ...options,
        onProgress: (progressData) => {
          progress.value = progressData.progress
          loadedSize.value = progressData.loaded
          totalSize.value = progressData.total
        },
        onChunk: (chunk) => {
          streamedData.value.push(...chunk)
          
          if (options.onChunk) {
            options.onChunk(chunk)
          }
        },
        onComplete: (result) => {
          isStreaming.value = false
          
          if (options.onComplete) {
            options.onComplete(result)
          }
        },
        onError: (err) => {
          error.value = err
          isStreaming.value = false
          
          if (options.onError) {
            options.onError(err)
          }
        }
      })

      if (type === 'json') {
        await currentStream.streamJSON(url)
      } else if (type === 'csv') {
        await currentStream.streamCSV(url, streamOptions)
      } else {
        throw new Error(`Unsupported stream type: ${type}`)
      }

    } catch (err) {
      error.value = err
      isStreaming.value = false
      throw err
    }
  }

  const cancelStream = () => {
    if (currentStream) {
      currentStream.cancel()
      currentStream = null
    }
    isStreaming.value = false
  }

  return {
    isStreaming,
    progress,
    loadedSize,
    totalSize,
    streamedData,
    error,
    startStream,
    cancelStream
  }
}

/**
 * Stream processor for real-time data processing
 */
export class StreamProcessor {
  constructor(options = {}) {
    this.processors = new Map()
    this.buffers = new Map()
    this.maxBufferSize = options.maxBufferSize || 10000
    this.flushInterval = options.flushInterval || 1000
    this.onFlush = options.onFlush || null
    
    this.timers = new Map()
  }

  /**
   * Add data processor
   */
  addProcessor(name, processorFn) {
    this.processors.set(name, processorFn)
    this.buffers.set(name, [])
  }

  /**
   * Process streaming data
   */
  process(name, data) {
    const processor = this.processors.get(name)
    if (!processor) {
      throw new Error(`No processor found for: ${name}`)
    }

    const buffer = this.buffers.get(name)
    
    if (Array.isArray(data)) {
      buffer.push(...data)
    } else {
      buffer.push(data)
    }

    // Auto-flush if buffer is full
    if (buffer.length >= this.maxBufferSize) {
      this.flush(name)
    } else {
      // Schedule flush
      this.scheduleFlush(name)
    }
  }

  /**
   * Schedule flush operation
   */
  scheduleFlush(name) {
    if (this.timers.has(name)) {
      clearTimeout(this.timers.get(name))
    }

    const timer = setTimeout(() => {
      this.flush(name)
    }, this.flushInterval)

    this.timers.set(name, timer)
  }

  /**
   * Flush buffer and process data
   */
  flush(name) {
    const processor = this.processors.get(name)
    const buffer = this.buffers.get(name)

    if (processor && buffer.length > 0) {
      const data = [...buffer]
      buffer.length = 0 // Clear buffer

      try {
        const result = processor(data)
        
        if (this.onFlush) {
          this.onFlush(name, result)
        }

        return result
      } catch (error) {
        console.error(`Error processing ${name}:`, error)
        throw error
      }
    }

    // Clear timer
    if (this.timers.has(name)) {
      clearTimeout(this.timers.get(name))
      this.timers.delete(name)
    }
  }

  /**
   * Flush all buffers
   */
  flushAll() {
    const results = {}
    
    this.processors.forEach((_, name) => {
      results[name] = this.flush(name)
    })

    return results
  }

  /**
   * Clear all buffers
   */
  clear() {
    this.buffers.forEach(buffer => buffer.length = 0)
    this.timers.forEach(timer => clearTimeout(timer))
    this.timers.clear()
  }

  /**
   * Get buffer stats
   */
  getStats() {
    const stats = {}
    
    this.buffers.forEach((buffer, name) => {
      stats[name] = {
        size: buffer.length,
        memoryUsage: JSON.stringify(buffer).length
      }
    })

    return stats
  }
}

/**
 * Lazy loading for large datasets
 */
export function useLazyDataLoader(dataSource, options = {}) {
  const {
    pageSize = 1000,
    preloadPages = 2,
    cacheSize = 10
  } = options

  const loadedPages = ref(new Map())
  const isLoading = ref(false)
  const currentPage = ref(0)
  const totalPages = ref(0)
  const error = ref(null)

  const loadPage = async (pageIndex) => {
    if (loadedPages.value.has(pageIndex)) {
      return loadedPages.value.get(pageIndex)
    }

    isLoading.value = true
    error.value = null

    try {
      const offset = pageIndex * pageSize
      let data

      if (typeof dataSource === 'function') {
        data = await dataSource(offset, pageSize)
      } else if (typeof dataSource === 'string') {
        const response = await fetch(`${dataSource}?offset=${offset}&limit=${pageSize}`)
        data = await response.json()
      } else if (Array.isArray(dataSource)) {
        data = dataSource.slice(offset, offset + pageSize)
      } else {
        throw new Error('Invalid data source')
      }

      // Cache management
      if (loadedPages.value.size >= cacheSize) {
        const oldestPage = Math.min(...loadedPages.value.keys())
        loadedPages.value.delete(oldestPage)
      }

      loadedPages.value.set(pageIndex, data)
      
      // Preload adjacent pages
      if (preloadPages > 0) {
        for (let i = 1; i <= preloadPages; i++) {
          if (pageIndex + i < totalPages.value) {
            setTimeout(() => loadPage(pageIndex + i), 100 * i)
          }
          if (pageIndex - i >= 0) {
            setTimeout(() => loadPage(pageIndex - i), 100 * i)
          }
        }
      }

      return data

    } catch (err) {
      error.value = err
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const getPage = (pageIndex) => {
    return loadedPages.value.get(pageIndex) || []
  }

  const clearCache = () => {
    loadedPages.value.clear()
  }

  return {
    loadedPages,
    isLoading,
    currentPage,
    totalPages,
    error,
    loadPage,
    getPage,
    clearCache
  }
}