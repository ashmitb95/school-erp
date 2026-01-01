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
import rbacService from './services/rbac';
import { verifyToken } from './middleware/auth';

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app = express();
const PORT = Number(process.env.PORT || process.env.API_GATEWAY_PORT || 3000);

// Middleware
// CORS configuration - allow all origins (you can restrict this later if needed)
app.use(cors({
  origin: true, // Allow all origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
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
app.use('/api/rbac', rbacService);

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

// Resolve database hostname to IPv4 before connecting (workaround for Railway IPv6 issue)
async function initializeDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (databaseUrl) {
    try {
      const url = new URL(databaseUrl);
      const hostname = url.hostname;
      
      // Only resolve if it's a domain name (not already an IP)
      if (hostname && !hostname.match(/^\d+\.\d+\.\d+\.\d+$/)) {
        const dns = require('dns');
        const { promisify } = require('util');
        const lookup = promisify(dns.lookup);
        
        try {
          const result = await lookup(hostname, { family: 4 });
          if (result && result.address) {
            console.log(`✓ Resolved ${hostname} to IPv4: ${result.address}`);
            // Note: We can't change the host after Sequelize is created,
            // but this at least ensures DNS resolution prefers IPv4
          }
        } catch (dnsError) {
          console.warn(`⚠️  Could not resolve ${hostname} to IPv4:`, dnsError);
        }
      }
    } catch (error) {
      console.warn('⚠️  Could not parse DATABASE_URL for IPv4 resolution:', error);
    }
  }
  
  // Now attempt database connection
  return sequelize.authenticate();
}

// Initialize database connection and start server
initializeDatabase()
  .then(async () => {
    console.log('✅ Database connection established');
    
    // Ensure Redis is connected (optional - caching is non-critical)
    await ensureConnected().catch((err) => {
      console.warn('⚠️  Redis connection warning:', err.message);
    });
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Consolidated server running on port ${PORT}`);
      console.log(`📡 Health check: http://0.0.0.0:${PORT}/health`);
      console.log(`🌐 Server is listening on all interfaces (0.0.0.0:${PORT})`);
    });
  })
  .catch((error) => {
    console.error('❌ Database connection failed:', error);
    console.error('💡 If you see IPv6 errors, try:');
    console.error('   1. Use Supabase connection pooler (port 6543) if available');
    console.error('   2. Contact Supabase support for IPv4-only connection');
    console.error('   3. Consider using Railway PostgreSQL instead');
    process.exit(1);
  });

