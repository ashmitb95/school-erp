import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config';

interface NotificationAttributes {
  id: string;
  school_id: string;
  recipient_type: 'student' | 'staff' | 'parent' | 'all';
  recipient_id?: string;
  title: string;
  message: string;
  notification_type: 'info' | 'alert' | 'reminder' | 'announcement';
  priority: 'low' | 'medium' | 'high';
  is_read: boolean;
  read_at?: Date;
  created_at?: Date;
  updated_at?: Date;
}

interface NotificationCreationAttributes extends Optional<NotificationAttributes, 'id' | 'created_at' | 'updated_at'> {}

class Notification extends Model<NotificationAttributes, NotificationCreationAttributes> implements NotificationAttributes {
  public id!: string;
  public school_id!: string;
  public recipient_type!: 'student' | 'staff' | 'parent' | 'all';
  public recipient_id?: string;
  public title!: string;
  public message!: string;
  public notification_type!: 'info' | 'alert' | 'reminder' | 'announcement';
  public priority!: 'low' | 'medium' | 'high';
  public is_read!: boolean;
  public read_at?: Date;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  static associate(models: any) {
    Notification.belongsTo(models.School, { foreignKey: 'school_id', as: 'school' });
  }
}

Notification.init(
  {
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
    },
    recipient_type: {
      type: DataTypes.ENUM('student', 'staff', 'parent', 'all'),
      allowNull: false,
    },
    recipient_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    notification_type: {
      type: DataTypes.ENUM('info', 'alert', 'reminder', 'announcement'),
      allowNull: false,
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high'),
      allowNull: false,
      defaultValue: 'medium',
    },
    is_read: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    read_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'notifications',
    indexes: [
      { fields: ['school_id', 'recipient_type', 'recipient_id'] },
      { fields: ['is_read'] },
      { fields: ['created_at'] },
      { fields: ['priority'] },
    ],
  }
);

export default Notification;


