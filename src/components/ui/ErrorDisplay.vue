<template>
  <div class="error-display" :class="errorClasses">
    <div class="error-content">
      <div class="error-icon">
        <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
        </svg>
      </div>
      
      <div class="error-message">
        <h3 class="error-title">{{ title }}</h3>
        <p class="error-description">{{ message }}</p>
        
        <div v-if="showDetails && error" class="error-details">
          <details class="mt-2">
            <summary class="cursor-pointer text-sm font-medium">Technical Details</summary>
            <pre class="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">{{ errorDetails }}</pre>
          </details>
        </div>
      </div>
      
      <div v-if="showRetry" class="error-actions">
        <BaseButton 
          @click="handleRetry"
          variant="outline"
          size="sm"
          class="mr-2"
        >
          Try Again
        </BaseButton>
        
        <BaseButton 
          v-if="showReport"
          @click="handleReport"
          variant="ghost"
          size="sm"
        >
          Report Issue
        </BaseButton>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import BaseButton from './BaseButton.vue'

const props = defineProps({
  error: {
    type: [Error, Object, String],
    default: null
  },
  title: {
    type: String,
    default: 'An error occurred'
  },
  message: {
    type: String,
    default: 'Something went wrong. Please try again.'
  },
  variant: {
    type: String,
    default: 'error', // error, warning, info
    validator: (value) => ['error', 'warning', 'info'].includes(value)
  },
  size: {
    type: String,
    default: 'md', // sm, md, lg
    validator: (value) => ['sm', 'md', 'lg'].includes(value)
  },
  showRetry: {
    type: Boolean,
    default: false
  },
  showReport: {
    type: Boolean,
    default: false
  },
  showDetails: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['retry', 'report'])

const errorClasses = computed(() => {
  const base = 'border rounded-lg p-4'
  const variants = {
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800'
  }
  const sizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  }
  
  return `${base} ${variants[props.variant]} ${sizes[props.size]}`
})

const errorDetails = computed(() => {
  if (!props.error) return ''
  
  if (props.error instanceof Error) {
    return `${props.error.name}: ${props.error.message}\n\nStack trace:\n${props.error.stack}`
  }
  
  if (typeof props.error === 'object') {
    return JSON.stringify(props.error, null, 2)
  }
  
  return String(props.error)
})

const handleRetry = () => {
  emit('retry')
}

const handleReport = () => {
  emit('report', {
    error: props.error,
    title: props.title,
    message: props.message,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href
  })
}
</script>

<style scoped>
.error-display {
  @apply w-full;
}

.error-content {
  @apply flex items-start space-x-3;
}

.error-icon {
  @apply flex-shrink-0;
}

.error-message {
  @apply flex-1 min-w-0;
}

.error-title {
  @apply font-medium;
}

.error-description {
  @apply mt-1 text-sm opacity-90;
}

.error-details {
  @apply mt-2;
}

.error-actions {
  @apply flex-shrink-0 flex flex-col space-y-2;
}

@media (min-width: 640px) {
  .error-actions {
    @apply flex-row space-y-0 space-x-2;
  }
}
</style>