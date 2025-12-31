import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config';

interface TransportRouteAttributes {
  id: string;
  school_id: string;
  route_name: string;
  route_number: string;
  driver_name: string;
  driver_phone: string;
  vehicle_number: string;
  vehicle_type: string;
  capacity: number;
  start_location: string;
  end_location: string;
  stops: string[]; // JSON array of stop locations
  fare_per_month: number;
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
}

interface TransportRouteCreationAttributes extends Optional<TransportRouteAttributes, 'id' | 'created_at' | 'updated_at'> {}

class TransportRoute extends Model<TransportRouteAttributes, TransportRouteCreationAttributes> implements TransportRouteAttributes {
  public id!: string;
  public school_id!: string;
  public route_name!: string;
  public route_number!: string;
  public driver_name!: string;
  public driver_phone!: string;
  public vehicle_number!: string;
  public vehicle_type!: string;
  public capacity!: number;
  public start_location!: string;
  public end_location!: string;
  public stops!: string[];
  public fare_per_month!: number;
  public is_active!: boolean;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  static associate(models: any) {
    TransportRoute.belongsTo(models.School, { foreignKey: 'school_id', as: 'school' });
  }
}

TransportRoute.init(
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
    route_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    route_number: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    driver_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    driver_phone: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    vehicle_number: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    vehicle_type: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    capacity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    start_location: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    end_location: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    stops: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
      defaultValue: [],
    },
    fare_per_month: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
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
  },
  {
    sequelize,
    tableName: 'transport_routes',
    indexes: [
      { fields: ['school_id', 'route_number'], unique: true },
      { fields: ['is_active'] },
    ],
  }
);

export default TransportRoute;


