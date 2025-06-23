import { ref } from 'vue'

import BaseSelect from './BaseSelect.vue'

export default {
  title: 'UI/BaseSelect',
  component: BaseSelect,
  parameters: {
    docs: {
      description: {
        component: 'Enhanced select component with search and validation capabilities.'
      }
    }
  },
  argTypes: {
    options: {
      control: { type: 'object' },
      description: 'Array of select options'
    },
    placeholder: {
      control: { type: 'text' },
      description: 'Placeholder text'
    },
    searchable: {
      control: { type: 'boolean' },
      description: 'Enable search functionality'
    },
    multiple: {
      control: { type: 'boolean' },
      description: 'Allow multiple selections'
    },
    disabled: {
      control: { type: 'boolean' },
      description: 'Disable the select'
    }
  }
}

const countries = [
  { label: 'United States', value: 'US' },
  { label: 'Canada', value: 'CA' },
  { label: 'Mexico', value: 'MX' },
  { label: 'Brazil', value: 'BR' },
  { label: 'Argentina', value: 'AR' },
  { label: 'United Kingdom', value: 'GB' },
  { label: 'France', value: 'FR' },
  { label: 'Germany', value: 'DE' },
  { label: 'Italy', value: 'IT' },
  { label: 'Spain', value: 'ES' },
  { label: 'China', value: 'CN' },
  { label: 'Japan', value: 'JP' },
  { label: 'South Korea', value: 'KR' },
  { label: 'India', value: 'IN' },
  { label: 'Australia', value: 'AU' }
]

const Template = (args) => ({
  components: { BaseSelect },
  setup() {
    const selectedValue = ref(args.modelValue)
    return { args, selectedValue }
  },
  template: `
    <div class="w-64">
      <BaseSelect 
        v-model="selectedValue" 
        v-bind="args"
      />
      <div class="mt-2 text-sm text-gray-600">
        Selected: {{ selectedValue }}
      </div>
    </div>
  `
})

export const Default = Template.bind({})
Default.args = {
  options: countries,
  placeholder: 'Select a country',
  searchable: false,
  multiple: false,
  disabled: false
}

export const Searchable = Template.bind({})
Searchable.args = {
  ...Default.args,
  searchable: true,
  placeholder: 'Search countries...'
}

export const Multiple = Template.bind({})
Multiple.args = {
  ...Default.args,
  multiple: true,
  placeholder: 'Select multiple countries',
  modelValue: ['US', 'CA']
}

export const SearchableMultiple = Template.bind({})
SearchableMultiple.args = {
  ...Default.args,
  searchable: true,
  multiple: true,
  placeholder: 'Search and select multiple...',
  modelValue: []
}

export const Disabled = Template.bind({})
Disabled.args = {
  ...Default.args,
  disabled: true,
  modelValue: 'US'
}

export const WithPreselection = Template.bind({})
WithPreselection.args = {
  ...Default.args,
  modelValue: 'US'
}

export const FoodCategories = () => ({
  components: { BaseSelect },
  setup() {
    const selectedCategory = ref('cereals')
    const foodCategories = [
      { label: 'Cereals (excluding beer)', value: 'cereals' },
      { label: 'Fruits (excluding wine)', value: 'fruits' },
      { label: 'Vegetables', value: 'vegetables' },
      { label: 'Meat', value: 'meat' },
      { label: 'Milk (excluding butter)', value: 'milk' },
      { label: 'Sugar & Sweeteners', value: 'sugar' },
      { label: 'Nuts and Products', value: 'nuts' },
      { label: 'Pulses', value: 'pulses' }
    ]
    
    return { selectedCategory, foodCategories }
  },
  template: `
    <div class="space-y-4">
      <h3 class="text-lg font-semibold">Food Category Selector</h3>
      <div class="w-80">
        <BaseSelect 
          v-model="selectedCategory"
          :options="foodCategories"
          placeholder="Select food category"
          searchable
        />
      </div>
      <div class="p-3 bg-blue-50 rounded">
        Selected category: <strong>{{ selectedCategory }}</strong>
      </div>
    </div>
  `
})