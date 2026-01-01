import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { sequelize } from '../../../shared/database/config';
import models from '../../../shared/database/models';
import { paginationSchema } from '../../../shared/utils/validation';

const { Exam, ExamResult, Student, Subject, School } = models;

// Load .env from project root

const router = Router();



// Create exam schema
const createExamSchema = z.object({
  school_id: z.string().uuid(),
  name: z.string(),
  exam_type: z.string(),
  academic_year: z.string(),
  start_date: z.string().date(),
  end_date: z.string().date(),
  max_marks: z.number().positive(),
  passing_marks: z.number().positive(),
  class_id: z.string().uuid().optional(),
  subject_id: z.string().uuid().optional(),
});

// Create exam result schema
const createExamResultSchema = z.object({
  school_id: z.string().uuid(),
  exam_id: z.string().uuid(),
  student_id: z.string().uuid(),
  subject_id: z.string().uuid(),
  marks_obtained: z.number().min(0),
  max_marks: z.number().positive(),
  grade: z.string().optional(),
  remarks: z.string().optional(),
});

// Get all exams
router.get('/', async (req: Request, res: Response) => {
  try {
    const { page, limit } = paginationSchema.parse(req.query);
    const { school_id, class_id, academic_year, exam_type, status } = req.query;

    if (!school_id) {
      return res.status(400).json({ error: 'school_id is required' });
    }

    const where: any = {
      school_id: school_id, // REQUIRED - always filter by school_id
    };
    if (class_id) where.class_id = class_id;
    if (academic_year) where.academic_year = academic_year;
    if (exam_type) where.exam_type = exam_type;
    
    // Use the proper status column now
    if (status) {
      const validStatuses = ['scheduled', 'in_progress', 'completed', 'cancelled'];
      if (validStatuses.includes(status as string)) {
        where.status = status;
      }
    }

    const offset = (page - 1) * limit;

    let exams = await Exam.findAndCountAll({
      where,
      limit,
      offset,
      order: [['start_date', 'DESC']],
    });

    res.json({
      data: exams.rows,
      pagination: {
        page,
        limit,
        total: exams.count,
        totalPages: Math.ceil(exams.count / limit),
      },
    });
  } catch (error: any) {
    console.error('Get exams error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create exam
router.post('/', async (req: Request, res: Response) => {
  try {
    const data = createExamSchema.parse(req.body);

    // Convert date strings to Date objects
    const examData: any = { ...data };
    if (examData.start_date && typeof examData.start_date === 'string') {
      examData.start_date = new Date(examData.start_date);
    }
    if (examData.end_date && typeof examData.end_date === 'string') {
      examData.end_date = new Date(examData.end_date);
    }

    const exam = await Exam.create(examData);

    res.status(201).json(exam);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Create exam error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get exam by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const exam = await Exam.findByPk(id, {
      include: [
        { model: ExamResult, as: 'results', include: [{ model: Student, as: 'student' }] },
      ],
    });

    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    res.json(exam);
  } catch (error: any) {
    console.error('Get exam error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add exam result
router.post('/:id/results', async (req: Request, res: Response) => {
  try {
    const { id: exam_id } = req.params;
    const data = createExamResultSchema.parse({ ...req.body, exam_id });

    // Check if result already exists
    const existing = await ExamResult.findOne({
      where: {
        exam_id: data.exam_id,
        student_id: data.student_id,
        subject_id: data.subject_id,
      },
    });

    if (existing) {
      await existing.update(data);
      return res.json(existing);
    }

    const result = await ExamResult.create(data);
    res.status(201).json(result);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Add exam result error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get exam results
router.get('/:id/results', async (req: Request, res: Response) => {
  try {
    const { id: exam_id } = req.params;
    const { page, limit } = paginationSchema.parse(req.query);
    const { student_id, subject_id } = req.query;

    const where: any = { exam_id };
    if (student_id) where.student_id = student_id;
    if (subject_id) where.subject_id = subject_id;

    const offset = (page - 1) * limit;

    const { count, rows } = await ExamResult.findAndCountAll({
      where,
      include: [
        { model: Student, as: 'student' },
        { model: Subject, as: 'subject' },
      ],
      limit,
      offset,
      order: [['marks_obtained', 'DESC']],
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
    console.error('Get exam results error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check
router.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'exam' });
});


export default router;
