# Contributor Guidelines

## Welcome

Thank you for your interest in contributing to the D2 Nutrition Vibes project! This guide will help you understand our development process, coding standards, and how to submit meaningful contributions.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Development Setup](#development-setup)
3. [Code Standards](#code-standards)
4. [Git Workflow](#git-workflow)
5. [Testing Requirements](#testing-requirements)
6. [Pull Request Process](#pull-request-process)
7. [Issue Guidelines](#issue-guidelines)
8. [Documentation](#documentation)
9. [Community Guidelines](#community-guidelines)

## Getting Started

### Prerequisites

Before contributing, ensure you have:

- Node.js 18.x or higher
- npm 9.x or higher  
- Git installed and configured
- A GitHub account
- Basic knowledge of Vue.js 3, TypeScript, and D3.js

### Development Environment

1. **Fork the Repository**
   ```bash
   # Fork the repository on GitHub
   # Clone your fork
   git clone https://github.com/YOUR_USERNAME/d2-nutrition-vibes.git
   cd d2-nutrition-vibes
   ```

2. **Set Up Upstream Remote**
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/d2-nutrition-vibes.git
   git remote -v
   ```

3. **Install Dependencies**
   ```bash
   npm install
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

5. **Verify Setup**
   ```bash
   npm run test
   npm run lint
   npm run typecheck
   ```

## Development Setup

### IDE Configuration

We recommend **VS Code** with the following extensions:

```json
// .vscode/extensions.json
{
  "recommendations": [
    "Vue.volar",
    "Vue.vscode-typescript-vue-plugin", 
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-vscode.vscode-typescript-next"
  ]
}
```

### Environment Variables

Create your local environment file:

```bash
cp .env.example .env.local
```

Update `.env.local` with your settings:

```env
VITE_APP_TITLE=D2 Nutrition Vibes (Dev)
VITE_API_BASE_URL=http://localhost:3000/api
VITE_ENABLE_DEV_TOOLS=true
```

## Code Standards

### TypeScript Standards

- **Always use TypeScript** for new files
- **Strict mode enabled** - fix all TypeScript errors
- **Explicit types** for function parameters and returns
- **Interface definitions** for complex objects

```typescript
// ✅ Good
interface UserData {
  id: string
  name: string
  email: string
  preferences: UserPreferences
}

export function processUserData(data: UserData[]): ProcessedUser[] {
  return data.map(user => ({
    ...user,
    displayName: formatDisplayName(user.name)
  }))
}

// ❌ Bad
export function processUserData(data: any): any {
  return data.map(user => ({
    ...user,
    displayName: formatDisplayName(user.name)
  }))
}
```

### Vue.js Standards

#### Component Structure

```vue
<template>
  <!-- Use semantic HTML with proper accessibility -->
  <div class="chart-container" role="img" :aria-label="chartDescription">
    <svg ref="svgRef" :width="width" :height="height">
      <!-- Chart elements -->
    </svg>
  </div>
</template>

<script setup lang="ts">
// 1. Vue imports
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

// 2. Third-party imports
import * as d3 from 'd3'

// 3. Internal imports
import { useD3 } from '@/composables/useD3'
import type { ChartData, ChartOptions } from '@/types'

// 4. Props and emits
interface Props {
  data: ChartData[]
  width?: number
  height?: number
  options?: ChartOptions
}

const props = withDefaults(defineProps<Props>(), {
  width: 800,
  height: 400,
  options: () => ({})
})

const emit = defineEmits<{
  chartReady: [element: SVGSVGElement]
  dataPointClick: [point: ChartData, event: MouseEvent]
}>()

// 5. Refs and reactive state
const svgRef = ref<SVGSVGElement>()

// 6. Composables
const { initializeChart, updateChart } = useD3(svgRef)

// 7. Computed properties
const chartDescription = computed(() => 
  `Chart showing ${props.data.length} data points`
)

// 8. Methods
const handleDataPointClick = (point: ChartData, event: MouseEvent) => {
  emit('dataPointClick', point, event)
}

// 9. Lifecycle hooks
onMounted(() => {
  initializeChart()
})

onUnmounted(() => {
  // Cleanup code
})

// 10. Watchers
watch(() => props.data, updateChart, { deep: true })
</script>

<style scoped>
.chart-container {
  @apply w-full h-full relative;
}
</style>
```

#### Composable Standards

```typescript
// composables/useFeatureName.ts
import { ref, computed, onUnmounted } from 'vue'

interface UseFeatureOptions {
  immediate?: boolean
  onSuccess?: (result: any) => void
  onError?: (error: Error) => void
}

export function useFeatureName(options: UseFeatureOptions = {}) {
  // State
  const isLoading = ref(false)
  const error = ref<Error | null>(null)
  const data = ref<any>(null)

  // Computed
  const isReady = computed(() => !isLoading.value && data.value !== null)

  // Methods
  const execute = async () => {
    isLoading.value = true
    error.value = null
    
    try {
      const result = await performOperation()
      data.value = result
      options.onSuccess?.(result)
      return result
    } catch (err) {
      error.value = err as Error
      options.onError?.(err as Error)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Cleanup
  onUnmounted(() => {
    // Cleanup logic
  })

  // Initialize if immediate
  if (options.immediate) {
    execute()
  }

  return {
    // State
    isLoading: readonly(isLoading),
    error: readonly(error),
    data: readonly(data),
    
    // Computed
    isReady,
    
    // Methods
    execute
  }
}
```

### TailwindCSS Standards

- **Use utility classes** instead of custom CSS when possible
- **Follow responsive design patterns**
- **Use design tokens** consistently
- **Group related utilities** logically

```vue
<template>
  <!-- ✅ Good -->
  <div class="
    flex flex-col gap-4 p-6 
    bg-white dark:bg-gray-900 
    rounded-lg shadow-md 
    transition-colors duration-200
    md:flex-row md:gap-6 md:p-8
  ">
    <!-- Content -->
  </div>

  <!-- ❌ Bad -->
  <div class="flex flex-col gap-4 p-6 bg-white rounded-lg shadow-md md:flex-row md:gap-6 md:p-8 dark:bg-gray-900 transition-colors duration-200">
    <!-- Content -->
  </div>
</template>
```

### D3.js Standards

- **Use composables** for D3.js integration
- **Proper cleanup** in onUnmounted
- **Type safety** with D3.js selections
- **Performance considerations** for large datasets

```typescript
// ✅ Good D3.js integration
export function useD3Chart(containerRef: Ref<HTMLElement | null>) {
  const svg = ref<d3.Selection<SVGSVGElement, unknown, null, undefined>>()
  
  const initChart = () => {
    if (!containerRef.value) return
    
    // Remove existing chart
    d3.select(containerRef.value).select('svg').remove()
    
    // Create new chart
    svg.value = d3.select(containerRef.value)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
  }
  
  const cleanup = () => {
    if (containerRef.value) {
      d3.select(containerRef.value).selectAll('*').remove()
    }
  }
  
  onUnmounted(cleanup)
  
  return { initChart, cleanup }
}
```

## Git Workflow

### Branch Naming

Use descriptive branch names following this pattern:

```bash
# Features
feature/add-new-chart-type
feature/implement-data-export

# Bug fixes
fix/chart-rendering-issue
fix/memory-leak-in-d3-component

# Documentation
docs/update-setup-guide
docs/add-api-documentation

# Refactoring
refactor/optimize-data-loading
refactor/improve-type-safety
```

### Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```bash
# Format
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]

# Examples
feat(charts): add interactive tooltip component

fix(data): resolve memory leak in large dataset processing

docs(readme): update installation instructions

refactor(components): extract reusable chart utilities

test(d3): add unit tests for chart composables

chore(deps): update Vue to latest version
```

### Commit Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, etc.)
- **refactor**: Code refactoring
- **test**: Adding or updating tests
- **chore**: Maintenance tasks

### Pre-commit Hooks

We use pre-commit hooks to ensure code quality:

```bash
# Install pre-commit hooks
npm run prepare

# The hooks will automatically:
# - Run ESLint and fix issues
# - Format code with Prettier
# - Run TypeScript checks
# - Run relevant tests
```

## Testing Requirements

### Test Coverage Requirements

- **Minimum 80% overall coverage**
- **90% coverage for critical paths**
- **100% coverage for utility functions**

### Testing Strategy

#### Unit Tests (Vitest)

```typescript
// tests/composables/useDataProcessor.test.ts
import { describe, it, expect, vi } from 'vitest'
import { useDataProcessor } from '@/composables/useDataProcessor'

describe('useDataProcessor', () => {
  it('should process data correctly', async () => {
    const { processData, isLoading } = useDataProcessor()
    
    expect(isLoading.value).toBe(false)
    
    const result = await processData([{ id: 1, value: 10 }])
    
    expect(result).toEqual([{ id: 1, value: 10, processed: true }])
    expect(isLoading.value).toBe(false)
  })

  it('should handle errors gracefully', async () => {
    const mockService = vi.fn().mockRejectedValue(new Error('API Error'))
    
    const { processData, error } = useDataProcessor()
    
    await expect(processData([])).rejects.toThrow('API Error')
    expect(error.value).toBeInstanceOf(Error)
  })
})
```

#### Component Tests

```typescript
// tests/components/ChartComponent.test.ts
import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import ChartComponent from '@/components/ChartComponent.vue'

describe('ChartComponent', () => {
  it('renders chart with data', () => {
    const wrapper = mount(ChartComponent, {
      props: {
        data: [{ x: 1, y: 2 }, { x: 2, y: 4 }]
      }
    })

    expect(wrapper.find('svg')).toBeTruthy()
    expect(wrapper.findAll('.data-point')).toHaveLength(2)
  })

  it('emits events on data point click', async () => {
    const wrapper = mount(ChartComponent, {
      props: {
        data: [{ x: 1, y: 2 }]
      }
    })

    await wrapper.find('.data-point').trigger('click')
    
    expect(wrapper.emitted('dataPointClick')).toBeTruthy()
  })
})
```

#### E2E Tests (Cypress)

```typescript
// cypress/e2e/chart-interaction.cy.ts
describe('Chart Interaction', () => {
  beforeEach(() => {
    cy.visit('/dashboard')
    cy.get('[data-testid="chart-container"]').should('be.visible')
  })

  it('should display tooltip on hover', () => {
    cy.get('[data-testid="chart-container"]')
      .find('.data-point')
      .first()
      .trigger('mouseover')

    cy.get('[data-testid="tooltip"]')
      .should('be.visible')
      .and('contain', 'Value:')
  })

  it('should filter data when selecting country', () => {
    cy.get('[data-testid="country-filter"]').select('Brazil')
    
    cy.get('[data-testid="chart-container"]')
      .find('.data-point')
      .should('have.length.lessThan', 10)
  })
})
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run e2e

# Run specific test file
npm test -- useDataProcessor.test.ts
```

## Pull Request Process

### Before Creating a PR

1. **Sync with upstream**
   ```bash
   git fetch upstream
   git checkout main
   git merge upstream/main
   git push origin main
   ```

2. **Create feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make changes and commit**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

4. **Run quality checks**
   ```bash
   npm run lint
   npm run typecheck
   npm run test
   npm run build
   ```

5. **Push changes**
   ```bash
   git push origin feature/your-feature-name
   ```

### PR Template

Use this template for your pull request:

```markdown
## Description
Brief description of the changes made.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Changes Made
- List specific changes
- Include any new files or modified files
- Mention any dependencies added/removed

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] E2E tests pass
- [ ] Manual testing completed

## Screenshots (if applicable)
Add screenshots to help explain your changes.

## Checklist
- [ ] My code follows the style guidelines
- [ ] I have performed a self-review of my code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
```

### Review Process

1. **Automated Checks**: All CI checks must pass
2. **Code Review**: At least one maintainer review required
3. **Testing**: Manual testing for UI changes
4. **Documentation**: Update docs if needed

### Addressing Review Feedback

```bash
# Make changes based on feedback
git add .
git commit -m "fix: address review feedback"
git push origin feature/your-feature-name

# Squash commits before merge (optional)
git rebase -i HEAD~3
```

## Issue Guidelines

### Creating Issues

Use the appropriate issue template:

#### Bug Report Template

```markdown
## Bug Description
A clear and concise description of what the bug is.

## Steps to Reproduce
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

## Expected Behavior
A clear description of what you expected to happen.

## Actual Behavior
A clear description of what actually happened.

## Screenshots
If applicable, add screenshots to help explain your problem.

## Environment
- OS: [e.g. iOS]
- Browser: [e.g. chrome, safari]
- Version: [e.g. 22]
- Node version: [e.g. 18.17.0]

## Additional Context
Add any other context about the problem here.
```

#### Feature Request Template

```markdown
## Feature Description
A clear and concise description of the feature you'd like to see.

## Problem Statement
What problem does this feature solve?

## Proposed Solution
A clear description of what you want to happen.

## Alternatives Considered
A clear description of any alternative solutions you've considered.

## Additional Context
Add any other context, mockups, or examples about the feature request.
```

### Issue Labels

- **bug**: Something isn't working
- **enhancement**: New feature or request
- **documentation**: Improvements or additions to documentation
- **good first issue**: Good for newcomers
- **help wanted**: Extra attention is needed
- **priority/high**: High priority issue
- **priority/medium**: Medium priority issue
- **priority/low**: Low priority issue

## Documentation

### Documentation Requirements

All contributions should include appropriate documentation:

1. **Code Comments**: For complex logic
2. **Component Documentation**: Props, events, and usage examples
3. **API Documentation**: For new services or utilities
4. **User Documentation**: For new features
5. **Setup Documentation**: For new dependencies or configurations

### Documentation Style

```typescript
/**
 * Processes agricultural data for visualization
 * 
 * @param data - Raw FAO dataset
 * @param options - Processing options
 * @returns Processed data ready for D3.js
 * 
 * @example
 * ```typescript
 * const processed = processAgriculturalData(rawData, {
 *   metric: 'production',
 *   countries: ['BRA', 'USA']
 * })
 * ```
 */
export function processAgriculturalData(
  data: RawData[], 
  options: ProcessingOptions
): ProcessedData[] {
  // Implementation
}
```

## Community Guidelines

### Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please:

- **Be respectful** in all interactions
- **Be constructive** when providing feedback
- **Be patient** with newcomers
- **Be collaborative** in discussions

### Communication Channels

- **GitHub Issues**: For bug reports and feature requests
- **GitHub Discussions**: For general questions and ideas
- **Pull Request Reviews**: For code-specific discussions

### Getting Help

If you need help:

1. Check existing documentation
2. Search existing issues
3. Create a new issue with the "help wanted" label
4. Join community discussions

### Recognition

Contributors will be recognized in:

- **README.md**: All contributors list
- **Release Notes**: Major contributions
- **Contributors Page**: Detailed contribution history

## Release Process

### Versioning

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Schedule

- **Patch releases**: As needed for critical bugs
- **Minor releases**: Monthly feature releases
- **Major releases**: Quarterly with breaking changes

Thank you for contributing to D2 Nutrition Vibes! Your contributions help make agricultural data more accessible and actionable for researchers and policymakers worldwide.