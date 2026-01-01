import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Op } from 'sequelize';
import { sequelize } from '../../../shared/database/config';
import models from '../../../shared/database/models';
import { paginationSchema } from '../../../shared/utils/validation';

const { Staff, Class, Subject, Timetable, TransportRoute, Student, School, CalendarEvent } = models;

// Load .env from project root

const router = Router();



// ==================== STAFF ENDPOINTS ====================

const createStaffSchema = z.object({
  school_id: z.string().uuid(),
  employee_id: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  middle_name: z.string().optional(),
  date_of_birth: z.string().date(),
  gender: z.enum(['male', 'female', 'other']),
  designation: z.string(),
  department: z.string().optional(),
  qualification: z.string(),
  experience_years: z.number().int().min(0),
  phone: z.string(),
  email: z.string().email(),
  address: z.string(),
  city: z.string(),
  state: z.string(),
  pincode: z.string(),
  aadhaar_number: z.string().optional(),
  pan_number: z.string().optional(),
  bank_account_number: z.string().optional(),
  bank_ifsc: z.string().optional(),
  salary: z.number().optional(),
  joining_date: z.string().date(),
  password: z.string().min(6).optional(),
});

// Get all staff
router.get('/staff', async (req: Request, res: Response) => {
  try {
    const { page, limit } = paginationSchema.parse(req.query);
    const { school_id, designation, department, is_active, search } = req.query;

    if (!school_id) {
      return res.status(400).json({ error: 'school_id is required' });
    }

    const where: any = {
      school_id: school_id, // REQUIRED - always filter by school_id
    };
    if (designation) where.designation = designation;
    if (department) where.department = department;
    if (is_active !== undefined) where.is_active = is_active === 'true';
    if (search) {
      where[Op.or] = [
        { first_name: { [Op.iLike]: `%${search}%` } },
        { last_name: { [Op.iLike]: `%${search}%` } },
        { employee_id: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await Staff.findAndCountAll({
      where,
      include: [{ model: School, as: 'school', attributes: ['id', 'name'] }],
      limit,
      offset,
      order: [['created_at', 'DESC']],
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
    console.error('Get staff error:', errorMessage);
    if (errorStack) console.error('Stack:', errorStack);
    res.status(500).json({ error: 'Internal server error', message: errorMessage });
  }
});

// Get staff by ID
router.get('/staff/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const staff = await Staff.findByPk(id, {
      include: [
        { model: School, as: 'school' },
        { model: Class, as: 'classes' },
      ],
    });

    if (!staff) {
      return res.status(404).json({ error: 'Staff not found' });
    }

    res.json(staff);
  } catch (error: any) {
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    const errorStack = error?.stack;
    console.error('Get staff error:', errorMessage);
    if (errorStack) console.error('Stack:', errorStack);
    res.status(500).json({ error: 'Internal server error', message: errorMessage });
  }
});

// Create staff
router.post('/staff', async (req: Request, res: Response) => {
  try {
    const data = createStaffSchema.parse(req.body);
    const staffData: any = { ...data, is_active: (data as any).is_active ?? true };
    const staff = await Staff.create(staffData);
    res.status(201).json(staff);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    const errorStack = error?.stack;
    console.error('Create staff error:', errorMessage);
    if (errorStack) console.error('Stack:', errorStack);
    res.status(500).json({ error: 'Internal server error', message: errorMessage });
  }
});

// Update staff
router.patch('/staff/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const staff = await Staff.findByPk(id);

    if (!staff) {
      return res.status(404).json({ error: 'Staff not found' });
    }

    await staff.update(req.body);
    res.json(staff);
  } catch (error: any) {
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    const errorStack = error?.stack;
    console.error('Update staff error:', errorMessage);
    if (errorStack) console.error('Stack:', errorStack);
    res.status(500).json({ error: 'Internal server error', message: errorMessage });
  }
});

// Delete staff (soft delete)
router.delete('/staff/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const staff = await Staff.findByPk(id);

    if (!staff) {
      return res.status(404).json({ error: 'Staff not found' });
    }

    await staff.update({ is_active: false });
    res.json({ message: 'Staff deactivated successfully' });
  } catch (error: any) {
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    const errorStack = error?.stack;
    console.error('Delete staff error:', errorMessage);
    if (errorStack) console.error('Stack:', errorStack);
    res.status(500).json({ error: 'Internal server error', message: errorMessage });
  }
});

// ==================== CLASSES ENDPOINTS ====================

const createClassSchema = z.object({
  school_id: z.string().uuid(),
  name: z.string(),
  code: z.string(),
  level: z.number().int().min(1).max(12),
  academic_year: z.string(),
  class_teacher_id: z.string().uuid().optional(),
  capacity: z.number().int().positive().default(40),
});

// Get all classes
router.get('/classes', async (req: Request, res: Response) => {
  try {
    const { page, limit } = paginationSchema.parse(req.query);
    const { school_id, academic_year, is_active } = req.query;

    if (!school_id) {
      return res.status(400).json({ error: 'school_id is required' });
    }

    const where: any = {
      school_id: school_id, // REQUIRED - always filter by school_id
    };
    if (academic_year) where.academic_year = academic_year;
    if (is_active !== undefined) where.is_active = is_active === 'true';

    const offset = (page - 1) * limit;

    const { count, rows } = await Class.findAndCountAll({
      where,
      include: [
        { model: School, as: 'school', attributes: ['id', 'name'] },
        { model: Staff, as: 'class_teacher', attributes: ['id', 'first_name', 'last_name', 'employee_id'] },
      ],
      limit,
      offset,
      order: [['level', 'ASC'], ['name', 'ASC']],
    });

    // Get student count for each class (with school_id safety check)
    const classesWithCounts = await Promise.all(
      rows.map(async (cls: any) => {
        const studentWhere: any = { class_id: cls.id, is_active: true };
        // Extra safety: if school_id filter was applied, ensure students also belong to that school
        if (school_id) {
          studentWhere.school_id = school_id;
        }
        const studentCount = await Student.count({ where: studentWhere });
        return {
          ...cls.toJSON(),
          student_count: studentCount,
        };
      })
    );

    res.json({
      data: classesWithCounts,
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
    console.error('Get classes error:', errorMessage);
    if (errorStack) console.error('Stack:', errorStack);
    res.status(500).json({ error: 'Internal server error', message: errorMessage });
  }
});

// Get class by ID
router.get('/classes/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const cls = await Class.findByPk(id, {
      include: [
        { model: School, as: 'school' },
        { model: Staff, as: 'class_teacher' },
        { model: Student, as: 'students', where: { is_active: true }, required: false },
      ],
    });

    if (!cls) {
      return res.status(404).json({ error: 'Class not found' });
    }

    res.json(cls);
  } catch (error: any) {
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    const errorStack = error?.stack;
    console.error('Get class error:', errorMessage);
    if (errorStack) console.error('Stack:', errorStack);
    res.status(500).json({ error: 'Internal server error', message: errorMessage });
  }
});

// Create class
router.post('/classes', async (req: Request, res: Response) => {
  try {
    const data = createClassSchema.parse(req.body);
    const classData: any = { ...data, is_active: (data as any).is_active ?? true, section: (data as any).section ?? null };
    const cls = await Class.create(classData);
    res.status(201).json(cls);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    const errorStack = error?.stack;
    console.error('Create class error:', errorMessage);
    if (errorStack) console.error('Stack:', errorStack);
    res.status(500).json({ error: 'Internal server error', message: errorMessage });
  }
});

// Update class
router.patch('/classes/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const cls = await Class.findByPk(id);

    if (!cls) {
      return res.status(404).json({ error: 'Class not found' });
    }

    await cls.update(req.body);
    res.json(cls);
  } catch (error: any) {
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    const errorStack = error?.stack;
    console.error('Update class error:', errorMessage);
    if (errorStack) console.error('Stack:', errorStack);
    res.status(500).json({ error: 'Internal server error', message: errorMessage });
  }
});

// Delete class (soft delete)
router.delete('/classes/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const cls = await Class.findByPk(id);

    if (!cls) {
      return res.status(404).json({ error: 'Class not found' });
    }

    await cls.update({ is_active: false });
    res.json({ message: 'Class deactivated successfully' });
  } catch (error: any) {
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    const errorStack = error?.stack;
    console.error('Delete class error:', errorMessage);
    if (errorStack) console.error('Stack:', errorStack);
    res.status(500).json({ error: 'Internal server error', message: errorMessage });
  }
});

// ==================== SUBJECTS ENDPOINTS ====================

const createSubjectSchema = z.object({
  school_id: z.string().uuid(),
  name: z.string(),
  code: z.string(),
  description: z.string().optional(),
});

// Get all subjects
router.get('/subjects', async (req: Request, res: Response) => {
  try {
    const { page, limit } = paginationSchema.parse(req.query);
    const { school_id, is_active, search } = req.query;

    if (!school_id) {
      return res.status(400).json({ error: 'school_id is required' });
    }

    const where: any = {
      school_id: school_id, // REQUIRED - always filter by school_id
    };
    if (is_active !== undefined) where.is_active = is_active === 'true';
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { code: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await Subject.findAndCountAll({
      where,
      include: [{ model: School, as: 'school', attributes: ['id', 'name'] }],
      limit,
      offset,
      order: [['name', 'ASC']],
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
    console.error('Get subjects error:', errorMessage);
    if (errorStack) console.error('Stack:', errorStack);
    res.status(500).json({ error: 'Internal server error', message: errorMessage });
  }
});

// Get subject by ID
router.get('/subjects/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const subject = await Subject.findByPk(id, {
      include: [{ model: School, as: 'school' }],
    });

    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    res.json(subject);
  } catch (error: any) {
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    const errorStack = error?.stack;
    console.error('Get subject error:', errorMessage);
    if (errorStack) console.error('Stack:', errorStack);
    res.status(500).json({ error: 'Internal server error', message: errorMessage });
  }
});

// Create subject
router.post('/subjects', async (req: Request, res: Response) => {
  try {
    const data = createSubjectSchema.parse(req.body);
    const subjectData: any = { ...data, is_active: (data as any).is_active ?? true };
    const subject = await Subject.create(subjectData);
    res.status(201).json(subject);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    const errorStack = error?.stack;
    console.error('Create subject error:', errorMessage);
    if (errorStack) console.error('Stack:', errorStack);
    res.status(500).json({ error: 'Internal server error', message: errorMessage });
  }
});

// Update subject
router.patch('/subjects/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const subject = await Subject.findByPk(id);

    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    await subject.update(req.body);
    res.json(subject);
  } catch (error: any) {
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    const errorStack = error?.stack;
    console.error('Update subject error:', errorMessage);
    if (errorStack) console.error('Stack:', errorStack);
    res.status(500).json({ error: 'Internal server error', message: errorMessage });
  }
});

// Delete subject (soft delete)
router.delete('/subjects/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const subject = await Subject.findByPk(id);

    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    await subject.update({ is_active: false });
    res.json({ message: 'Subject deactivated successfully' });
  } catch (error: any) {
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    const errorStack = error?.stack;
    console.error('Delete subject error:', errorMessage);
    if (errorStack) console.error('Stack:', errorStack);
    res.status(500).json({ error: 'Internal server error', message: errorMessage });
  }
});

// ==================== TIMETABLES ENDPOINTS ====================

const createTimetableSchema = z.object({
  school_id: z.string().uuid(),
  class_id: z.string().uuid(),
  subject_id: z.string().uuid(),
  teacher_id: z.string().uuid(),
  day_of_week: z.number().int().min(0).max(6),
  period_number: z.number().int().positive(),
  start_time: z.string(),
  end_time: z.string(),
  room: z.string().optional(),
  academic_year: z.string(),
});

// Get timetables
router.get('/timetables', async (req: Request, res: Response) => {
  try {
    const { school_id, class_id, teacher_id, academic_year, day_of_week } = req.query;

    if (!school_id) {
      return res.status(400).json({ error: 'school_id is required' });
    }

    const where: any = {
      is_active: true,
    };
    if (class_id) where.class_id = class_id;
    if (teacher_id) where.teacher_id = teacher_id;
    if (academic_year) where.academic_year = academic_year;
    if (day_of_week !== undefined) where.day_of_week = parseInt(day_of_week as string);

    // Build class filter with school_id (REQUIRED)
    const classWhere: any = {
      school_id: school_id, // REQUIRED - always filter by school_id
    };

    // Order by class level/name descending when no specific class is selected
    const order: any[] = [];
    if (!class_id) {
      // Order by class level descending, then class name/section
      order.push([{ model: Class, as: 'class' }, 'level', 'DESC']);
      order.push([{ model: Class, as: 'class' }, 'section', 'ASC']);
    }
    // Always order by day and period
    order.push(['day_of_week', 'ASC']);
    order.push(['period_number', 'ASC']);

    const timetables = await Timetable.findAll({
      where,
      include: [
        { 
          model: Class, 
          as: 'class', 
          attributes: ['id', 'name', 'code', 'level', 'section', 'school_id'],
          where: Object.keys(classWhere).length > 0 ? classWhere : undefined,
        },
        { model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] },
        { model: Staff, as: 'teacher', attributes: ['id', 'first_name', 'last_name', 'employee_id'] },
      ],
      order,
    });

    res.json({ data: timetables });
  } catch (error: any) {
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    const errorStack = error?.stack;
    console.error('Get timetables error:', errorMessage);
    if (errorStack) console.error('Stack:', errorStack);
    res.status(500).json({ error: 'Internal server error', message: errorMessage });
  }
});

// Get timetable by class
router.get('/timetables/class/:classId', async (req: Request, res: Response) => {
  try {
    const { classId } = req.params;
    const { academic_year } = req.query;

    const where: any = { class_id: classId, is_active: true };
    if (academic_year) where.academic_year = academic_year;

    const timetables = await Timetable.findAll({
      where,
      include: [
        { model: Subject, as: 'subject' },
        { model: Staff, as: 'teacher' },
      ],
      order: [['day_of_week', 'ASC'], ['period_number', 'ASC']],
    });

    res.json({ data: timetables });
  } catch (error: any) {
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    const errorStack = error?.stack;
    console.error('Get class timetable error:', errorMessage);
    if (errorStack) console.error('Stack:', errorStack);
    res.status(500).json({ error: 'Internal server error', message: errorMessage });
  }
});

// Create timetable
router.post('/timetables', async (req: Request, res: Response) => {
  try {
    const data = createTimetableSchema.parse(req.body);
    const timetableData: any = { ...data, is_active: (data as any).is_active ?? true };
    const timetable = await Timetable.create(timetableData);
    res.status(201).json(timetable);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    const errorStack = error?.stack;
    console.error('Create timetable error:', errorMessage);
    if (errorStack) console.error('Stack:', errorStack);
    res.status(500).json({ error: 'Internal server error', message: errorMessage });
  }
});

// Update timetable
router.patch('/timetables/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const timetable = await Timetable.findByPk(id);

    if (!timetable) {
      return res.status(404).json({ error: 'Timetable not found' });
    }

    await timetable.update(req.body);
    res.json(timetable);
  } catch (error: any) {
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    const errorStack = error?.stack;
    console.error('Update timetable error:', errorMessage);
    if (errorStack) console.error('Stack:', errorStack);
    res.status(500).json({ error: 'Internal server error', message: errorMessage });
  }
});

// Delete timetable
router.delete('/timetables/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const timetable = await Timetable.findByPk(id);

    if (!timetable) {
      return res.status(404).json({ error: 'Timetable not found' });
    }

    await timetable.update({ is_active: false });
    res.json({ message: 'Timetable deactivated successfully' });
  } catch (error: any) {
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    const errorStack = error?.stack;
    console.error('Delete timetable error:', errorMessage);
    if (errorStack) console.error('Stack:', errorStack);
    res.status(500).json({ error: 'Internal server error', message: errorMessage });
  }
});

// ==================== TRANSPORT ROUTES ENDPOINTS ====================

const createTransportRouteSchema = z.object({
  school_id: z.string().uuid(),
  route_name: z.string(),
  route_number: z.string(),
  driver_name: z.string(),
  driver_phone: z.string(),
  vehicle_number: z.string(),
  vehicle_type: z.string(),
  capacity: z.number().int().positive(),
  start_location: z.string(),
  end_location: z.string(),
  stops: z.array(z.string()),
  fare_per_month: z.number().positive(),
});

// Get all transport routes
router.get('/transport-routes', async (req: Request, res: Response) => {
  try {
    const { page, limit } = paginationSchema.parse(req.query);
    const { school_id, is_active, search } = req.query;

    if (!school_id) {
      return res.status(400).json({ error: 'school_id is required' });
    }

    const where: any = {
      school_id: school_id, // REQUIRED - always filter by school_id
    };
    if (is_active !== undefined) where.is_active = is_active === 'true';
    if (search) {
      where[Op.or] = [
        { route_name: { [Op.iLike]: `%${search}%` } },
        { route_number: { [Op.iLike]: `%${search}%` } },
        { driver_name: { [Op.iLike]: `%${search}%` } },
        { vehicle_number: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await TransportRoute.findAndCountAll({
      where,
      include: [{ model: School, as: 'school', attributes: ['id', 'name'] }],
      limit,
      offset,
      order: [['route_number', 'ASC']],
    });

    // Get student count for each route
    const routesWithCounts = await Promise.all(
      rows.map(async (route: any) => {
        const studentCount = await Student.count({
          where: { transport_route_id: route.id, is_active: true },
        });
        return {
          ...route.toJSON(),
          student_count: studentCount,
        };
      })
    );

    res.json({
      data: routesWithCounts,
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
    console.error('Get transport routes error:', errorMessage);
    if (errorStack) console.error('Stack:', errorStack);
    res.status(500).json({ error: 'Internal server error', message: errorMessage });
  }
});

// Get transport route by ID
router.get('/transport-routes/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const route = await TransportRoute.findByPk(id, {
      include: [
        { model: School, as: 'school' },
        // Note: Student association with TransportRoute needs to be defined in Student model
        // For now, we'll fetch students separately
      ],
    });

    if (!route) {
      return res.status(404).json({ error: 'Transport route not found' });
    }

    res.json(route);
  } catch (error: any) {
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    const errorStack = error?.stack;
    console.error('Get transport route error:', errorMessage);
    if (errorStack) console.error('Stack:', errorStack);
    res.status(500).json({ error: 'Internal server error', message: errorMessage });
  }
});

// Create transport route
router.post('/transport-routes', async (req: Request, res: Response) => {
  try {
    const data = createTransportRouteSchema.parse(req.body);
    const routeData: any = { ...data, is_active: (data as any).is_active ?? true };
    const route = await TransportRoute.create(routeData);
    res.status(201).json(route);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    const errorStack = error?.stack;
    console.error('Create transport route error:', errorMessage);
    if (errorStack) console.error('Stack:', errorStack);
    res.status(500).json({ error: 'Internal server error', message: errorMessage });
  }
});

// Update transport route
router.patch('/transport-routes/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const route = await TransportRoute.findByPk(id);

    if (!route) {
      return res.status(404).json({ error: 'Transport route not found' });
    }

    await route.update(req.body);
    res.json(route);
  } catch (error: any) {
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    const errorStack = error?.stack;
    console.error('Update transport route error:', errorMessage);
    if (errorStack) console.error('Stack:', errorStack);
    res.status(500).json({ error: 'Internal server error', message: errorMessage });
  }
});

// Delete transport route (soft delete)
router.delete('/transport-routes/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const route = await TransportRoute.findByPk(id);

    if (!route) {
      return res.status(404).json({ error: 'Transport route not found' });
    }

    await route.update({ is_active: false });
    res.json({ message: 'Transport route deactivated successfully' });
  } catch (error: any) {
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    const errorStack = error?.stack;
    console.error('Delete transport route error:', errorMessage);
    if (errorStack) console.error('Stack:', errorStack);
    res.status(500).json({ error: 'Internal server error', message: errorMessage });
  }
});

// Health check
router.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'management' });
});


export default router;
