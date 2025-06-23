<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'ghost' | 'outline-primary' | 'outline-secondary'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  fullWidth?: boolean
  icon?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  disabled: false,
  loading: false,
  fullWidth: false,
  icon: false
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const buttonClasses = computed(() => {
  const baseClasses = [
    'inline-flex',
    'items-center',
    'justify-center',
    'font-medium',
    'rounded-lg',
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
    sm: props.icon ? 'p-1' : 'px-3 py-1.5 text-sm',
    md: props.icon ? 'p-2' : 'px-4 py-2 text-sm',
    lg: props.icon ? 'p-3' : 'px-6 py-3 text-base'
  }

  // Variant classes
  const variantClasses = {
    primary: [
      'bg-primary-500',
      'text-white',
      'hover:bg-primary-600',
      'focus:ring-primary-500',
      'active:bg-primary-700',
      'border',
      'border-primary-500',
      'hover:border-primary-600',
      'shadow-sm'
    ],
    secondary: [
      'bg-secondary-500',
      'text-white',
      'hover:bg-secondary-600',
      'focus:ring-secondary-500',
      'active:bg-secondary-700',
      'border',
      'border-secondary-500',
      'hover:border-secondary-600',
      'shadow-sm'
    ],
    danger: [
      'bg-error-500',
      'text-white',
      'hover:bg-error-600',
      'focus:ring-error-500',
      'active:bg-error-700',
      'border',
      'border-error-500',
      'hover:border-error-600',
      'shadow-sm'
    ],
    success: [
      'bg-success-500',
      'text-white',
      'hover:bg-success-600',
      'focus:ring-success-500',
      'active:bg-success-700',
      'border',
      'border-success-500',
      'hover:border-success-600',
      'shadow-sm'
    ],
    warning: [
      'bg-warning-500',
      'text-white',
      'hover:bg-warning-600',
      'focus:ring-warning-500',
      'active:bg-warning-700',
      'border',
      'border-warning-500',
      'hover:border-warning-600',
      'shadow-sm'
    ],
    ghost: [
      'bg-transparent',
      'text-gray-700',
      'hover:bg-gray-100',
      'focus:ring-gray-500',
      'active:bg-gray-200',
      'dark:text-gray-300',
      'dark:hover:bg-gray-800',
      'dark:active:bg-gray-700',
      'border',
      'border-transparent',
      'hover:border-gray-300',
      'dark:hover:border-gray-600'
    ],
    'outline-primary': [
      'bg-transparent',
      'text-primary-600',
      'hover:bg-primary-50',
      'focus:ring-primary-500',
      'active:bg-primary-100',
      'dark:text-primary-400',
      'dark:hover:bg-primary-950',
      'dark:active:bg-primary-900',
      'border-2',
      'border-primary-500',
      'hover:border-primary-600'
    ],
    'outline-secondary': [
      'bg-transparent',
      'text-secondary-600',
      'hover:bg-secondary-50',
      'focus:ring-secondary-500',
      'active:bg-secondary-100',
      'dark:text-secondary-400',
      'dark:hover:bg-secondary-950',
      'dark:active:bg-secondary-900',
      'border-2',
      'border-secondary-500',
      'hover:border-secondary-600'
    ]
  }

  // Full width class
  const widthClass = props.fullWidth ? 'w-full' : ''

  const currentVariantClasses = variantClasses[props.variant] || variantClasses.primary
  
  return [
    ...baseClasses,
    sizeClasses[props.size],
    ...currentVariantClasses,
    widthClass
  ].filter(Boolean).join(' ')
})

const handleClick = (event: MouseEvent) => {
  if (!props.disabled && !props.loading) {
    emit('click', event)
  }
}
</script>

<template>
  <button
    :class="buttonClasses"
    :disabled="disabled || loading"
    @click="handleClick"
  >
    <!-- Loading Spinner -->
    <svg
      v-if="loading"
      class="animate-spin -ml-1 mr-2 h-4 w-4"
      :class="{ 'mr-0': icon }"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        class="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        stroke-width="4"
      />
      <path
        class="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>

    <!-- Button Content -->
    <slot v-if="!loading" />
  </button>
</template>