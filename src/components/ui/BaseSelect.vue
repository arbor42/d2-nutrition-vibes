<script setup lang="ts">
import { computed, ref } from 'vue'

interface Option {
  value: string | number
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
  required?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Auswählen...',
  disabled: false,
  required: false,
  size: 'md'
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number | null]
  change: [value: string | number | null]
}>()

const selectRef = ref<HTMLSelectElement>()

const selectClasses = computed(() => {
  const baseClasses = [
    'block',
    'w-full',
    'rounded-lg',
    'border',
    'bg-white',
    'dark:bg-gray-800',
    'text-gray-900',
    'dark:text-gray-100',
    'transition-colors',
    'duration-200',
    'focus:outline-none',
    'focus:ring-2',
    'focus:ring-offset-2',
    'disabled:opacity-50',
    'disabled:cursor-not-allowed'
  ]

  // Size classes
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-3 text-base'
  }

  // State classes
  const stateClasses = props.error
    ? [
        'border-red-300',
        'focus:border-red-500',
        'focus:ring-red-500'
      ]
    : [
        'border-gray-300',
        'dark:border-gray-600',
        'focus:border-primary-500',
        'focus:ring-primary-500'
      ]

  return [
    ...baseClasses,
    sizeClasses[props.size],
    ...stateClasses
  ].join(' ')
})

const labelClasses = computed(() => [
  'block',
  'text-sm',
  'font-medium',
  'mb-1',
  props.error ? 'text-red-700 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'
].join(' '))

const handleChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  const value = target.value === '' ? null : target.value
  
  emit('update:modelValue', value)
  emit('change', value)
}

const focus = () => {
  selectRef.value?.focus()
}

defineExpose({
  focus
})
</script>

<template>
  <div class="w-full">
    <!-- Label -->
    <label
      v-if="label"
      :class="labelClasses"
      :for="$attrs.id as string"
    >
      {{ label }}
      <span
        v-if="required"
        class="text-red-500 ml-1"
      >*</span>
    </label>

    <!-- Select -->
    <select
      ref="selectRef"
      :value="modelValue ?? ''"
      :class="selectClasses"
      :disabled="disabled"
      v-bind="$attrs"
      @change="handleChange"
    >
      <!-- Placeholder option -->
      <option
        value=""
        :disabled="required"
      >
        {{ placeholder }}
      </option>

      <!-- Options -->
      <option
        v-for="option in options"
        :key="option.value"
        :value="option.value"
        :disabled="option.disabled"
      >
        {{ option.label }}
      </option>
    </select>

    <!-- Error message -->
    <p
      v-if="error"
      class="mt-1 text-sm text-red-600 dark:text-red-400"
    >
      {{ error }}
    </p>
  </div>
</template>