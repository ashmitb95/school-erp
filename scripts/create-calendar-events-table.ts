import { sequelize } from '../shared/database/config';
import { DataTypes } from 'sequelize';

/**
 * Migration script to create the calendar_events table.
 */
async function createCalendarEventsTable() {
  try {
    console.log('Starting migration to create calendar_events table...');

    await sequelize.authenticate();
    console.log('Database connection established.');

    const queryInterface = sequelize.getQueryInterface();

    // Check if table already exists
    const tableExists = await queryInterface.tableExists('calendar_events');
    if (tableExists) {
      console.log('Table calendar_events already exists. Skipping creation.');
      return;
    }

    // Create calendar_events table
    await queryInterface.createTable('calendar_events', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      school_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'schools',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      event_type: {
        type: DataTypes.ENUM('org', 'class', 'admin', 'teacher_global'),
        allowNull: false,
      },
      start_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      end_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      start_time: {
        type: DataTypes.STRING(10),
        allowNull: true,
      },
      end_time: {
        type: DataTypes.STRING(10),
        allowNull: true,
      },
      all_day: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      class_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'classes',
          key: 'id',
        },
        onDelete: 'SET NULL',
      },
      created_by: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'staff',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      target_audience: {
        type: DataTypes.ENUM(
          'all_teachers',
          'all_staff',
          'all_students',
          'specific_class',
          'admins_only'
        ),
        allowNull: true,
      },
      reminder_days_before: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      is_recurring: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      recurrence_pattern: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      recurrence_end_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      color: {
        type: DataTypes.STRING(7),
        allowNull: true,
        defaultValue: '#6366f1',
      },
      location: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    });

    // Create indexes
    await queryInterface.addIndex('calendar_events', ['school_id', 'start_date'], {
      name: 'calendar_events_school_date_idx',
    });
    await queryInterface.addIndex('calendar_events', ['event_type'], {
      name: 'calendar_events_type_idx',
    });
    await queryInterface.addIndex('calendar_events', ['class_id'], {
      name: 'calendar_events_class_idx',
    });
    await queryInterface.addIndex('calendar_events', ['created_by'], {
      name: 'calendar_events_creator_idx',
    });
    await queryInterface.addIndex('calendar_events', ['target_audience'], {
      name: 'calendar_events_audience_idx',
    });
    await queryInterface.addIndex('calendar_events', ['is_active'], {
      name: 'calendar_events_active_idx',
    });
    await queryInterface.addIndex('calendar_events', ['start_date', 'end_date'], {
      name: 'calendar_events_date_range_idx',
    });

    console.log('✅ Successfully created calendar_events table with indexes.');
  } catch (error: any) {
    console.error('❌ Migration failed:', error?.message || error?.toString());
    if (error?.stack) console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

createCalendarEventsTable();


