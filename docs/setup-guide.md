# Setup Guide: Vue + TailwindCSS + D3.js

## Overview

This guide provides step-by-step instructions for setting up, running, and developing the D2 Nutrition Vibes application. The application is built with Vue.js 3, TailwindCSS, and D3.js for agricultural data visualization.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Development Setup](#development-setup)
4. [Project Structure](#project-structure)
5. [Configuration](#configuration)
6. [Development Workflow](#development-workflow)
7. [Build and Deployment](#build-and-deployment)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

- **Node.js**: 18.x or higher
- **npm**: 9.x or higher (or yarn 3.x)
- **Git**: Latest version
- **Modern Browser**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

### Recommended Tools

- **VS Code** with extensions:
  - Vue Language Features (Volar)
  - TypeScript Vue Plugin (Volar)
  - Tailwind CSS IntelliSense
  - ESLint
  - Prettier
  - Auto Rename Tag
  - Bracket Pair Colorizer

### Verify Prerequisites

```bash
# Check Node.js version
node --version
# Should output v18.x.x or higher

# Check npm version
npm --version
# Should output 9.x.x or higher

# Check Git
git --version
```

## Installation

### 1. Clone the Repository

```bash
# Clone the repository
git clone https://github.com/your-org/d2-nutrition-vibes.git
cd d2-nutrition-vibes
```

### 2. Install Dependencies

```bash
# Install all dependencies
npm install

# Or using yarn
yarn install
```

This will install:
- **Vue.js 3** with Composition API
- **Vite** as build tool
- **TailwindCSS** for styling
- **D3.js** for data visualization
- **Pinia** for state management
- **Vue Router** for routing
- **TypeScript** for type safety
- **Vitest** and **Cypress** for testing
- **ESLint** and **Prettier** for code quality

### 3. Environment Setup

Create environment files:

```bash
# Copy environment template
cp .env.example .env
cp .env.example .env.local
```

Edit `.env.local` with your local configuration:

```env
# Development settings
VITE_APP_TITLE=D2 Nutrition Vibes
VITE_API_BASE_URL=http://localhost:3000/api
VITE_ENABLE_DEV_TOOLS=true

# Data settings
VITE_DATA_SOURCE=local
VITE_MAX_DATA_POINTS=10000

# Performance settings
VITE_ENABLE_PERFORMANCE_MONITORING=true
VITE_BUNDLE_ANALYZER=false
```

## Development Setup

### 1. Start Development Server

```bash
# Start the development server
npm run dev

# The application will be available at:
# http://localhost:5173
```

### 2. Verify Installation

Open your browser to `http://localhost:5173` and verify:

1. ✅ Application loads without errors
2. ✅ Navigation works between panels
3. ✅ Sample data visualizations render
4. ✅ TailwindCSS styles are applied
5. ✅ Vue DevTools are available (in development mode)

### 3. Run Tests

```bash
# Run unit tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run end-to-end tests
npm run e2e
```

### 4. Code Quality Checks

```bash
# Run linting
npm run lint

# Format code
npm run format

# Type checking
npm run typecheck
```

## Project Structure

```
d2-nutrition-vibes/
├── public/                 # Static assets
│   ├── data/              # FAO datasets and geo data
│   └── favicon.ico        # Site icon
├── src/                   # Source code
│   ├── App.vue           # Root component
│   ├── main.ts           # Application entry point
│   ├── components/       # Vue components
│   │   ├── layout/       # Layout components
│   │   ├── ui/          # Reusable UI components
│   │   ├── panels/      # Main application panels
│   │   └── visualizations/ # D3.js charts
│   ├── composables/     # Vue composables
│   ├── stores/          # Pinia stores
│   ├── router/          # Vue Router configuration
│   ├── services/        # API services
│   ├── utils/           # Utility functions
│   ├── types/           # TypeScript definitions
│   └── assets/          # Assets and styles
├── tests/               # Test files
├── docs/                # Documentation
├── cypress/             # E2E tests
├── .storybook/          # Storybook configuration
└── dist/                # Build output
```

## Configuration

### 1. Vite Configuration

The main build configuration is in `vite.config.js`:

```javascript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    open: true
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: {
          'vue-vendor': ['vue', 'vue-router', 'pinia'],
          'd3-vendor': ['d3', 'topojson-client'],
          'ui-vendor': ['@vueuse/core']
        }
      }
    }
  }
})
```

### 2. TailwindCSS Configuration

TailwindCSS is configured in `tailwind.config.js`:

```javascript
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          // ... color scale
          900: '#1e3a8a',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}
```

### 3. TypeScript Configuration

TypeScript is configured in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "lib": ["DOM", "DOM.Iterable", "ESNext"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": false,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "preserve",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.vue"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### 4. ESLint Configuration

ESLint is configured in `.eslintrc.js`:

```javascript
module.exports = {
  root: true,
  env: {
    node: true,
    'vue/setup-compiler-macros': true
  },
  extends: [
    'plugin:vue/vue3-essential',
    'eslint:recommended',
    '@vue/typescript/recommended',
    '@vue/prettier'
  ],
  parserOptions: {
    ecmaVersion: 2020
  },
  rules: {
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'vue/multi-word-component-names': 'off'
  }
}
```

## Development Workflow

### 1. Creating New Components

```bash
# Create a new visualization component
mkdir src/components/visualizations/NewChart
touch src/components/visualizations/NewChart/NewChart.vue
touch src/components/visualizations/NewChart/NewChart.stories.js
touch src/components/visualizations/NewChart/NewChart.test.ts
```

Component template:

```vue
<template>
  <div ref="containerRef" class="chart-container">
    <!-- Chart content -->
  </div>
</template>

<script setup lang="ts">
import { useD3 } from '@/composables/useD3'

interface Props {
  data: DataPoint[]
  width?: number
  height?: number
}

const props = withDefaults(defineProps<Props>(), {
  width: 800,
  height: 400
})

const containerRef = ref<HTMLElement>()
const { createSVG, isReady } = useD3(containerRef)

// Component logic here
</script>

<style scoped>
.chart-container {
  @apply w-full h-full;
}
</style>
```

### 2. Adding New Routes

Add routes in `src/router/index.js`:

```javascript
{
  path: '/new-panel',
  name: 'NewPanel',
  component: () => import('@/components/panels/NewPanel.vue'),
  meta: {
    title: 'New Panel',
    requiresAuth: false
  }
}
```

### 3. Creating Composables

Create composables in `src/composables/`:

```typescript
// src/composables/useNewFeature.ts
import { ref, computed } from 'vue'

export function useNewFeature(options = {}) {
  const state = ref(null)
  const isLoading = ref(false)
  
  const processedData = computed(() => {
    // Process data
    return state.value
  })
  
  const loadData = async () => {
    isLoading.value = true
    try {
      // Load data logic
    } finally {
      isLoading.value = false
    }
  }
  
  return {
    state,
    isLoading,
    processedData,
    loadData
  }
}
```

### 4. Development Tools

#### Storybook for Component Development

```bash
# Start Storybook
npm run storybook

# Build Storybook
npm run build-storybook
```

#### Vue DevTools

Install the Vue DevTools browser extension for debugging:
- [Chrome Extension](https://chrome.google.com/webstore/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
- [Firefox Add-on](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)

#### Bundle Analysis

```bash
# Analyze bundle size
npm run build:analyze

# Detailed bundle analysis
npm run bundle-analyze
```

## Build and Deployment

### 1. Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

The build output will be in the `dist/` directory.

### 2. Build Configuration

Environment-specific builds:

```bash
# Development build
npm run build -- --mode development

# Staging build
npm run build -- --mode staging

# Production build
npm run build -- --mode production
```

### 3. Deployment Options

#### Static Hosting (Netlify, Vercel, GitHub Pages)

```bash
# Build the application
npm run build

# Deploy the dist/ folder to your static hosting provider
```

#### Docker Deployment

```dockerfile
# Dockerfile
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Build and run:

```bash
# Build Docker image
docker build -t d2-nutrition-vibes .

# Run container
docker run -p 80:80 d2-nutrition-vibes
```

### 4. Environment Variables for Production

Create `.env.production`:

```env
VITE_APP_TITLE=D2 Nutrition Vibes
VITE_API_BASE_URL=https://api.yoursite.com
VITE_ENABLE_DEV_TOOLS=false
VITE_DATA_SOURCE=api
VITE_ENABLE_PERFORMANCE_MONITORING=true
```

## Development Commands Reference

```bash
# Development
npm run dev              # Start dev server
npm run build           # Production build
npm run preview         # Preview build

# Code Quality
npm run lint            # Run ESLint
npm run lint:fix        # Fix ESLint errors
npm run format          # Format with Prettier
npm run typecheck       # TypeScript check

# Testing
npm run test            # Unit tests
npm run test:ui         # Test with UI
npm run test:coverage   # Coverage report
npm run e2e             # End-to-end tests
npm run e2e:dev         # E2E in dev mode

# Tools
npm run storybook       # Component library
npm run build-storybook # Build Storybook
npm run bundle-analyze  # Bundle analysis
```

## IDE Setup

### VS Code Settings

Create `.vscode/settings.json`:

```json
{
  "typescript.preferences.quoteStyle": "single",
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "tailwindCSS.experimental.classRegex": [
    ["class:\\s*?[\"'`]([^\"'`]*).*?[\"'`]", 1],
    ["(?:enter|leave)(?:From|To)?:\\s*?[\"'`]([^\"'`]*).*?[\"'`]", 1]
  ]
}
```

### VS Code Extensions

Create `.vscode/extensions.json`:

```json
{
  "recommendations": [
    "Vue.volar",
    "Vue.vscode-typescript-vue-plugin",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint"
  ]
}
```

## Troubleshooting

### Common Issues

#### 1. Port Already in Use

```bash
# Kill process using port 5173
sudo lsof -ti:5173 | xargs kill -9

# Or use a different port
npm run dev -- --port 3000
```

#### 2. Module Resolution Issues

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### 3. TypeScript Errors

```bash
# Restart TypeScript service in VS Code
# Command Palette: "TypeScript: Restart TS Server"

# Or rebuild TypeScript
npm run typecheck
```

#### 4. TailwindCSS Not Working

Check that TailwindCSS is imported in `src/assets/styles/tailwind.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

#### 5. D3.js Type Errors

Install D3 types:

```bash
npm install --save-dev @types/d3
```

### Performance Issues

#### Slow Development Server

```bash
# Use SWC for faster builds
npm install --save-dev @vitejs/plugin-vue-jsx @swc/core

# Update vite.config.js to use SWC
```

#### Large Bundle Size

```bash
# Analyze bundle
npm run bundle-analyze

# Enable tree shaking
# Check for unused dependencies
npm run build:analyze
```

### Getting Help

1. Check the [troubleshooting guide](./troubleshooting.md)
2. Review [GitHub Issues](https://github.com/your-org/d2-nutrition-vibes/issues)
3. Check the [Vue.js documentation](https://vuejs.org/)
4. Review [D3.js documentation](https://d3js.org/)
5. Check [TailwindCSS documentation](https://tailwindcss.com/)

This setup guide should get you up and running with the D2 Nutrition Vibes application. For more detailed information, refer to the specific documentation files in the `docs/` directory.