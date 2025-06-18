<template>
  <div 
    ref="containerRef"
    class="virtual-list-container overflow-auto"
    :style="{ height: `${containerHeight}px` }"
    @scroll="handleScroll"
  >
    <div 
      class="virtual-list-spacer"
      :style="{ 
        height: `${totalHeight}px`,
        paddingTop: `${offsetY}px`
      }"
    >
      <div 
        v-for="item in visibleItems" 
        :key="getItemKey(item.data)"
        class="virtual-list-item"
        :style="{ height: `${itemHeight}px` }"
      >
        <slot 
          :item="item.data" 
          :index="item.index"
          :isVisible="true"
        />
      </div>
    </div>
    
    <!-- Loading indicator -->
    <div 
      v-if="loading" 
      class="virtual-list-loading flex items-center justify-center p-4"
    >
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      <span class="ml-2 text-gray-600">Loading...</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'

const props = defineProps({
  items: {
    type: Array,
    required: true
  },
  itemHeight: {
    type: Number,
    default: 50
  },
  containerHeight: {
    type: Number,
    default: 400
  },
  overscan: {
    type: Number,
    default: 5
  },
  keyField: {
    type: String,
    default: 'id'
  },
  loading: {
    type: Boolean,
    default: false
  },
  enableInfiniteScroll: {
    type: Boolean,
    default: false
  },
  threshold: {
    type: Number,
    default: 200
  }
})

const emit = defineEmits(['load-more', 'scroll'])

const containerRef = ref(null)
const scrollTop = ref(0)
const isScrolling = ref(false)
let scrollTimer = null

// Computed properties
const totalHeight = computed(() => props.items.length * props.itemHeight)

const visibleCount = computed(() => 
  Math.ceil(props.containerHeight / props.itemHeight) + props.overscan * 2
)

const startIndex = computed(() => 
  Math.max(0, Math.floor(scrollTop.value / props.itemHeight) - props.overscan)
)

const endIndex = computed(() => 
  Math.min(props.items.length - 1, startIndex.value + visibleCount.value)
)

const visibleItems = computed(() => {
  const items = []
  for (let i = startIndex.value; i <= endIndex.value; i++) {
    if (props.items[i]) {
      items.push({
        index: i,
        data: props.items[i]
      })
    }
  }
  return items
})

const offsetY = computed(() => startIndex.value * props.itemHeight)

// Methods
const getItemKey = (item) => {
  if (typeof item === 'object' && item !== null) {
    return item[props.keyField] || item.id
  }
  return item
}

const handleScroll = (event) => {
  scrollTop.value = event.target.scrollTop
  isScrolling.value = true
  
  // Clear existing timer
  if (scrollTimer) {
    clearTimeout(scrollTimer)
  }
  
  // Set timer to detect end of scrolling
  scrollTimer = setTimeout(() => {
    isScrolling.value = false
  }, 150)
  
  // Emit scroll event
  emit('scroll', {
    scrollTop: scrollTop.value,
    isScrolling: isScrolling.value
  })
  
  // Check for infinite scroll
  if (props.enableInfiniteScroll && !props.loading) {
    const { scrollTop: currentScrollTop, scrollHeight, clientHeight } = event.target
    const distanceFromBottom = scrollHeight - currentScrollTop - clientHeight
    
    if (distanceFromBottom < props.threshold) {
      emit('load-more')
    }
  }
}

const scrollToIndex = (index, behavior = 'smooth') => {
  if (!containerRef.value) return
  
  const targetScrollTop = index * props.itemHeight
  containerRef.value.scrollTo({
    top: targetScrollTop,
    behavior
  })
}

const scrollToTop = (behavior = 'smooth') => {
  scrollToIndex(0, behavior)
}

const scrollToBottom = (behavior = 'smooth') => {
  if (!containerRef.value) return
  
  containerRef.value.scrollTo({
    top: totalHeight.value,
    behavior
  })
}

// Performance optimization: batch updates
let updateTimer = null
const batchedUpdate = () => {
  if (updateTimer) {
    clearTimeout(updateTimer)
  }
  
  updateTimer = setTimeout(() => {
    nextTick(() => {
      // Force update of visible items if needed
      if (containerRef.value) {
        scrollTop.value = containerRef.value.scrollTop
      }
    })
  }, 16) // ~60fps
}

// Watch for items changes
watch(() => props.items.length, (newLength, oldLength) => {
  // If items were added and we're near the bottom, maintain scroll position
  if (newLength > oldLength && containerRef.value) {
    const { scrollTop: currentScrollTop, scrollHeight, clientHeight } = containerRef.value
    const wasNearBottom = scrollHeight - currentScrollTop - clientHeight < 100
    
    if (wasNearBottom) {
      nextTick(() => {
        scrollToBottom('auto')
      })
    }
  }
  
  batchedUpdate()
})

// Intersection Observer for better performance tracking
const observeVisibility = () => {
  if (!window.IntersectionObserver || !containerRef.value) return
  
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // Container is visible, enable optimizations
          batchedUpdate()
        }
      })
    },
    { threshold: 0.1 }
  )
  
  observer.observe(containerRef.value)
  
  return observer
}

let visibilityObserver = null

onMounted(() => {
  visibilityObserver = observeVisibility()
  
  // Initial scroll position setup
  if (containerRef.value) {
    scrollTop.value = containerRef.value.scrollTop
  }
})

onUnmounted(() => {
  if (scrollTimer) {
    clearTimeout(scrollTimer)
  }
  if (updateTimer) {
    clearTimeout(updateTimer)
  }
  if (visibilityObserver) {
    visibilityObserver.disconnect()
  }
})

// Expose methods
defineExpose({
  scrollToIndex,
  scrollToTop,
  scrollToBottom,
  getVisibleRange: () => ({ start: startIndex.value, end: endIndex.value }),
  isScrolling: () => isScrolling.value
})
</script>

<style scoped>
.virtual-list-container {
  position: relative;
  will-change: scroll-position;
}

.virtual-list-spacer {
  position: relative;
  will-change: transform;
}

.virtual-list-item {
  position: relative;
  will-change: contents;
}

.virtual-list-loading {
  position: sticky;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(4px);
}

/* Smooth scrolling performance */
.virtual-list-container::-webkit-scrollbar {
  width: 8px;
}

.virtual-list-container::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.virtual-list-container::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
  transition: background 0.2s ease;
}

.virtual-list-container::-webkit-scrollbar-thumb:hover {
  background: #a1a1a1;
}
</style>