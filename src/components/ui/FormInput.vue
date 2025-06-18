<script setup lang="ts">
import { computed, ref } from 'vue'

interface Props {
  modelValue: string | number | null
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search'
  placeholder?: string
  disabled?: boolean
  readonly?: boolean
  error?: string
  label?: string
  hint?: string
  required?: boolean
  size?: 'sm' | 'md' | 'lg'
  icon?: string
  iconPosition?: 'left' | 'right'
  clearable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  disabled: false,
  readonly: false,
  required: false,
  size: 'md',
  iconPosition: 'left',
  clearable: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number | null]
  blur: [event: FocusEvent]
  focus: [event: FocusEvent]
  input: [event: Event]
}>()

const inputRef = ref<HTMLInputElement>()
const focused = ref(false)

const inputClasses = computed(() => {
  const baseClasses = [
    'block',
    'w-full',
    'border',
    'rounded-lg',
    'bg-white',
    'dark:bg-gray-800',
    'text-gray-900',
    'dark:text-gray-100',
    'placeholder-gray-500',
    'dark:placeholder-gray-400',
    'transition-all',
    'duration-200',
    'focus:outline-none',
    'focus:ring-2',
    'focus:ring-offset-2',
    'disabled:opacity-50',
    'disabled:cursor-not-allowed',
    'disabled:bg-gray-50',
    'dark:disabled:bg-gray-900',
    'readonly:bg-gray-50',
    'dark:readonly:bg-gray-900',
    'readonly:cursor-default'
  ]

  // Size classes
  const sizeClasses = {
    sm: [
      'px-3',
      'py-1.5',
      'text-sm',
      props.icon && props.iconPosition === 'left' ? 'pl-9' : '',
      props.icon && props.iconPosition === 'right' ? 'pr-9' : '',
      props.clearable && props.modelValue ? 'pr-9' : ''
    ],
    md: [
      'px-3',
      'py-2',
      'text-sm',
      props.icon && props.iconPosition === 'left' ? 'pl-10' : '',
      props.icon && props.iconPosition === 'right' ? 'pr-10' : '',
      props.clearable && props.modelValue ? 'pr-10' : ''
    ],
    lg: [
      'px-4',
      'py-3',
      'text-base',
      props.icon && props.iconPosition === 'left' ? 'pl-12' : '',
      props.icon && props.iconPosition === 'right' ? 'pr-12' : '',
      props.clearable && props.modelValue ? 'pr-12' : ''
    ]
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
    : focused.value
    ? [
        'border-primary-500',
        'ring-2',
        'ring-primary-500',
        'dark:border-primary-400',
        'dark:ring-primary-400'
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

const iconClasses = computed(() => {
  const baseClasses = [
    'absolute',
    'inset-y-0',
    'flex',
    'items-center',
    'pointer-events-none'
  ]

  const positionClasses = props.iconPosition === 'left'
    ? ['left-0', 'pl-3']
    : ['right-0', 'pr-3']

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }

  return [
    ...baseClasses,
    ...positionClasses,
    sizeClasses[props.size],
    props.error ? 'text-error-400' : 'text-gray-400'
  ].join(' ')
})

const clearButtonClasses = computed(() => {
  const baseClasses = [
    'absolute',
    'inset-y-0',
    'right-0',
    'flex',
    'items-center',
    'pr-3',
    'cursor-pointer',
    'text-gray-400',
    'hover:text-gray-600',
    'dark:hover:text-gray-200',
    'transition-colors'
  ]

  return baseClasses.join(' ')
})

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  let value: string | number | null = target.value

  // Convert to number for number inputs
  if (props.type === 'number' && value !== '') {
    value = parseFloat(value as string)
    if (isNaN(value as number)) {
      value = null
    }
  }

  emit('update:modelValue', value)
  emit('input', event)
}

const handleFocus = (event: FocusEvent) => {
  focused.value = true
  emit('focus', event)
}

const handleBlur = (event: FocusEvent) => {
  focused.value = false
  emit('blur', event)
}

const clearValue = () => {
  emit('update:modelValue', '')
  inputRef.value?.focus()
}

const focus = () => {
  inputRef.value?.focus()
}

const blur = () => {
  inputRef.value?.blur()
}

defineExpose({
  focus,
  blur
})
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

    <!-- Input Container -->
    <div :class="containerClasses">
      <!-- Left Icon -->
      <div
        v-if="icon && iconPosition === 'left'"
        :class="iconClasses"
      >
        <svg
          class="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <!-- Add your icon paths here based on the icon prop -->
          <path
            v-if="icon === 'search'"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
          <path
            v-else-if="icon === 'email'"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
          <path
            v-else-if="icon === 'lock'"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
          <path
            v-else-if="icon === 'user'"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      </div>

      <!-- Input Field -->
      <input
        ref="inputRef"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :required="required"
        :class="inputClasses"
        v-bind="$attrs"
        @input="handleInput"
        @focus="handleFocus"
        @blur="handleBlur"
      />

      <!-- Right Icon -->
      <div
        v-if="icon && iconPosition === 'right'"
        :class="iconClasses"
      >
        <svg
          class="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <!-- Same icon paths as above -->
        </svg>
      </div>

      <!-- Clear Button -->
      <div
        v-if="clearable && modelValue && !disabled && !readonly"
        :class="clearButtonClasses"
        @click="clearValue"
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
            d="M6 18L18 6M6 6l12 12"
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