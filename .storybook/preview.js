import { setup } from '@storybook/vue3'
import { createPinia } from 'pinia'
import '../src/assets/styles/tailwind.css'

// Setup Vue plugins
const pinia = createPinia()

setup((app) => {
  app.use(pinia)
})

export const parameters = {
  actions: { argTypesRegex: '^on[A-Z].*' },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
  docs: {
    extractComponentDescription: (component, { notes }) => {
      if (notes) {
        return typeof notes === 'string' ? notes : notes.markdown || notes.text
      }
      return null
    },
  },
  viewport: {
    viewports: {
      mobile: {
        name: 'Mobile',
        styles: {
          width: '375px',
          height: '667px',
        },
      },
      tablet: {
        name: 'Tablet',
        styles: {
          width: '768px',
          height: '1024px',
        },
      },
      desktop: {
        name: 'Desktop',
        styles: {
          width: '1440px',
          height: '900px',
        },
      },
    },
  },
  backgrounds: {
    default: 'light',
    values: [
      {
        name: 'light',
        value: '#ffffff',
      },
      {
        name: 'dark',
        value: '#1f2937',
      },
    ],
  },
}

export const globalTypes = {
  theme: {
    name: 'Theme',
    description: 'Global theme for components',
    defaultValue: 'light',
    toolbar: {
      icon: 'circlehollow',
      items: ['light', 'dark'],
      showName: true,
    },
  },
}

const withThemeProvider = (story, context) => {
  const theme = context.globals.theme || 'light'
  
  return {
    components: { story },
    template: `
      <div class="${theme === 'dark' ? 'dark' : ''}" style="min-height: 100vh; background-color: ${theme === 'dark' ? '#1f2937' : '#ffffff'};">
        <story />
      </div>
    `,
  }
}

export const decorators = [withThemeProvider]