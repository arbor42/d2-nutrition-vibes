# Claude AI Interaction Guide

## Overview

This document provides guidance for Claude AI assistants on how to effectively interact with and understand the D2 Nutrition Vibes codebase. It serves as a reference for maintaining consistency and quality when working on this Vue.js + D3.js + TailwindCSS application.

## Project Architecture

### Technology Stack

- **Frontend Framework**: Vue.js 3.4.0+ with Composition API
- **Build Tool**: Vite 5.0.0+
- **Styling**: TailwindCSS 3.4.0+ with custom design system
- **Data Visualization**: D3.js v7.8.5+
- **State Management**: Pinia 2.1.0+
- **Routing**: Vue Router 4.2.0+
- **Type Safety**: TypeScript 5.3.0+
- **Testing**: Vitest 3.2.4+ + Cypress 14.5.0+ + Storybook 8.6.14+
- **Code Quality**: ESLint + Prettier
- **Form Validation**: VeeValidate 4.15.1+ with Zod 3.25.67+
- **Utilities**: @vueuse/core 13.3.0+
- **Performance**: Web Workers + Canvas Rendering + Progressive Loading

### Project Structure

```
d2-nutrition-vibes/
├── src/
│   ├── components/          # Vue components organized by type
│   │   ├── layout/         # Layout components (header, navigation)
│   │   ├── ui/             # Reusable UI components
│   │   ├── panels/         # Main application panels
│   │   └── visualizations/ # D3.js visualization components
│   ├── composables/        # Vue composables for shared logic
│   ├── stores/             # Pinia state management
│   ├── services/           # API and data services
│   ├── utils/              # Utility functions
│   ├── types/              # TypeScript type definitions
│   ├── assets/             # Static assets and styles
│   ├── router/             # Vue Router configuration
│   ├── schemas/            # Validation schemas (Zod)
│   └── workers/            # Web Workers for background processing
├── public/                 # Public static files
│   └── data/              # FAO datasets and ML predictions
├── py/                     # Python scripts for data processing
├── docs/                   # Documentation
├── tests/                  # Test files
├── cypress/                # E2E test configuration
├── js/                     # Legacy JavaScript files (deprecated)
└── css/                    # Legacy CSS files (deprecated)
```

## Key Patterns and Conventions

### 1. Vue.js Component Structure

Components follow a consistent structure:

```vue
<template>
  <!-- Semantic HTML with TailwindCSS classes -->
</template>

<script setup lang="ts">
// 1. Vue imports
// 2. Third-party imports  
// 3. Internal composables
// 4. Internal components
// 5. Props/emits definition
// 6. Reactive state
// 7. Composables usage
// 8. Methods
// 9. Lifecycle hooks
// 10. Watchers
</script>

<style scoped>
/* Minimal custom CSS - prefer TailwindCSS */
</style>
```

### 2. Composables Pattern

All shared logic is encapsulated in composables located in `src/composables/`:

**Core Composables:**
- `useD3.js` - D3.js lifecycle management
- `useDataLoader.js` - Data fetching and caching
- `useVisualization.js` - Common visualization patterns
- `usePerformance.js` - Performance monitoring

**Advanced Features:**
- `useD3Cache.js` - Advanced caching system for D3.js computations
- `useCanvasRenderer.js` - Canvas rendering for performance-critical visualizations
- `useProgressiveRenderer.js` - Progressive rendering for large datasets
- `useWebWorker.js` - Web worker integration for background processing

**Data Management:**
- `useDataSync.js` - Data synchronization utilities
- `useDataTransformations.js` - Data transformation helpers
- `useDerivedData.js` - Computed data derivations
- `useDataStreaming.js` - Streaming for large file processing

**UI/UX:**
- `useFormValidation.js` - Form validation with VeeValidate and Zod
- `useStoreComposition.js` - Store composition patterns
- Custom composables for specific features

### 3. State Management

Uses Pinia stores with consistent patterns:

- `useDataStore` - FAO dataset management
- `useUIStore` - UI state and preferences
- `useVisualizationStore` - Visualization configuration
- `useUserPreferencesStore` - User preferences and settings persistence

### 4. D3.js Integration

D3.js is integrated through Vue composables with proper lifecycle management:

- SVG creation and cleanup
- Reactive data binding
- Performance optimization for large datasets
- Canvas rendering for heavy visualizations

## File Modification Guidelines

### When modifying existing files:

1. **Read the file first** - Always use the Read tool to understand current implementation
2. **Follow existing patterns** - Maintain consistency with existing code style
3. **Preserve functionality** - Ensure all existing features continue to work
4. **Use TypeScript** - Add proper type definitions for new code
5. **Update tests** - Modify related tests when changing functionality

### When creating new files:

1. **Follow naming conventions** - Use PascalCase for components, camelCase for utilities
2. **Place in correct directory** - Follow the established project structure
3. **Include proper imports** - Use the established import order
4. **Add TypeScript types** - Define interfaces and types for all new functionality
5. **Write tests** - Include test files for new functionality

## Testing Approach

The project uses a comprehensive testing strategy:

- **Unit Tests**: Vitest for components and composables
- **Integration Tests**: Vue Test Utils for component integration
- **E2E Tests**: Cypress for full application testing
- **Visual Tests**: Storybook for component documentation
- **Visual Regression**: Percy integration for visual testing
- **Accessibility Tests**: cypress-axe for a11y compliance
- **Performance Tests**: Custom D3.js performance monitoring

### Test File Locations:
- Component tests: `tests/components/`
- Composable tests: `tests/composables/`
- E2E tests: `cypress/e2e/`
- Stories: `src/components/**/*.stories.js`

## Performance Considerations

The application is optimized for handling large agricultural datasets:

1. **Lazy Loading** - Route components are lazy loaded
2. **Virtual Scrolling** - Large lists use virtual scrolling
3. **Canvas Rendering** - Complex visualizations use canvas via `useCanvasRenderer`
4. **Data Streaming** - Large files are processed in chunks via `dataStreaming.js`
5. **Advanced Caching** - Multi-layer caching with `useD3Cache` composable
6. **Progressive Rendering** - Large datasets render progressively via `useProgressiveRenderer`
7. **Web Workers** - Background processing for heavy computations
8. **CSS Optimization** - Critical CSS extraction and optimization utilities
9. **Bundle Optimization** - Advanced chunk splitting and tree-shaking

## Data Handling

The application works with FAO (Food and Agriculture Organization) datasets:

- **Data Location**: `public/data/fao_data/` and `public/data/fao/`
- **Data Types**: Production, trade, geographic, ML predictions, network analysis
- **Formats**: JSON, GeoJSON, CSV
- **Processing**: Client-side data transformation and analysis
- **ML Forecasts**: Extensive ML predictions in `public/data/fao/ml/` and `py/fao_ml_forecasts/`
- **Network Data**: Trade network analysis (`network.json`, `trade_network_analysis.py`)
- **Rankings**: Production rankings and trade balance data

### Python Data Processing

- **Raw FAO Dataset**: Located in `py/fao.csv` and `py/fao_slim.csv`
- **Python Scripts**: You can create and run Python scripts in the `py/` directory
- **Data Analysis**: Use Python for complex data analysis and preprocessing
- **Example**: Trade network analysis script (`py/trade_network_analysis.py`) processes FAO trade data to create network visualizations
- **Output**: Processed data should be saved to `public/data/fao_data/` for the Vue app to consume

## Development Commands

Essential commands for development:

```bash
# Development
npm run dev              # Start development server
npm run build           # Production build
npm run preview         # Preview production build

# Code Quality
npm run lint            # Run ESLint
npm run format          # Format with Prettier
npm run typecheck       # TypeScript type checking

# Testing
npm run test            # Unit tests
npm run test:coverage   # Test coverage
npm run e2e             # E2E tests
npm run storybook       # Component library

# Analysis
npm run build:analyze   # Bundle analysis
npm run bundle-analyze  # Detailed bundle analysis
```

## New Components and Features

### Available Visualizations

- **HierarchyVisualization.vue** - Hierarchical data visualization
- **NetworkVisualization.vue** - Network graph visualization
- **WorldMapSimple.vue** - Simplified world map component
- **StructuralChart.vue** - Structural data visualization
- **PopulationPyramid.vue** - Population demographics
- **TradeFlowMap.vue** - International trade flows
- **TimeSeriesChart.vue** - Time series analysis

## Common Tasks

### Adding a New Visualization Component

1. Create component in `src/components/visualizations/`
2. Use `useD3` composable for lifecycle management
3. Implement proper TypeScript interfaces
4. Add responsive design with TailwindCSS
5. Include error handling and loading states
6. Write tests and stories
7. Update documentation

### Adding a New Data Processing Feature

1. Create composable in `src/composables/`
2. Implement caching if computation is expensive
3. Add TypeScript types in `src/types/`
4. Include error handling and validation
5. Write comprehensive tests
6. Update relevant stores if state is needed

### Modifying Existing Components

1. Read current implementation thoroughly
2. Understand component props and events
3. Maintain backward compatibility
4. Update TypeScript types if needed
5. Modify tests to reflect changes
6. Update documentation and stories

## Architecture Decisions

Key architectural decisions documented in `docs/`:

1. **Vue 3 Composition API** - For better TypeScript integration and composability
2. **TailwindCSS** - For consistent, utility-first styling
3. **D3.js Integration** - Custom composables for Vue-D3 lifecycle management
4. **Performance First** - Virtual scrolling, canvas rendering, caching
5. **Type Safety** - Comprehensive TypeScript coverage
6. **Testing Strategy** - Multi-layered testing approach

## Phase Implementation Status

The project follows a 9-phase refactor plan:

- ✅ **Phase 1-8**: Completed (Setup through Performance Optimization)
- 🚧 **Phase 9**: In Progress (Documentation & Maintenance)

*Note: The referenced `todo.md` file for phase tracking is currently not present in the repository.*

## Error Handling

The application implements comprehensive error handling:

1. **Global Error Handler** - Vue app-level error catching
2. **Error Boundaries** - Component-level error isolation  
3. **Async Error Handling** - Proper promise rejection handling
4. **User-Friendly Messages** - Clear error communication
5. **Logging** - Console and external service integration

## Form Validation

The project uses VeeValidate with Zod for robust form validation:

1. **Schema Definition** - Define schemas in `src/schemas/validation.js`
2. **Form Setup** - Use `useFormValidation` composable
3. **Field Validation** - Real-time field validation with error messages
4. **Type Safety** - Zod provides TypeScript inference

### Example:
```javascript
import { useFormValidation } from '@/composables/useFormValidation'
import { dataFilterSchema } from '@/schemas/validation'

const { form, errors, validate } = useFormValidation(dataFilterSchema)
```

## Legacy Code

The following directories contain legacy code from the pre-Vue.js implementation:
- `js/` - Old vanilla JavaScript files
- `css/` - Legacy CSS files

These are maintained for reference but are not used in the current application.

## Best Practices for Claude Assistants

### Do:
- Always read files before modifying
- Follow established patterns and conventions
- Maintain TypeScript type safety
- Write tests for new functionality
- Document significant changes
- Consider performance implications
- Use existing composables and utilities

### Don't:
- Break existing functionality
- Ignore TypeScript errors
- Skip testing new features
- Create inconsistent patterns
- Hardcode values that should be configurable
- Bypass error handling
- Ignore accessibility requirements

## Getting Help

When working on this codebase:

1. **Check documentation** - Comprehensive docs in `docs/` directory
2. **Review existing patterns** - Look at similar implementations
3. **Run tests** - Ensure changes don't break functionality
4. **Check TypeScript** - Run type checking frequently
5. **Test in browser** - Verify changes work as expected

## Contact and Feedback

For questions about this codebase or suggestions for improvements to this guide, please refer to the project's issue tracker or documentation.

---

# Mock Data

NEVER USE MOCK DATA, NEVER