# ERPNext Integration Guide

## Overview

This ERP system integrates with ERPNext to leverage existing modules for accounting, inventory, HR, and CRM functionality.

## Setup

### 1. ERPNext Installation

You can either:
- Install ERPNext separately (recommended for production)
- Use the Docker container provided in `docker-compose.yml` (for development)

### 2. API Credentials

1. Log in to your ERPNext instance
2. Go to **Settings** → **API** → **API Keys**
3. Create a new API Key and API Secret
4. Add these to your `.env` file:

```env
ERPNEXT_URL=http://localhost:8000
ERPNEXT_API_KEY=your-api-key
ERPNEXT_API_SECRET=your-api-secret
```

## Integration Points

### 1. Accounting Integration

#### Fee Payments
When a fee is paid in the School ERP, it automatically creates a Payment Entry in ERPNext:

```typescript
// Automatically called in Fees Service
await erpnextClient.createPaymentEntry({
  posting_date: '2024-01-15',
  payment_type: 'Receive',
  party_type: 'Customer',
  party: 'STU001', // Student admission number
  paid_amount: 5000,
  received_amount: 5000,
  reference_no: 'TXN123456',
  reference_date: '2024-01-15',
});
```

#### Journal Entries
For complex accounting entries, use Journal Entries:

```typescript
await erpnextClient.createJournalEntry({
  posting_date: '2024-01-15',
  accounts: [
    {
      account: 'Cash',
      debit_in_account_currency: 5000,
      credit_in_account_currency: 0,
    },
    {
      account: 'Fees Income',
      debit_in_account_currency: 0,
      credit_in_account_currency: 5000,
    },
  ],
  reference_no: 'FEE001',
  remarks: 'Tuition fee payment',
});
```

### 2. Inventory Integration

#### Stock Entries
When inventory items are added or removed:

```typescript
await erpnextClient.createStockEntry({
  posting_date: '2024-01-15',
  posting_time: '10:00:00',
  purpose: 'Material Receipt',
  items: [
    {
      item_code: 'BOOK001',
      qty: 100,
      t_warehouse: 'Main Warehouse',
    },
  ],
});
```

### 3. HR Integration

#### Employee Creation
When staff is added to the School ERP, sync with ERPNext:

```typescript
await erpnextClient.createEmployee({
  first_name: 'John',
  last_name: 'Doe',
  employee_name: 'John Doe',
  date_of_birth: '1990-01-01',
  gender: 'Male',
  designation: 'Teacher',
  department: 'Mathematics',
  company: 'School Name',
  date_of_joining: '2024-01-01',
});
```

### 4. CRM Integration

#### Customer Creation
Parents/Students are created as customers in ERPNext:

```typescript
await erpnextClient.createCustomer({
  customer_name: 'Parent Name',
  customer_type: 'Individual',
  customer_group: 'Parents',
  territory: 'India',
});
```

## API Client Usage

The ERPNext client is available in all services:

```typescript
import erpnextClient from '../../../shared/erpnext/client';

// Get a resource
const customer = await erpnextClient.getResource('Customer', 'CUST001');

// List resources
const employees = await erpnextClient.listResources('Employee', {
  designation: 'Teacher',
});

// Update a resource
await erpnextClient.updateResource('Employee', 'EMP001', {
  salary: 50000,
});

// Delete a resource
await erpnextClient.deleteResource('Customer', 'CUST001');
```

## Error Handling

The ERPNext integration includes error handling. If ERPNext is unavailable, the School ERP will continue to function, but accounting entries won't be synced. You should implement a retry mechanism or queue for failed syncs.

## Data Mapping

### Student → Customer
- `admission_number` → `customer_name`
- `father_name` → Primary contact
- `father_phone` → Phone number

### Staff → Employee
- `employee_id` → `employee_number`
- `designation` → `designation`
- `salary` → `salary`

### Fee → Payment Entry
- `amount` → `paid_amount`
- `transaction_id` → `reference_no`
- `paid_date` → `posting_date`

## Best Practices

1. **Idempotency**: Use unique reference numbers to avoid duplicate entries
2. **Error Logging**: Log all ERPNext API errors for debugging
3. **Retry Logic**: Implement retry for transient failures
4. **Async Processing**: Use message queues for non-critical syncs
5. **Validation**: Validate data before sending to ERPNext

## Troubleshooting

### Connection Issues
- Verify ERPNext URL is accessible
- Check API credentials
- Ensure ERPNext API is enabled

### Authentication Errors
- Verify API key and secret
- Check token format in headers
- Ensure API user has proper permissions

### Data Sync Issues
- Check ERPNext logs
- Verify data format matches ERPNext requirements
- Check for required fields

## Future Enhancements

1. **Bidirectional Sync**: Sync data from ERPNext back to School ERP
2. **Webhooks**: Receive notifications from ERPNext
3. **Batch Operations**: Sync multiple records at once
4. **Conflict Resolution**: Handle data conflicts intelligently


