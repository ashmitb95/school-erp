# School ERP System Architecture

## Overview

This is a comprehensive, scalable ERP system designed for managing a chain of schools in India. It follows a microservices architecture with optimized database design and ERPNext integration capabilities.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      API Gateway (Port 3000)                 │
│              (Authentication & Request Routing)              │
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
│Attendance   │ │ Exam Service│ │   ...       │
│ (Port 3004) │ │ (Port 3005) │ │             │
└─────────────┘ └─────────────┘ └─────────────┘
        │              │              │
        └──────────────┼──────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ PostgreSQL  │ │    Redis    │ │  ERPNext    │
│  Database   │ │   Cache     │ │ Integration │
└─────────────┘ └─────────────┘ └─────────────┘
```

## Components

### 1. API Gateway
- **Port**: 3000
- **Purpose**: Central entry point for all API requests
- **Features**:
  - Request routing to appropriate microservices
  - Authentication middleware
  - CORS handling
  - Request/response logging

### 2. Microservices

#### Auth Service (Port 3001)
- User authentication
- JWT token generation and validation
- Staff login management

#### Student Service (Port 3002)
- Student CRUD operations
- Student search and filtering
- Redis caching for performance

#### Fees Service (Port 3003)
- Fee management
- Payment processing
- ERPNext integration for accounting

#### Attendance Service (Port 3004)
- Daily attendance marking
- Bulk attendance operations
- Attendance statistics

#### Exam Service (Port 3005)
- Exam creation and management
- Exam result entry
- Grade calculation

### 3. Database Layer

#### PostgreSQL
- **Optimizations**:
  - Proper indexing on frequently queried fields
  - Connection pooling
  - Partitioning for large tables (future)
  - Read replicas for scaling (future)

#### Redis
- **Usage**:
  - Caching frequently accessed data
  - Session management
  - Rate limiting

### 4. ERPNext Integration

The system integrates with ERPNext for:
- **Accounting**: Fee payments, journal entries
- **Inventory**: Stock management
- **HR**: Employee management
- **CRM**: Customer (parent) management

Integration is done via ERPNext REST API with token-based authentication.

## Database Schema

### Core Tables

1. **schools**: School information
2. **students**: Student records
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

### Indexing Strategy

- **Primary Keys**: UUID for all tables
- **Foreign Keys**: Indexed for join performance
- **Search Fields**: Full-text search indexes on names
- **Date Fields**: Indexed for range queries
- **Status Fields**: Indexed for filtering

## Scalability Considerations

### Horizontal Scaling
- Microservices can be scaled independently
- Load balancer in front of API Gateway
- Database read replicas for read-heavy operations

### Vertical Scaling
- Connection pooling configured
- Query optimization
- Caching strategy in place

### Database Optimization
- Proper indexing on all query patterns
- Connection pooling (min: 2, max: 10)
- Prepared statements
- Query result caching via Redis

## Security

- JWT-based authentication
- Password hashing with bcrypt
- Environment-based configuration
- CORS protection
- Input validation with Zod

## Deployment

### Development
```bash
docker-compose up -d  # Start infrastructure
npm run dev            # Start all services
```

### Production
- Use Docker containers for each service
- Kubernetes for orchestration (recommended)
- Database backups and replication
- Monitoring and logging (ELK stack recommended)

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `GET /api/auth/verify` - Verify token

### Students
- `GET /api/student` - List students
- `GET /api/student/:id` - Get student
- `POST /api/student` - Create student
- `PUT /api/student/:id` - Update student
- `DELETE /api/student/:id` - Deactivate student

### Fees
- `GET /api/fees` - List fees
- `POST /api/fees` - Create fee
- `POST /api/fees/:id/pay` - Pay fee

### Attendance
- `POST /api/attendance` - Mark attendance
- `POST /api/attendance/bulk` - Bulk mark
- `GET /api/attendance` - Get attendance
- `GET /api/attendance/stats` - Statistics

### Exams
- `GET /api/exam` - List exams
- `POST /api/exam` - Create exam
- `POST /api/exam/:id/results` - Add result
- `GET /api/exam/:id/results` - Get results

## Future Enhancements

1. **Additional Services**:
   - Library management service
   - Transport management service
   - Notification service
   - Reporting service

2. **Features**:
   - Real-time notifications (WebSocket)
   - Mobile app APIs
   - SMS/Email integration
   - Advanced analytics and reporting
   - Multi-language support

3. **Infrastructure**:
   - Message queue (RabbitMQ) for async processing
   - Elasticsearch for advanced search
   - CDN for static assets
   - API rate limiting


