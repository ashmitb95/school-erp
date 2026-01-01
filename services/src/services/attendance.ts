import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { sequelize } from '../../../shared/database/config';
import { Op, fn, col } from 'sequelize';
import models from '../../../shared/database/models';
import { paginationSchema, dateRangeSchema } from '../../../shared/utils/validation';

const { Attendance, Student, Class } = models;

// Load .env from project root

const router = Router();



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
router.post('/', async (req: Request, res: Response) => {
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
      const updateData: any = { ...data };
      if (updateData.date && typeof updateData.date === 'string') {
        updateData.date = new Date(updateData.date);
      }
      await existing.update(updateData);
      return res.json(existing);
    }

    const createData: any = { ...data };
    if (createData.date && typeof createData.date === 'string') {
      createData.date = new Date(createData.date);
    }
    const attendance = await Attendance.create(createData);
    res.status(201).json(attendance);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Mark attendance error:', error?.message || String(error));
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bulk mark attendance
router.post('/bulk', async (req: Request, res: Response) => {
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
          date: new Date(date),
        });
        results.push(existing);
      } else {
        const attendance = await Attendance.create({
          school_id: (await Class.findByPk(class_id))?.get('school_id') as string,
          student_id: att.student_id,
          class_id,
          date: new Date(date),
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
    console.error('Bulk mark attendance error:', error?.message || String(error));
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get attendance with filters
router.get('/', async (req: Request, res: Response) => {
  try {
    const { page, limit } = paginationSchema.parse(req.query);
    const { school_id, student_id, class_id, date, start_date, end_date, status, leave_type } = req.query;

    if (!school_id) {
      return res.status(400).json({ error: 'school_id is required' });
    }

    const where: any = {
      school_id: school_id, // REQUIRED - always filter by school_id
    };
    if (student_id) where.student_id = student_id;
    if (class_id) where.class_id = class_id;
    if (status) where.status = status;
    if (leave_type) where.leave_type = leave_type;
    
    // Handle date filtering
    if (date) {
      // Convert to date range for the entire day to handle timezone issues
      where.date = date;
    } else if (start_date && end_date) {
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
    console.error('Get attendance error:', error?.message || error);
    res.status(500).json({ error: 'Internal server error', message: error?.message });
  }
});

// Get attendance statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const { school_id, student_id, class_id, start_date, end_date } = req.query;

    if (!school_id) {
      return res.status(400).json({ error: 'school_id is required' });
    }

    if (!start_date || !end_date) {
      return res.status(400).json({ error: 'start_date and end_date are required' });
    }

    const where: any = {
      school_id: school_id, // REQUIRED - always filter by school_id
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
    console.error('Get attendance stats error:', error?.message || String(error));
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check
router.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'attendance' });
});


export default router;
