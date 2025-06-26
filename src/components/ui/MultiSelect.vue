<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'

interface Option {
  value: string | number
  label: string
  disabled?: boolean
}

interface Props {
  modelValue: (string | number)[]
  options: Option[]
  placeholder?: string
  searchPlaceholder?: string
  disabled?: boolean
  error?: string
  label?: string
  required?: boolean
  size?: 'sm' | 'md' | 'lg'
  maxItems?: number
  maxHeight?: string
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Auswählen...',
  searchPlaceholder: 'Suchen...',
  disabled: false,
  error: undefined,
  label: undefined,
  required: false,
  size: 'md',
  maxItems: undefined,
  maxHeight: '200px'
})

const emit = defineEmits<{
  'update:modelValue': [value: (string | number)[]]
  change: [value: (string | number)[]]
}>()

const isOpen = ref(false)
const searchQuery = ref('')
const searchInputRef = ref<HTMLInputElement>()
const containerRef = ref<HTMLDivElement>()

const selectedOptions = computed(() => {
  return props.options.filter(option => 
    props.modelValue.includes(option.value)
  )
})

const filteredOptions = computed(() => {
  if (!searchQuery.value) return props.options
  
  return props.options.filter(option =>
    option.label.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
})

const availableOptions = computed(() => {
  return filteredOptions.value.filter(option => 
    !props.modelValue.includes(option.value)
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
    'cursor-pointer',
    'min-h-[38px]'
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
        'border-emerald-500',
        'ring-2',
        'ring-emerald-500'
      ]
    : [
        'border-gray-300',
        'dark:border-gray-600',
        'focus:border-emerald-500',
        'focus:ring-emerald-500'
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

const optionClasses = (option: Option, isHighlighted: boolean) => {
  const isSelected = props.modelValue.includes(option.value)
  return [
    'flex',
    'items-center',
    'px-3',
    'py-2',
    'text-sm',
    'cursor-pointer',
    'transition-colors',
    'duration-150',
    isSelected
      ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-900 dark:text-emerald-100'
      : isHighlighted
      ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
      : 'text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700',
    option.disabled ? 'opacity-50 cursor-not-allowed' : ''
  ].filter(Boolean).join(' ')
}

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

const toggleOption = (option: Option) => {
  if (option.disabled) return
  
  const newValue = [...props.modelValue]
  const index = newValue.indexOf(option.value)
  
  if (index > -1) {
    // Remove if already selected
    newValue.splice(index, 1)
  } else {
    // Add if not selected and within maxItems limit
    if (!props.maxItems || newValue.length < props.maxItems) {
      newValue.push(option.value)
    }
  }
  
  emit('update:modelValue', newValue)
  emit('change', newValue)
}

const removeOption = (option: Option, event: Event) => {
  event.stopPropagation()
  const newValue = props.modelValue.filter(v => v !== option.value)
  emit('update:modelValue', newValue)
  emit('change', newValue)
}

const clearAll = (event: Event) => {
  event.stopPropagation()
  emit('update:modelValue', [])
  emit('change', [])
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
        availableOptions.value.length - 1
      )
      break
    case 'ArrowUp':
      event.preventDefault()
      highlightedIndex.value = Math.max(highlightedIndex.value - 1, -1)
      break
    case 'Enter':
      event.preventDefault()
      if (highlightedIndex.value >= 0) {
        toggleOption(availableOptions.value[highlightedIndex.value])
      }
      break
    case 'Escape':
      isOpen.value = false
      searchQuery.value = ''
      break
  }
}

watch(availableOptions, () => {
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
        <div class="flex-1 flex flex-wrap gap-1 items-center">
          <!-- Selected items -->
          <span
            v-for="option in selectedOptions"
            :key="option.value"
            class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200"
          >
            {{ option.label }}
            <button
              type="button"
              class="ml-1 inline-flex items-center justify-center w-3 h-3 rounded-full hover:bg-emerald-200 dark:hover:bg-emerald-800"
              @click="removeOption(option, $event)"
            >
              <svg
                class="w-2 h-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="3"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </span>
          
          <!-- Placeholder -->
          <span
            v-if="selectedOptions.length === 0"
            class="block truncate text-gray-500 dark:text-gray-400"
          >
            {{ placeholder }}
          </span>
        </div>

        <div class="flex items-center ml-2 space-x-1">
          <!-- Clear all button -->
          <button
            v-if="selectedOptions.length > 0"
            type="button"
            class="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
            @click="clearAll"
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
            class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
            @keydown="handleKeydown"
          />
        </div>

        <!-- Options -->
        <div
          class="max-h-48 overflow-y-auto"
          :style="{ maxHeight }"
        >
          <div
            v-if="availableOptions.length === 0 && selectedOptions.length === 0"
            class="px-3 py-2 text-sm text-gray-500 dark:text-gray-400"
          >
            Keine Optionen gefunden
          </div>
          
          <!-- Selected options (shown at top) -->
          <div
            v-for="option in selectedOptions"
            :key="`selected-${option.value}`"
            :class="optionClasses(option, false)"
            @click="toggleOption(option)"
          >
            <svg
              class="w-4 h-4 mr-2 text-emerald-600 dark:text-emerald-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
            {{ option.label }}
          </div>
          
          <!-- Available options -->
          <div
            v-for="(option, index) in availableOptions"
            :key="option.value"
            :class="optionClasses(
              option,
              index === highlightedIndex
            )"
            @click="toggleOption(option)"
            @mouseenter="highlightedIndex = index"
          >
            <div class="w-4 h-4 mr-2" /> <!-- Spacer for alignment -->
            {{ option.label }}
          </div>
        </div>
        
        <!-- Max items message -->
        <div
          v-if="maxItems && modelValue.length >= maxItems"
          class="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-600"
        >
          Maximum {{ maxItems }} Elemente ausgewählt
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
    
    <!-- Selected count -->
    <p
      v-if="selectedOptions.length > 0 && !error"
      class="mt-1 text-xs text-gray-500 dark:text-gray-400"
    >
      {{ selectedOptions.length }} {{ selectedOptions.length === 1 ? 'Element' : 'Elemente' }} ausgewählt
    </p>
  </div>
</template>