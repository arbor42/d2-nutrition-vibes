import { ref, onUnmounted } from 'vue'

export function useWebWorker(workerScript) {
  const worker = ref(null)
  const isReady = ref(false)
  const isProcessing = ref(false)
  const pendingTasks = ref(new Map())
  
  let taskIdCounter = 0

  // Initialize worker
  const initWorker = () => {
    try {
      worker.value = new Worker(new URL(workerScript, import.meta.url), {
        type: 'module'
      })
      
      worker.value.onmessage = handleWorkerMessage
      worker.value.onerror = handleWorkerError
      worker.value.onmessageerror = handleWorkerMessageError
      
      isReady.value = true
      console.log('Web Worker initialized successfully')
    } catch (error) {
      console.error('Failed to initialize Web Worker:', error)
      isReady.value = false
    }
  }

  // Handle worker messages
  const handleWorkerMessage = (event) => {
    const { id, success, result, error } = event.data
    
    if (pendingTasks.value.has(id)) {
      const { resolve, reject } = pendingTasks.value.get(id)
      pendingTasks.value.delete(id)
      
      if (success) {
        resolve(result)
      } else {
        reject(new Error(error))
      }
    }
    
    // Update processing status
    isProcessing.value = pendingTasks.value.size > 0
  }

  // Handle worker errors
  const handleWorkerError = (error) => {
    console.error('Web Worker error:', error)
    isReady.value = false
    
    // Reject all pending tasks
    pendingTasks.value.forEach(({ reject }) => {
      reject(new Error(`Web Worker error: ${  error.message}`))
    })
    pendingTasks.value.clear()
    isProcessing.value = false
  }

  // Handle worker message errors
  const handleWorkerMessageError = (error) => {
    console.error('Web Worker message error:', error)
  }

  // Send message to worker
  const postMessage = (type, data, options = {}) => {
    return new Promise((resolve, reject) => {
      if (!worker.value || !isReady.value) {
        reject(new Error('Web Worker not ready'))
        return
      }

      const id = ++taskIdCounter
      const timeout = options.timeout || 30000 // 30 seconds default

      pendingTasks.value.set(id, { resolve, reject })
      isProcessing.value = true

      // Set timeout for task
      const timeoutId = setTimeout(() => {
        if (pendingTasks.value.has(id)) {
          pendingTasks.value.delete(id)
          isProcessing.value = pendingTasks.value.size > 0
          reject(new Error('Web Worker task timeout'))
        }
      }, timeout)

      // Override resolve/reject to clear timeout
      const originalResolve = resolve
      const originalReject = reject
      
      pendingTasks.value.set(id, {
        resolve: (result) => {
          clearTimeout(timeoutId)
          originalResolve(result)
        },
        reject: (error) => {
          clearTimeout(timeoutId)
          originalReject(error)
        }
      })

      worker.value.postMessage({ id, type, data, options })
    })
  }

  // Terminate worker
  const terminateWorker = () => {
    if (worker.value) {
      worker.value.terminate()
      worker.value = null
      isReady.value = false
      isProcessing.value = false
      
      // Reject all pending tasks
      pendingTasks.value.forEach(({ reject }) => {
        reject(new Error('Web Worker terminated'))
      })
      pendingTasks.value.clear()
      
      console.log('Web Worker terminated')
    }
  }

  // Initialize worker on creation
  initWorker()

  // Cleanup on unmount
  onUnmounted(() => {
    terminateWorker()
  })

  return {
    worker,
    isReady,
    isProcessing,
    postMessage,
    terminateWorker,
    initWorker
  }
}

// Specific hook for data processing worker
export function useDataProcessor() {
  const {
    worker,
    isReady,
    isProcessing,
    postMessage,
    terminateWorker,
    initWorker
  } = useWebWorker('../workers/dataProcessor.worker.js')

  // Process large dataset
  const processDataset = async (data, options = {}) => {
    try {
      const result = await postMessage('process', data, options)
      console.log(`Data processing completed:`, result)
      return result
    } catch (error) {
      console.error('Data processing failed:', error)
      throw error
    }
  }

  // Aggregate data
  const aggregateData = (data, groupBy, aggregateBy = 'value') => {
    return processDataset(data, {
      operation: 'aggregate',
      groupBy,
      aggregateBy
    })
  }

  // Filter data
  const filterData = (data, filterFunction) => {
    return processDataset(data, {
      operation: 'filter',
      filterFn: filterFunction.toString()
    })
  }

  // Sort data
  const sortData = (data, sortBy) => {
    return processDataset(data, {
      operation: 'sort',
      sortBy
    })
  }

  // Calculate statistics
  const calculateStatistics = (data, field = 'value') => {
    return processDataset(data, {
      operation: 'statistics',
      aggregateBy: field
    })
  }

  // Normalize data
  const normalizeData = (data, field = 'value') => {
    return processDataset(data, {
      operation: 'normalize',
      aggregateBy: field
    })
  }

  // Cluster data
  const clusterData = (data, k = 3, features = ['x', 'y']) => {
    return processDataset(data, {
      operation: 'cluster',
      k,
      features
    })
  }

  // Forecast data
  const forecastData = (data, options = {}) => {
    return processDataset(data, {
      operation: 'forecast',
      ...options
    })
  }

  // Clear worker cache
  const clearCache = () => {
    return postMessage('clearCache')
  }

  // Get memory usage
  const getMemoryUsage = () => {
    return postMessage('getMemoryUsage')
  }

  return {
    isReady,
    isProcessing,
    processDataset,
    aggregateData,
    filterData,
    sortData,
    calculateStatistics,
    normalizeData,
    clusterData,
    forecastData,
    clearCache,
    getMemoryUsage,
    terminateWorker,
    initWorker
  }
}

// Hook for CSV parsing worker
export function useCSVProcessor() {
  const {
    isReady,
    isProcessing,
    postMessage,
    terminateWorker
  } = useWebWorker('../workers/csvProcessor.worker.js')

  const parseCSV = (csvText, options = {}) => {
    return postMessage('parse', csvText, options)
  }

  const generateCSV = (data, options = {}) => {
    return postMessage('generate', data, options)
  }

  return {
    isReady,
    isProcessing,
    parseCSV,
    generateCSV,
    terminateWorker
  }
}

// Hook for image processing worker  
export function useImageProcessor() {
  const {
    isReady,
    isProcessing,
    postMessage,
    terminateWorker
  } = useWebWorker('../workers/imageProcessor.worker.js')

  const processImage = (imageData, operation, options = {}) => {
    return postMessage('process', { imageData, operation, options })
  }

  const resizeImage = (imageData, width, height) => {
    return processImage(imageData, 'resize', { width, height })
  }

  const compressImage = (imageData, quality = 0.8) => {
    return processImage(imageData, 'compress', { quality })
  }

  const filterImage = (imageData, filter) => {
    return processImage(imageData, 'filter', { filter })
  }

  return {
    isReady,
    isProcessing,
    processImage,
    resizeImage,
    compressImage,
    filterImage,
    terminateWorker
  }
}

// Worker pool for handling multiple concurrent tasks
export function useWorkerPool(workerScript, poolSize = 4) {
  const workers = ref([])
  const availableWorkers = ref([])
  const busyWorkers = ref(new Set())
  const taskQueue = ref([])
  
  // Initialize worker pool
  const initPool = () => {
    for (let i = 0; i < poolSize; i++) {
      const worker = new Worker(new URL(workerScript, import.meta.url), {
        type: 'module'
      })
      
      worker.onmessage = (event) => {
        handleWorkerMessage(worker, event)
      }
      
      worker.onerror = (error) => {
        console.error(`Worker ${i} error:`, error)
      }
      
      workers.value.push(worker)
      availableWorkers.value.push(worker)
    }
    
    console.log(`Worker pool initialized with ${poolSize} workers`)
  }

  // Handle worker message and manage pool
  const handleWorkerMessage = (worker, event) => {
    const { id, success, result, error } = event.data
    
    // Find and resolve the corresponding task
    const taskIndex = taskQueue.value.findIndex(task => task.id === id)
    if (taskIndex !== -1) {
      const task = taskQueue.value.splice(taskIndex, 1)[0]
      
      if (success) {
        task.resolve(result)
      } else {
        task.reject(new Error(error))
      }
    }
    
    // Return worker to available pool
    busyWorkers.value.delete(worker)
    availableWorkers.value.push(worker)
    
    // Process next task in queue
    processNextTask()
  }

  // Execute task using worker pool
  const executeTask = (type, data, options = {}) => {
    return new Promise((resolve, reject) => {
      const id = Date.now() + Math.random()
      const task = { id, type, data, options, resolve, reject }
      
      if (availableWorkers.value.length > 0) {
        assignTaskToWorker(task)
      } else {
        taskQueue.value.push(task)
      }
    })
  }

  // Assign task to available worker
  const assignTaskToWorker = (task) => {
    const worker = availableWorkers.value.pop()
    busyWorkers.value.add(worker)
    
    worker.postMessage({
      id: task.id,
      type: task.type,
      data: task.data,
      options: task.options
    })
  }

  // Process next task in queue
  const processNextTask = () => {
    if (taskQueue.value.length > 0 && availableWorkers.value.length > 0) {
      const task = taskQueue.value.shift()
      assignTaskToWorker(task)
    }
  }

  // Terminate all workers
  const terminatePool = () => {
    workers.value.forEach(worker => worker.terminate())
    workers.value = []
    availableWorkers.value = []
    busyWorkers.value.clear()
    taskQueue.value = []
  }

  // Initialize pool
  initPool()

  // Cleanup on unmount
  onUnmounted(() => {
    terminatePool()
  })

  return {
    executeTask,
    poolSize: workers.value.length,
    availableWorkers: availableWorkers.value.length,
    busyWorkers: busyWorkers.value.size,
    queueLength: taskQueue.value.length,
    terminatePool
  }
}