<script setup lang="ts">
import { computed, ref } from 'vue'

interface Props {
  modelValue: number
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  label?: string
  showValue?: boolean
  formatValue?: (value: number) => string
  size?: 'sm' | 'md' | 'lg'
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger'
}

const props = withDefaults(defineProps<Props>(), {
  min: 0,
  max: 100,
  step: 1,
  disabled: false,
  label: undefined,
  showValue: true,
  formatValue: undefined,
  size: 'md',
  color: 'primary'
})

const emit = defineEmits<{
  'update:modelValue': [value: number]
  change: [value: number]
  input: [value: number]
}>()

const sliderRef = ref<HTMLInputElement>()

const percentage = computed(() => {
  return ((props.modelValue - props.min) / (props.max - props.min)) * 100
})

const formattedValue = computed(() => {
  if (props.formatValue) {
    return props.formatValue(props.modelValue)
  }
  return props.modelValue.toString()
})

const sliderClasses = computed(() => {
  const baseClasses = [
    'w-full',
    'h-2',
    'bg-gray-200',
    'dark:bg-gray-700',
    'rounded-lg',
    'appearance-none',
    'cursor-pointer',
    'transition-all',
    'duration-200',
    'focus:outline-none',
    'focus:ring-2',
    'focus:ring-offset-2',
    'disabled:opacity-50',
    'disabled:cursor-not-allowed'
  ]

  // Size classes
  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  }

  // Color classes for focus ring
  const colorClasses = {
    primary: 'focus:ring-primary-500',
    secondary: 'focus:ring-gray-500',
    success: 'focus:ring-green-500',
    warning: 'focus:ring-yellow-500',
    danger: 'focus:ring-red-500'
  }

  return [
    ...baseClasses,
    sizeClasses[props.size],
    colorClasses[props.color]
  ].join(' ')
})

const trackStyle = computed(() => {
  const colors = {
    primary: 'bg-primary-500',
    secondary: 'bg-gray-500',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    danger: 'bg-red-500'
  }

  return {
    background: `linear-gradient(to right, rgb(var(--color-${props.color}-500)) 0%, rgb(var(--color-${props.color}-500)) ${percentage.value}%, rgb(229 231 235) ${percentage.value}%, rgb(229 231 235) 100%)`
  }
})

const thumbStyle = computed(() => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }

  const colors = {
    primary: 'bg-primary-500 border-primary-600',
    secondary: 'bg-gray-500 border-gray-600',
    success: 'bg-green-500 border-green-600',
    warning: 'bg-yellow-500 border-yellow-600',
    danger: 'bg-red-500 border-red-600'
  }

  return [
    sizes[props.size],
    colors[props.color],
    'rounded-full',
    'border-2',
    'cursor-pointer',
    'shadow-sm',
    'transition-all',
    'duration-200',
    'hover:shadow-md',
    'focus:shadow-lg'
  ].join(' ')
})

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  const value = parseFloat(target.value)
  
  emit('update:modelValue', value)
  emit('input', value)
}

const handleChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  const value = parseFloat(target.value)
  
  emit('change', value)
}

const focus = () => {
  sliderRef.value?.focus()
}

defineExpose({
  focus
})
</script>

<template>
  <div class="w-full">
    <!-- Label and Value -->
    <div
      v-if="label || showValue"
      class="flex justify-between items-center mb-2"
    >
      <label
        v-if="label"
        class="block text-sm font-medium text-gray-700 dark:text-gray-300"
        :for="$attrs.id as string"
      >
        {{ label }}
      </label>
      <span
        v-if="showValue"
        class="text-sm font-medium text-gray-900 dark:text-gray-100 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded"
      >
        {{ formattedValue }}
      </span>
    </div>

    <!-- Slider Container -->
    <div class="relative">
      <!-- Custom styled slider -->
      <input
        ref="sliderRef"
        type="range"
        :value="modelValue"
        :min="min"
        :max="max"
        :step="step"
        :disabled="disabled"
        :class="sliderClasses"
        v-bind="$attrs"
        @input="handleInput"
        @change="handleChange"
      />
    </div>

    <!-- Min/Max Labels -->
    <div class="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
      <span>{{ formatValue ? formatValue(min) : min }}</span>
      <span>{{ formatValue ? formatValue(max) : max }}</span>
    </div>
  </div>
</template>

<style scoped>
/* Custom slider styles */
input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
}

/* Webkit browsers */
input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  @apply w-5 h-5 bg-primary-500 rounded-full cursor-pointer border-2 border-primary-600 shadow-sm transition-all duration-200;
}

input[type="range"]::-webkit-slider-thumb:hover {
  @apply shadow-md;
}

input[type="range"]::-webkit-slider-thumb:active {
  @apply shadow-lg;
}

/* Firefox */
input[type="range"]::-moz-range-thumb {
  @apply w-5 h-5 bg-primary-500 rounded-full cursor-pointer border-2 border-primary-600 shadow-sm transition-all duration-200;
  border: none;
}

input[type="range"]::-moz-range-track {
  @apply w-full h-2 bg-gray-200 rounded-lg;
}

/* Small size */
.h-1::-webkit-slider-thumb {
  @apply w-4 h-4;
}

.h-1::-moz-range-thumb {
  @apply w-4 h-4;
}

/* Large size */
.h-3::-webkit-slider-thumb {
  @apply w-6 h-6;
}

.h-3::-moz-range-thumb {
  @apply w-6 h-6;
}

/* Color variants */
.focus\:ring-primary-500::-webkit-slider-thumb {
  @apply bg-primary-500 border-primary-600;
}

.focus\:ring-green-500::-webkit-slider-thumb {
  @apply bg-green-500 border-green-600;
}

.focus\:ring-red-500::-webkit-slider-thumb {
  @apply bg-red-500 border-red-600;
}

.focus\:ring-yellow-500::-webkit-slider-thumb {
  @apply bg-yellow-500 border-yellow-600;
}

.focus\:ring-gray-500::-webkit-slider-thumb {
  @apply bg-gray-500 border-gray-600;
}
</style>