<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'

interface Option {
  value: string | number
  label: string
  description?: string
  disabled?: boolean
}

interface Props {
  modelValue: string | number | null | (string | number)[]
  options: Option[]
  placeholder?: string
  searchPlaceholder?: string
  disabled?: boolean
  error?: string
  label?: string
  required?: boolean
  size?: 'sm' | 'md' | 'lg'
  clearable?: boolean
  maxHeight?: string
  multiple?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Auswählen...',
  searchPlaceholder: 'Suchen...',
  disabled: false,
  error: undefined,
  label: undefined,
  required: false,
  size: 'md',
  clearable: false,
  multiple: false,
  maxHeight: '200px'
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number | null]
  change: [value: string | number | null]
}>()

const isOpen = ref(false)
const searchQuery = ref('')
const searchInputRef = ref<HTMLInputElement>()
const containerRef = ref<HTMLDivElement>()

const selectedOption = computed(() => {
  return props.options.find(option => option.value === props.modelValue)
})

const filteredOptions = computed(() => {
  if (!searchQuery.value) return props.options
  
  return props.options.filter(option =>
    option.label.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
})

const containerClasses = computed(() => [
  'relative',
  'w-full'
].join(' '))

const triggerClasses = computed(() => {
  const baseClasses = [
    'flex',
    'items-center',
    'justify-between',
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
    'disabled:cursor-not-allowed',
    'cursor-pointer'
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
    : isOpen.value
    ? [
        'border-primary-500',
        'ring-2',
        'ring-primary-500'
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

const dropdownClasses = computed(() => [
  'absolute',
  'z-50',
  'w-full',
  'mt-1',
  'bg-white',
  'dark:bg-gray-800',
  'border',
  'border-gray-200',
  'dark:border-gray-600',
  'rounded-lg',
  'shadow-lg'
].join(' '))

const optionClasses = (option: Option, isSelected: boolean, isHighlighted: boolean) => [
  'flex',
  'items-center',
  'px-3',
  'py-2',
  'text-sm',
  'cursor-pointer',
  'transition-colors',
  'duration-150',
  isSelected
    ? 'bg-primary-500 text-white'
    : isHighlighted
    ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
    : 'text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700',
  option.disabled ? 'opacity-50 cursor-not-allowed' : ''
].filter(Boolean).join(' ')

const toggleDropdown = () => {
  if (props.disabled) return
  
  isOpen.value = !isOpen.value
  
  if (isOpen.value) {
    nextTick(() => {
      searchInputRef.value?.focus()
    })
  } else {
    searchQuery.value = ''
  }
}

const selectOption = (option: Option) => {
  if (option.disabled) return
  
  emit('update:modelValue', option.value)
  emit('change', option.value)
  isOpen.value = false
  searchQuery.value = ''
}

const clearSelection = (event: Event) => {
  event.stopPropagation()
  emit('update:modelValue', null)
  emit('change', null)
}

const handleClickOutside = (event: Event) => {
  if (containerRef.value && !containerRef.value.contains(event.target as Node)) {
    isOpen.value = false
    searchQuery.value = ''
  }
}

watch(isOpen, (newValue) => {
  if (newValue) {
    document.addEventListener('click', handleClickOutside)
  } else {
    document.removeEventListener('click', handleClickOutside)
  }
})

// Keyboard navigation
const highlightedIndex = ref(-1)

const handleKeydown = (event: KeyboardEvent) => {
  if (!isOpen.value) return
  
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      highlightedIndex.value = Math.min(
        highlightedIndex.value + 1,
        filteredOptions.value.length - 1
      )
      break
    case 'ArrowUp':
      event.preventDefault()
      highlightedIndex.value = Math.max(highlightedIndex.value - 1, -1)
      break
    case 'Enter':
      event.preventDefault()
      if (highlightedIndex.value >= 0) {
        selectOption(filteredOptions.value[highlightedIndex.value])
      }
      break
    case 'Escape':
      isOpen.value = false
      searchQuery.value = ''
      break
  }
}

watch(filteredOptions, () => {
  highlightedIndex.value = -1
})
</script>

<template>
  <div class="w-full">
    <!-- Label -->
    <label
      v-if="label"
      class="block text-sm font-medium mb-1"
      :class="{
        'text-red-700 dark:text-red-400': error,
        'text-gray-700 dark:text-gray-300': !error
      }"
    >
      {{ label }}
      <span
        v-if="required"
        class="text-red-500 ml-1"
      >*</span>
    </label>

    <!-- Select Container -->
    <div
      ref="containerRef"
      :class="containerClasses"
    >
      <!-- Trigger -->
      <button
        type="button"
        :class="triggerClasses"
        :disabled="disabled"
        @click="toggleDropdown"
        @keydown="handleKeydown"
      >
        <span
          v-if="selectedOption"
          class="block truncate"
        >
          {{ selectedOption.label }}
        </span>
        <span
          v-else
          class="block truncate text-gray-500 dark:text-gray-400"
        >
          {{ placeholder }}
        </span>

        <div class="flex items-center ml-2 space-x-1">
          <!-- Clear button -->
          <button
            v-if="clearable && selectedOption"
            type="button"
            class="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
            @click="clearSelection"
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
          </button>

          <!-- Dropdown arrow -->
          <svg
            class="w-4 h-4 transition-transform duration-200"
            :class="{ 'rotate-180': isOpen }"
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
      </button>

      <!-- Dropdown -->
      <div
        v-if="isOpen"
        :class="dropdownClasses"
      >
        <!-- Search input -->
        <div class="p-2 border-b border-gray-200 dark:border-gray-600">
          <input
            ref="searchInputRef"
            v-model="searchQuery"
            type="text"
            :placeholder="searchPlaceholder"
            class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            @keydown="handleKeydown"
          />
        </div>

        <!-- Options -->
        <div
          class="max-h-48 overflow-y-auto"
          :style="{ maxHeight }"
        >
          <div
            v-if="filteredOptions.length === 0"
            class="px-3 py-2 text-sm text-gray-500 dark:text-gray-400"
          >
            Keine Optionen gefunden
          </div>
          <div
            v-for="(option, index) in filteredOptions"
            :key="option.value"
            :class="optionClasses(
              option,
              option.value === modelValue,
              index === highlightedIndex
            )"
            @click="selectOption(option)"
            @mouseenter="highlightedIndex = index"
          >
            <div class="flex flex-col">
              <span class="font-medium">{{ option.label }}</span>
              <span 
                v-if="option.description" 
                class="text-xs text-gray-500 dark:text-gray-400 mt-0.5"
              >
                {{ option.description }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Error message -->
    <p
      v-if="error"
      class="mt-1 text-sm text-red-600 dark:text-red-400"
    >
      {{ error }}
    </p>
  </div>
</template>