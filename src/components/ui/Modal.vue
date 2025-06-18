<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

interface Props {
  modelValue: boolean
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  closable?: boolean
  closeOnBackdrop?: boolean
  closeOnEscape?: boolean
  persistent?: boolean
  centered?: boolean
  scrollable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  closable: true,
  closeOnBackdrop: true,
  closeOnEscape: true,
  persistent: false,
  centered: true,
  scrollable: true
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  close: []
  open: []
}>()

const modalRef = ref<HTMLDivElement>()
const contentRef = ref<HTMLDivElement>()

const overlayClasses = computed(() => [
  'fixed',
  'inset-0',
  'bg-gray-900',
  'bg-opacity-50',
  'backdrop-blur-sm',
  'transition-all',
  'duration-300',
  'z-50',
  props.centered ? 'flex items-center justify-center' : 'flex items-start justify-center pt-16',
  props.scrollable ? 'overflow-y-auto' : 'overflow-hidden'
].join(' '))

const modalClasses = computed(() => {
  const baseClasses = [
    'relative',
    'bg-white',
    'dark:bg-gray-800',
    'rounded-lg',
    'shadow-xl',
    'border',
    'border-gray-200',
    'dark:border-gray-700',
    'transition-all',
    'duration-300',
    'transform',
    'max-h-full',
    'flex',
    'flex-col'
  ]

  // Size classes
  const sizeClasses = {
    sm: ['max-w-sm', 'w-full', 'mx-4'],
    md: ['max-w-md', 'w-full', 'mx-4'],
    lg: ['max-w-lg', 'w-full', 'mx-4'],
    xl: ['max-w-4xl', 'w-full', 'mx-4'],
    full: ['w-full', 'h-full', 'm-4']
  }

  return [
    ...baseClasses,
    ...sizeClasses[props.size]
  ].filter(Boolean).join(' ')
})

const headerClasses = computed(() => [
  'flex',
  'items-center',
  'justify-between',
  'p-6',
  'border-b',
  'border-gray-200',
  'dark:border-gray-700',
  'flex-shrink-0'
].join(' '))

const bodyClasses = computed(() => [
  'flex-1',
  'p-6',
  props.scrollable ? 'overflow-y-auto' : 'overflow-hidden'
].join(' '))

const footerClasses = computed(() => [
  'flex',
  'items-center',
  'justify-end',
  'space-x-3',
  'p-6',
  'border-t',
  'border-gray-200',
  'dark:border-gray-700',
  'bg-gray-50',
  'dark:bg-gray-900/50',
  'flex-shrink-0'
].join(' '))

const closeModal = () => {
  if (!props.persistent) {
    emit('update:modelValue', false)
    emit('close')
  }
}

const handleBackdropClick = (event: MouseEvent) => {
  if (props.closeOnBackdrop && event.target === modalRef.value) {
    closeModal()
  }
}

const handleEscapeKey = (event: KeyboardEvent) => {
  if (props.closeOnEscape && event.key === 'Escape' && props.modelValue) {
    closeModal()
  }
}

const handleTrapFocus = (event: KeyboardEvent) => {
  if (!props.modelValue || event.key !== 'Tab') return

  const focusableElements = contentRef.value?.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )

  if (!focusableElements || focusableElements.length === 0) return

  const firstElement = focusableElements[0] as HTMLElement
  const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

  if (event.shiftKey) {
    if (document.activeElement === firstElement) {
      event.preventDefault()
      lastElement.focus()
    }
  } else {
    if (document.activeElement === lastElement) {
      event.preventDefault()
      firstElement.focus()
    }
  }
}

// Focus management
watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    document.body.style.overflow = 'hidden'
    emit('open')
    
    // Focus first focusable element
    setTimeout(() => {
      const focusableElement = contentRef.value?.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as HTMLElement
      focusableElement?.focus()
    }, 100)
  } else {
    document.body.style.overflow = ''
  }
})

onMounted(() => {
  document.addEventListener('keydown', handleEscapeKey)
  document.addEventListener('keydown', handleTrapFocus)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleEscapeKey)
  document.removeEventListener('keydown', handleTrapFocus)
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <Transition
      name="modal"
      appear
    >
      <div
        v-if="modelValue"
        ref="modalRef"
        :class="overlayClasses"
        @click="handleBackdropClick"
      >
        <div
          ref="contentRef"
          :class="modalClasses"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="title ? 'modal-title' : undefined"
          @click.stop
        >
          <!-- Header -->
          <div
            v-if="title || closable || $slots.header"
            :class="headerClasses"
          >
            <slot name="header">
              <h3
                v-if="title"
                id="modal-title"
                class="text-lg font-semibold text-gray-900 dark:text-gray-100"
              >
                {{ title }}
              </h3>
            </slot>
            
            <button
              v-if="closable"
              @click="closeModal"
              class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              :aria-label="'Modal schließen'"
            >
              <svg
                class="w-5 h-5"
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
          </div>

          <!-- Body -->
          <div :class="bodyClasses">
            <slot />
          </div>

          <!-- Footer -->
          <div
            v-if="$slots.footer"
            :class="footerClasses"
          >
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* Modal transition animations */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .relative,
.modal-leave-to .relative {
  transform: scale(0.9) translateY(-20px);
}

.modal-enter-to .relative,
.modal-leave-from .relative {
  transform: scale(1) translateY(0);
}

/* Smooth backdrop transition */
.modal-enter-from,
.modal-leave-to {
  backdrop-filter: blur(0px);
}

.modal-enter-to,
.modal-leave-from {
  backdrop-filter: blur(4px);
}

/* Scrollbar styling for modal body */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: theme('colors.gray.100');
  border-radius: 3px;
}

.dark .overflow-y-auto::-webkit-scrollbar-track {
  background: theme('colors.gray.800');
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: theme('colors.gray.300');
  border-radius: 3px;
}

.dark .overflow-y-auto::-webkit-scrollbar-thumb {
  background: theme('colors.gray.600');
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: theme('colors.gray.400');
}

.dark .overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: theme('colors.gray.500');
}
</style>