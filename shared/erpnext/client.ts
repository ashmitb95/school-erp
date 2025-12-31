import axios, { AxiosInstance } from 'axios';
import dotenv from 'dotenv';
import * as path from 'path';

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * ERPNext API Client (Optional)
 * Integrates with ERPNext for modules like Accounting, Inventory, HR, etc.
 * This is optional - the system works independently without ERPNext
 */
export class ERPNextClient {
  private client: AxiosInstance;
  private apiKey: string;
  private apiSecret: string;
  private baseURL: string;

  constructor() {
    this.baseURL = process.env.ERPNEXT_URL || 'http://localhost:8000';
    this.apiKey = process.env.ERPNEXT_API_KEY || '';
    this.apiSecret = process.env.ERPNEXT_API_SECRET || '';

    this.client = axios.create({
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
  async createJournalEntry(data: {
    posting_date: string;
    accounts: Array<{
      account: string;
      debit_in_account_currency: number;
      credit_in_account_currency: number;
    }>;
    reference_no?: string;
    reference_date?: string;
    remarks?: string;
  }) {
    try {
      const response = await this.client.post('/api/resource/Journal Entry', {
        ...data,
        doctype: 'Journal Entry',
      });
      return response.data;
    } catch (error: any) {
      throw new Error(`ERPNext Journal Entry creation failed: ${error.message}`);
    }
  }

  /**
   * Create a Payment Entry in ERPNext
   */
  async createPaymentEntry(data: {
    posting_date: string;
    payment_type: 'Receive' | 'Pay';
    party_type: string;
    party: string;
    paid_amount: number;
    received_amount: number;
    reference_no?: string;
    reference_date?: string;
  }) {
    try {
      const response = await this.client.post('/api/resource/Payment Entry', {
        ...data,
        doctype: 'Payment Entry',
      });
      return response.data;
    } catch (error: any) {
      throw new Error(`ERPNext Payment Entry creation failed: ${error.message}`);
    }
  }

  /**
   * Create a Stock Entry in ERPNext (for inventory management)
   */
  async createStockEntry(data: {
    posting_date: string;
    posting_time: string;
    items: Array<{
      item_code: string;
      qty: number;
      s_warehouse?: string;
      t_warehouse?: string;
    }>;
    purpose: string;
  }) {
    try {
      const response = await this.client.post('/api/resource/Stock Entry', {
        ...data,
        doctype: 'Stock Entry',
      });
      return response.data;
    } catch (error: any) {
      throw new Error(`ERPNext Stock Entry creation failed: ${error.message}`);
    }
  }

  /**
   * Create an Employee in ERPNext (for staff management)
   */
  async createEmployee(data: {
    first_name: string;
    last_name: string;
    employee_name: string;
    date_of_birth: string;
    gender: string;
    designation: string;
    department: string;
    company: string;
    date_of_joining: string;
  }) {
    try {
      const response = await this.client.post('/api/resource/Employee', {
        ...data,
        doctype: 'Employee',
      });
      return response.data;
    } catch (error: any) {
      throw new Error(`ERPNext Employee creation failed: ${error.message}`);
    }
  }

  /**
   * Create a Customer in ERPNext (for parent/student billing)
   */
  async createCustomer(data: {
    customer_name: string;
    customer_type: string;
    customer_group: string;
    territory: string;
  }) {
    try {
      const response = await this.client.post('/api/resource/Customer', {
        ...data,
        doctype: 'Customer',
      });
      return response.data;
    } catch (error: any) {
      throw new Error(`ERPNext Customer creation failed: ${error.message}`);
    }
  }

  /**
   * Get data from ERPNext
   */
  async getResource(doctype: string, name: string) {
    try {
      const response = await this.client.get(`/api/resource/${doctype}/${name}`);
      return response.data.data;
    } catch (error: any) {
      throw new Error(`ERPNext get resource failed: ${error.message}`);
    }
  }

  /**
   * List resources from ERPNext
   */
  async listResources(doctype: string, filters?: Record<string, any>) {
    try {
      const params: any = {};
      if (filters) {
        params.filters = JSON.stringify(filters);
      }
      const response = await this.client.get(`/api/resource/${doctype}`, { params });
      return response.data.data;
    } catch (error: any) {
      throw new Error(`ERPNext list resources failed: ${error.message}`);
    }
  }

  /**
   * Update a resource in ERPNext
   */
  async updateResource(doctype: string, name: string, data: Record<string, any>) {
    try {
      const response = await this.client.put(`/api/resource/${doctype}/${name}`, data);
      return response.data;
    } catch (error: any) {
      throw new Error(`ERPNext update resource failed: ${error.message}`);
    }
  }

  /**
   * Delete a resource in ERPNext
   */
  async deleteResource(doctype: string, name: string) {
    try {
      const response = await this.client.delete(`/api/resource/${doctype}/${name}`);
      return response.data;
    } catch (error: any) {
      throw new Error(`ERPNext delete resource failed: ${error.message}`);
    }
  }
}

export default new ERPNextClient();

