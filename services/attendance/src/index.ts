import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import * as path from 'path';
import { z } from 'zod';
import { sequelize } from '../../../shared/database/config';
import { Op, fn, col } from 'sequelize';
import models from '../../../shared/database/models';
import { paginationSchema, dateRangeSchema } from '../../../shared/utils/validation';

const { Attendance, Student, Class } = models;

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const app = express();
const PORT = process.env.ATTENDANCE_SERVICE_PORT || 3004;

app.use(express.json());

// Mark attendance schema
const markAttendanceSchema = z.object({
  school_id: z.string().uuid(),
  student_id: z.string().uuid(),
  class_id: z.string().uuid(),
  date: z.string().date(),
  status: z.enum(['present', 'absent', 'late', 'excused']),
  marked_by: z.string().uuid(),
  remarks: z.string().optional(),
});

// Mark attendance
app.post('/', async (req: Request, res: Response) => {
  try {
    const data = markAttendanceSchema.parse(req.body);

    // Check if attendance already marked for this date
    const existing = await Attendance.findOne({
      where: {
        student_id: data.student_id,
        date: data.date,
      },
    });

    if (existing) {
      await existing.update(data);
      return res.json(existing);
    }

    const attendance = await Attendance.create(data);
    res.status(201).json(attendance);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Mark attendance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bulk mark attendance
app.post('/bulk', async (req: Request, res: Response) => {
  try {
    const { class_id, date, attendances, marked_by } = z
      .object({
        class_id: z.string().uuid(),
        date: z.string().date(),
        marked_by: z.string().uuid(),
        attendances: z.array(
          z.object({
            student_id: z.string().uuid(),
            status: z.enum(['present', 'absent', 'late', 'excused']),
            remarks: z.string().optional(),
          })
        ),
      })
      .parse(req.body);

    const results = [];

    for (const att of attendances) {
      const existing = await Attendance.findOne({
        where: { student_id: att.student_id, date },
      });

      if (existing) {
        await existing.update({
          ...att,
          class_id,
          marked_by,
          date,
        });
        results.push(existing);
      } else {
        const attendance = await Attendance.create({
          school_id: (await Class.findByPk(class_id))?.get('school_id') as string,
          student_id: att.student_id,
          class_id,
          date,
          status: att.status,
          marked_by,
          remarks: att.remarks,
        });
        results.push(attendance);
      }
    }

    res.json({ data: results, count: results.length });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Bulk mark attendance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get attendance with filters
app.get('/', async (req: Request, res: Response) => {
  try {
    const { page, limit } = paginationSchema.parse(req.query);
    const { school_id, student_id, class_id, date, start_date, end_date } = req.query;

    const where: any = {};
    if (school_id) where.school_id = school_id;
    if (student_id) where.student_id = student_id;
    if (class_id) where.class_id = class_id;
    if (date) where.date = date;
    if (start_date && end_date) {
      where.date = {
        [Op.between]: [start_date, end_date],
      };
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await Attendance.findAndCountAll({
      where,
      include: [
        { model: Student, as: 'student' },
        { model: Class, as: 'class' },
      ],
      limit,
      offset,
      order: [['date', 'DESC']],
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
    console.error('Get attendance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get attendance statistics
app.get('/stats', async (req: Request, res: Response) => {
  try {
    const { student_id, class_id, start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({ error: 'start_date and end_date are required' });
    }

    const where: any = {
      date: {
        [Op.between]: [start_date, end_date],
      },
    };

    if (student_id) where.student_id = student_id;
    if (class_id) where.class_id = class_id;

    const stats = await Attendance.findAll({
      where,
      attributes: [
        'status',
        [fn('COUNT', col('id')), 'count'],
      ],
      group: ['status'],
    });

    res.json({ stats });
  } catch (error: any) {
    console.error('Get attendance stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'attendance' });
});

// Initialize database connection
sequelize
  .authenticate()
  .then(() => {
    console.log('Database connection established for attendance service');
    app.listen(PORT, () => {
      console.log(`Attendance service running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Database connection failed:', error);
    process.exit(1);
  });

