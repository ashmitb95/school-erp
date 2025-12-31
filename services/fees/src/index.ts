import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import * as path from 'path';
import { z } from 'zod';
import crypto from 'crypto';
import axios from 'axios';
import { Op } from 'sequelize';
import { sequelize } from '../../../shared/database/config';
import models from '../../../shared/database/models';
import { paginationSchema } from '../../../shared/utils/validation';
import erpnextClient from '../../../shared/erpnext/client';

const { Fee, Student } = models;

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const app = express();
const PORT = process.env.FEES_SERVICE_PORT || 3003;

app.use(express.json());

// Create fee schema
const createFeeSchema = z.object({
  school_id: z.string().uuid(),
  student_id: z.string().uuid(),
  fee_type: z.string(),
  amount: z.number().positive(),
  due_date: z.string().date(),
  academic_year: z.string(),
});

// Get all fees with filters
app.get('/', async (req: Request, res: Response) => {
  try {
    const { page, limit } = paginationSchema.parse(req.query);
    const { school_id, student_id, status, academic_year } = req.query;

    if (!school_id) {
      return res.status(400).json({ error: 'school_id is required' });
    }

    const where: any = {
      school_id: school_id, // REQUIRED - always filter by school_id
    };
    if (student_id) where.student_id = student_id;
    if (status) where.status = status;
    if (academic_year) where.academic_year = academic_year;

    const offset = (page - 1) * limit;

    const { count, rows } = await Fee.findAndCountAll({
      where,
      include: [{ model: Student, as: 'student' }],
      limit,
      offset,
      order: [['due_date', 'DESC']],
    });

    res.json({
      data: rows,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error: any) {
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    const errorStack = error?.stack;
    console.error('Get fees error:', errorMessage);
    if (errorStack) console.error('Stack:', errorStack);
    res.status(500).json({ 
      error: 'Internal server error',
      message: errorMessage
    });
  }
});

// Create fee
app.post('/', async (req: Request, res: Response) => {
  try {
    const data = createFeeSchema.parse(req.body);

    const fee = await Fee.create(data);

    res.status(201).json(fee);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    const errorStack = error?.stack;
    console.error('Create fee error:', errorMessage);
    if (errorStack) console.error('Stack:', errorStack);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Pay fee
app.post('/:id/pay', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { school_id, payment_method, transaction_id, paid_amount } = z
      .object({
        school_id: z.string().uuid(),
        payment_method: z.string(),
        transaction_id: z.string().optional(),
        paid_amount: z.number().positive(),
      })
      .parse(req.body);

    const fee = await Fee.findOne({
      where: {
        id: id,
        school_id: school_id, // REQUIRED - ensure fee belongs to school
      },
      include: [{ model: Student, as: 'student' }],
    });

    if (!fee) {
      return res.status(404).json({ error: 'Fee not found' });
    }

    const currentAmount = parseFloat(fee.get('amount') as string);
    const newStatus = paid_amount >= currentAmount ? 'paid' : 'partial';

    await fee.update({
      status: newStatus,
      paid_date: new Date().toISOString().split('T')[0],
      payment_method,
      transaction_id,
    });

    // Optional: Integrate with ERPNext for accounting
    // Only syncs if ERPNext is configured
    if (process.env.ERPNEXT_URL && process.env.ERPNEXT_API_KEY) {
      try {
        const student = fee.get('student') as any;
        await erpnextClient.createPaymentEntry({
          posting_date: new Date().toISOString().split('T')[0],
          payment_type: 'Receive',
          party_type: 'Customer',
          party: student.get('admission_number'),
          paid_amount: paid_amount,
          received_amount: paid_amount,
          reference_no: transaction_id,
          reference_date: new Date().toISOString().split('T')[0],
        });
      } catch (erpnextError) {
        const erpnextErrorMessage = (erpnextError as any)?.message || (erpnextError as any)?.toString() || 'Unknown error';
        console.error('ERPNext integration error (optional):', erpnextErrorMessage);
        // Continue - ERPNext is optional
      }
    }

    res.json(fee);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    const errorStack = error?.stack;
    console.error('Pay fee error:', errorMessage);
    if (errorStack) console.error('Stack:', errorStack);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get fee status distribution summary
app.get('/summary/status-distribution', async (req: Request, res: Response) => {
  try {
    const { school_id } = req.query;

    if (!school_id) {
      return res.status(400).json({ error: 'school_id is required' });
    }

    const fees = await Fee.findAll({
      where: {
        school_id: school_id, // REQUIRED - always filter by school_id
      },
      attributes: ['status'],
    });

    const distribution: Record<string, number> = {};

    fees.forEach((fee: any) => {
      const status = fee.get('status');
      // Normalize status - handle null, undefined, or invalid values
      let normalizedStatus = 'pending';
      if (status === 'paid' || status === 'pending' || status === 'partial') {
        normalizedStatus = status;
      } else if (!status || status === 'unknown' || status === null) {
        normalizedStatus = 'pending'; // Default to pending for null/unknown
      } else {
        normalizedStatus = status.toLowerCase();
      }
      
      distribution[normalizedStatus] = (distribution[normalizedStatus] || 0) + 1;
    });

    const result = Object.entries(distribution)
      .map(([status, count]) => ({ status, count }))
      .filter((item) => item.count > 0)
      .sort((a, b) => {
        // Sort: paid first, then pending, then partial, then others
        const order: Record<string, number> = { paid: 1, pending: 2, partial: 3 };
        const aOrder = order[a.status] || 4;
        const bOrder = order[b.status] || 4;
        return aOrder - bOrder;
      });

    res.json(result);
  } catch (error: any) {
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    const errorStack = error?.stack;
    console.error('Get fee status distribution error:', errorMessage);
    if (errorStack) console.error('Stack:', errorStack);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check (must be before /:id route)
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'fees' });
});

// Create Razorpay order (must be before /:id route)
app.post('/:id/payment/razorpay/create-order', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { school_id, amount } = z.object({ 
      school_id: z.string().uuid(),
      amount: z.number().positive() 
    }).parse(req.body);

    const fee = await Fee.findOne({
      where: {
        id: id,
        school_id: school_id, // REQUIRED - ensure fee belongs to school
      },
      include: [{ model: Student, as: 'student' }],
    });

    if (!fee) {
      return res.status(404).json({ error: 'Fee not found' });
    }

    if (fee.get('status') === 'paid') {
      return res.status(400).json({ error: 'Fee already paid' });
    }

    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!razorpayKeyId || !razorpayKeySecret) {
      return res.status(500).json({ error: 'Razorpay not configured' });
    }

    // Create order via Razorpay API
    const orderData = {
      amount: Math.round(amount * 100), // Convert to paise
      currency: 'INR',
      receipt: `FEE_${id}_${Date.now()}`,
      notes: {
        fee_id: id,
        student_id: fee.get('student_id'),
        fee_type: fee.get('fee_type'),
      },
    };

    const auth = Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString('base64');
    const razorpayResponse = await axios.post('https://api.razorpay.com/v1/orders', orderData, {
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
    });

    res.json({
      order_id: razorpayResponse.data.id,
      amount: razorpayResponse.data.amount,
      currency: razorpayResponse.data.currency,
      key_id: razorpayKeyId,
    });
  } catch (error: any) {
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    const errorStack = error?.stack;
    console.error('Create Razorpay order error:', errorMessage);
    if (errorStack) console.error('Stack:', errorStack);
    res.status(500).json({
      error: 'Internal server error',
      message: errorMessage,
    });
  }
});

// Create Stripe payment intent (must be before /:id route)
app.post('/:id/payment/stripe/create-intent', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { school_id, amount } = z.object({ 
      school_id: z.string().uuid(),
      amount: z.number().positive() 
    }).parse(req.body);

    const fee = await Fee.findOne({
      where: {
        id: id,
        school_id: school_id, // REQUIRED - ensure fee belongs to school
      },
      include: [{ model: Student, as: 'student' }],
    });

    if (!fee) {
      return res.status(404).json({ error: 'Fee not found' });
    }

    if (fee.get('status') === 'paid') {
      return res.status(400).json({ error: 'Fee already paid' });
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const stripePublishableKey = process.env.STRIPE_PUBLISHABLE_KEY;

    if (!stripeSecretKey || !stripePublishableKey) {
      return res.status(500).json({ error: 'Stripe not configured' });
    }

    // Create payment intent via Stripe API
    const stripeResponse = await axios.post(
      'https://api.stripe.com/v1/payment_intents',
      {
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'inr',
        metadata: {
          fee_id: id,
          student_id: fee.get('student_id') as string,
          fee_type: fee.get('fee_type') as string,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${stripeSecretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    res.json({
      payment_intent_id: stripeResponse.data.id,
      client_secret: stripeResponse.data.client_secret,
      publishable_key: stripePublishableKey,
    });
  } catch (error: any) {
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    const errorStack = error?.stack;
    console.error('Create Stripe intent error:', errorMessage);
    if (errorStack) console.error('Stack:', errorStack);
    res.status(500).json({
      error: 'Internal server error',
      message: errorMessage,
    });
  }
});

// Verify payment (must be before /:id route)
app.post('/:id/payment/verify', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { school_id, gateway, payment_id, order_id, signature } = z
      .object({
        school_id: z.string().uuid(),
        gateway: z.enum(['razorpay', 'stripe']),
        payment_id: z.string(),
        order_id: z.string(),
        signature: z.string().optional(),
      })
      .parse(req.body);

    const fee = await Fee.findOne({
      where: {
        id: id,
        school_id: school_id, // REQUIRED - ensure fee belongs to school
      },
      include: [{ model: Student, as: 'student' }],
    });

    if (!fee) {
      return res.status(404).json({ error: 'Fee not found' });
    }

    let isVerified = false;
    let transactionId = payment_id;

    if (gateway === 'razorpay') {
      // Verify Razorpay payment
      const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
      if (!razorpayKeySecret || !signature) {
        return res.status(400).json({ error: 'Invalid verification data' });
      }

      const text = `${order_id}|${payment_id}`;
      const generatedSignature = crypto.createHmac('sha256', razorpayKeySecret).update(text).digest('hex');

      isVerified = generatedSignature === signature;

      if (isVerified) {
        // Fetch payment details from Razorpay
        const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${razorpayKeySecret}`).toString('base64');
        const paymentResponse = await axios.get(`https://api.razorpay.com/v1/payments/${payment_id}`, {
          headers: {
            Authorization: `Basic ${auth}`,
          },
        });

        if (paymentResponse.data.status === 'captured' || paymentResponse.data.status === 'authorized') {
          const paidAmount = paymentResponse.data.amount / 100; // Convert from paise
          const currentAmount = parseFloat(fee.get('amount') as string);
          const newStatus = paidAmount >= currentAmount ? 'paid' : 'partial';

          await fee.update({
            status: newStatus,
            paid_date: new Date().toISOString().split('T')[0],
            payment_method: 'razorpay',
            transaction_id: payment_id,
          });

          res.json({ success: true, fee });
        } else {
          return res.status(400).json({ error: 'Payment not captured' });
        }
      } else {
        return res.status(400).json({ error: 'Payment verification failed' });
      }
    } else if (gateway === 'stripe') {
      // Verify Stripe payment
      const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeSecretKey) {
        return res.status(500).json({ error: 'Stripe not configured' });
      }

      const paymentIntentResponse = await axios.get(
        `https://api.stripe.com/v1/payment_intents/${payment_id}`,
        {
          headers: {
            Authorization: `Bearer ${stripeSecretKey}`,
          },
        }
      );

      if (paymentIntentResponse.data.status === 'succeeded') {
        const paidAmount = paymentIntentResponse.data.amount / 100; // Convert from cents
        const currentAmount = parseFloat(fee.get('amount') as string);
        const newStatus = paidAmount >= currentAmount ? 'paid' : 'partial';

        await fee.update({
          status: newStatus,
          paid_date: new Date().toISOString().split('T')[0],
          payment_method: 'stripe',
          transaction_id: payment_id,
        });

        res.json({ success: true, fee });
      } else {
        return res.status(400).json({ error: `Payment status: ${paymentIntentResponse.data.status}` });
      }
    }
  } catch (error: any) {
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    const errorStack = error?.stack;
    console.error('Verify payment error:', errorMessage);
    if (errorStack) console.error('Stack:', errorStack);
    res.status(500).json({
      error: 'Internal server error',
      message: errorMessage,
    });
  }
});

// Get fee by ID (public endpoint for payment links)
app.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { token } = req.query;

    const fee = await Fee.findByPk(id, {
      include: [{ model: Student, as: 'student' }],
    });

    if (!fee) {
      return res.status(404).json({ error: 'Fee not found' });
    }

    // Optional: Validate token if provided (for security)
    // Token format: base64(fee_id:timestamp)
    if (token) {
      try {
        const decoded = Buffer.from(token as string, 'base64').toString('utf-8');
        const [feeId, timestamp] = decoded.split(':');
        
        // Verify fee ID matches
        if (feeId !== id) {
          return res.status(403).json({ error: 'Invalid payment link' });
        }

        // Optional: Check if token is expired (e.g., 30 days)
        const tokenAge = Date.now() - parseInt(timestamp);
        const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
        if (tokenAge > maxAge) {
          return res.status(403).json({ error: 'Payment link has expired' });
        }
      } catch (e) {
        // Invalid token format, but we'll still return fee data
        // In production, you might want to be stricter
      }
    }

    res.json(fee);
  } catch (error: any) {
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    const errorStack = error?.stack;
    console.error('Get fee error:', errorMessage);
    if (errorStack) console.error('Stack:', errorStack);
    res.status(500).json({ 
      error: 'Internal server error',
      message: errorMessage
    });
  }
});

// Generate payment link
app.post('/:id/payment-link', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const fee = await Fee.findByPk(id, {
      include: [{ model: Student, as: 'student' }],
    });

    if (!fee) {
      return res.status(404).json({ error: 'Fee not found' });
    }

    // Generate a unique payment link
    const paymentLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/pay/${id}?token=${Buffer.from(`${id}:${Date.now()}`).toString('base64')}`;

    // In a real implementation, you'd store this link in the database
    // For now, we'll just return it

    res.json({
      payment_link: paymentLink,
      fee_id: id,
      amount: fee.get('amount'),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    });
  } catch (error: any) {
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    const errorStack = error?.stack;
    console.error('Generate payment link error:', errorMessage);
    if (errorStack) console.error('Stack:', errorStack);
    res.status(500).json({ 
      error: 'Internal server error',
      message: errorMessage
    });
  }
});

// Postpone payment (update due date)
app.patch('/:id/postpone', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { school_id, new_due_date, reason } = z.object({
      school_id: z.string().uuid(),
      new_due_date: z.string().date(),
      reason: z.string().optional(),
    }).parse(req.body);

    const fee = await Fee.findOne({
      where: {
        id: id,
        school_id: school_id, // REQUIRED - ensure fee belongs to school
      },
    });
    if (!fee) {
      return res.status(404).json({ error: 'Fee not found' });
    }

    await fee.update({
      due_date: new_due_date,
      remarks: reason ? `${fee.get('remarks') || ''}\n[Postponed: ${reason}]`.trim() : fee.get('remarks'),
    });

    res.json(fee);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    const errorStack = error?.stack;
    console.error('Postpone payment error:', errorMessage);
    if (errorStack) console.error('Stack:', errorStack);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send reminder
app.post('/:id/reminder', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { school_id, method } = z.object({
      school_id: z.string().uuid(),
      method: z.enum(['email', 'sms', 'both']).default('email'),
    }).parse(req.body);

    const fee = await Fee.findOne({
      where: {
        id: id,
        school_id: school_id, // REQUIRED - ensure fee belongs to school
      },
      include: [{ model: Student, as: 'student' }],
    });

    if (!fee) {
      return res.status(404).json({ error: 'Fee not found' });
    }

    const student = fee.get('student') as any;
    const amount = fee.get('amount');
    const dueDate = fee.get('due_date');

    // In a real implementation, you'd send actual email/SMS here
    // For now, we'll just log and return success

    console.log(`Sending ${method} reminder for fee ${id} to student ${student?.first_name} ${student?.last_name}`);

    res.json({
      success: true,
      message: `Reminder sent via ${method}`,
      fee_id: id,
      student_name: `${student?.first_name} ${student?.last_name}`,
      amount,
      due_date: dueDate,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    const errorStack = error?.stack;
    console.error('Send reminder error:', errorMessage);
    if (errorStack) console.error('Stack:', errorStack);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Initialize database connection
sequelize
  .authenticate()
  .then(() => {
    console.log('Database connection established for fees service');
    app.listen(PORT, () => {
      console.log(`Fees service running on port ${PORT}`);
    });
  })
  .catch((error) => {
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    const errorStack = error?.stack;
    console.error('Database connection failed:', errorMessage);
    if (errorStack) console.error('Stack:', errorStack);
    process.exit(1);
  });

