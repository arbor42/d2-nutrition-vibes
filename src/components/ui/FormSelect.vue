<script setup lang="ts">
import { computed } from 'vue'

interface Option {
  value: string | number | null
  label: string
  disabled?: boolean
}

interface Props {
  modelValue: string | number | null
  options: Option[]
  placeholder?: string
  disabled?: boolean
  error?: string
  label?: string
  hint?: string
  required?: boolean
  size?: 'sm' | 'md' | 'lg'
  multiple?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Auswählen...',
  disabled: false,
  error: undefined,
  label: undefined,
  hint: undefined,
  required: false,
  size: 'md',
  multiple: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number | null]
  change: [value: string | number | null]
}>()

const selectClasses = computed(() => {
  const baseClasses = [
    'block',
    'w-full',
    'border',
    'rounded-lg',
    'bg-white',
    'dark:bg-gray-800',
    'text-gray-900',
    'dark:text-gray-100',
    'transition-all',
    'duration-200',
    'focus:outline-none',
    'focus:ring-2',
    'focus:ring-offset-2',
    'disabled:opacity-50',
    'disabled:cursor-not-allowed',
    'disabled:bg-gray-50',
    'dark:disabled:bg-gray-900',
    'appearance-none',
    'cursor-pointer'
  ]

  // Size classes
  const sizeClasses = {
    sm: ['px-3', 'py-1.5', 'text-sm', 'pr-8'],
    md: ['px-3', 'py-2', 'text-sm', 'pr-9'],
    lg: ['px-4', 'py-3', 'text-base', 'pr-10']
  }

  // State classes
  const stateClasses = props.error
    ? [
        'border-error-300',
        'focus:border-error-500',
        'focus:ring-error-500',
        'dark:border-error-600',
        'dark:focus:border-error-400'
      ]
    : [
        'border-gray-300',
        'dark:border-gray-600',
        'focus:border-primary-500',
        'focus:ring-primary-500',
        'dark:focus:border-primary-400',
        'dark:focus:ring-primary-400'
      ]

  return [
    ...baseClasses,
    ...sizeClasses[props.size],
    ...stateClasses
  ].filter(Boolean).join(' ')
})

const containerClasses = computed(() => [
  'relative',
  'w-full'
].join(' '))

const arrowClasses = computed(() => {
  const baseClasses = [
    'absolute',
    'inset-y-0',
    'right-0',
    'flex',
    'items-center',
    'pr-2',
    'pointer-events-none'
  ]

  const colorClasses = props.error
    ? 'text-error-400'
    : 'text-gray-400'

  return [...baseClasses, colorClasses].join(' ')
})

const handleChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  let value: string | number | null = target.value

  // Handle empty value
  if (value === '') {
    value = null
  }

  // Convert to number if the original option value was a number
  if (value !== null) {
    const option = props.options.find(opt => opt.value?.toString() === value)
    if (option && typeof option.value === 'number') {
      value = Number(value)
    }
  }

  emit('update:modelValue', value)
  emit('change', value)
}
</script>

<template>
  <div class="w-full">
    <!-- Label -->
    <label
      v-if="label"
      class="form-label"
      :for="$attrs.id as string"
    >
      {{ label }}
      <span
        v-if="required"
        class="text-error-500 ml-1"
      >*</span>
    </label>

    <!-- Select Container -->
    <div :class="containerClasses">
      <!-- Select Field -->
      <select
        :value="modelValue ?? ''"
        :disabled="disabled"
        :required="required"
        :multiple="multiple"
        :class="selectClasses"
        v-bind="$attrs"
        @change="handleChange"
      >
        <!-- Placeholder Option -->
        <option
          v-if="!multiple && placeholder"
          value=""
          disabled
          :selected="modelValue === null"
        >
          {{ placeholder }}
        </option>

        <!-- Options -->
        <option
          v-for="option in options"
          :key="option.value ?? 'null'"
          :value="option.value ?? ''"
          :disabled="option.disabled"
          :selected="modelValue === option.value"
        >
          {{ option.label }}
        </option>
      </select>

      <!-- Arrow Icon -->
      <div
        v-if="!multiple"
        :class="arrowClasses"
      >
        <svg
          class="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>
    </div>

    <!-- Hint Text -->
    <p
      v-if="hint && !error"
      class="form-help"
    >
      {{ hint }}
    </p>

    <!-- Error Message -->
    <p
      v-if="error"
      class="form-error"
    >
      {{ error }}
    </p>
  </div>
</template>

<style scoped>
/* Custom select styling for better cross-browser compatibility */
select {
  background-image: none;
}

/* Hide default arrow in IE */
select::-ms-expand {
  display: none;
}

/* Firefox specific styling */
select:-moz-focusring {
  color: transparent;
  text-shadow: 0 0 0 theme('colors.gray.900');
}

.dark select:-moz-focusring {
  text-shadow: 0 0 0 theme('colors.gray.100');
}
</style>