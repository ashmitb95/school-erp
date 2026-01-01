import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import * as path from 'path';
import { sequelize } from '../../shared/database/config';
import { ensureConnected } from '../../shared/utils/redis';

// Import service modules
import authService from './services/auth';
import studentService from './services/student';
import feesService from './services/fees';
import attendanceService from './services/attendance';
import examService from './services/exam';
import aiService from './services/ai';
import managementService from './services/management';
import { verifyToken } from './middleware/auth';

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app = express();
const PORT = process.env.PORT || process.env.API_GATEWAY_PORT || 3000;

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'consolidated-server' });
});

// Public routes (no authentication)
app.use('/api/auth', authService);

// Protected routes middleware
const requireAuth = async (req: Request, res: Response, next: any) => {
  // Skip auth for non-API routes
  if (!req.url.startsWith('/api/')) {
    return next();
  }
  // Skip auth for /api/auth routes
  if (req.url.startsWith('/api/auth')) {
    return next();
  }
  // Skip auth for payment endpoints (public access for parents)
  if (req.url.includes('/payment/') || 
      (req.url.startsWith('/api/fees/') && req.method === 'GET' && req.url.includes('?token='))) {
    return next();
  }
  // Verify token for all other API routes
  return verifyToken(req, res, next);
};

// Register all service routes with authentication
app.use(requireAuth);
app.use('/api/student', studentService);
app.use('/api/fees', feesService);
app.use('/api/attendance', attendanceService);
app.use('/api/exam', examService);
app.use('/api/ai', aiService);
app.use('/api/management', managementService);

// Error handler
app.use((error: any, req: Request, res: Response, next: any) => {
  console.error('Error:', error);
  res.status(error.statusCode || 500).json({
    error: 'Internal Server Error',
    message: error.message || 'An unexpected error occurred',
    code: error.code || 'INTERNAL_ERROR',
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.url} not found`,
  });
});

// Initialize database connection and start server
sequelize
  .authenticate()
  .then(async () => {
    console.log('✅ Database connection established');
    
    // Ensure Redis is connected (optional - caching is non-critical)
    await ensureConnected().catch((err) => {
      console.warn('⚠️  Redis connection warning:', err.message);
    });
    
    app.listen(PORT, () => {
      console.log(`🚀 Consolidated server running on port ${PORT}`);
      console.log(`📡 Health check: http://localhost:${PORT}/health`);
    });
  })
  .catch((error) => {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  });

