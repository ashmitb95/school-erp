import { Sequelize } from 'sequelize';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as dns from 'dns';
import { promisify } from 'util';

// Force IPv4 resolution (Railway doesn't support IPv6)
dns.setDefaultResultOrder('ipv4first');

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Function to resolve hostname to IPv4 (synchronous for immediate use)
function resolveToIPv4Sync(hostname: string): string {
  try {
    // Use dns.lookup with family 4 to force IPv4
    const result = dns.lookup(hostname, { family: 4 }, (err, address) => {
      if (!err && address) {
        return address;
      }
      return hostname;
    });
    // For synchronous resolution, we need to use a different approach
    // Since dns.lookup is async, we'll resolve it at connection time
    return hostname;
  } catch (error) {
    return hostname;
  }
}

// Support DATABASE_URL (private connection for application runtime) and individual env vars
// Note: PUBLIC_DATABASE_URL is only used by migration scripts, not the application
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

// Resolve hostname to IPv4 synchronously for immediate use
// We'll do async resolution in the sequelize initialization
let resolvedHost: string | null = null;

if (databaseUrl) {
  // Parse DATABASE_URL (format: postgresql://user:password@host:port/database)
  const url = new URL(databaseUrl);
  let hostname = url.hostname;
  let port = parseInt(url.port || '5432');
  
  // For Supabase: If using direct connection (port 5432), suggest using pooler (port 6543)
  // The pooler has better IPv4 support and works better with Railway
  if (hostname.includes('.supabase.co') && port === 5432) {
    console.warn('⚠️  Using Supabase direct connection (port 5432).');
    console.warn('💡 TIP: Use Supabase connection pooler (port 6543) for better IPv4 support on Railway.');
    console.warn('   Change your DATABASE_URL to use port 6543 instead of 5432');
  }
  
  // Try to resolve to IPv4 using async lookup (will be awaited before connection)
  // For now, store the hostname - we'll resolve it when creating the connection
  resolvedHost = hostname;
  
  config = {
    host: resolvedHost || hostname,
    port: port,
    database: url.pathname.slice(1).split('?')[0], // Remove leading '/' and query params
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
// Note: We use the hostname directly and rely on dns.setDefaultResultOrder('ipv4first')
// If IPv6 issues persist, use Supabase connection pooler (port 6543) instead of direct (5432)
export const sequelize = databaseUrl
  ? new Sequelize(
      config.database,
      config.username,
      config.password,
      {
        host: config.host,
        port: config.port,
        dialect: 'postgres',
        pool: config.pool,
        logging: config.logging,
        define: config.define,
        dialectOptions: {
          ssl: process.env.DB_SSL === 'true' || process.env.DATABASE_URL?.includes('sslmode=require') ? {
            require: true,
            rejectUnauthorized: false,
          } : false,
          // Force IPv4 resolution to avoid IPv6 connection issues on Railway
          connectTimeout: 10000,
          // Additional pg library options
          application_name: 'erp-server',
        },
        // Additional options to handle connection issues
        retry: {
          max: 3,
        },
      }
    )
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

