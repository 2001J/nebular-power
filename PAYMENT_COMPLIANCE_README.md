# Payment Compliance Service API Documentation

This document provides sample request/response examples for all endpoints in the Payment Compliance Service, making it easier to test the API.

## Table of Contents
- [Admin Endpoints](#admin-endpoints)
  - [Get Overdue Payments](#get-overdue-payments)
  - [Get Customer Payment Plans](#get-customer-payment-plans)
  - [Update Payment Plan](#update-payment-plan)
  - [Create Payment Plan](#create-payment-plan)
  - [Record Manual Payment](#record-manual-payment)
  - [Get Installation Payments](#get-installation-payments)
  - [Send Manual Reminder](#send-manual-reminder)
  - [Grace Period Configuration](#grace-period-configuration)
  - [Reminder Configuration](#reminder-configuration)
- [Customer Endpoints](#customer-endpoints)
  - [Get Customer Payments](#get-customer-payments)
  - [Make Payment](#make-payment)
  - [Get Payment Details](#get-payment-details)

## Admin Endpoints

### Get Overdue Payments

**Endpoint:** `GET /api/admin/payments/overdue`

**Query Parameters:**
- `page` (default: 0)
- `size` (default: 10)
- `sortBy` (default: "dueDate")
- `direction` (default: "asc")

**Sample Request:**
```
GET /api/admin/payments/overdue?page=0&size=10&sortBy=dueDate&direction=desc
```

**Sample Response:**
```json
{
  "content": [
    {
      "id": 1,
      "installationId": 1,
      "customerName": "John Doe",
      "customerEmail": "john.doe@example.com",
      "paymentPlanId": 1,
      "paymentPlanName": "Standard Monthly Plan",
      "amount": 250.00,
      "dueDate": "2025-03-15T00:00:00",
      "status": "OVERDUE",
      "statusReason": "Payment not received",
      "daysOverdue": 31,
      "paymentDate": null,
      "paymentMethod": null,
      "transactionId": null
    }
  ],
  "pageable": {
    "pageNumber": 0,
    "pageSize": 10,
    "sort": {
      "empty": false,
      "sorted": true,
      "unsorted": false
    },
    "offset": 0,
    "paged": true,
    "unpaged": false
  },
  "totalElements": 1,
  "totalPages": 1,
  "last": true,
  "size": 10,
  "number": 0,
  "sort": {
    "empty": false,
    "sorted": true,
    "unsorted": false
  },
  "numberOfElements": 1,
  "first": true,
  "empty": false
}
```

### Get Customer Payment Plans

**Endpoint:** `GET /api/admin/payments/customers/{customerId}/plan`

**Path Parameters:**
- `customerId`: ID of the customer

**Sample Request:**
```
GET /api/admin/payments/customers/1/plan
```

**Sample Response:**
```json
[
  {
    "id": 1,
    "installationId": 1,
    "customerName": "John Doe",
    "customerEmail": "john.doe@example.com",
    "name": "Standard Monthly Plan",
    "description": "Regular monthly payments for solar installation",
    "totalAmount": 12000.00,
    "remainingAmount": 10500.00,
    "numberOfPayments": 48,
    "installmentAmount": 250.00,
    "frequency": "MONTHLY",
    "startDate": "2025-01-01T00:00:00",
    "endDate": "2029-01-01T00:00:00",
    "status": "ACTIVE",
    "createdAt": "2025-01-01T10:30:00",
    "updatedAt": "2025-01-01T10:30:00"
  }
]
```

### Update Payment Plan

**Endpoint:** `PUT /api/admin/payments/customers/{customerId}/plan/{planId}`

**Path Parameters:**
- `customerId`: ID of the customer
- `planId`: ID of the payment plan

**Request Body:**
```json
{
  "installationId": 1,
  "installmentAmount": 300.00,
  "frequency": "MONTHLY",
  "startDate": "2025-05-01",
  "endDate": "2029-05-01",
  "totalAmount": 12000.00,
  "name": "Updated Monthly Plan",
  "description": "Updated payment plan with higher installments"
}
```

**Sample Response:**
```json
{
  "id": 1,
  "installationId": 1,
  "customerName": "John Doe",
  "customerEmail": "john.doe@example.com",
  "name": "Updated Monthly Plan",
  "description": "Updated payment plan with higher installments",
  "totalAmount": 12000.00,
  "remainingAmount": 10500.00,
  "numberOfPayments": 40,
  "installmentAmount": 300.00,
  "frequency": "MONTHLY",
  "startDate": "2025-05-01T00:00:00",
  "endDate": "2029-05-01T00:00:00",
  "status": "ACTIVE",
  "createdAt": "2025-01-01T10:30:00",
  "updatedAt": "2025-04-15T14:25:00"
}
```

### Create Payment Plan

**Endpoint:** `POST /api/admin/payments/customers/{customerId}/plan`

**Path Parameters:**
- `customerId`: ID of the customer

**Request Body:**
```json
{
  "installationId": 1,
  "installmentAmount": 250.00,
  "frequency": "MONTHLY",
  "startDate": "2025-05-01",
  "endDate": "2029-05-01",
  "totalAmount": 12000.00,
  "name": "New Monthly Plan",
  "description": "Standard payment plan for new customer"
}
```

**Sample Response:**
```json
{
  "id": 2,
  "installationId": 1,
  "customerName": "John Doe",
  "customerEmail": "john.doe@example.com",
  "name": "New Monthly Plan",
  "description": "Standard payment plan for new customer",
  "totalAmount": 12000.00,
  "remainingAmount": 12000.00,
  "numberOfPayments": 48,
  "installmentAmount": 250.00,
  "frequency": "MONTHLY",
  "startDate": "2025-05-01T00:00:00",
  "endDate": "2029-05-01T00:00:00",
  "status": "ACTIVE",
  "createdAt": "2025-04-15T14:30:00",
  "updatedAt": "2025-04-15T14:30:00"
}
```

### Record Manual Payment

**Endpoint:** `POST /api/admin/payments/customers/{customerId}/manual-payment`

**Path Parameters:**
- `customerId`: ID of the customer

**Request Body:**
```json
{
  "paymentId": 1,
  "amount": 250.00,
  "paymentMethod": "BANK_TRANSFER",
  "transactionId": "TR12345678",
  "notes": "Payment received via bank transfer"
}
```

**Sample Response:**
```json
{
  "id": 1,
  "installationId": 1,
  "customerName": "John Doe",
  "customerEmail": "john.doe@example.com",
  "paymentPlanId": 1,
  "paymentPlanName": "Standard Monthly Plan",
  "amount": 250.00,
  "dueDate": "2025-03-15T00:00:00",
  "status": "PAID",
  "statusReason": "Manual payment recorded",
  "daysOverdue": 31,
  "paymentDate": "2025-04-15T14:35:00",
  "paymentMethod": "BANK_TRANSFER",
  "transactionId": "TR12345678",
  "notes": "Payment received via bank transfer"
}
```

### Get Installation Payments

**Endpoint:** `GET /api/admin/payments/installations/{installationId}/payments`

**Path Parameters:**
- `installationId`: ID of the installation

**Query Parameters:**
- `page` (default: 0)
- `size` (default: 10)
- `sortBy` (default: "dueDate")
- `direction` (default: "desc")

**Sample Request:**
```
GET /api/admin/payments/installations/1/payments?page=0&size=10&sortBy=dueDate&direction=desc
```

**Sample Response:**
```json
{
  "content": [
    {
      "id": 3,
      "installationId": 1,
      "customerName": "John Doe",
      "customerEmail": "john.doe@example.com",
      "paymentPlanId": 1,
      "paymentPlanName": "Standard Monthly Plan",
      "amount": 250.00,
      "dueDate": "2025-05-15T00:00:00",
      "status": "UPCOMING",
      "statusReason": null,
      "daysOverdue": 0,
      "paymentDate": null,
      "paymentMethod": null,
      "transactionId": null
    },
    {
      "id": 2,
      "installationId": 1,
      "customerName": "John Doe",
      "customerEmail": "john.doe@example.com",
      "paymentPlanId": 1,
      "paymentPlanName": "Standard Monthly Plan",
      "amount": 250.00,
      "dueDate": "2025-04-15T00:00:00",
      "status": "DUE",
      "statusReason": null,
      "daysOverdue": 0,
      "paymentDate": null,
      "paymentMethod": null,
      "transactionId": null
    },
    {
      "id": 1,
      "installationId": 1,
      "customerName": "John Doe",
      "customerEmail": "john.doe@example.com",
      "paymentPlanId": 1,
      "paymentPlanName": "Standard Monthly Plan",
      "amount": 250.00,
      "dueDate": "2025-03-15T00:00:00",
      "status": "PAID",
      "statusReason": "Manual payment recorded",
      "daysOverdue": 31,
      "paymentDate": "2025-04-15T14:35:00",
      "paymentMethod": "BANK_TRANSFER",
      "transactionId": "TR12345678",
      "notes": "Payment received via bank transfer"
    }
  ],
  "pageable": {
    "pageNumber": 0,
    "pageSize": 10,
    "sort": {
      "empty": false,
      "sorted": true,
      "unsorted": false
    },
    "offset": 0,
    "paged": true,
    "unpaged": false
  },
  "totalElements": 3,
  "totalPages": 1,
  "last": true,
  "size": 10,
  "number": 0,
  "sort": {
    "empty": false,
    "sorted": true,
    "unsorted": false
  },
  "numberOfElements": 3,
  "first": true,
  "empty": false
}
```

### Send Manual Reminder

**Endpoint:** `POST /api/admin/payments/reminders/send`

**Query Parameters:**
- `paymentId`: ID of the payment to send reminder for
- `reminderType`: Type of reminder (FIRST_REMINDER, SECOND_REMINDER, FINAL_REMINDER, EMAIL, SMS)

**Sample Request:**
```
POST /api/admin/payments/reminders/send?paymentId=2&reminderType=FIRST_REMINDER
```

**Sample Response:**
```
200 OK
```

### Grace Period Configuration

#### Get Grace Period Configuration

**Endpoint:** `GET /api/admin/payments/grace-period-config`

**Sample Response:**
```json
{
  "id": 1,
  "numberOfDays": 10,
  "reminderFrequency": 3,
  "autoSuspendEnabled": true,
  "createdBy": "admin",
  "createdAt": "2025-01-01T00:00:00",
  "updatedBy": "admin",
  "updatedAt": "2025-01-01T00:00:00"
}
```

#### Update Grace Period Configuration

**Endpoint:** `PUT /api/admin/payments/grace-period-config`

**Request Body:**
```json
{
  "numberOfDays": 15,
  "reminderFrequency": 5,
  "autoSuspendEnabled": true
}
```

**Sample Response:**
```json
{
  "id": 1,
  "numberOfDays": 15,
  "reminderFrequency": 5,
  "autoSuspendEnabled": true,
  "createdBy": "admin",
  "createdAt": "2025-01-01T00:00:00",
  "updatedBy": "admin",
  "updatedAt": "2025-04-15T14:40:00"
}
```

### Reminder Configuration

#### Get Reminder Configuration

**Endpoint:** `GET /api/admin/payments/reminder-config`

**Sample Response:**
```json
{
  "id": 1,
  "autoSendReminders": true,
  "firstReminderDays": 1,
  "secondReminderDays": 3,
  "finalReminderDays": 7,
  "reminderMethod": "EMAIL",
  "createdBy": "admin",
  "createdAt": "2025-01-01T00:00:00",
  "updatedBy": "admin",
  "updatedAt": "2025-01-01T00:00:00"
}
```

#### Update Reminder Configuration

**Endpoint:** `PUT /api/admin/payments/reminder-config`

**Request Body:**
```json
{
  "autoSendReminders": true,
  "firstReminderDays": 2,
  "secondReminderDays": 5,
  "finalReminderDays": 10,
  "reminderMethod": "EMAIL_AND_SMS"
}
```

**Sample Response:**
```json
{
  "id": 1,
  "autoSendReminders": true,
  "firstReminderDays": 2,
  "secondReminderDays": 5,
  "finalReminderDays": 10,
  "reminderMethod": "EMAIL_AND_SMS",
  "createdBy": "admin",
  "createdAt": "2025-01-01T00:00:00",
  "updatedBy": "admin",
  "updatedAt": "2025-04-15T14:45:00"
}
```

## Customer Endpoints

### Get Customer Payments

**Endpoint:** `GET /api/customer/payments`

**Query Parameters:**
- `page` (default: 0)
- `size` (default: 10)
- `sortBy` (default: "dueDate")
- `direction` (default: "desc")

**Sample Request:**
``GET /api/customer/payments?page=0&size=10&sortBy=dueDate&direction=desc
```

**Sample Response:**
```json
{
  "content": [
    {
      "id": 3,
      "installationId": 1,
      "installationName": "Home Solar System",
      "paymentPlanId": 1,
      "paymentPlanName": "Standard Monthly Plan",
      "amount": 250.00,
      "dueDate": "2025-05-15T00:00:00",
      "status": "UPCOMING",
      "daysOverdue": 0,
      "paymentDate": null,
      "paymentMethod": null
    },
    {
      "id": 2,
      "installationId": 1,
      "installationName": "Home Solar System",
      "paymentPlanId": 1,
      "paymentPlanName": "Standard Monthly Plan",
      "amount": 250.00,
      "dueDate": "2025-04-15T00:00:00",
      "status": "DUE",
      "daysOverdue": 0,
      "paymentDate": null,
      "paymentMethod": null
    },
    {
      "id": 1,
      "installationId": 1,
      "installationName": "Home Solar System",
      "paymentPlanId": 1,
      "paymentPlanName": "Standard Monthly Plan",
      "amount": 250.00,
      "dueDate": "2025-03-15T00:00:00",
      "status": "PAID",
      "daysOverdue": 31,
      "paymentDate": "2025-04-15T14:35:00",
      "paymentMethod": "BANK_TRANSFER"
    }
  ],
  "pageable": {
    "pageNumber": 0,
    "pageSize": 10,
    "sort": {
      "empty": false,
      "sorted": true,
      "unsorted": false
    },
    "offset": 0,
    "paged": true,
    "unpaged": false
  },
  "totalElements": 3,
  "totalPages": 1,
  "last": true,
  "size": 10,
  "number": 0,
  "sort": {
    "empty": false,
    "sorted": true,
    "unsorted": false
  },
  "numberOfElements": 3,
  "first": true,
  "empty": false
}
```

### Make Payment

**Endpoint:** `POST /api/customer/payments/{paymentId}/pay`

**Path Parameters:**
- `paymentId`: ID of the payment to be made

**Request Body:**
```json
{
  "paymentMethod": "CREDIT_CARD",
  "cardNumber": "4111111111111111",
  "expiryMonth": 12,
  "expiryYear": 2028,
  "cvv": "123",
  "cardholderName": "John Doe"
}
```

**Sample Response:**
```json
{
  "id": 2,
  "installationId": 1,
  "installationName": "Home Solar System",
  "paymentPlanId": 1,
  "paymentPlanName": "Standard Monthly Plan",
  "amount": 250.00,
  "dueDate": "2025-04-15T00:00:00",
  "status": "PAID",
  "daysOverdue": 0,
  "paymentDate": "2025-04-15T15:00:00",
  "paymentMethod": "CREDIT_CARD",
  "transactionId": "TXN78901234"
}
```

### Get Payment Details

**Endpoint:** `GET /api/customer/payments/{paymentId}`

**Path Parameters:**
- `paymentId`: ID of the payment

**Sample Request:**
```
GET /api/customer/payments/2
```

**Sample Response:**
```json
{
  "id": 2,
  "installationId": 1,
  "installationName": "Home Solar System",
  "paymentPlanId": 1,
  "paymentPlanName": "Standard Monthly Plan",
  "amount": 250.00,
  "dueDate": "2025-04-15T00:00:00",
  "status": "PAID",
  "statusReason": "Online payment",
  "daysOverdue": 0,
  "paymentDate": "2025-04-15T15:00:00",
  "paymentMethod": "CREDIT_CARD",
  "transactionId": "TXN78901234",
  "previousPaymentDate": "2025-04-15T14:35:00",
  "nextPaymentDate": "2025-05-15T00:00:00"
}
```

## Testing Tips

1. **Customer IDs vs Installation IDs**: 
   - For endpoints that specify "customer" in the path, use customer IDs
   - For endpoints that specify "installation" in the path, use installation IDs

2. **Test Data Setup**:
   - Create users with role "CUSTOMER" first
   - Create solar installations associated with those customers
   - Create payment plans for those installations
   - Payments will be automatically generated based on payment plans

3. **Authentication**:
   - Admin endpoints require a user with the "ADMIN" role
   - Customer endpoints authenticate the current user and only return their own data

4. **Common HTTP Status Codes**:
   - 200: Success
   - 201: Created (for POST requests that create new resources)
   - 400: Bad Request (invalid input)
   - 401: Unauthorized (not logged in)
   - 403: Forbidden (insufficient permissions)
   - 404: Not Found (resource doesn't exist)
   - 500: Server Error

5. **Date Formats**:
   - All date fields use ISO-8601 format: "YYYY-MM-DDThh:mm:ss"
   - Date-only fields (like startDate, endDate in requests) can use "YYYY-MM-DD"