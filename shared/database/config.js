"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.sequelize = void 0;
const sequelize_1 = require("sequelize");
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
// Support both DATABASE_URL (Supabase) and individual env vars
const databaseUrl = process.env.DATABASE_URL;
let config;
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
        dialect: 'postgres',
        logging: process.env.NODE_ENV === 'development' ? console.log : false,
        define: {
            timestamps: true,
            underscored: true,
            freezeTableName: true,
        },
    };
}
else {
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
        dialect: 'postgres',
        logging: process.env.NODE_ENV === 'development' ? console.log : false,
        define: {
            timestamps: true,
            underscored: true,
            freezeTableName: true,
        },
    };
}
// Use DATABASE_URL if available, otherwise use individual config
exports.sequelize = databaseUrl
    ? new sequelize_1.Sequelize(databaseUrl, {
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
    : new sequelize_1.Sequelize(config.database, config.username, config.password, {
        host: config.host,
        port: config.port,
        dialect: config.dialect,
        pool: config.pool,
        logging: config.logging,
        define: config.define,
    });
exports.default = config;
//# sourceMappingURL=config.js.map