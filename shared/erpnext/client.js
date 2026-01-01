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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ERPNextClient = void 0;
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
const path = __importStar(require("path"));
// Load .env from project root
dotenv_1.default.config({ path: path.resolve(__dirname, '../../.env') });
/**
 * ERPNext API Client (Optional)
 * Integrates with ERPNext for modules like Accounting, Inventory, HR, etc.
 * This is optional - the system works independently without ERPNext
 */
class ERPNextClient {
    constructor() {
        this.baseURL = process.env.ERPNEXT_URL || 'http://localhost:8000';
        this.apiKey = process.env.ERPNEXT_API_KEY || '';
        this.apiSecret = process.env.ERPNEXT_API_SECRET || '';
        this.client = axios_1.default.create({
            baseURL: this.baseURL,
            headers: {
                'Content-Type': 'application/json',
            },
            timeout: 30000,
        });
        // Add authentication interceptor
        this.client.interceptors.request.use((config) => {
            if (this.apiKey && this.apiSecret) {
                config.headers['Authorization'] = `token ${this.apiKey}:${this.apiSecret}`;
            }
            return config;
        });
    }
    /**
     * Create a Journal Entry in ERPNext (for fee payments)
     */
    async createJournalEntry(data) {
        try {
            const response = await this.client.post('/api/resource/Journal Entry', {
                ...data,
                doctype: 'Journal Entry',
            });
            return response.data;
        }
        catch (error) {
            throw new Error(`ERPNext Journal Entry creation failed: ${error.message}`);
        }
    }
    /**
     * Create a Payment Entry in ERPNext
     */
    async createPaymentEntry(data) {
        try {
            const response = await this.client.post('/api/resource/Payment Entry', {
                ...data,
                doctype: 'Payment Entry',
            });
            return response.data;
        }
        catch (error) {
            throw new Error(`ERPNext Payment Entry creation failed: ${error.message}`);
        }
    }
    /**
     * Create a Stock Entry in ERPNext (for inventory management)
     */
    async createStockEntry(data) {
        try {
            const response = await this.client.post('/api/resource/Stock Entry', {
                ...data,
                doctype: 'Stock Entry',
            });
            return response.data;
        }
        catch (error) {
            throw new Error(`ERPNext Stock Entry creation failed: ${error.message}`);
        }
    }
    /**
     * Create an Employee in ERPNext (for staff management)
     */
    async createEmployee(data) {
        try {
            const response = await this.client.post('/api/resource/Employee', {
                ...data,
                doctype: 'Employee',
            });
            return response.data;
        }
        catch (error) {
            throw new Error(`ERPNext Employee creation failed: ${error.message}`);
        }
    }
    /**
     * Create a Customer in ERPNext (for parent/student billing)
     */
    async createCustomer(data) {
        try {
            const response = await this.client.post('/api/resource/Customer', {
                ...data,
                doctype: 'Customer',
            });
            return response.data;
        }
        catch (error) {
            throw new Error(`ERPNext Customer creation failed: ${error.message}`);
        }
    }
    /**
     * Get data from ERPNext
     */
    async getResource(doctype, name) {
        try {
            const response = await this.client.get(`/api/resource/${doctype}/${name}`);
            return response.data.data;
        }
        catch (error) {
            throw new Error(`ERPNext get resource failed: ${error.message}`);
        }
    }
    /**
     * List resources from ERPNext
     */
    async listResources(doctype, filters) {
        try {
            const params = {};
            if (filters) {
                params.filters = JSON.stringify(filters);
            }
            const response = await this.client.get(`/api/resource/${doctype}`, { params });
            return response.data.data;
        }
        catch (error) {
            throw new Error(`ERPNext list resources failed: ${error.message}`);
        }
    }
    /**
     * Update a resource in ERPNext
     */
    async updateResource(doctype, name, data) {
        try {
            const response = await this.client.put(`/api/resource/${doctype}/${name}`, data);
            return response.data;
        }
        catch (error) {
            throw new Error(`ERPNext update resource failed: ${error.message}`);
        }
    }
    /**
     * Delete a resource in ERPNext
     */
    async deleteResource(doctype, name) {
        try {
            const response = await this.client.delete(`/api/resource/${doctype}/${name}`);
            return response.data;
        }
        catch (error) {
            throw new Error(`ERPNext delete resource failed: ${error.message}`);
        }
    }
}
exports.ERPNextClient = ERPNextClient;
exports.default = new ERPNextClient();
//# sourceMappingURL=client.js.map