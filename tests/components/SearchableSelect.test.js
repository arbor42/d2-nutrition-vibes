import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import SearchableSelect from '@/components/ui/SearchableSelect.vue'

describe('SearchableSelect', () => {
  const defaultOptions = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3' }
  ]

  it('renders with default props', () => {
    const wrapper = mount(SearchableSelect, {
      props: {
        options: defaultOptions,
        modelValue: null
      }
    })
    
    expect(wrapper.find('.searchable-select').exists()).toBe(true)
  })

  it('displays placeholder when no value selected', () => {
    const wrapper = mount(SearchableSelect, {
      props: {
        options: defaultOptions,
        modelValue: null,
        placeholder: 'Select an option...'
      }
    })
    
    expect(wrapper.text()).toContain('Select an option...')
  })

  it('displays selected option label', () => {
    const wrapper = mount(SearchableSelect, {
      props: {
        options: defaultOptions,
        modelValue: 'option2'
      }
    })
    
    expect(wrapper.text()).toContain('Option 2')
  })

  it('opens dropdown when clicked', async () => {
    const wrapper = mount(SearchableSelect, {
      props: {
        options: defaultOptions,
        modelValue: null
      }
    })
    
    await wrapper.find('.select-trigger').trigger('click')
    expect(wrapper.find('.select-dropdown').isVisible()).toBe(true)
  })

  it('filters options based on search input', async () => {
    const wrapper = mount(SearchableSelect, {
      props: {
        options: defaultOptions,
        modelValue: null,
        searchable: true
      }
    })
    
    await wrapper.find('.select-trigger').trigger('click')
    const searchInput = wrapper.find('.search-input')
    await searchInput.setValue('Option 1')
    
    const visibleOptions = wrapper.findAll('.option-item:not(.hidden)')
    expect(visibleOptions).toHaveLength(1)
    expect(visibleOptions[0].text()).toContain('Option 1')
  })

  it('emits update:modelValue when option is selected', async () => {
    const wrapper = mount(SearchableSelect, {
      props: {
        options: defaultOptions,
        modelValue: null
      }
    })
    
    await wrapper.find('.select-trigger').trigger('click')
    await wrapper.findAll('.option-item')[1].trigger('click')
    
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')[0]).toEqual(['option2'])
  })

  it('handles disabled state', () => {
    const wrapper = mount(SearchableSelect, {
      props: {
        options: defaultOptions,
        modelValue: null,
        disabled: true
      }
    })
    
    expect(wrapper.find('.select-trigger').classes()).toContain('disabled')
  })
})