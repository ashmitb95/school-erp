import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import httpProxy from '@fastify/http-proxy';
import dotenv from 'dotenv';
import * as path from 'path';
import { verifyToken, AuthRequest } from './middleware/auth';

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const app = Fastify({
  logger: process.env.NODE_ENV === 'development' ? {
    level: 'info',
    transport: process.env.NO_PRETTY_LOGS ? undefined : {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  } : true,
});

const PORT = parseInt(process.env.API_GATEWAY_PORT || '3000', 10);

// Register CORS
app.register(cors, {
  origin: true,
  credentials: true,
});

// Service URLs - use 127.0.0.1 instead of localhost to avoid IPv6 issues
const services = {
  auth: `http://127.0.0.1:${process.env.AUTH_SERVICE_PORT || 3001}`,
  student: `http://127.0.0.1:${process.env.STUDENT_SERVICE_PORT || 3002}`,
  fees: `http://127.0.0.1:${process.env.FEES_SERVICE_PORT || 3003}`,
  attendance: `http://127.0.0.1:${process.env.ATTENDANCE_SERVICE_PORT || 3004}`,
  exam: `http://127.0.0.1:${process.env.EXAM_SERVICE_PORT || 3005}`,
  ai: `http://127.0.0.1:${process.env.AI_SERVICE_PORT || 3006}`,
  management: `http://127.0.0.1:${process.env.MANAGEMENT_SERVICE_PORT || 3007}`,
};

// Health check
app.get('/health', async (request: FastifyRequest, reply: FastifyReply) => {
  return { status: 'ok', service: 'api-gateway' };
});

// Auth routes (no authentication required)
app.register(httpProxy, {
  upstream: services.auth,
  prefix: '/api/auth',
  rewritePrefix: '/',
  http2: false,
  timeout: 30000,
});

// Protected routes (require authentication)
app.register(async (fastify) => {
  // Add authentication hook for all routes in this scope
  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    // Skip auth for non-API routes
    if (!request.url.startsWith('/api/')) {
      return;
    }
    // Skip auth for /api/auth routes (handled above)
    if (request.url.startsWith('/api/auth')) {
      return;
    }
    // Skip auth for payment endpoints (public access for parents)
    if (request.url.includes('/payment/') || (request.url.startsWith('/api/fees/') && request.method === 'GET' && request.url.includes('?token='))) {
      return;
    }
    // Verify token for all other API routes
    await verifyToken(request, reply);
  });

  // Register proxies for protected routes
  fastify.register(httpProxy, {
    upstream: services.student,
    prefix: '/api/student',
    rewritePrefix: '/',
    http2: false,
    timeout: 30000,
  });

  fastify.register(httpProxy, {
    upstream: services.fees,
    prefix: '/api/fees',
    rewritePrefix: '/',
    http2: false,
    timeout: 30000,
  });

  fastify.register(httpProxy, {
    upstream: services.attendance,
    prefix: '/api/attendance',
    rewritePrefix: '/',
    http2: false,
    timeout: 30000,
  });

  fastify.register(httpProxy, {
    upstream: services.exam,
    prefix: '/api/exam',
    rewritePrefix: '/',
    http2: false,
    timeout: 30000,
  });

  fastify.register(httpProxy, {
    upstream: services.ai,
    prefix: '/api/ai',
    rewritePrefix: '/',
    http2: false,
    timeout: 60000, // Longer timeout for AI queries
  });

  fastify.register(httpProxy, {
    upstream: services.management,
    prefix: '/api/management',
    rewritePrefix: '/',
    http2: false,
    timeout: 30000,
  });
});

// Error handler
app.setErrorHandler((error: any, request: FastifyRequest, reply: FastifyReply) => {
  app.log.error(error);
  
  // Handle proxy/connection errors more gracefully
  const isConnectionError = 
    error.message?.includes('ECONNREFUSED') || 
    error.message?.includes('Socket') || 
    error.message?.includes('other side closed') ||
    error.code === 'ECONNREFUSED' ||
    error.code === 'UND_ERR_SOCKET' ||
    error.name === 'SocketError';
  
  if (isConnectionError) {
    // Extract service name from URL
    const urlParts = request.url.split('/');
    const serviceName = urlParts[2] || 'service';
    const servicePorts: Record<string, string> = {
      'student': '3002',
      'fees': '3003',
      'attendance': '3004',
      'exam': '3005',
      'ai': '3006',
      'auth': '3001',
    };
    const port = servicePorts[serviceName] || 'unknown';
    
    return reply.status(503).send({
      error: 'Service Unavailable',
      message: `The ${serviceName} service is not available on port ${port}. Please ensure the service is running.`,
      code: 'SERVICE_UNAVAILABLE',
      service: serviceName,
      port: port,
    });
  }
  
  reply.status(error.statusCode || 500).send({
    error: 'Internal Server Error',
    message: error.message || 'An unexpected error occurred',
    code: error.code || 'INTERNAL_ERROR',
  });
});

// Start server
const start = async () => {
  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`API Gateway running on port ${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
