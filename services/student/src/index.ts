import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import * as path from 'path';
import { z } from 'zod';
import { sequelize } from '../../../shared/database/config';
import { Op } from 'sequelize';
import models from '../../../shared/database/models';
import { paginationSchema } from '../../../shared/utils/validation';
import { ensureConnected, safeRedisGet, safeRedisSetEx, safeRedisDel } from '../../../shared/utils/redis';

const { Student, Class, School } = models;

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const app = express();
const PORT = process.env.STUDENT_SERVICE_PORT || 3002;

app.use(express.json());

// Create student schema
const createStudentSchema = z.object({
  school_id: z.string().uuid(),
  admission_number: z.string(),
  roll_number: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  middle_name: z.string().optional(),
  date_of_birth: z.string().date(),
  gender: z.enum(['male', 'female', 'other']),
  class_id: z.string().uuid(),
  section: z.string().optional(),
  academic_year: z.string(),
  father_name: z.string(),
  mother_name: z.string(),
  father_phone: z.string(),
  address: z.string(),
  city: z.string(),
  state: z.string(),
  pincode: z.string(),
  emergency_contact_name: z.string(),
  emergency_contact_phone: z.string(),
  admission_date: z.string().date(),
});

// Get all students with pagination and filters
app.get('/', async (req: Request, res: Response) => {
  try {
    const { page, limit } = paginationSchema.parse(req.query);
    const { school_id, class_id, academic_year, search } = req.query;

    if (!school_id) {
      return res.status(400).json({ error: 'school_id is required' });
    }

    const where: any = {
      school_id: Array.isArray(school_id) ? school_id[0] : school_id, // REQUIRED - always filter by school_id
    };
    if (class_id) where.class_id = Array.isArray(class_id) ? class_id[0] : class_id;
    if (academic_year) where.academic_year = Array.isArray(academic_year) ? academic_year[0] : academic_year;
    if (search) {
      const searchStr = Array.isArray(search) ? search[0] : search;
      where[Op.or] = [
        { first_name: { [Op.iLike]: `%${searchStr}%` } },
        { last_name: { [Op.iLike]: `%${searchStr}%` } },
        { admission_number: { [Op.iLike]: `%${searchStr}%` } },
      ];
    }

    const offset = (page - 1) * limit;

    // Try cache first
    const cacheKey = `students:${JSON.stringify(where)}:${page}:${limit}`;
    const cached = await safeRedisGet(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

          const { count, rows } = await Student.findAndCountAll({
            where,
            include: [
              { model: Class, as: 'class' },
              { model: School, as: 'school' },
            ],
            attributes: {
              include: ['latitude', 'longitude'], // Include geodata
            },
            limit,
            offset,
            order: [['created_at', 'DESC']],
          });

    const result = {
      data: rows,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    };

    // Cache for 5 minutes
    await safeRedisSetEx(cacheKey, 300, JSON.stringify(result));

    res.json(result);
  } catch (error: any) {
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    const errorStack = error?.stack;
    console.error('Get students error:', errorMessage);
    if (errorStack) console.error('Stack:', errorStack);
    res.status(500).json({ 
      error: 'Internal server error',
      message: errorMessage
    });
  }
});

// Get student by ID
app.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { school_id } = req.query;

    if (!school_id) {
      return res.status(400).json({ error: 'school_id is required' });
    }

    const schoolIdStr = Array.isArray(school_id) ? school_id[0] : String(school_id);
    const idStr = Array.isArray(id) ? id[0] : String(id);

    // Try cache
    const cacheKey = `student:${idStr}:${schoolIdStr}`;
    const cached = await safeRedisGet(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

          const student = await Student.findOne({
            where: {
              id: idStr,
              school_id: schoolIdStr, // REQUIRED - always filter by school_id
            },
            include: [
              { model: Class, as: 'class' },
              { model: School, as: 'school' },
            ],
            attributes: {
              include: ['latitude', 'longitude'], // Include geodata
            },
          });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Cache for 5 minutes
    await safeRedisSetEx(cacheKey, 300, JSON.stringify(student));

    res.json(student);
  } catch (error: any) {
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    const errorStack = error?.stack;
    console.error('Get student error:', errorMessage);
    if (errorStack) console.error('Stack:', errorStack);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create student
app.post('/', async (req: Request, res: Response) => {
  try {
    const data = createStudentSchema.parse(req.body);

    // Ensure required fields are set
    const studentData: any = {
      ...data,
      is_active: (data as any).is_active ?? true,
    };

    const student = await Student.create(studentData);

    // Invalidate cache
    await safeRedisDel(`students:*`);

    res.status(201).json(student);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    const errorStack = error?.stack;
    console.error('Create student error:', errorMessage);
    if (errorStack) console.error('Stack:', errorStack);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update student
app.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = createStudentSchema.partial().parse(req.body);

    if (!data.school_id) {
      return res.status(400).json({ error: 'school_id is required' });
    }

    const idStr = Array.isArray(id) ? id[0] : String(id);

    const student = await Student.findOne({
      where: {
        id: idStr,
        school_id: data.school_id, // REQUIRED - ensure student belongs to school
      },
    });
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Convert date strings to Date objects if present
    const updateData: any = { ...data };
    if (updateData.date_of_birth && typeof updateData.date_of_birth === 'string') {
      updateData.date_of_birth = new Date(updateData.date_of_birth);
    }
    if (updateData.admission_date && typeof updateData.admission_date === 'string') {
      updateData.admission_date = new Date(updateData.admission_date);
    }

    await student.update(updateData);

    // Invalidate cache
    await safeRedisDel(`student:${id}`);
    await safeRedisDel(`students:*`);

    res.json(student);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    const errorStack = error?.stack;
    console.error('Update student error:', errorMessage);
    if (errorStack) console.error('Stack:', errorStack);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete student
app.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { school_id } = req.query;

    if (!school_id) {
      return res.status(400).json({ error: 'school_id is required' });
    }

    const idStr = Array.isArray(id) ? id[0] : String(id);
    const schoolIdStr = Array.isArray(school_id) ? school_id[0] : String(school_id);

    const student = await Student.findOne({
      where: {
        id: idStr,
        school_id: schoolIdStr, // REQUIRED - ensure student belongs to school
      },
    });
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    await student.update({ is_active: false });

    // Invalidate cache
    await safeRedisDel(`student:${id}`);
    await safeRedisDel(`students:*`);

    res.json({ message: 'Student deactivated successfully' });
  } catch (error: any) {
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    const errorStack = error?.stack;
    console.error('Delete student error:', errorMessage);
    if (errorStack) console.error('Stack:', errorStack);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get class distribution summary
app.get('/summary/class-distribution', async (req: Request, res: Response) => {
  try {
    const { school_id } = req.query;

    if (!school_id) {
      return res.status(400).json({ error: 'school_id is required' });
    }

    const cacheKey = `student:class-distribution:${school_id}`;
    const cached = await safeRedisGet(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const students = await Student.findAll({
      include: [
        {
          model: Class,
          as: 'class',
          attributes: ['id', 'name'],
        },
      ],
      attributes: ['id', 'class_id'],
      where: {
        school_id: Array.isArray(school_id) ? school_id[0] : String(school_id), // REQUIRED - always filter by school_id
        is_active: true,
      },
    });

    const distribution: Record<string, number> = {};
    students.forEach((student: any) => {
      const className = student.class?.name || 'Unassigned';
      distribution[className] = (distribution[className] || 0) + 1;
    });

    const result = Object.entries(distribution)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    await safeRedisSetEx(cacheKey, 300, JSON.stringify(result));
    res.json(result);
  } catch (error: any) {
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    const errorStack = error?.stack;
    console.error('Get class distribution error:', errorMessage);
    if (errorStack) console.error('Stack:', errorStack);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'student' });
});

// Initialize database connection
sequelize
  .authenticate()
  .then(async () => {
    console.log('Database connection established for student service');
    // Ensure Redis is connected (will not reconnect if already connected)
    await ensureConnected().catch((err) => {
      console.warn('Redis connection warning:', err.message);
      // Continue even if Redis fails - caching is optional
    });
    app.listen(PORT, () => {
      console.log(`Student service running on port ${PORT}`);
    });
  })
  .catch((error) => {
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    const errorStack = error?.stack;
    console.error('Database connection failed:', errorMessage);
    if (errorStack) console.error('Stack:', errorStack);
    process.exit(1);
  });

