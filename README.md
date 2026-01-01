# Praxis ERP System - All-in-One Solution

A comprehensive, scalable ERP system for managing a chain of schools in India, with ERPNext integration capabilities.

## Architecture

- **Microservices Architecture**: Modular services for scalability
- **ERPNext Integration**: Seamless integration with ERPNext for existing modules
- **Optimized Database**: PostgreSQL with proper indexing and query optimization
- **Caching Layer**: Redis for performance
- **API Gateway**: Centralized API routing and authentication

## Features

### Core Modules
- Student Information System (SIS)
- Admission Management
- Fee Management
- Attendance Management
- Exam/Assessment Management
- Timetable Management
- Library Management
- Inventory Management
- HR & Payroll
- Transport Management
- Communication & Notifications
- Reports & Analytics

### Technical Stack
- **Frontend**: React 18 + TypeScript + Vite (Mobile-First, AI-Powered)
- **Backend**: Node.js + TypeScript + Express (Microservices)
- **Database**: PostgreSQL (optimized for scale)
- **Cache**: Redis
- **Message Queue**: RabbitMQ (for async processing)
- **Containerization**: Docker & Docker Compose
- **Integration**: ERPNext API Client (Optional)

## Getting Started

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 14+
- Redis 7+

### Installation

```bash
# Install root dependencies
sudo npm install

# Install workspace dependencies
sudo npm install --workspaces

# Start services with Docker
docker-compose up -d

# Run database migrations
npm run migrate

# Start backend services
npm run dev

# In another terminal, start frontend
cd web
sudo npm install
npm run dev
```

The web app will be available at `http://localhost:5173`

## Project Structure

```
erp/
├── web/               # Frontend web application (React + TypeScript)
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── pages/       # Page components
│   │   ├── services/    # API services
│   │   └── stores/      # State management
│   └── package.json
├── services/           # Microservices
│   ├── api-gateway/   # API Gateway service
│   ├── auth/          # Authentication service
│   ├── student/       # Student management
│   ├── fees/          # Fee management
│   ├── attendance/    # Attendance tracking
│   ├── exam/          # Exam management
│   └── ...
├── shared/            # Shared utilities
│   ├── database/      # DB connection & models
│   ├── erpnext/       # ERPNext integration (optional)
│   └── utils/         # Common utilities
├── docker-compose.yml # Docker configuration
└── package.json
```

## ERPNext Integration (Optional)

The system can optionally integrate with ERPNext for advanced modules like:
- Accounting & Finance
- Inventory Management
- HR & Payroll
- CRM

**Note**: ERPNext integration is **optional**. The system works independently with all core modules built-in. ERPNext is only needed if you want to use its advanced accounting or inventory features.

See `ERPNEXT_INTEGRATION.md` for integration details.

## Database Optimization

- Proper indexing on frequently queried fields
- Connection pooling
- Query optimization
- Read replicas for scaling
- Partitioning for large tables

## License

MIT

