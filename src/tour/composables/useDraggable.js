import { ref, onMounted, onUnmounted } from 'vue'

export function useDraggable(elementRef, options = {}) {
  const {
    initialPosition = { x: 0, y: 0 },
    handle = null,
    bounds = 'viewport',
    onDragStart = null,
    onDrag = null,
    onDragEnd = null
  } = options

  const position = ref({ ...initialPosition })
  const isDragging = ref(false)
  const dragOffset = ref({ x: 0, y: 0 })
  const hasMoved = ref(false)

  let dragHandle = null

  const handleMouseDown = (e) => {
    // Prevent text selection during drag
    e.preventDefault()
    
    const element = elementRef.value
    if (!element) return

    const rect = element.getBoundingClientRect()
    
    // Calculate offset from mouse to element position
    dragOffset.value = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }

    isDragging.value = true
    hasMoved.value = false

    // Add document listeners
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    
    // Lock cursor style
    document.body.style.cursor = 'grabbing'
    
    if (onDragStart) {
      onDragStart({ x: rect.left, y: rect.top })
    }
  }

  const handleMouseMove = (e) => {
    if (!isDragging.value) return

    hasMoved.value = true

    let newX = e.clientX - dragOffset.value.x
    let newY = e.clientY - dragOffset.value.y

    // Apply bounds constraint
    if (bounds === 'viewport') {
      const element = elementRef.value
      if (element) {
        const rect = element.getBoundingClientRect()
        const padding = 20

        // Constrain to viewport
        newX = Math.max(padding, Math.min(newX, window.innerWidth - rect.width - padding))
        newY = Math.max(padding, Math.min(newY, window.innerHeight - rect.height - padding))
      }
    }

    position.value = { x: newX, y: newY }

    if (onDrag) {
      onDrag({ x: newX, y: newY })
    }
  }

  const handleMouseUp = () => {
    if (!isDragging.value) return

    isDragging.value = false
    
    // Remove document listeners
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
    
    // Reset cursor
    document.body.style.cursor = ''

    if (onDragEnd && hasMoved.value) {
      onDragEnd(position.value)
    }
  }

  const setPosition = (newPosition) => {
    position.value = { ...newPosition }
  }

  onMounted(() => {
    const element = elementRef.value
    if (!element) return

    // Determine drag handle
    if (handle) {
      dragHandle = typeof handle === 'string' 
        ? element.querySelector(handle)
        : handle.value || handle
    } else {
      dragHandle = element
    }

    if (dragHandle) {
      dragHandle.addEventListener('mousedown', handleMouseDown)
      dragHandle.style.cursor = 'grab'
    }
  })

  onUnmounted(() => {
    if (dragHandle) {
      dragHandle.removeEventListener('mousedown', handleMouseDown)
    }
    
    // Clean up any active drag
    if (isDragging.value) {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
    }
  })

  return {
    position,
    isDragging,
    hasMoved,
    setPosition
  }
}