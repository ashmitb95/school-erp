import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import dotenv from 'dotenv';
import * as path from 'path';

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const AUTH_SERVICE_URL = `http://127.0.0.1:${process.env.AUTH_SERVICE_PORT || 3001}`;

export interface AuthRequest extends FastifyRequest {
  user?: {
    id: string;
    school_id: string;
    role: string;
    email: string;
  };
}

export const verifyToken = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const authHeader = request.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return reply.status(401).send({ error: 'No token provided' });
    }

    // Verify token with auth service
    try {
      const response = await axios.get(`${AUTH_SERVICE_URL}/verify`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000,
      });

      (request as AuthRequest).user = response.data.user;
      // Continue to next handler
    } catch (error: any) {
      if (error.response?.status === 401) {
        return reply.status(401).send({ error: 'Invalid token' });
      }
      throw error;
    }
  } catch (error: any) {
    console.error('Auth middleware error:', error);
    return reply.status(500).send({ error: 'Authentication failed' });
  }
};
