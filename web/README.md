# Praxis ERP Web App

Modern, mobile-first web application for the Praxis ERP system with AI-first features.

## Features

- 🎨 **Modern Design**: Flat, clean UI with soft curved borders and solid colors
- 📱 **Mobile-First**: Responsive design optimized for mobile devices
- 🎨 **Themeable**: Customizable themes without Tailwind (CSS Modules)
- 🤖 **AI-First**: Built-in AI assistant for smart interactions
- ⚡ **Fast**: Built with Vite and React
- 🔒 **Secure**: JWT-based authentication

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development and building
- **React Router** for navigation
- **Zustand** for state management
- **React Query** for data fetching
- **Framer Motion** for animations
- **CSS Modules** for styling (no Tailwind)
- **Lucide React** for icons

## Getting Started

### Prerequisites

- Node.js 18+
- Backend API running (see main README)

### Installation

```bash
# Install dependencies
cd web
sudo npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Project Structure

```
web/
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/          # Page components
│   ├── contexts/       # React contexts (Theme, etc.)
│   ├── stores/         # Zustand stores
│   ├── services/       # API and service integrations
│   └── styles/         # Global styles
├── public/             # Static assets
└── index.html          # HTML entry point
```

## Features

### AI Assistant
- Chat interface for natural language queries
- Smart suggestions based on context
- Integration with school data

### Theme System
- Light/Dark mode
- Customizable colors
- CSS Variables for easy theming

### Modules
- **Dashboard**: Overview and quick actions
- **Students**: Student management and details
- **Fees**: Fee collection and tracking
- **Attendance**: Daily attendance marking
- **Exams**: Exam and result management
- **Settings**: App configuration

## Design Principles

- **Mobile-First**: Designed for mobile, enhanced for desktop
- **Flat Design**: No shadows, clean and modern
- **Soft Borders**: Rounded corners (8-16px radius)
- **Solid Colors**: Vibrant, solid color palette
- **Accessible**: WCAG compliant, keyboard navigation

## API Integration

The app connects to the backend API through the API Gateway (port 3000). All API calls are proxied through Vite's dev server.

## Environment Variables

Create a `.env` file in the `web` directory:

```env
VITE_API_URL=http://localhost:3000
VITE_OSRM_URL=http://localhost:5000  # Optional: Your own OSRM instance (defaults to public demo server)
```

**Note**: The public OSRM demo server has rate limits. For production, set up your own OSRM instance. See [OSRM_SETUP.md](./OSRM_SETUP.md) for instructions.

## Development

```bash
# Start dev server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)


