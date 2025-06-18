import BaseButton from './BaseButton.vue'

export default {
  title: 'UI/BaseButton',
  component: BaseButton,
  parameters: {
    docs: {
      description: {
        component: 'A reusable button component with consistent styling and multiple variants.'
      }
    }
  },
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['primary', 'secondary', 'danger', 'success'],
      description: 'Button style variant'
    },
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg'],
      description: 'Button size'
    },
    disabled: {
      control: { type: 'boolean' },
      description: 'Whether the button is disabled'
    },
    loading: {
      control: { type: 'boolean' },
      description: 'Show loading state'
    },
    type: {
      control: { type: 'select' },
      options: ['button', 'submit', 'reset'],
      description: 'HTML button type'
    },
    onClick: { action: 'clicked' }
  }
}

const Template = (args) => ({
  components: { BaseButton },
  setup() {
    return { args }
  },
  template: '<BaseButton v-bind="args" @click="args.onClick">{{ args.default || "Button" }}</BaseButton>'
})

export const Default = Template.bind({})
Default.args = {
  variant: 'primary',
  size: 'md',
  disabled: false,
  loading: false,
  type: 'button'
}

export const Secondary = Template.bind({})
Secondary.args = {
  ...Default.args,
  variant: 'secondary'
}

export const Danger = Template.bind({})
Danger.args = {
  ...Default.args,
  variant: 'danger',
  default: 'Delete'
}

export const Success = Template.bind({})
Success.args = {
  ...Default.args,
  variant: 'success',
  default: 'Save'
}

export const Small = Template.bind({})
Small.args = {
  ...Default.args,
  size: 'sm',
  default: 'Small Button'
}

export const Large = Template.bind({})
Large.args = {
  ...Default.args,
  size: 'lg',
  default: 'Large Button'
}

export const Loading = Template.bind({})
Loading.args = {
  ...Default.args,
  loading: true,
  default: 'Loading...'
}

export const Disabled = Template.bind({})
Disabled.args = {
  ...Default.args,
  disabled: true,
  default: 'Disabled'
}

export const AllVariants = () => ({
  components: { BaseButton },
  template: `
    <div class="space-y-4 p-4">
      <div class="space-x-2">
        <BaseButton variant="primary">Primary</BaseButton>
        <BaseButton variant="secondary">Secondary</BaseButton>
        <BaseButton variant="danger">Danger</BaseButton>
        <BaseButton variant="success">Success</BaseButton>
      </div>
      
      <div class="space-x-2">
        <BaseButton size="sm">Small</BaseButton>
        <BaseButton size="md">Medium</BaseButton>
        <BaseButton size="lg">Large</BaseButton>
      </div>
      
      <div class="space-x-2">
        <BaseButton :loading="true">Loading</BaseButton>
        <BaseButton :disabled="true">Disabled</BaseButton>
      </div>
    </div>
  `
})