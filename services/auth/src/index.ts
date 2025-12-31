import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import * as path from 'path';
import { z } from 'zod';
import { sequelize } from '../../../shared/database/config';
import models from '../../../shared/database/models';

const { Staff, School } = models;

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const app = express();
const PORT = process.env.AUTH_SERVICE_PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

app.use(express.json());

// Login schema
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

// Login endpoint
app.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    // Find staff by email (without include first to avoid association issues)
    const staff = await Staff.findOne({
      where: { email, is_active: true },
    });

    if (!staff) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Get password from staff record
    const staffPassword = staff.get('password') as string;
    if (!staffPassword) {
      console.error('Staff found but no password set');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Compare password with bcrypt
    const isValidPassword = await bcrypt.compare(password, staffPassword);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: staff.get('id'),
        school_id: staff.get('school_id'),
        email: staff.get('email'),
        role: staff.get('designation'),
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      token,
      user: {
        id: staff.get('id'),
        school_id: staff.get('school_id'),
        email: staff.get('email'),
        name: `${staff.get('first_name')} ${staff.get('last_name')}`,
        role: staff.get('designation'),
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Login error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Verify token endpoint
app.get('/verify', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;

    // Verify user still exists and is active
    const staff = await Staff.findOne({
      where: { id: decoded.id, is_active: true },
    });

    if (!staff) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    res.json({
      user: {
        id: decoded.id,
        school_id: decoded.school_id,
        email: decoded.email,
        role: decoded.role,
      },
    });
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    console.error('Verify error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'auth' });
});

// Initialize database connection
sequelize
  .authenticate()
  .then(() => {
    console.log('Database connection established for auth service');
    app.listen(PORT, () => {
      console.log(`Auth service running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Database connection failed:', error);
    process.exit(1);
  });

