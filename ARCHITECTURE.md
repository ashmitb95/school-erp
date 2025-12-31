# School ERP System Architecture

## Overview

This is a comprehensive, scalable ERP system designed for managing a chain of schools in India. It follows a microservices architecture with optimized database design, AI-powered features, and mobile-first responsive design.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                  API Gateway (Fastify, Port 3000)          │
│          (Authentication, Request Routing, CORS)            │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ Auth Service│ │Student Svc  │ │ Fees Service│
│  (Port 3001)│ │ (Port 3002) │ │ (Port 3003) │
└─────────────┘ └─────────────┘ └─────────────┘
        │              │              │
        ▼              ▼              ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│Attendance   │ │ Exam Service│ │ AI Service  │
│ (Port 3004) │ │ (Port 3005) │ │ (Port 3006) │
└─────────────┘ └─────────────┘ └─────────────┘
        │              │              │
        ▼              ▼              ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│Management   │ │   Frontend  │ │  Payment    │
│ (Port 3007) │ │  (Port 5173)│ │  Gateways   │
└─────────────┘ └─────────────┘ └─────────────┘
        │              │              │
        └──────────────┼──────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ PostgreSQL  │ │    Redis    │ │  Razorpay/  │
│  Database   │ │   Cache     │ │   Stripe    │
└─────────────┘ └─────────────┘ └─────────────┘
```

## Components

### 1. API Gateway
- **Technology**: Fastify
- **Port**: 3000
- **Purpose**: Central entry point for all API requests
- **Features**:
  - Request routing to appropriate microservices via HTTP proxy
  - JWT-based authentication middleware
  - CORS handling
  - Request/response logging
  - Error handling with service-specific messages
  - Public payment endpoints (token-based access)

### 2. Microservices

#### Auth Service (Port 3001)
- User authentication (Staff login)
- JWT token generation and validation
- Password hashing with bcrypt
- Session management

#### Student Service (Port 3002)
- Student CRUD operations
- Student search and filtering
- Student detail views
- Pagination support
- Redis caching for performance

#### Fees Service (Port 3003)
- Fee management and tracking
- Payment processing
- Payment gateway integration (Razorpay, Stripe)
- Public payment links with token validation
- Fee postponement and reminders
- Receipt generation
- Transaction history

#### Attendance Service (Port 3004)
- Daily attendance marking
- Bulk attendance operations
- Attendance statistics and analytics
- Date range filtering
- Status tracking (present, absent, late, excused)

#### Exam Service (Port 3005)
- Exam creation and management
- Exam result entry
- Grade calculation
- Status filtering (upcoming, ongoing, completed)
- Exam type management (unit_test, mid_term, final, assignment)
- Result analytics

#### AI Service (Port 3006)
- **LLM-based SQL Generation**: Converts natural language queries to SQL
- **Semantic Database Understanding**: Uses database schema and example values
- **Server-Sent Events (SSE)**: Streams responses for real-time chat experience
- **Conversation Memory**: Maintains context across chat sessions
- **Dynamic Data Rendering**: Supports markdown, charts, and tables
- **Hybrid Data Streaming**: Small datasets via SSE, large datasets via separate API
- **Multi-LLM Support**: OpenAI, Anthropic, and local LLM APIs

#### Management Service (Port 3007)
- School management
- Staff management
- Class management
- Subject management
- Timetable management
- Transport route management
- Calendar event management (organization, class, admin, teacher_global events)

### 3. Frontend Application

#### Technology Stack
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **State Management**: Zustand (with persistence)
- **Data Fetching**: React Query
- **UI Components**: Custom components with CSS Modules
- **Charts**: AG Charts
- **Tables**: AG Grid with set filters for enum columns
- **Maps**: React Leaflet for transport routes
- **Animations**: Framer Motion
- **Markdown**: react-markdown with remark-gfm
- **Design**: Mobile-first responsive design

#### Pages & Features
1. **Dashboard**: Overview with statistics, charts, and quick actions
2. **Students**: Student management with search, filters, analytics, and export
3. **Staff**: Staff management with designation filtering
4. **Classes**: Class management with academic year filtering
5. **Subjects**: Subject catalog management
6. **Timetables**: Class schedule viewing with modal popup for detailed view
7. **Transport Routes**: Route management with interactive maps showing student pickup points
8. **Calendar**: School calendar with event types (organization, class, admin, teacher_global)
9. **Fees**: Fee management with payment links, postponement, and reminders
10. **Attendance**: Attendance tracking with date range filtering
11. **Exams**: Exam management with status and type filtering
12. **AI Chat**: Natural language query interface with streaming responses
13. **Settings**: System configuration

#### UI Features
- **Skeleton Loaders**: Custom skeleton components for loading states
- **Enum Filters**: Set filters in AG Grid tables for enum columns
- **Mobile-First Design**: Responsive layouts for mobile, tablet, and desktop
- **Payment Integration**: Razorpay and Stripe payment gateways
- **Geotagging**: Student location tracking for transport routes
- **Real-time Updates**: SSE for AI chat responses

### 4. Database Layer

#### PostgreSQL
- **Optimizations**:
  - Proper indexing on frequently queried fields
  - Connection pooling (min: 2, max: 10)
  - UUID primary keys for all tables
  - Foreign key indexes for join performance
  - Full-text search indexes on names
  - Date field indexes for range queries
  - Status field indexes for filtering

#### Database Models
1. **schools**: School information
2. **students**: Student records with geolocation
3. **staff**: Staff/employee records
4. **classes**: Class information
5. **subjects**: Subject catalog
6. **attendances**: Daily attendance records
7. **fees**: Fee records and payments
8. **exams**: Exam information
9. **exam_results**: Exam results
10. **timetables**: Class schedules
11. **library_books**: Library catalog
12. **library_transactions**: Book issue/return
13. **inventory_items**: Inventory management
14. **transport_routes**: Transport management
15. **notifications**: System notifications
16. **calendar_events**: School calendar events

#### Redis
- **Usage**:
  - Caching frequently accessed data
  - Session management
  - Rate limiting (future)

### 5. Payment Integration

#### Payment Gateways
- **Razorpay**: Primary payment gateway for Indian market
- **Stripe**: International payment support
- **Features**:
  - Public payment links with token validation
  - Payment status tracking
  - Receipt generation
  - Transaction history

### 6. AI Features

#### Natural Language Query Interface
- Converts natural language to SQL queries
- Understands database schema and relationships
- Uses example values for better context
- Supports complex queries with joins and aggregations
- Returns formatted results (tables, charts, markdown)

#### Streaming Responses
- Server-Sent Events (SSE) for real-time responses
- Hybrid approach: metadata via SSE, large datasets via API
- Conversation memory for context retention

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `GET /api/auth/verify` - Verify token

### Students
- `GET /api/student` - List students (with pagination, search)
- `GET /api/student/:id` - Get student details
- `POST /api/student` - Create student
- `PUT /api/student/:id` - Update student
- `DELETE /api/student/:id` - Deactivate student

### Fees
- `GET /api/fees` - List fees (with pagination, search, status filter)
- `POST /api/fees` - Create fee
- `POST /api/fees/:id/pay` - Pay fee
- `PATCH /api/fees/:id/postpone` - Postpone payment
- `POST /api/fees/:id/reminder` - Send reminder
- `POST /api/fees/:id/payment-link` - Generate payment link
- `GET /api/fees/payment/:token` - Public payment page (token-based)

### Attendance
- `GET /api/attendance` - Get attendance (with date range, pagination)
- `POST /api/attendance` - Mark attendance
- `POST /api/attendance/bulk` - Bulk mark attendance
- `GET /api/attendance/stats` - Statistics

### Exams
- `GET /api/exam` - List exams (with pagination, type filter, status filter)
- `POST /api/exam` - Create exam
- `GET /api/exam/:id` - Get exam details
- `POST /api/exam/:id/results` - Add result
- `GET /api/exam/:id/results` - Get results

### AI
- `POST /api/ai/chat` - Chat endpoint (SSE streaming)
- `GET /api/ai/data/:queryId` - Fetch large dataset results

### Management
- `GET /api/management/staff` - List staff
- `GET /api/management/classes` - List classes
- `GET /api/management/subjects` - List subjects
- `GET /api/management/timetables` - List timetables
- `GET /api/management/transport-routes` - List transport routes
- `GET /api/management/calendar-events` - List calendar events
- `POST /api/management/calendar-events` - Create calendar event

## Scalability Considerations

### Horizontal Scaling
- Microservices can be scaled independently
- Load balancer in front of API Gateway
- Database read replicas for read-heavy operations
- Stateless services for easy scaling

### Vertical Scaling
- Connection pooling configured
- Query optimization
- Caching strategy in place
- Batch processing for large operations

### Database Optimization
- Proper indexing on all query patterns
- Connection pooling (min: 2, max: 10)
- Prepared statements
- Query result caching via Redis
- Efficient pagination

## Security

- JWT-based authentication
- Password hashing with bcrypt (10 rounds)
- Environment-based configuration
- CORS protection
- Input validation with Zod
- Token-based public payment links
- SQL injection prevention via parameterized queries

## Deployment

### Development
```bash
# Start infrastructure
docker-compose up -d

# Start all backend services
npm run dev

# Start frontend (in web directory)
cd web
npm run dev
```

### Production
- Use Docker containers for each service
- Kubernetes for orchestration (recommended)
- Database backups and replication
- Monitoring and logging (ELK stack recommended)
- CDN for static assets
- SSL/TLS certificates

## Technology Stack Summary

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js (services), Fastify (API Gateway)
- **Language**: TypeScript
- **ORM**: Sequelize
- **Database**: PostgreSQL 14+
- **Cache**: Redis 7+
- **Validation**: Zod

### Frontend
- **Framework**: React 18
- **Language**: TypeScript
- **Build Tool**: Vite
- **State Management**: Zustand
- **Data Fetching**: React Query
- **Charts**: AG Charts
- **Tables**: AG Grid
- **Maps**: React Leaflet
- **Styling**: CSS Modules
- **Animations**: Framer Motion

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Message Queue**: RabbitMQ (for async processing)
- **Payment**: Razorpay, Stripe
- **AI/LLM**: OpenAI, Anthropic, Local LLM APIs

## Future Enhancements

1. **Additional Services**:
   - Library management service
   - Notification service (WebSocket-based)
   - Reporting service
   - Analytics service

2. **Features**:
   - Real-time notifications (WebSocket)
   - Mobile app APIs
   - SMS/Email integration
   - Advanced analytics and reporting
   - Multi-language support
   - Offline mode support

3. **Infrastructure**:
   - Elasticsearch for advanced search
   - CDN for static assets
   - API rate limiting
   - GraphQL API layer
   - Microservice mesh (Istio)
