# Troubleshooting Guide

## Overview

This guide provides solutions to common issues encountered when developing, building, or deploying the D2 Nutrition Vibes application.

## Development Issues

### Node.js and npm Issues

#### Node Version Conflicts

```bash
# Problem: Wrong Node.js version
# Solution: Use Node Version Manager (nvm)

# Install nvm (if not already installed)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Use the correct Node version
nvm use 18
nvm alias default 18

# Verify version
node --version  # Should be 18.x.x
npm --version   # Should be 9.x.x or higher
```

#### npm Installation Problems

```bash
# Problem: npm install fails or takes too long
# Solution: Clear cache and reinstall

# Clear npm cache
npm cache clean --force

# Remove node_modules and lock file
rm -rf node_modules package-lock.json

# Reinstall dependencies
npm install

# Alternative: Use npm ci for faster installs
npm ci
```

#### Permission Issues (macOS/Linux)

```bash
# Problem: Permission denied when installing globally
# Solution: Fix npm permissions

# Create global directory
mkdir ~/.npm-global

# Configure npm to use new directory
npm config set prefix '~/.npm-global'

# Add to your profile (.bashrc, .zshrc, etc.)
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

### Vite Development Server Issues

#### Port Already in Use

```bash
# Problem: Error: listen EADDRINUSE :::5173
# Solution: Kill process or use different port

# Find and kill process using port 5173
sudo lsof -ti:5173 | xargs kill -9

# Or use a different port
npm run dev -- --port 3000

# Or set port in vite.config.js
export default defineConfig({
  server: {
    port: 3000
  }
})
```

#### Hot Reload Not Working

```bash
# Problem: Changes not reflected in browser
# Solution: Check file watching limits

# Increase file watch limit (Linux)
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# For macOS with Docker
# Add to vite.config.js
export default defineConfig({
  server: {
    watch: {
      usePolling: true
    }
  }
})
```

#### Module Resolution Issues

```bash
# Problem: Cannot resolve module '@/components/...'
# Solution: Check path aliases

# Verify vite.config.js has correct aliases
export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
})

# Check tsconfig.json paths
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

### Vue.js Issues

#### Component Not Rendering

```bash
# Problem: Vue component shows blank/not rendering
# Check browser console for errors

# Common causes and solutions:

# 1. Missing component registration
# In parent component:
import MyComponent from '@/components/MyComponent.vue'

# 2. Template syntax errors
# Ensure proper Vue template syntax

# 3. Props not passed correctly
<MyComponent :prop-name="value" />

# 4. Reactive data issues
# Use ref() or reactive() for data
```

#### Vue DevTools Not Working

```bash
# Problem: Vue DevTools extension not detecting app
# Solution: Check development mode

# Ensure development environment
NODE_ENV=development npm run dev

# Verify in main.js/main.ts
const app = createApp(App)
app.config.devtools = true  // Enable devtools
```

#### Router Issues

```bash
# Problem: Vue Router not working or 404 errors
# Solution: Check router configuration

# 1. Verify router setup in main.js
import { createApp } from 'vue'
import router from './router'
app.use(router)

# 2. Check route definitions
const routes = [
  { path: '/', component: Home },
  { path: '/about', component: About }
]

# 3. For history mode, configure server
# nginx.conf
location / {
  try_files $uri $uri/ /index.html;
}
```

### TailwindCSS Issues

#### Styles Not Applied

```bash
# Problem: TailwindCSS classes not working
# Solution: Check configuration

# 1. Verify tailwind.css import in main.js
import './assets/styles/tailwind.css'

# 2. Check tailwind.config.js content paths
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  // ...
}

# 3. Rebuild and restart dev server
npm run dev
```

#### Purged CSS Classes

```bash
# Problem: Classes work in development but not production
# Solution: Update content configuration

# Add dynamic class patterns to safelist
module.exports = {
  content: [
    "./src/**/*.{vue,js,ts}",
  ],
  safelist: [
    'bg-red-500',
    'text-blue-600',
    // Add dynamic classes
  ]
}
```

### D3.js Integration Issues

#### D3 Not Rendering

```bash
# Problem: D3 visualizations not appearing
# Common causes and solutions:

# 1. Container not ready
onMounted(() => {
  if (containerRef.value) {
    initializeD3()
  }
})

# 2. SVG dimensions not set
svg.attr('width', width).attr('height', height)

# 3. Data not loaded
watch(() => props.data, (newData) => {
  if (newData && newData.length > 0) {
    updateChart()
  }
})
```

#### Memory Leaks with D3

```bash
# Problem: Memory usage increases over time
# Solution: Proper cleanup

onUnmounted(() => {
  // Remove event listeners
  d3.select(window).on('resize', null)
  
  // Clear selections
  d3.select(containerRef.value).selectAll('*').remove()
  
  // Cancel animations
  d3.selectAll('.transition').interrupt()
})
```

## Build Issues

### TypeScript Errors

#### Type Check Failures

```bash
# Problem: TypeScript compilation errors
# Solution: Fix type issues

# Run type check to see errors
npm run typecheck

# Common fixes:
# 1. Add type annotations
const data: DataPoint[] = []

# 2. Use type assertions
const element = document.getElementById('chart') as HTMLElement

# 3. Update type definitions
npm update @types/node @types/d3
```

#### Vue SFC TypeScript Issues

```bash
# Problem: TypeScript errors in Vue components
# Solution: Proper TypeScript setup

# 1. Use correct script setup syntax
<script setup lang="ts">
import { ref } from 'vue'
const count = ref<number>(0)
</script>

# 2. Define props properly
interface Props {
  data: DataPoint[]
  width?: number
}
const props = withDefaults(defineProps<Props>(), {
  width: 800
})

# 3. Type composables
export function useCounter(): {
  count: Ref<number>
  increment: () => void
} {
  // implementation
}
```

### Build Performance Issues

#### Slow Build Times

```bash
# Problem: Build takes too long
# Solution: Optimize build configuration

# 1. Enable parallel processing
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            return 'vendor'
          }
        }
      }
    }
  }
})

# 2. Exclude unnecessary files
// .gitignore and .dockerignore
node_modules/
*.log
.DS_Store
```

#### Large Bundle Size

```bash
# Problem: Bundle size too large
# Solution: Analyze and optimize

# Analyze bundle
npm run build:analyze

# Common optimizations:
# 1. Tree shake unused code
import { specific } from 'library' // Instead of import *

# 2. Lazy load routes
const About = () => import('./views/About.vue')

# 3. Optimize images
# Use WebP format and proper sizing

# 4. Remove unused dependencies
npx depcheck
```

### Memory Issues

#### Out of Memory Errors

```bash
# Problem: JavaScript heap out of memory
# Solution: Increase memory limit

# Temporary fix
NODE_OPTIONS="--max-old-space-size=4096" npm run build

# Permanent fix in package.json
{
  "scripts": {
    "build": "NODE_OPTIONS='--max-old-space-size=4096' vite build"
  }
}

# For Docker builds
ENV NODE_OPTIONS="--max-old-space-size=4096"
```

## Deployment Issues

### Static Hosting Issues

#### 404 Errors on Refresh

```bash
# Problem: Vue Router history mode 404s
# Solution: Configure server redirects

# Netlify (_redirects file)
/*    /index.html   200

# nginx
location / {
  try_files $uri $uri/ /index.html;
}

# Apache (.htaccess)
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

#### CORS Issues

```bash
# Problem: API requests blocked by CORS
# Solution: Configure CORS properly

# Vite proxy for development
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})

# Production: Configure server CORS headers
Access-Control-Allow-Origin: https://yourdomain.com
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

### Docker Issues

#### Build Context Too Large

```bash
# Problem: Docker build slow due to large context
# Solution: Optimize .dockerignore

# .dockerignore
node_modules
npm-debug.log
.git
.gitignore
README.md
.env
.nyc_output
coverage
.docker
```

#### Permission Issues in Container

```bash
# Problem: Permission denied in Docker container
# Solution: Fix file permissions

# Dockerfile
FROM node:18-alpine
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
USER nextjs

# Or use multi-stage build
FROM nginx:alpine
COPY --chown=nginx:nginx --from=build /app/dist /usr/share/nginx/html
```

## Runtime Issues

### Performance Problems

#### Slow Rendering

```bash
# Problem: Application feels slow/laggy
# Solution: Performance optimization

# 1. Use v-memo for expensive lists
<div v-for="item in items" v-memo="[item.id]" :key="item.id">

# 2. Implement virtual scrolling
import { VirtualList } from '@tanstack/vue-virtual'

# 3. Debounce expensive operations
import { debounce } from 'lodash-es'
const debouncedUpdate = debounce(updateChart, 300)

# 4. Use Web Workers for heavy calculations
const worker = new Worker('./worker.js')
```

#### Memory Leaks

```bash
# Problem: Memory usage keeps increasing
# Solution: Proper cleanup

# 1. Remove event listeners
onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})

# 2. Cancel pending requests
const controller = new AbortController()
fetch(url, { signal: controller.signal })
onUnmounted(() => controller.abort())

# 3. Clear timers
const timer = setInterval(fn, 1000)
onUnmounted(() => clearInterval(timer))
```

### Data Loading Issues

#### Failed API Requests

```bash
# Problem: API requests failing
# Solution: Error handling and retries

# 1. Implement retry logic
async function fetchWithRetry(url, options, retries = 3) {
  try {
    const response = await fetch(url, options)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return response
  } catch (error) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, 1000))
      return fetchWithRetry(url, options, retries - 1)
    }
    throw error
  }
}

# 2. Check network connectivity
if (!navigator.onLine) {
  // Handle offline state
}
```

#### Large Dataset Performance

```bash
# Problem: App becomes unresponsive with large datasets
# Solution: Data pagination and virtualization

# 1. Implement pagination
const pageSize = 1000
const currentPage = ref(0)
const visibleData = computed(() => 
  data.value.slice(
    currentPage.value * pageSize, 
    (currentPage.value + 1) * pageSize
  )
)

# 2. Use canvas for large visualizations
const canvas = d3.select(container).append('canvas')
const context = canvas.node().getContext('2d')

# 3. Stream data processing
async function* processDataStream(data) {
  for (let i = 0; i < data.length; i += batchSize) {
    yield data.slice(i, i + batchSize)
    await new Promise(resolve => setTimeout(resolve, 0))
  }
}
```

## Browser Compatibility

### Legacy Browser Support

```bash
# Problem: App doesn't work in older browsers
# Solution: Add polyfills and transpilation

# Install polyfills
npm install core-js regenerator-runtime

# Add to main.js
import 'core-js/stable'
import 'regenerator-runtime/runtime'

# Configure Vite for legacy support
import legacy from '@vitejs/plugin-legacy'

export default defineConfig({
  plugins: [
    vue(),
    legacy({
      targets: ['defaults', 'not IE 11']
    })
  ]
})
```

### Mobile Issues

```bash
# Problem: App doesn't work well on mobile
# Solution: Mobile-specific optimizations

# 1. Add viewport meta tag
<meta name="viewport" content="width=device-width, initial-scale=1.0">

# 2. Handle touch events
@touchstart="handleTouchStart"
@touchmove="handleTouchMove"
@touchend="handleTouchEnd"

# 3. Optimize for mobile performance
# Use smaller initial data sets
# Implement progressive loading
# Reduce animation complexity on mobile
```

## Getting Help

### Debug Information

```bash
# Collect debug information
npm run dev -- --debug
npm run build -- --debug

# Check versions
node --version
npm --version
npm list vue
npm list vite
```

### Log Analysis

```bash
# Enable verbose logging
DEBUG=vite:* npm run dev

# Check browser console
# Look for error messages, warnings, and network failures

# Check build logs
npm run build > build.log 2>&1
```

### Community Resources

- [Vue.js Discord](https://discord.com/invite/vue)
- [Vite GitHub Issues](https://github.com/vitejs/vite/issues)
- [TailwindCSS GitHub Discussions](https://github.com/tailwindlabs/tailwindcss/discussions)
- [D3.js Observable Forum](https://talk.observablehq.com/)

This troubleshooting guide covers the most common issues you might encounter. For specific problems not covered here, check the documentation of the individual tools or create an issue in the project repository.