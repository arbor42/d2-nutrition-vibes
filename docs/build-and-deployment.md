# Build and Deployment Guide

## Overview

This document provides comprehensive instructions for building and deploying the D2 Nutrition Vibes application across different environments and platforms.

## Build Process

### Development Build

```bash
# Start development server with hot reload
npm run dev

# Development server with specific port
npm run dev -- --port 3000

# Development with host binding (for network access)
npm run dev -- --host 0.0.0.0
```

### Production Build

```bash
# Standard production build
npm run build

# Build with analysis
npm run build:analyze

# Build for specific environment
npm run build -- --mode staging
npm run build -- --mode production
```

### Build Configuration

The build process is configured in `vite.config.js`:

```javascript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  
  build: {
    target: 'esnext',
    outDir: 'dist',
    
    // Code splitting configuration
    rollupOptions: {
      output: {
        manualChunks: {
          'vue-vendor': ['vue', 'vue-router', 'pinia'],
          'd3-vendor': ['d3', 'topojson-client'],
          'ui-vendor': ['@vueuse/core']
        }
      }
    },
    
    // Compression and optimization
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    
    // Source maps for production debugging
    sourcemap: process.env.NODE_ENV !== 'production'
  }
})
```

### Environment-Specific Builds

Create environment files:

```bash
# .env.development
VITE_APP_TITLE=D2 Nutrition Vibes (Dev)
VITE_API_BASE_URL=http://localhost:3000/api
VITE_ENABLE_DEV_TOOLS=true

# .env.staging
VITE_APP_TITLE=D2 Nutrition Vibes (Staging)
VITE_API_BASE_URL=https://staging-api.example.com
VITE_ENABLE_DEV_TOOLS=false

# .env.production
VITE_APP_TITLE=D2 Nutrition Vibes
VITE_API_BASE_URL=https://api.example.com
VITE_ENABLE_DEV_TOOLS=false
```

## Deployment Strategies

### 1. Static Hosting (Netlify, Vercel, GitHub Pages)

#### Netlify Deployment

Create `netlify.toml`:

```toml
[build]
  publish = "dist"
  command = "npm run build"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[build.processing]
  skip_processing = false

[build.processing.css]
  bundle = true
  minify = true

[build.processing.js]
  bundle = true
  minify = true

[build.processing.html]
  pretty_urls = true

[[headers]]
  for = "/static/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "*.js"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "*.css"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

Deploy command:
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy to Netlify
netlify deploy --prod --dir=dist
```

#### Vercel Deployment

Create `vercel.json`:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "handle": "filesystem"
    },
    {
      "src": "/.*",
      "dest": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/static/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

Deploy:
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy to Vercel
vercel --prod
```

#### GitHub Pages Deployment

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout
      uses: actions/checkout@v3
      
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Build
      run: npm run build
      
    - name: Deploy to GitHub Pages
      uses: peaceiris/actions-gh-pages@v3
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./dist
```

### 2. Docker Deployment

#### Multi-stage Dockerfile

Create `Dockerfile`:

```dockerfile
# Build stage
FROM node:18-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine AS production

# Copy built application
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
```

#### Nginx Configuration

Create `nginx.conf`:

```nginx
events {
  worker_connections 1024;
}

http {
  include /etc/nginx/mime.types;
  default_type application/octet-stream;
  
  # Gzip compression
  gzip on;
  gzip_vary on;
  gzip_min_length 1024;
  gzip_types text/plain text/css text/xml text/javascript 
             application/javascript application/xml+rss 
             application/json application/xml;

  # Security headers
  add_header X-Frame-Options DENY;
  add_header X-Content-Type-Options nosniff;
  add_header X-XSS-Protection "1; mode=block";
  add_header Referrer-Policy strict-origin-when-cross-origin;

  server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
      expires 1y;
      add_header Cache-Control "public, immutable";
    }

    # Handle Vue Router
    location / {
      try_files $uri $uri/ /index.html;
    }

    # API proxy (if needed)
    location /api/ {
      proxy_pass http://api-server:3000/;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
    }
  }
}
```

#### Docker Commands

```bash
# Build Docker image
docker build -t d2-nutrition-vibes .

# Run container
docker run -p 80:80 d2-nutrition-vibes

# Run with environment variables
docker run -p 80:80 \
  -e VITE_API_BASE_URL=https://api.example.com \
  d2-nutrition-vibes

# Docker Compose
docker-compose up -d
```

#### Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "80:80"
    environment:
      - VITE_API_BASE_URL=https://api.example.com
    restart: unless-stopped
    
  # Optional: Add a reverse proxy
  nginx-proxy:
    image: nginx:alpine
    ports:
      - "443:443"
    volumes:
      - ./ssl:/etc/nginx/ssl
      - ./proxy.conf:/etc/nginx/nginx.conf
    depends_on:
      - app
```

### 3. AWS Deployment

#### S3 + CloudFront

Deploy to AWS S3 with CloudFront CDN:

```bash
# Install AWS CLI
pip install awscli

# Configure AWS credentials
aws configure

# Sync to S3 bucket
aws s3 sync dist/ s3://your-bucket-name --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"
```

#### AWS deployment script

Create `scripts/deploy-aws.sh`:

```bash
#!/bin/bash
set -e

# Build the application
echo "Building application..."
npm run build

# Upload to S3
echo "Uploading to S3..."
aws s3 sync dist/ s3://$AWS_S3_BUCKET --delete \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "*.html" \
  --exclude "service-worker.js"

# Upload HTML files with shorter cache
aws s3 sync dist/ s3://$AWS_S3_BUCKET \
  --cache-control "public, max-age=0, must-revalidate" \
  --exclude "*" \
  --include "*.html" \
  --include "service-worker.js"

# Invalidate CloudFront
echo "Invalidating CloudFront..."
aws cloudfront create-invalidation \
  --distribution-id $AWS_CLOUDFRONT_DISTRIBUTION_ID \
  --paths "/*"

echo "Deployment complete!"
```

### 4. CI/CD Pipeline

#### GitHub Actions

Create `.github/workflows/ci-cd.yml`:

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

env:
  NODE_VERSION: '18'

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: ${{ env.NODE_VERSION }}
        cache: 'npm'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Run linting
      run: npm run lint
      
    - name: Run type checking
      run: npm run typecheck
      
    - name: Run tests
      run: npm run test:coverage
      
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3

  build:
    needs: test
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: ${{ env.NODE_VERSION }}
        cache: 'npm'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Build application
      run: npm run build
      
    - name: Upload build artifacts
      uses: actions/upload-artifact@v3
      with:
        name: dist
        path: dist/

  deploy-staging:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/develop'
    
    steps:
    - name: Download build artifacts
      uses: actions/download-artifact@v3
      with:
        name: dist
        path: dist/
        
    - name: Deploy to staging
      run: |
        # Deploy to staging environment
        echo "Deploying to staging..."

  deploy-production:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - name: Download build artifacts
      uses: actions/download-artifact@v3
      with:
        name: dist
        path: dist/
        
    - name: Deploy to production
      run: |
        # Deploy to production environment
        echo "Deploying to production..."
```

## Performance Optimization

### Build Optimization

```javascript
// vite.config.js optimization settings
export default defineConfig({
  build: {
    // Enable rollup optimizations
    rollupOptions: {
      output: {
        // Chunk splitting strategy
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('vue')) return 'vue-vendor'
            if (id.includes('d3')) return 'd3-vendor'
            return 'vendor'
          }
        }
      }
    },
    
    // Minification options
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info']
      }
    }
  }
})
```

### Bundle Analysis

```bash
# Analyze bundle size
npm run build:analyze

# Generate bundle report
npx vite-bundle-analyzer dist
```

### Preloading and Caching

Add to `index.html`:

```html
<!-- Preload critical resources -->
<link rel="preload" href="/assets/fonts/inter.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preconnect" href="https://api.example.com">

<!-- Service worker for caching -->
<script>
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js')
  }
</script>
```

## Monitoring and Analytics

### Performance Monitoring

```javascript
// Performance monitoring setup
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals'

// Send metrics to analytics
function sendToAnalytics({ name, value, id }) {
  gtag('event', name, {
    event_category: 'Web Vitals',
    value: Math.round(name === 'CLS' ? value * 1000 : value),
    event_label: id,
    non_interaction: true
  })
}

getCLS(sendToAnalytics)
getFID(sendToAnalytics)
getFCP(sendToAnalytics)
getLCP(sendToAnalytics)
getTTFB(sendToAnalytics)
```

### Error Tracking

```javascript
// Error tracking setup
window.addEventListener('error', (event) => {
  // Send error to monitoring service
  sendErrorToService({
    message: event.message,
    source: event.source,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error
  })
})
```

## Security Considerations

### Content Security Policy

Add to nginx or server configuration:

```
Content-Security-Policy: default-src 'self'; 
  script-src 'self' 'unsafe-eval'; 
  style-src 'self' 'unsafe-inline'; 
  img-src 'self' data: https:; 
  font-src 'self' data:; 
  connect-src 'self' https://api.example.com;
```

### Environment Variables Security

```bash
# Never commit sensitive environment variables
# Use secrets management for production

# .env.example (safe to commit)
VITE_APP_TITLE=D2 Nutrition Vibes
VITE_API_BASE_URL=https://api.example.com
VITE_ENABLE_DEV_TOOLS=false

# Actual .env files should be in .gitignore
```

## Troubleshooting

### Common Build Issues

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
npx vite --force

# Check for TypeScript errors
npm run typecheck
```

### Deployment Issues

```bash
# Check build output
ls -la dist/

# Verify environment variables
npm run build -- --mode production

# Test production build locally
npm run preview
```

This comprehensive guide covers all aspects of building and deploying the D2 Nutrition Vibes application across different platforms and environments.