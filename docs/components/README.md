# Vue Component Documentation

## Overview

This document provides comprehensive API documentation for all Vue.js components in the D2 Nutrition Vibes application.

## Component Architecture

The application follows a modular component architecture organized into logical groups:

```
src/components/
├── layout/          # Application layout components
├── ui/              # Reusable UI components
├── panels/          # Main application panels
└── visualizations/  # D3.js visualization components
```

## Layout Components

### AppHeader.vue

Main application header with navigation and branding.

**Props:**
- `title` (String, optional): Application title override
- `showLogo` (Boolean, default: true): Whether to display the logo

**Events:**
- `@navigation-toggle`: Emitted when mobile navigation is toggled

**Slots:**
- `actions`: Additional header actions

**Usage:**
```vue
<AppHeader 
  title="Custom Title"
  @navigation-toggle="handleNavToggle"
>
  <template #actions>
    <button>Settings</button>
  </template>
</AppHeader>
```

### NavigationControls.vue

Navigation controls for switching between application panels.

**Props:**
- `activePanel` (String, required): Currently active panel identifier
- `panels` (Array, required): Array of available panels

**Events:**
- `@panel-change`: Emitted when panel selection changes

**Usage:**
```vue
<NavigationControls 
  :active-panel="currentPanel"
  :panels="availablePanels"
  @panel-change="setActivePanel"
/>
```

### PanelsContainer.vue

Container component that manages panel rendering and transitions.

**Props:**
- `activePanel` (String, required): Current active panel
- `transition` (String, default: 'fade'): Transition animation type

**Slots:**
- `default`: Panel components

## UI Components

### BaseButton.vue

Reusable button component with consistent styling.

**Props:**
- `variant` (String, default: 'primary'): Button style variant
  - Options: 'primary', 'secondary', 'danger', 'success'
- `size` (String, default: 'md'): Button size
  - Options: 'sm', 'md', 'lg'
- `disabled` (Boolean, default: false): Whether button is disabled
- `loading` (Boolean, default: false): Show loading state
- `type` (String, default: 'button'): HTML button type

**Events:**
- `@click`: Emitted when button is clicked

**Usage:**
```vue
<BaseButton 
  variant="primary" 
  size="lg" 
  :loading="isLoading"
  @click="handleClick"
>
  Save Changes
</BaseButton>
```

### BaseSelect.vue

Enhanced select component with search and validation.

**Props:**
- `options` (Array, required): Select options
- `modelValue` (Any): Selected value (v-model)
- `placeholder` (String): Placeholder text
- `searchable` (Boolean, default: false): Enable search functionality
- `multiple` (Boolean, default: false): Allow multiple selections
- `disabled` (Boolean, default: false): Disable the select

**Events:**
- `@update:modelValue`: Emitted when selection changes
- `@search`: Emitted when search query changes

**Usage:**
```vue
<BaseSelect 
  v-model="selectedCountry"
  :options="countries"
  placeholder="Select a country"
  searchable
  @search="handleSearch"
/>
```

### SearchableSelect.vue

Advanced select with async search capabilities.

**Props:**
- `options` (Array, required): Initial options
- `modelValue` (Any): Selected value
- `searchFn` (Function): Async search function
- `debounce` (Number, default: 300): Search debounce delay
- `minSearchLength` (Number, default: 2): Minimum characters to trigger search

**Events:**
- `@update:modelValue`: Selection change
- `@search`: Search query change

### RangeSlider.vue

Dual-handle range slider component.

**Props:**
- `min` (Number, required): Minimum value
- `max` (Number, required): Maximum value
- `modelValue` (Array, required): Range values [min, max]
- `step` (Number, default: 1): Step increment
- `formatLabel` (Function): Value formatting function

**Events:**
- `@update:modelValue`: Range change

## Panel Components

### DashboardPanel.vue

Main dashboard overview panel.

**Props:**
- `data` (Object): Dashboard data
- `loading` (Boolean, default: false): Loading state

**Computed Properties:**
- `summaryStats`: Computed summary statistics
- `chartData`: Processed chart data

### TimeseriesPanel.vue

Time series data visualization panel.

**Props:**
- `timeseriesData` (Array, required): Time series dataset
- `selectedMetric` (String): Currently selected metric
- `dateRange` (Array): Selected date range

**Events:**
- `@metric-change`: Metric selection change
- `@date-range-change`: Date range change

### SimulationPanel.vue

Simulation and modeling panel.

**Props:**
- `simulationConfig` (Object): Simulation parameters
- `results` (Array): Simulation results

**Methods:**
- `runSimulation()`: Execute simulation
- `exportResults()`: Export simulation data

### MLPanel.vue

Machine learning predictions panel.

**Props:**
- `models` (Array): Available ML models
- `predictions` (Object): Model predictions
- `trainingData` (Array): Training dataset

### StructuralPanel.vue

Structural analysis panel.

**Props:**
- `networkData` (Object): Network structure data
- `analysisType` (String): Type of structural analysis

### ProcessPanel.vue

Process mining visualization panel.

**Props:**
- `processData` (Array): Process event data
- `filters` (Object): Applied filters

## Visualization Components

### WorldMap.vue

Interactive world map visualization using D3.js.

**Props:**
- `geoData` (Object, required): GeoJSON data
- `dataValues` (Object): Data values by country
- `colorScale` (Function): Color scale function
- `projection` (String, default: 'naturalEarth1'): Map projection

**Events:**
- `@country-click`: Country selection
- `@country-hover`: Country hover

**Methods:**
- `updateData(newData)`: Update map data
- `zoomToCountry(countryCode)`: Zoom to specific country

### TimeseriesChart.vue

Time series line chart component.

**Props:**
- `data` (Array, required): Time series data
- `xAccessor` (Function|String): X-axis data accessor
- `yAccessor` (Function|String): Y-axis data accessor
- `width` (Number): Chart width
- `height` (Number): Chart height

**Methods:**
- `brushSelection()`: Get current brush selection
- `zoomToRange(start, end)`: Zoom to date range

### SimulationChart.vue

Simulation results visualization.

**Props:**
- `simulationResults` (Array): Simulation output
- `chartType` (String): Visualization type

### MLChart.vue

Machine learning model visualizations.

**Props:**
- `predictions` (Array): Model predictions
- `actualValues` (Array): Actual values for comparison
- `modelMetrics` (Object): Model performance metrics

### StructuralChart.vue

Network and structural visualizations.

**Props:**
- `nodes` (Array): Network nodes
- `links` (Array): Network connections
- `layout` (String): Graph layout algorithm

### ProcessChart.vue

Process flow visualization.

**Props:**
- `processEvents` (Array): Process event data
- `processModel` (Object): Process model structure

## Composables Integration

All components utilize Vue composables for shared functionality:

- `useD3()`: D3.js lifecycle management
- `useDataLoader()`: Data loading and caching
- `useVisualization()`: Common visualization patterns
- `useExport()`: Data export functionality

## Styling Guidelines

Components follow TailwindCSS conventions:

- Consistent spacing using Tailwind spacing scale
- Responsive design with mobile-first approach
- Dark mode support using `dark:` variants
- Accessibility features with proper ARIA attributes

## Testing

All components include comprehensive tests:

- Unit tests with Vue Test Utils
- Integration tests for D3.js interactions
- Accessibility tests with Testing Library
- Visual regression tests

## Performance Considerations

- Lazy loading for large datasets
- Virtual scrolling for long lists
- Memoization of expensive computations
- Progressive rendering for complex visualizations

## Error Handling

Components implement robust error handling:

- Graceful degradation for missing data
- Error boundaries with Suspense
- User-friendly error messages
- Automatic retry mechanisms