import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseButton from '@/components/ui/BaseButton.vue'

describe('BaseButton', () => {
  it('renders with default props', () => {
    const wrapper = mount(BaseButton, {
      slots: {
        default: 'Click me'
      }
    })
    
    expect(wrapper.text()).toBe('Click me')
    expect(wrapper.classes()).toContain('btn')
    expect(wrapper.attributes('type')).toBe('button')
  })

  it('applies variant classes correctly', () => {
    const wrapper = mount(BaseButton, {
      props: {
        variant: 'primary'
      },
      slots: {
        default: 'Primary Button'
      }
    })
    
    expect(wrapper.classes()).toContain('btn-primary')
  })

  it('applies size classes correctly', () => {
    const wrapper = mount(BaseButton, {
      props: {
        size: 'lg'
      },
      slots: {
        default: 'Large Button'
      }
    })
    
    expect(wrapper.classes()).toContain('btn-lg')
  })

  it('emits click event when clicked', async () => {
    const wrapper = mount(BaseButton, {
      slots: {
        default: 'Click me'
      }
    })
    
    await wrapper.trigger('click')
    expect(wrapper.emitted()).toHaveProperty('click')
  })

  it('is disabled when disabled prop is true', () => {
    const wrapper = mount(BaseButton, {
      props: {
        disabled: true
      },
      slots: {
        default: 'Disabled Button'
      }
    })
    
    expect(wrapper.attributes('disabled')).toBeDefined()
    expect(wrapper.classes()).toContain('btn-disabled')
  })

  it('shows loading state', () => {
    const wrapper = mount(BaseButton, {
      props: {
        loading: true
      },
      slots: {
        default: 'Loading Button'
      }
    })
    
    expect(wrapper.classes()).toContain('btn-loading')
  })
})