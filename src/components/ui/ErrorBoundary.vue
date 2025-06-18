<template>
  <div class="error-boundary">
    <Suspense>
      <template #default>
        <slot />
      </template>
      <template #fallback>
        <div class="error-loading">
          <LoadingSpinner />
          <p class="text-gray-600 mt-2">Loading...</p>
        </div>
      </template>
    </Suspense>
  </div>
</template>

<script setup>
import { onErrorCaptured, provide, ref } from 'vue'
import LoadingSpinner from './LoadingSpinner.vue'

const props = defineProps({
  onError: {
    type: Function,
    default: null
  },
  fallback: {
    type: [String, Object],
    default: null
  }
})

const hasError = ref(false)
const error = ref(null)

// Error boundary for child components
onErrorCaptured((err, instance, info) => {
  hasError.value = true
  error.value = err
  
  console.error('Error Boundary caught error:', err)
  console.error('Component instance:', instance)
  console.error('Error info:', info)
  
  // Call custom error handler if provided
  if (props.onError) {
    props.onError(err, instance, info)
  }
  
  // Prevent error from propagating to parent
  return false
})

// Provide error state to child components
provide('errorState', {
  hasError,
  error,
  resetError: () => {
    hasError.value = false
    error.value = null
  }
})
</script>

<style scoped>
.error-boundary {
  @apply min-h-32;
}

.error-loading {
  @apply flex flex-col items-center justify-center p-8;
}
</style>