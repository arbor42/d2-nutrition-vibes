# D2 Nutrition Vibes

A modern Vue.js application for visualizing and analyzing FAO (Food and Agriculture Organization) agricultural data with advanced D3.js visualizations.

## Overview

D2 Nutrition Vibes is a comprehensive data visualization platform that transforms complex agricultural datasets into interactive, insightful visualizations. Built with Vue.js 3, D3.js, and TailwindCSS, it provides powerful tools for exploring global food production, trade patterns, and nutritional trends.

## Features

- **Interactive Visualizations**: Multiple chart types including time series, network graphs, hierarchical views, and geographic maps
- **Real-time Data Processing**: Client-side data transformation with Web Workers for performance
- **Machine Learning Forecasts**: ML-powered predictions for agricultural trends
- **Responsive Design**: Fully responsive interface with mobile-first approach
- **Dark Mode Support**: Complete dark mode implementation
- **Advanced Filtering**: Complex data filtering with form validation
- **Export Capabilities**: Export visualizations and data in multiple formats

## Technology Stack

- **Frontend**: Vue.js 3.4.0+ with Composition API
- **Build Tool**: Vite 5.0.0+
- **Styling**: TailwindCSS 3.4.0+
- **Visualizations**: D3.js 7.8.5+
- **State Management**: Pinia 2.1.0+
- **TypeScript**: Full TypeScript support
- **Testing**: Vitest, Cypress, Storybook
- **Form Validation**: VeeValidate + Zod

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Modern web browser

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/d2-nutrition-vibes.git
cd d2-nutrition-vibes

# Install dependencies
npm install

# Start development server
npm run dev
```

### Available Scripts

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

## Project Structure

```
d2-nutrition-vibes/
├── src/
│   ├── components/      # Vue components
│   ├── composables/     # Vue composables
│   ├── stores/          # Pinia stores
│   ├── services/        # API services
│   ├── utils/           # Utilities
│   ├── types/           # TypeScript types
│   ├── router/          # Vue Router
│   ├── schemas/         # Validation schemas
│   └── workers/         # Web Workers
├── public/
│   └── data/           # FAO datasets
├── py/                 # Python scripts
├── docs/               # Documentation
├── tests/              # Test files
└── cypress/            # E2E tests
```

## Key Features

### Visualization Components

- **StructuralChart**: Complex hierarchical data visualization
- **NetworkVisualization**: Trade network analysis
- **WorldMapSimple**: Geographic data representation
- **TimeSeriesChart**: Temporal trend analysis
- **PopulationPyramid**: Demographic visualization
- **TradeFlowMap**: International trade patterns

### Performance Optimizations

- Canvas rendering for complex visualizations
- Progressive data loading
- Advanced caching strategies
- Web Worker processing
- Virtual scrolling for large datasets
- Optimized bundle splitting

### Data Sources

The application uses FAO agricultural datasets including:
- Production statistics
- Trade data
- Geographic information
- ML-generated forecasts
- Network analysis results

## Development

### Code Style

The project follows strict code quality standards:
- ESLint for code linting
- Prettier for formatting
- TypeScript for type safety
- Conventional commits

### Testing

Comprehensive testing approach:
- Unit tests with Vitest
- Integration tests with Vue Test Utils
- E2E tests with Cypress
- Visual regression with Percy
- Accessibility testing with cypress-axe

### Contributing

Please read the [CLAUDE.md](./CLAUDE.md) file for detailed development guidelines and best practices.

## Performance

The application is optimized for handling large datasets:
- Lazy loading of components
- Progressive rendering
- Efficient caching mechanisms
- Background processing with Web Workers
- Optimized D3.js rendering

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Android)

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- FAO for providing comprehensive agricultural datasets
- D3.js community for visualization tools
- Vue.js ecosystem for the robust framework

## Deep-Linking & URL-State-Service

Der neue `UrlStateService` serialisiert den kompletten UI-Zustand in die Query-Parameter der Adresse. Dadurch lassen sich Ansichten teilen und per Bookmark wiederherstellen.

Beispiele
```
/?dark=1&sb=1&pnl=simulation            # Dark-Mode, Sidebar offen, Simulation-Panel
/?pr=Wheat,Rice&cty=DEU,BRA&yr=2022     # Auswahl mehrerer Produkte/Länder
```

Weitere Details siehe `urlservice.md`.

---

For detailed development instructions and architectural decisions, please refer to the [CLAUDE.md](./CLAUDE.md) documentation.