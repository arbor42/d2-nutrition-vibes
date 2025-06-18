/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9f5',
          100: '#dcf2e8',
          200: '#bee5d4',
          300: '#8dd1b6',
          400: '#54b592',
          500: '#27ae60',
          600: '#1e8b4f',
          700: '#1a6e41',
          800: '#175736',
          900: '#14482e',
          950: '#0a291a'
        },
        secondary: {
          50: '#eff8ff',
          100: '#daeeff',
          200: '#bee1ff',
          300: '#91ceff',
          400: '#5eb0fd',
          500: '#3498db',
          600: '#2980b9',
          700: '#21618c',
          800: '#1f5274',
          900: '#1e4460',
          950: '#162a40'
        },
        // Data visualization colors
        viz: {
          production: {
            50: '#f7fcf0',
            100: '#e0f3db',
            200: '#ccebc5',
            300: '#a8ddb5',
            400: '#7bccc4',
            500: '#4eb3d3',
            600: '#2b8cbe',
            700: '#0868ac',
            800: '#084081',
            900: '#08306b'
          },
          forecast: {
            50: '#fff7ec',
            100: '#fee8c8',
            200: '#fdd49e',
            300: '#fdbb84',
            400: '#fc8d59',
            500: '#ef6548',
            600: '#d7301f',
            700: '#b30000',
            800: '#7f0000',
            900: '#4a0000'
          },
          analysis: {
            50: '#f7f4f9',
            100: '#e7e1ef',
            200: '#d4c4df',
            300: '#c2a2c8',
            400: '#a876b0',
            500: '#8e4b99',
            600: '#7a2182',
            700: '#5f1a6b',
            800: '#4a1554',
            900: '#35113d'
          }
        },
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d'
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f'
        },
        error: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d'
        }
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'Menlo', 'Monaco', 'monospace']
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        '6xl': ['3.75rem', { lineHeight: '1' }]
      },
      spacing: {
        '0.5': '0.125rem',
        '1.5': '0.375rem',
        '2.5': '0.625rem',
        '3.5': '0.875rem',
        '4.5': '1.125rem',
        '5.5': '1.375rem',
        '6.5': '1.625rem',
        '7.5': '1.875rem',
        '8.5': '2.125rem',
        '9.5': '2.375rem',
        '13': '3.25rem',
        '15': '3.75rem',
        '17': '4.25rem',
        '18': '4.5rem',
        '19': '4.75rem',
        '21': '5.25rem',
        '22': '5.5rem',
        '23': '5.75rem',
        '25': '6.25rem',
        '26': '6.5rem',
        '27': '6.75rem',
        '29': '7.25rem',
        '30': '7.5rem',
        '33': '8.25rem',
        '34': '8.5rem',
        '35': '8.75rem',
        '37': '9.25rem',
        '38': '9.5rem',
        '39': '9.75rem'
      },
      borderRadius: {
        'xs': '0.125rem',
        'sm': '0.25rem',
        'md': '0.375rem',
        'lg': '0.5rem',
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem'
      },
      boxShadow: {
        'xs': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'sm': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        'xl': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
        'inner': 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)'
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'fade-out': 'fadeOut 0.5s ease-in-out',
        'slide-in-up': 'slideInUp 0.5s ease-out',
        'slide-in-down': 'slideInDown 0.5s ease-out',
        'slide-in-left': 'slideInLeft 0.5s ease-out',
        'slide-in-right': 'slideInRight 0.5s ease-out',
        'bounce-in': 'bounceIn 0.6s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 3s linear infinite'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' }
        },
        slideInUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        slideInDown: {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' }
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' }
        },
        bounceIn: {
          '0%, 20%, 40%, 60%, 80%': {
            transform: 'scale3d(0.3, 0.3, 0.3)',
            opacity: '0'
          },
          '20%': {
            transform: 'scale3d(1.1, 1.1, 1.1)'
          },
          '40%': {
            transform: 'scale3d(0.9, 0.9, 0.9)',
            opacity: '1'
          },
          '60%': {
            transform: 'scale3d(1.03, 1.03, 1.03)'
          },
          '80%': {
            transform: 'scale3d(0.97, 0.97, 0.97)'
          },
          '100%': {
            transform: 'scale3d(1, 1, 1)',
            opacity: '1'
          }
        }
      },
      utilities: {
        // Custom utilities for data visualizations
        '.viz-container': {
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: 'theme(colors.white)',
          borderRadius: 'theme(borderRadius.lg)',
          boxShadow: 'theme(boxShadow.sm)',
          border: '1px solid theme(colors.gray.200)'
        },
        '.viz-container.dark': {
          backgroundColor: 'theme(colors.gray.800)',
          borderColor: 'theme(colors.gray.700)'
        },
        '.chart-tooltip': {
          position: 'absolute',
          pointerEvents: 'none',
          backgroundColor: 'theme(colors.gray.900)',
          color: 'theme(colors.white)',
          fontSize: 'theme(fontSize.sm[0])',
          borderRadius: 'theme(borderRadius.lg)',
          padding: 'theme(spacing.3)',
          boxShadow: 'theme(boxShadow.lg)',
          opacity: '0',
          transition: 'opacity 0.2s ease-in-out',
          zIndex: '30',
          maxWidth: '200px'
        }
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography')
  ],
}