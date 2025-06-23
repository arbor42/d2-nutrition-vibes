import js from '@eslint/js'
import vue from 'eslint-plugin-vue'
import typescript from '@typescript-eslint/eslint-plugin'
import typescriptParser from '@typescript-eslint/parser'
import vueParser from 'vue-eslint-parser'
import prettier from 'eslint-config-prettier'

export default [
  // Base ESLint recommended rules
  js.configs.recommended,

  // Vue rules
  ...vue.configs['flat/recommended'],

  // Prettier integration
  prettier,

  {
    files: ['**/*.{js,ts,vue}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        navigator: 'readonly',
        
        // Node.js globals (for build scripts)
        process: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        
        // Vue globals
        defineProps: 'readonly',
        defineEmits: 'readonly',
        defineExpose: 'readonly',
        withDefaults: 'readonly',
      },
    },
    rules: {
      // Console rules - warn instead of error for development
      'no-console': 'warn',
      'no-debugger': 'warn',
      
      // Unused variables - warn instead of error
      'no-unused-vars': 'warn',
      
      // Prefer const
      'prefer-const': 'warn',
      
      // No constant conditions in loops
      'no-constant-condition': 'error',
      
      // Import/export
      'no-undef': 'error',
    },
  },

  // TypeScript files
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        project: ['./tsconfig.json'],
        tsconfigRootDir: '.',
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
    },
    rules: {
      ...typescript.configs.recommended.rules,
      
      // Override strict rules for gradual migration
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/prefer-nullish-coalescing': 'warn', 
      
      // Disable rules that conflict with Vue
      'no-undef': 'off', // TypeScript handles this
      'no-unused-vars': 'off', // Use @typescript-eslint version
    },
  },

  // Vue files
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: typescriptParser,
        ecmaVersion: 2022,
        sourceType: 'module',
        extraFileExtensions: ['.vue'],
        project: ['./tsconfig.json'],
        tsconfigRootDir: '.',
      },
    },
    rules: {
      // Vue specific rules
      'vue/multi-word-component-names': 'warn',
      'vue/no-unused-vars': 'warn',
      
      // Allow single word component names for some cases
      'vue/multi-word-component-names': 'off',
      
      // Template rules
      'vue/html-indent': ['warn', 2],
      'vue/max-attributes-per-line': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      
      // Script setup rules
      'vue/script-setup-uses-vars': 'error',
      
      // Disable conflicting rules for Vue
      'no-undef': 'off', // Vue handles globals
      'no-unused-vars': 'off', // Use vue version
    },
  },

  // Test files
  {
    files: ['tests/**/*.{js,ts}', '**/*.test.{js,ts}', '**/*.spec.{js,ts}'],
    languageOptions: {
      globals: {
        // Vitest globals
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        vi: 'readonly',
        
        // Cypress globals
        cy: 'readonly',
        Cypress: 'readonly',
      },
    },
  },

  // Worker files
  {
    files: ['**/*.worker.{js,ts}'],
    languageOptions: {
      globals: {
        self: 'readonly',
        postMessage: 'readonly',
        importScripts: 'readonly',
        WorkerGlobalScope: 'readonly',
      },
    },
  },

  // Ignore patterns
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'public/**',
      'coverage/**',
      '*.config.js',
      'cypress/**',
      'js/**', // Legacy files
      'css/**', // Legacy files
    ],
  },
]