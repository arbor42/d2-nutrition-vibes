import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig(({ mode }) => ({
  plugins: [
    vue(),
    ...(mode === 'analyze' ? [
      visualizer({
        filename: 'dist/stats.html',
        open: true,
        gzipSize: true
      })
    ] : [])
  ],
  root: '.',
  server: {
    port: 3000,
    open: true
  },
  define: {
    __VUE_OPTIONS_API__: false,
    __VUE_PROD_DEVTOOLS__: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    minify: 'terser',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      input: {
        main: './index.html'
      },
      output: {
        manualChunks: (id) => {
          // Vendor chunks
          if (id.includes('node_modules')) {
            if (id.includes('d3')) {
              return 'd3-vendor'
            }
            if (id.includes('topojson')) {
              return 'topojson-vendor'
            }
            if (id.includes('vue')) {
              return 'vue-vendor'
            }
            if (id.includes('pinia')) {
              return 'pinia-vendor'
            }
            return 'vendor'
          }
          
          // Component chunks
          if (id.includes('/components/panels/')) {
            return 'panels'
          }
          if (id.includes('/components/visualizations/')) {
            return 'visualizations'
          }
          if (id.includes('/components/ui/')) {
            return 'ui-components'
          }
          if (id.includes('/composables/')) {
            return 'composables'
          }
          if (id.includes('/stores/')) {
            return 'stores'
          }
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  assetsInclude: ['**/*.geojson'],
  optimizeDeps: {
    include: ['d3', 'topojson-client']
  },
  esbuild: {
    drop: mode === 'production' ? ['console', 'debugger'] : []
  }
}))