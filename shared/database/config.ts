import { Sequelize } from 'sequelize';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Support both DATABASE_URL (Supabase) and individual env vars
const databaseUrl = process.env.DATABASE_URL;

let config: {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  pool: {
    min: number;
    max: number;
    idle: number;
    acquire: number;
    evict: number;
  };
  dialect: 'postgres';
  logging: boolean | ((sql: string) => void);
  define: {
    timestamps: boolean;
    underscored: boolean;
    freezeTableName: boolean;
  };
};

if (databaseUrl) {
  // Parse DATABASE_URL (format: postgresql://user:password@host:port/database)
  const url = new URL(databaseUrl);
  config = {
    host: url.hostname,
    port: parseInt(url.port || '5432'),
    database: url.pathname.slice(1), // Remove leading '/'
    username: url.username,
    password: url.password,
    pool: {
      min: parseInt(process.env.DB_POOL_MIN || '2'),
      max: parseInt(process.env.DB_POOL_MAX || '10'),
      idle: 10000,
      acquire: 30000,
      evict: 1000,
    },
    dialect: 'postgres' as const,
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true,
    },
  };
} else {
  // Fallback to individual env vars
  config = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'school_erp',
    username: process.env.DB_USER || 'erp_user',
    password: process.env.DB_PASSWORD || 'erp_password',
    pool: {
      min: parseInt(process.env.DB_POOL_MIN || '2'),
      max: parseInt(process.env.DB_POOL_MAX || '10'),
      idle: 10000,
      acquire: 30000,
      evict: 1000,
    },
    dialect: 'postgres' as const,
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true,
    },
  };
}

// Use DATABASE_URL if available, otherwise use individual config
export const sequelize = databaseUrl
  ? new Sequelize(databaseUrl, {
      dialect: 'postgres',
      pool: config.pool,
      logging: config.logging,
      define: config.define,
      dialectOptions: {
        ssl: process.env.DB_SSL === 'true' || process.env.DATABASE_URL?.includes('sslmode=require') ? {
          require: true,
          rejectUnauthorized: false,
        } : false,
      },
    })
  : new Sequelize(
      config.database,
      config.username,
      config.password,
      {
        host: config.host,
        port: config.port,
        dialect: config.dialect,
        pool: config.pool,
        logging: config.logging,
        define: config.define,
      }
    );

export default config;

