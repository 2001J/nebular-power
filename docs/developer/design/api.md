# API Documentation

This document provides comprehensive documentation for the REST API endpoints of the Solar Energy Monitoring and Financing System. It covers request/response formats, authentication, authorization, rate limiting, and versioning strategies.

## API Overview

The Solar Energy Monitoring and Financing System exposes a RESTful API that allows clients to interact with the system programmatically. The API follows REST principles and uses standard HTTP methods to perform operations on resources.

### Base URL

All API endpoints are relative to the base URL:

```
https://api.solarenergysystem.com/v1
```

For development environments:

```
http://localhost:8080/api/v1
```

### API Versioning

The API uses URL-based versioning to ensure backward compatibility as the API evolves:

- `/api/v1/` - Version 1 (current)
- `/api/v2/` - Version 2 (future)

When a new version is released, the previous version will be maintained for a deprecation period of at least 6 months.

## Authentication and Authorization

### Authentication

The API uses JSON Web Tokens (JWT) for authentication. To access protected endpoints, clients must include a valid JWT token in the Authorization header of their requests.

#### Obtaining a Token

To obtain a token, clients must authenticate using the `/auth/login` endpoint:

```
POST /auth/login
```

Request body:
```json
{
  "username": "user@example.com",
  "password": "password123"
}
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600
}
```

#### Using the Token

Include the token in the Authorization header of subsequent requests:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Token Refresh

When a token expires, clients can obtain a new token using the refresh token:

```
POST /auth/refresh
```

Request body:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600
}
```

### Authorization

The API uses role-based access control (RBAC) to determine what actions a user can perform. The following roles are defined:

- `ADMIN`: Full access to all endpoints
- `MANAGER`: Access to manage installations and view data
- `OWNER`: Access to view and manage owned installations
- `VIEWER`: Read-only access to specific installations

## API Endpoints

### User Management

#### Get Current User

```
GET /users/me
```

Returns information about the currently authenticated user.

Response:
```json
{
  "id": 1,
  "username": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "roles": ["OWNER"],
  "preferences": {
    "theme": "dark",
    "notifications": "email"
  }
}
```

#### Get User by ID

```
GET /users/{id}
```

Returns information about a specific user. Requires ADMIN role.

Response:
```json
{
  "id": 1,
  "username": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "roles": ["OWNER"],
  "enabled": true,
  "createdAt": "2023-01-15T10:30:00Z",
  "lastLogin": "2023-05-20T14:22:10Z"
}
```

#### Create User

```
POST /users
```

Creates a new user. Requires ADMIN role.

Request body:
```json
{
  "username": "newuser@example.com",
  "password": "securePassword123",
  "firstName": "Jane",
  "lastName": "Smith",
  "roles": ["VIEWER"]
}
```

Response:
```json
{
  "id": 2,
  "username": "newuser@example.com",
  "firstName": "Jane",
  "lastName": "Smith",
  "roles": ["VIEWER"],
  "enabled": true,
  "createdAt": "2023-05-21T09:15:30Z"
}
```

#### Update User

```
PUT /users/{id}
```

Updates an existing user. Users can update their own information, while ADMIN can update any user.

Request body:
```json
{
  "firstName": "Jane",
  "lastName": "Smith-Johnson",
  "roles": ["VIEWER", "OWNER"]
}
```

Response:
```json
{
  "id": 2,
  "username": "newuser@example.com",
  "firstName": "Jane",
  "lastName": "Smith-Johnson",
  "roles": ["VIEWER", "OWNER"],
  "enabled": true,
  "updatedAt": "2023-05-21T10:20:45Z"
}
```

#### Delete User

```
DELETE /users/{id}
```

Deletes a user. Requires ADMIN role.

Response: HTTP 204 No Content

### Installation Management

#### Get All Installations

```
GET /installations
```

Returns a list of installations the user has access to.

Query parameters:
- `status` (optional): Filter by status (ACTIVE, INACTIVE, MAINTENANCE)
- `page` (optional): Page number for pagination (default: 0)
- `size` (optional): Page size for pagination (default: 20)
- `sort` (optional): Sort field and direction (e.g., "name,asc")

Response:
```json
{
  "content": [
    {
      "id": 1,
      "name": "Rooftop Solar Array",
      "location": "123 Main St, Anytown, USA",
      "capacityKw": 10.5,
      "status": "ACTIVE",
      "installationDate": "2022-03-15",
      "owner": {
        "id": 1,
        "username": "user@example.com"
      }
    },
    {
      "id": 2,
      "name": "Backyard Solar Installation",
      "location": "456 Oak Ave, Somewhere, USA",
      "capacityKw": 5.2,
      "status": "ACTIVE",
      "installationDate": "2022-07-22",
      "owner": {
        "id": 1,
        "username": "user@example.com"
      }
    }
  ],
  "pageable": {
    "pageNumber": 0,
    "pageSize": 20,
    "sort": {
      "sorted": true,
      "unsorted": false
    }
  },
  "totalElements": 2,
  "totalPages": 1
}
```

#### Get Installation by ID

```
GET /installations/{id}
```

Returns details of a specific installation.

Response:
```json
{
  "id": 1,
  "name": "Rooftop Solar Array",
  "location": "123 Main St, Anytown, USA",
  "capacityKw": 10.5,
  "status": "ACTIVE",
  "installationDate": "2022-03-15",
  "owner": {
    "id": 1,
    "username": "user@example.com"
  },
  "specifications": {
    "panelType": "Monocrystalline",
    "panelCount": 30,
    "inverterModel": "SolarEdge SE10000H",
    "azimuth": 180,
    "tilt": 30
  },
  "createdAt": "2022-03-10T14:30:00Z",
  "updatedAt": "2022-03-15T09:45:20Z"
}
```

#### Create Installation

```
POST /installations
```

Creates a new installation. Requires ADMIN or MANAGER role.

Request body:
```json
{
  "name": "New Solar Installation",
  "location": "789 Pine St, Elsewhere, USA",
  "capacityKw": 8.0,
  "installationDate": "2023-05-20",
  "ownerId": 1,
  "specifications": {
    "panelType": "Polycrystalline",
    "panelCount": 24,
    "inverterModel": "Fronius Primo 8.2-1",
    "azimuth": 175,
    "tilt": 25
  }
}
```

Response:
```json
{
  "id": 3,
  "name": "New Solar Installation",
  "location": "789 Pine St, Elsewhere, USA",
  "capacityKw": 8.0,
  "status": "ACTIVE",
  "installationDate": "2023-05-20",
  "owner": {
    "id": 1,
    "username": "user@example.com"
  },
  "specifications": {
    "panelType": "Polycrystalline",
    "panelCount": 24,
    "inverterModel": "Fronius Primo 8.2-1",
    "azimuth": 175,
    "tilt": 25
  },
  "createdAt": "2023-05-21T11:30:00Z"
}
```

#### Update Installation

```
PUT /installations/{id}
```

Updates an existing installation. Requires ADMIN, MANAGER, or OWNER role for the specific installation.

Request body:
```json
{
  "name": "Updated Solar Installation",
  "status": "MAINTENANCE",
  "specifications": {
    "panelCount": 26,
    "inverterModel": "Fronius Primo 8.2-1 Plus"
  }
}
```

Response:
```json
{
  "id": 3,
  "name": "Updated Solar Installation",
  "location": "789 Pine St, Elsewhere, USA",
  "capacityKw": 8.0,
  "status": "MAINTENANCE",
  "installationDate": "2023-05-20",
  "owner": {
    "id": 1,
    "username": "user@example.com"
  },
  "specifications": {
    "panelType": "Polycrystalline",
    "panelCount": 26,
    "inverterModel": "Fronius Primo 8.2-1 Plus",
    "azimuth": 175,
    "tilt": 25
  },
  "updatedAt": "2023-05-22T09:15:30Z"
}
```

#### Delete Installation

```
DELETE /installations/{id}
```

Deletes an installation. Requires ADMIN role.

Response: HTTP 204 No Content

#### Grant User Access to Installation

```
POST /installations/{id}/users
```

Grants a user access to an installation. Requires ADMIN, MANAGER, or OWNER role for the specific installation.

Request body:
```json
{
  "userId": 2,
  "accessLevel": "VIEWER"
}
```

Response:
```json
{
  "installationId": 1,
  "userId": 2,
  "accessLevel": "VIEWER",
  "createdAt": "2023-05-22T10:30:00Z"
}
```

#### Revoke User Access to Installation

```
DELETE /installations/{installationId}/users/{userId}
```

Revokes a user's access to an installation. Requires ADMIN, MANAGER, or OWNER role for the specific installation.

Response: HTTP 204 No Content

### Energy Monitoring

#### Get Energy Data

```
GET /installations/{id}/energy-data
```

Returns energy data for a specific installation.

Query parameters:
- `startDate` (required): Start date and time (ISO 8601 format)
- `endDate` (required): End date and time (ISO 8601 format)
- `interval` (optional): Data interval in minutes (default: 15)
- `page` (optional): Page number for pagination (default: 0)
- `size` (optional): Page size for pagination (default: 100)

Response:
```json
{
  "content": [
    {
      "id": 1001,
      "timestamp": "2023-05-20T10:00:00Z",
      "powerOutputKw": 8.2,
      "energyGeneratedKwh": 2.05,
      "energyConsumedKwh": 1.2,
      "temperatureCelsius": 42.5,
      "irradianceWM2": 950.3,
      "efficiencyPercentage": 18.5
    },
    {
      "id": 1002,
      "timestamp": "2023-05-20T10:15:00Z",
      "powerOutputKw": 8.5,
      "energyGeneratedKwh": 2.12,
      "energyConsumedKwh": 1.3,
      "temperatureCelsius": 43.1,
      "irradianceWM2": 965.7,
      "efficiencyPercentage": 18.7
    }
  ],
  "pageable": {
    "pageNumber": 0,
    "pageSize": 100,
    "sort": {
      "sorted": true,
      "unsorted": false
    }
  },
  "totalElements": 96,
  "totalPages": 1
}
```

#### Get Energy Summaries

```
GET /installations/{id}/summaries/{period}
```

Returns energy summaries for a specific installation and period.

Path parameters:
- `id`: Installation ID
- `period`: Summary period (DAILY, WEEKLY, MONTHLY, YEARLY)

Query parameters:
- `startDate` (optional): Start date (ISO 8601 format)
- `endDate` (optional): End date (ISO 8601 format)
- `page` (optional): Page number for pagination (default: 0)
- `size` (optional): Page size for pagination (default: 20)

Response:
```json
{
  "content": [
    {
      "id": 101,
      "period": "DAILY",
      "date": "2023-05-20",
      "totalGenerationKwh": 45.2,
      "totalConsumptionKwh": 32.5,
      "peakPowerKw": 9.1,
      "averagePowerKw": 5.6,
      "efficiencyPercentage": 18.7,
      "weatherCondition": "SUNNY"
    },
    {
      "id": 102,
      "period": "DAILY",
      "date": "2023-05-21",
      "totalGenerationKwh": 42.8,
      "totalConsumptionKwh": 30.2,
      "peakPowerKw": 8.9,
      "averagePowerKw": 5.3,
      "efficiencyPercentage": 18.5,
      "weatherCondition": "PARTLY_CLOUDY"
    }
  ],
  "pageable": {
    "pageNumber": 0,
    "pageSize": 20,
    "sort": {
      "sorted": true,
      "unsorted": false
    }
  },
  "totalElements": 30,
  "totalPages": 2
}
```

#### Generate Energy Summary

```
POST /installations/{id}/summaries/{period}/generate
```

Generates an energy summary for a specific installation, period, and date. Requires ADMIN role.

Path parameters:
- `id`: Installation ID
- `period`: Summary period (DAILY, WEEKLY, MONTHLY)

Query parameters:
- `date` (required): Date for the summary (ISO 8601 format)

Response:
```json
{
  "id": 103,
  "period": "DAILY",
  "date": "2023-05-22",
  "totalGenerationKwh": 43.5,
  "totalConsumptionKwh": 31.8,
  "peakPowerKw": 9.0,
  "averagePowerKw": 5.4,
  "efficiencyPercentage": 18.6,
  "weatherCondition": "SUNNY",
  "createdAt": "2023-05-23T01:00:00Z"
}
```

### Financial Management

#### Get Payments

```
GET /installations/{id}/payments
```

Returns payments for a specific installation.

Query parameters:
- `startDate` (optional): Start date (ISO 8601 format)
- `endDate` (optional): End date (ISO 8601 format)
- `status` (optional): Payment status (PENDING, COMPLETED, FAILED)
- `page` (optional): Page number for pagination (default: 0)
- `size` (optional): Page size for pagination (default: 20)

Response:
```json
{
  "content": [
    {
      "id": 201,
      "amount": 120.50,
      "currency": "USD",
      "paymentDate": "2023-05-15",
      "paymentMethod": "CREDIT_CARD",
      "status": "COMPLETED",
      "reference": "PAY-123456789",
      "description": "Monthly payment for May 2023"
    },
    {
      "id": 202,
      "amount": 120.50,
      "currency": "USD",
      "paymentDate": "2023-04-15",
      "paymentMethod": "CREDIT_CARD",
      "status": "COMPLETED",
      "reference": "PAY-987654321",
      "description": "Monthly payment for April 2023"
    }
  ],
  "pageable": {
    "pageNumber": 0,
    "pageSize": 20,
    "sort": {
      "sorted": true,
      "unsorted": false
    }
  },
  "totalElements": 12,
  "totalPages": 1
}
```

#### Create Payment

```
POST /installations/{id}/payments
```

Creates a new payment for a specific installation. Requires ADMIN or FINANCIAL_ADMIN role.

Request body:
```json
{
  "amount": 120.50,
  "currency": "USD",
  "paymentDate": "2023-06-15",
  "paymentMethod": "CREDIT_CARD",
  "description": "Monthly payment for June 2023"
}
```

Response:
```json
{
  "id": 203,
  "amount": 120.50,
  "currency": "USD",
  "paymentDate": "2023-06-15",
  "paymentMethod": "CREDIT_CARD",
  "status": "PENDING",
  "description": "Monthly payment for June 2023",
  "createdAt": "2023-05-23T10:15:30Z"
}
```

#### Get Invoices

```
GET /installations/{id}/invoices
```

Returns invoices for a specific installation.

Query parameters:
- `startDate` (optional): Start date (ISO 8601 format)
- `endDate` (optional): End date (ISO 8601 format)
- `status` (optional): Invoice status (DRAFT, ISSUED, PAID, OVERDUE)
- `page` (optional): Page number for pagination (default: 0)
- `size` (optional): Page size for pagination (default: 20)

Response:
```json
{
  "content": [
    {
      "id": 301,
      "invoiceNumber": "INV-2023-0501",
      "issueDate": "2023-05-01",
      "dueDate": "2023-05-15",
      "totalAmount": 120.50,
      "currency": "USD",
      "status": "PAID",
      "items": [
        {
          "id": 401,
          "description": "Solar energy service - May 2023",
          "quantity": 1,
          "unitPrice": 120.50,
          "amount": 120.50
        }
      ]
    },
    {
      "id": 302,
      "invoiceNumber": "INV-2023-0601",
      "issueDate": "2023-06-01",
      "dueDate": "2023-06-15",
      "totalAmount": 120.50,
      "currency": "USD",
      "status": "ISSUED",
      "items": [
        {
          "id": 402,
          "description": "Solar energy service - June 2023",
          "quantity": 1,
          "unitPrice": 120.50,
          "amount": 120.50
        }
      ]
    }
  ],
  "pageable": {
    "pageNumber": 0,
    "pageSize": 20,
    "sort": {
      "sorted": true,
      "unsorted": false
    }
  },
  "totalElements": 6,
  "totalPages": 1
}
```

#### Create Invoice

```
POST /installations/{id}/invoices
```

Creates a new invoice for a specific installation. Requires ADMIN or FINANCIAL_ADMIN role.

Request body:
```json
{
  "issueDate": "2023-07-01",
  "dueDate": "2023-07-15",
  "currency": "USD",
  "items": [
    {
      "description": "Solar energy service - July 2023",
      "quantity": 1,
      "unitPrice": 120.50
    }
  ]
}
```

Response:
```json
{
  "id": 303,
  "invoiceNumber": "INV-2023-0701",
  "issueDate": "2023-07-01",
  "dueDate": "2023-07-15",
  "totalAmount": 120.50,
  "currency": "USD",
  "status": "DRAFT",
  "items": [
    {
      "id": 403,
      "description": "Solar energy service - July 2023",
      "quantity": 1,
      "unitPrice": 120.50,
      "amount": 120.50
    }
  ],
  "createdAt": "2023-05-23T11:30:00Z"
}
```

### Notifications and Alerts

#### Get Notifications

```
GET /notifications
```

Returns notifications for the current user.

Query parameters:
- `read` (optional): Filter by read status (true/false)
- `page` (optional): Page number for pagination (default: 0)
- `size` (optional): Page size for pagination (default: 20)

Response:
```json
{
  "content": [
    {
      "id": 501,
      "title": "Energy Production Alert",
      "message": "Energy production for Installation #1 is 20% below expected levels.",
      "type": "WARNING",
      "read": false,
      "createdAt": "2023-05-22T14:30:00Z"
    },
    {
      "id": 502,
      "title": "Invoice Generated",
      "message": "Invoice INV-2023-0601 has been generated for Installation #1.",
      "type": "INFO",
      "read": true,
      "createdAt": "2023-06-01T10:00:00Z",
      "readAt": "2023-06-01T10:05:30Z"
    }
  ],
  "pageable": {
    "pageNumber": 0,
    "pageSize": 20,
    "sort": {
      "sorted": true,
      "unsorted": false
    }
  },
  "totalElements": 8,
  "totalPages": 1
}
```

#### Mark Notification as Read

```
PUT /notifications/{id}/read
```

Marks a notification as read.

Response:
```json
{
  "id": 501,
  "title": "Energy Production Alert",
  "message": "Energy production for Installation #1 is 20% below expected levels.",
  "type": "WARNING",
  "read": true,
  "createdAt": "2023-05-22T14:30:00Z",
  "readAt": "2023-05-23T09:45:10Z"
}
```

#### Get Alerts

```
GET /installations/{id}/alerts
```

Returns alerts for a specific installation.

Query parameters:
- `status` (optional): Filter by status (ACTIVE, ACKNOWLEDGED, RESOLVED)
- `severity` (optional): Filter by severity (LOW, MEDIUM, HIGH, CRITICAL)
- `page` (optional): Page number for pagination (default: 0)
- `size` (optional): Page size for pagination (default: 20)

Response:
```json
{
  "content": [
    {
      "id": 601,
      "alertType": "LOW_PRODUCTION",
      "severity": "MEDIUM",
      "message": "Energy production is 20% below expected levels.",
      "status": "ACTIVE",
      "createdAt": "2023-05-22T14:30:00Z"
    },
    {
      "id": 602,
      "alertType": "INVERTER_ERROR",
      "severity": "HIGH",
      "message": "Inverter reporting error code E034.",
      "status": "ACKNOWLEDGED",
      "createdAt": "2023-05-21T09:15:00Z",
      "acknowledgedAt": "2023-05-21T09:30:00Z",
      "acknowledgedBy": {
        "id": 1,
        "username": "user@example.com"
      }
    }
  ],
  "pageable": {
    "pageNumber": 0,
    "pageSize": 20,
    "sort": {
      "sorted": true,
      "unsorted": false
    }
  },
  "totalElements": 5,
  "totalPages": 1
}
```

#### Acknowledge Alert

```
PUT /installations/{installationId}/alerts/{alertId}/acknowledge
```

Acknowledges an alert.

Response:
```json
{
  "id": 601,
  "alertType": "LOW_PRODUCTION",
  "severity": "MEDIUM",
  "message": "Energy production is 20% below expected levels.",
  "status": "ACKNOWLEDGED",
  "createdAt": "2023-05-22T14:30:00Z",
  "acknowledgedAt": "2023-05-23T10:15:30Z",
  "acknowledgedBy": {
    "id": 1,
    "username": "user@example.com"
  }
}
```

#### Resolve Alert

```
PUT /installations/{installationId}/alerts/{alertId}/resolve
```

Resolves an alert.

Request body (optional):
```json
{
  "resolutionNotes": "Cleaned solar panels to improve production."
}
```

Response:
```json
{
  "id": 601,
  "alertType": "LOW_PRODUCTION",
  "severity": "MEDIUM",
  "message": "Energy production is 20% below expected levels.",
  "status": "RESOLVED",
  "createdAt": "2023-05-22T14:30:00Z",
  "acknowledgedAt": "2023-05-23T10:15:30Z",
  "acknowledgedBy": {
    "id": 1,
    "username": "user@example.com"
  },
  "resolvedAt": "2023-05-23T14:20:00Z",
  "resolvedBy": {
    "id": 1,
    "username": "user@example.com"
  },
  "resolutionNotes": "Cleaned solar panels to improve production."
}
```

## Error Handling

The API uses standard HTTP status codes to indicate the success or failure of requests. In case of an error, the response body will contain additional information about the error.

### Error Response Format

```json
{
  "timestamp": "2023-05-23T10:30:45Z",
  "status": 400,
  "error": "Bad Request",
  "message": "Invalid input: Installation capacity must be greater than zero",
  "path": "/api/v1/installations",
  "errorCode": "INVALID_INPUT",
  "details": {
    "capacityKw": "must be greater than 0"
  }
}
```

### Common Error Codes

| HTTP Status | Error Code | Description |
|-------------|------------|-------------|
| 400 | INVALID_INPUT | The request contains invalid input data |
| 401 | UNAUTHORIZED | Authentication is required or has failed |
| 403 | FORBIDDEN | The authenticated user does not have permission to access the resource |
| 404 | NOT_FOUND | The requested resource was not found |
| 409 | CONFLICT | The request conflicts with the current state of the resource |
| 422 | VALIDATION_FAILED | The request validation failed |
| 429 | TOO_MANY_REQUESTS | The user has sent too many requests in a given amount of time |
| 500 | INTERNAL_ERROR | An unexpected error occurred on the server |

## Rate Limiting

To ensure fair usage and protect the API from abuse, rate limiting is implemented:

- **Anonymous requests**: 60 requests per hour
- **Authenticated requests**: 1000 requests per hour per user
- **Admin users**: 5000 requests per hour

Rate limit information is included in the response headers:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 995
X-RateLimit-Reset: 1621771200
```

When a rate limit is exceeded, the API will respond with a 429 Too Many Requests status code.

## Pagination

List endpoints support pagination to limit the amount of data returned in a single response. Pagination parameters are specified as query parameters:

- `page`: The page number to retrieve (zero-based, default: 0)
- `size`: The number of items per page (default varies by endpoint)
- `sort`: The field to sort by, with optional direction (e.g., "name,asc" or "date,desc")

Paginated responses include metadata about the pagination state:

```json
{
  "content": [
    {
      "id": 1,
      "name": "Example Item 1"
    },
    {
      "id": 2,
      "name": "Example Item 2"
    }
  ],
  "pageable": {
    "pageNumber": 0,
    "pageSize": 20,
    "sort": {
      "sorted": true,
      "unsorted": false
    }
  },
  "totalElements": 42,
  "totalPages": 3
}
```

## HATEOAS Links

The API supports Hypermedia as the Engine of Application State (HATEOAS) to provide navigational information in responses. Links are included in the response to help clients navigate the API:

```json
{
  "content": [
    {
      "id": 1,
      "name": "Example Item 1"
    },
    {
      "id": 2,
      "name": "Example Item 2"
    }
  ],
  "_links": {
    "self": {
      "href": "https://api.solarenergysystem.com/v1/installations?page=0&size=20"
    },
    "next": {
      "href": "https://api.solarenergysystem.com/v1/installations?page=1&size=20"
    },
    "last": {
      "href": "https://api.solarenergysystem.com/v1/installations?page=2&size=20"
    }
  }
}
```

## API Documentation Tools

The API is documented using OpenAPI (Swagger) specification. The documentation is available at:

```
https://api.solarenergysystem.com/swagger-ui.html
```

For development environments:

```
http://localhost:8080/swagger-ui.html
```

The OpenAPI specification can be downloaded in JSON format:

```
https://api.solarenergysystem.com/v3/api-docs
```

## API Clients

The system provides client libraries for common programming languages to simplify integration:

- **Java**: Available as a Maven dependency
- **JavaScript/TypeScript**: Available as an npm package
- **Python**: Available as a pip package

Example usage in Java:

Example Java client code:

```
// Initialize the client
SolarApiClient client = new SolarApiClient("https://api.solarenergysystem.com/v1");

// Authenticate
client.authenticate("user@example.com", "password123");

// Get installations
Page<Installation> installations = client.getInstallations(0, 20);

// Get energy data
List<EnergyData> energyData = client.getEnergyData(
    1L,
    LocalDateTime.of(2023, 5, 1, 0, 0),
    LocalDateTime.of(2023, 5, 2, 0, 0)
);
```

## Webhooks

The API supports webhooks for event-driven integrations. Clients can register webhook endpoints to receive notifications when specific events occur:

```
POST /webhooks
```

Request body:
```json
{
  "url": "https://example.com/webhook",
  "events": ["installation.created", "energy.summary.generated", "alert.created"],
  "secret": "your-webhook-secret"
}
```

Response:
```json
{
  "id": "wh-123456",
  "url": "https://example.com/webhook",
  "events": ["installation.created", "energy.summary.generated", "alert.created"],
  "createdAt": "2023-05-23T12:00:00Z"
}
```

Webhook payloads are signed using HMAC-SHA256 with the provided secret. The signature is included in the `X-Webhook-Signature` header.
