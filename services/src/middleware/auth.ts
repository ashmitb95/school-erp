import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import models from '../../../shared/database/models';

const { Staff } = models;
const JWT_SECRET = (process.env.JWT_SECRET || 'your-secret-key') as string;

export interface AuthRequest extends Request {
  user?: {
    id: string;
    school_id: string;
    role: string;
    email: string;
  };
}

export const verifyToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    // Verify user still exists and is active
    const staff = await Staff.findOne({
      where: { id: decoded.id, is_active: true },
    });

    if (!staff) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    // Attach user to request
    (req as AuthRequest).user = {
      id: decoded.id,
      school_id: decoded.school_id,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
};

