<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  color?: 'primary' | 'secondary' | 'white' | 'gray'
  text?: string
  centered?: boolean
  overlay?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  color: 'primary',
  text: undefined,
  centered: false,
  overlay: false
})

const containerClasses = computed(() => {
  const baseClasses = ['flex', 'items-center']
  
  if (props.centered) {
    baseClasses.push('justify-center')
  }
  
  if (props.overlay) {
    baseClasses.push(
      'absolute',
      'inset-0',
      'bg-white',
      'dark:bg-gray-900',
      'bg-opacity-75',
      'dark:bg-opacity-75',
      'z-10'
    )
  }
  
  return baseClasses.join(' ')
})

const spinnerClasses = computed(() => {
  const baseClasses = [
    'animate-spin',
    'rounded-full',
    'border-2',
    'border-solid'
  ]
  
  // Size classes
  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  }
  
  // Color classes
  const colorClasses = {
    primary: 'border-primary-200 border-t-primary-600 dark:border-primary-800 dark:border-t-primary-400',
    secondary: 'border-secondary-200 border-t-secondary-600 dark:border-secondary-800 dark:border-t-secondary-400',
    white: 'border-gray-200 border-t-white',
    gray: 'border-gray-200 border-t-gray-600 dark:border-gray-700 dark:border-t-gray-300'
  }
  
  return [
    ...baseClasses,
    sizeClasses[props.size],
    colorClasses[props.color]
  ].join(' ')
})

const textClasses = computed(() => {
  const baseClasses = ['text-gray-600', 'dark:text-gray-400']
  
  // Size-based text classes
  const textSizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg'
  }
  
  return [
    ...baseClasses,
    textSizeClasses[props.size]
  ].join(' ')
})
</script>

<template>
  <div :class="containerClasses">
    <div class="flex items-center space-x-3">
      <!-- Spinner -->
      <div :class="spinnerClasses" />
      
      <!-- Loading Text -->
      <span
        v-if="text"
        :class="textClasses"
      >
        {{ text }}
      </span>
    </div>
  </div>
</template>

<style scoped>
/* Custom spinner animation */
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .animate-spin {
    animation: none;
  }
  
  /* Show a pulsing effect instead for reduced motion */
  .animate-spin {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>