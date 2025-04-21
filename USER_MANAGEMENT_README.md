# User Management Service API Documentation

This document provides sample request/response examples for all endpoints in the User Management Service, making it easier to test and understand the API.

## Table of Contents
- [Authentication Endpoints](#authentication-endpoints)
  - [Login](#login)
  - [Register](#register)
  - [Verify Email](#verify-email)
  - [Refresh Token](#refresh-token)
  - [Reset Password](#reset-password)
  - [Change Password](#change-password)
- [User Profile Endpoints](#user-profile-endpoints)
  - [Get Current User](#get-current-user)
  - [Update User Profile](#update-user-profile)
  - [Update Communication Preferences](#update-communication-preferences)
  - [Get User Activity](#get-user-activity)
- [User Administration Endpoints](#user-administration-endpoints)
  - [Get Users](#get-users)
  - [Get User Details](#get-user-details)
  - [Create User](#create-user)
  - [Update User](#update-user)
  - [Deactivate User](#deactivate-user)
  - [Update User Roles](#update-user-roles)
  - [Unlock User Account](#unlock-user-account)
- [Organization Endpoints](#organization-endpoints)
  - [Get Organizations](#get-organizations)
  - [Get Organization Members](#get-organization-members)
  - [Add Organization Member](#add-organization-member)
  - [Remove Organization Member](#remove-organization-member)
  - [Update Member Permissions](#update-member-permissions)

## Authentication Endpoints

### Login

**Endpoint:** `POST /api/auth/login`

**Description:** Authenticate a user and generate access and refresh tokens.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecureP@ssw0rd",
  "rememberMe": true
}
```

**Sample Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tokenType": "Bearer",
  "expiresIn": 3600,
  "userId": 1,
  "email": "user@example.com",
  "name": "John Doe",
  "roles": ["USER", "CUSTOMER"],
  "verified": true,
  "organizationId": 1,
  "organizationName": "Example Organization"
}
```

### Register

**Endpoint:** `POST /api/auth/register`

**Description:** Register a new user account.

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "password": "SecureP@ssw0rd",
  "confirmPassword": "SecureP@ssw0rd",
  "firstName": "Jane",
  "lastName": "Smith",
  "phoneNumber": "+15551234567",
  "organizationName": "New Organization",
  "termsAccepted": true
}
```

**Sample Response:**
```json
{
  "userId": 2,
  "email": "newuser@example.com",
  "name": "Jane Smith",
  "message": "Registration successful. Please check your email to verify your account.",
  "verified": false,
  "organizationId": 2,
  "organizationName": "New Organization",
  "verificationEmailSent": true
}
```

### Verify Email

**Endpoint:** `GET /api/auth/verify-email`

**Query Parameters:**
- `token`: Email verification token

**Description:** Verify a user's email address with the provided token.

**Sample Request:**
```
GET /api/auth/verify-email?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Sample Response:**
```json
{
  "success": true,
  "message": "Email successfully verified. You can now log in.",
  "redirectUrl": "/login"
}
```

### Refresh Token

**Endpoint:** `POST /api/auth/refresh-token`

**Description:** Refresh an expired access token using a valid refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Sample Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tokenType": "Bearer",
  "expiresIn": 3600
}
```

### Reset Password

**Endpoint:** `POST /api/auth/reset-password/request`

**Description:** Request a password reset link.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Sample Response:**
```json
{
  "success": true,
  "message": "If the email exists in our system, a password reset link has been sent."
}
```

**Endpoint:** `POST /api/auth/reset-password/confirm`

**Description:** Confirm a password reset with the provided token.

**Request Body:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "password": "NewSecureP@ssw0rd",
  "confirmPassword": "NewSecureP@ssw0rd"
}
```

**Sample Response:**
```json
{
  "success": true,
  "message": "Password has been reset successfully. You can now log in with your new password.",
  "redirectUrl": "/login"
}
```

### Change Password

**Endpoint:** `POST /api/auth/change-password`

**Description:** Change the password for the authenticated user.

**Request Body:**
```json
{
  "currentPassword": "SecureP@ssw0rd",
  "newPassword": "NewSecureP@ssw0rd",
  "confirmPassword": "NewSecureP@ssw0rd"
}
```

**Sample Response:**
```json
{
  "success": true,
  "message": "Password changed successfully."
}
```

## User Profile Endpoints

### Get Current User

**Endpoint:** `GET /api/users/me`

**Description:** Get the profile information for the currently authenticated user.

**Sample Request:**
```
GET /api/users/me
```

**Sample Response:**
```json
{
  "id": 1,
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "fullName": "John Doe",
  "phoneNumber": "+15551234567",
  "profileImage": "https://example.com/profiles/user1.jpg",
  "roles": ["USER", "CUSTOMER"],
  "verified": true,
  "active": true,
  "createdAt": "2024-01-15T10:30:00",
  "lastLogin": "2025-04-15T09:15:00",
  "organization": {
    "id": 1,
    "name": "Example Organization",
    "role": "ADMIN"
  },
  "communicationPreferences": {
    "emailNotifications": true,
    "smsNotifications": true,
    "marketingCommunications": false,
    "maintenanceAlerts": true,
    "paymentReminders": true,
    "energyReports": true
  }
}
```

### Update User Profile

**Endpoint:** `PUT /api/users/me`

**Description:** Update the profile information for the currently authenticated user.

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "+15551234567",
  "profileImage": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQE..."
}
```

**Sample Response:**
```json
{
  "id": 1,
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "fullName": "John Doe",
  "phoneNumber": "+15551234567",
  "profileImage": "https://example.com/profiles/user1.jpg",
  "updated": true,
  "message": "Profile updated successfully."
}
```

### Update Communication Preferences

**Endpoint:** `PUT /api/users/me/communication-preferences`

**Description:** Update communication preferences for the currently authenticated user.

**Request Body:**
```json
{
  "emailNotifications": true,
  "smsNotifications": true,
  "marketingCommunications": false,
  "maintenanceAlerts": true,
  "paymentReminders": true,
  "energyReports": true
}
```

**Sample Response:**
```json
{
  "success": true,
  "message": "Communication preferences updated successfully.",
  "communicationPreferences": {
    "emailNotifications": true,
    "smsNotifications": true,
    "marketingCommunications": false,
    "maintenanceAlerts": true,
    "paymentReminders": true,
    "energyReports": true
  }
}
```

### Get User Activity

**Endpoint:** `GET /api/users/me/activity`

**Query Parameters:**
- `startDate` (optional): Start date in ISO-8601 format
- `endDate` (optional): End date in ISO-8601 format
- `page` (optional): Page number for pagination
- `size` (optional): Number of activities per page

**Description:** Get activity log for the currently authenticated user.

**Sample Request:**
```
GET /api/users/me/activity?startDate=2025-04-01T00:00:00&endDate=2025-04-15T23:59:59&page=0&size=10
```

**Sample Response:**
```json
{
  "activities": [
    {
      "id": 1245,
      "timestamp": "2025-04-15T14:30:00",
      "activityType": "LOGIN",
      "description": "Successful login",
      "ipAddress": "192.168.1.100",
      "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...",
      "location": {
        "country": "United States",
        "city": "San Francisco",
        "latitude": 37.7749,
        "longitude": -122.4194
      }
    },
    {
      "id": 1240,
      "timestamp": "2025-04-15T11:45:00",
      "activityType": "PROFILE_UPDATE",
      "description": "Updated user profile information",
      "ipAddress": "192.168.1.100",
      "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...",
      "location": {
        "country": "United States",
        "city": "San Francisco",
        "latitude": 37.7749,
        "longitude": -122.4194
      }
    },
    {
      "id": 1235,
      "timestamp": "2025-04-14T16:20:00",
      "activityType": "PASSWORD_CHANGE",
      "description": "Changed account password",
      "ipAddress": "192.168.1.100",
      "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...",
      "location": {
        "country": "United States",
        "city": "San Francisco",
        "latitude": 37.7749,
        "longitude": -122.4194
      }
    }
  ],
  "page": 0,
  "size": 10,
  "totalElements": 3,
  "totalPages": 1
}
```

## User Administration Endpoints

### Get Users

**Endpoint:** `GET /api/admin/users`

**Query Parameters:**
- `search` (optional): Search by name or email
- `role` (optional): Filter by user role
- `status` (optional): Filter by status (ACTIVE, INACTIVE, UNVERIFIED)
- `page` (optional): Page number for pagination
- `size` (optional): Number of users per page
- `sortBy` (optional): Sort field (name, email, createdAt, lastLogin)
- `direction` (optional): Sort direction (asc, desc)

**Description:** Get a list of users (admin only).

**Sample Request:**
```
GET /api/admin/users?search=john&role=CUSTOMER&status=ACTIVE&page=0&size=10&sortBy=name&direction=asc
```

**Sample Response:**
```json
{
  "content": [
    {
      "id": 1,
      "email": "john.doe@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "fullName": "John Doe",
      "roles": ["USER", "CUSTOMER"],
      "organizationName": "Example Organization",
      "verified": true,
      "active": true,
      "createdAt": "2024-01-15T10:30:00",
      "lastLogin": "2025-04-15T09:15:00"
    },
    {
      "id": 3,
      "email": "john.smith@example.com",
      "firstName": "John",
      "lastName": "Smith",
      "fullName": "John Smith",
      "roles": ["USER", "CUSTOMER"],
      "organizationName": "Smith Solar",
      "verified": true,
      "active": true,
      "createdAt": "2024-02-10T14:45:00",
      "lastLogin": "2025-04-14T16:30:00"
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
  "totalElements": 2,
  "totalPages": 1,
  "last": true,
  "size": 10,
  "number": 0,
  "sort": {
    "empty": false,
    "sorted": true,
    "unsorted": false
  },
  "numberOfElements": 2,
  "first": true,
  "empty": false
}
```

### Get User Details

**Endpoint:** `GET /api/admin/users/{userId}`

**Path Parameters:**
- `userId`: ID of the user

**Description:** Get detailed information for a specific user (admin only).

**Sample Request:**
```
GET /api/admin/users/1
```

**Sample Response:**
```json
{
  "id": 1,
  "email": "john.doe@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "fullName": "John Doe",
  "phoneNumber": "+15551234567",
  "profileImage": "https://example.com/profiles/user1.jpg",
  "roles": ["USER", "CUSTOMER"],
  "verified": true,
  "active": true,
  "createdAt": "2024-01-15T10:30:00",
  "lastLogin": "2025-04-15T09:15:00",
  "organization": {
    "id": 1,
    "name": "Example Organization",
    "role": "ADMIN"
  },
  "installations": [
    {
      "id": 1,
      "name": "Home Solar System",
      "status": "ACTIVE"
    },
    {
      "id": 2,
      "name": "Vacation Home System",
      "status": "ACTIVE"
    }
  ],
  "communicationPreferences": {
    "emailNotifications": true,
    "smsNotifications": true,
    "marketingCommunications": false,
    "maintenanceAlerts": true,
    "paymentReminders": true,
    "energyReports": true
  },
  "securityInfo": {
    "accountLocked": false,
    "lastPasswordChange": "2025-04-14T16:20:00",
    "failedLoginAttempts": 0,
    "mfaEnabled": true,
    "ipAddresses": [
      {
        "ipAddress": "192.168.1.100",
        "firstSeen": "2024-01-15T10:30:00",
        "lastSeen": "2025-04-15T09:15:00",
        "location": "San Francisco, United States"
      }
    ]
  }
}
```

### Create User

**Endpoint:** `POST /api/admin/users`

**Description:** Create a new user account (admin only).

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "password": "TemporaryP@ss",
  "firstName": "Jane",
  "lastName": "Smith",
  "phoneNumber": "+15551234567",
  "roles": ["USER", "CUSTOMER"],
  "organizationId": 1,
  "sendWelcomeEmail": true
}
```

**Sample Response:**
```json
{
  "id": 4,
  "email": "newuser@example.com",
  "firstName": "Jane",
  "lastName": "Smith",
  "fullName": "Jane Smith",
  "roles": ["USER", "CUSTOMER"],
  "organizationName": "Example Organization",
  "verified": false,
  "active": true,
  "createdAt": "2025-04-15T15:00:00",
  "message": "User created successfully. Welcome email sent.",
  "temporaryPasswordGenerated": true
}
```

### Update User

**Endpoint:** `PUT /api/admin/users/{userId}`

**Path Parameters:**
- `userId`: ID of the user

**Description:** Update information for a specific user (admin only).

**Request Body:**
```json
{
  "firstName": "Jane",
  "lastName": "Smith-Jones",
  "phoneNumber": "+15551234567",
  "active": true,
  "organizationId": 2
}
```

**Sample Response:**
```json
{
  "id": 4,
  "email": "newuser@example.com",
  "firstName": "Jane",
  "lastName": "Smith-Jones",
  "fullName": "Jane Smith-Jones",
  "phoneNumber": "+15551234567",
  "roles": ["USER", "CUSTOMER"],
  "organizationName": "New Organization",
  "verified": false,
  "active": true,
  "updatedAt": "2025-04-15T15:15:00",
  "message": "User updated successfully."
}
```

### Deactivate User

**Endpoint:** `PUT /api/admin/users/{userId}/deactivate`

**Path Parameters:**
- `userId`: ID of the user

**Description:** Deactivate a user account (admin only).

**Request Body:**
```json
{
  "reason": "Customer requested account closure",
  "preserveData": true
}
```

**Sample Response:**
```json
{
  "id": 4,
  "email": "newuser@example.com",
  "fullName": "Jane Smith-Jones",
  "active": false,
  "deactivatedAt": "2025-04-15T15:30:00",
  "deactivatedBy": "admin@example.com",
  "reason": "Customer requested account closure",
  "message": "User deactivated successfully."
}
```

### Update User Roles

**Endpoint:** `PUT /api/admin/users/{userId}/roles`

**Path Parameters:**
- `userId`: ID of the user

**Description:** Update roles for a specific user (admin only).

**Request Body:**
```json
{
  "roles": ["USER", "CUSTOMER", "SERVICE_TECH"]
}
```

**Sample Response:**
```json
{
  "id": 1,
  "email": "john.doe@example.com",
  "fullName": "John Doe",
  "previousRoles": ["USER", "CUSTOMER"],
  "currentRoles": ["USER", "CUSTOMER", "SERVICE_TECH"],
  "updatedAt": "2025-04-15T15:45:00",
  "message": "User roles updated successfully."
}
```

### Unlock User Account

**Endpoint:** `POST /api/admin/users/{userId}/unlock`

**Path Parameters:**
- `userId`: ID of the user

**Description:** Unlock a locked user account (admin only).

**Sample Request:**
```
POST /api/admin/users/1/unlock
```

**Sample Response:**
```json
{
  "id": 1,
  "email": "john.doe@example.com",
  "fullName": "John Doe",
  "accountLocked": false,
  "failedLoginAttempts": 0,
  "unlockTime": "2025-04-15T16:00:00",
  "unlockedBy": "admin@example.com",
  "message": "User account unlocked successfully."
}
```

## Organization Endpoints

### Get Organizations

**Endpoint:** `GET /api/admin/organizations`

**Query Parameters:**
- `search` (optional): Search by organization name
- `page` (optional): Page number for pagination
- `size` (optional): Number of organizations per page
- `sortBy` (optional): Sort field (name, memberCount, createdAt)
- `direction` (optional): Sort direction (asc, desc)

**Description:** Get a list of organizations (admin only).

**Sample Request:**
```
GET /api/admin/organizations?search=example&page=0&size=10&sortBy=name&direction=asc
```

**Sample Response:**
```json
{
  "content": [
    {
      "id": 1,
      "name": "Example Organization",
      "adminEmail": "john.doe@example.com",
      "adminName": "John Doe",
      "memberCount": 5,
      "installationCount": 3,
      "createdAt": "2024-01-15T10:30:00",
      "active": true
    },
    {
      "id": 2,
      "name": "Example Solar Ltd",
      "adminEmail": "jane.smith@example.com",
      "adminName": "Jane Smith",
      "memberCount": 3,
      "installationCount": 1,
      "createdAt": "2024-02-10T14:45:00",
      "active": true
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
  "totalElements": 2,
  "totalPages": 1,
  "last": true,
  "size": 10,
  "number": 0,
  "sort": {
    "empty": false,
    "sorted": true,
    "unsorted": false
  },
  "numberOfElements": 2,
  "first": true,
  "empty": false
}
```

### Get Organization Members

**Endpoint:** `GET /api/admin/organizations/{organizationId}/members`

**Path Parameters:**
- `organizationId`: ID of the organization

**Description:** Get a list of members for a specific organization.

**Sample Request:**
```
GET /api/admin/organizations/1/members
```

**Sample Response:**
```json
{
  "organizationId": 1,
  "organizationName": "Example Organization",
  "members": [
    {
      "id": 1,
      "email": "john.doe@example.com",
      "fullName": "John Doe",
      "role": "ADMIN",
      "joinDate": "2024-01-15T10:30:00",
      "lastActive": "2025-04-15T09:15:00"
    },
    {
      "id": 5,
      "email": "jane.doe@example.com",
      "fullName": "Jane Doe",
      "role": "MEMBER",
      "joinDate": "2024-01-20T14:15:00",
      "lastActive": "2025-04-14T11:30:00"
    },
    {
      "id": 8,
      "email": "bob.smith@example.com",
      "fullName": "Bob Smith",
      "role": "MEMBER",
      "joinDate": "2024-02-05T09:45:00",
      "lastActive": "2025-04-13T16:20:00"
    }
  ],
  "memberCount": 3
}
```

### Add Organization Member

**Endpoint:** `POST /api/admin/organizations/{organizationId}/members`

**Path Parameters:**
- `organizationId`: ID of the organization

**Description:** Add a user to an organization.

**Request Body:**
```json
{
  "userId": 10,
  "role": "MEMBER",
  "sendInvitationEmail": true
}
```

**Sample Response:**
```json
{
  "organizationId": 1,
  "organizationName": "Example Organization",
  "userId": 10,
  "userEmail": "mark.johnson@example.com",
  "userName": "Mark Johnson",
  "role": "MEMBER",
  "joinDate": "2025-04-15T16:30:00",
  "invitationSent": true,
  "message": "User added to organization successfully."
}
```

### Remove Organization Member

**Endpoint:** `DELETE /api/admin/organizations/{organizationId}/members/{userId}`

**Path Parameters:**
- `organizationId`: ID of the organization
- `userId`: ID of the user to remove

**Description:** Remove a user from an organization.

**Sample Request:**
```
DELETE /api/admin/organizations/1/members/10
```

**Sample Response:**
```json
{
  "organizationId": 1,
  "organizationName": "Example Organization",
  "userId": 10,
  "userEmail": "mark.johnson@example.com",
  "userName": "Mark Johnson",
  "removedAt": "2025-04-15T16:45:00",
  "removedBy": "admin@example.com",
  "message": "User removed from organization successfully."
}
```

### Update Member Permissions

**Endpoint:** `PUT /api/admin/organizations/{organizationId}/members/{userId}/role`

**Path Parameters:**
- `organizationId`: ID of the organization
- `userId`: ID of the user

**Description:** Update a member's role in an organization.

**Request Body:**
```json
{
  "role": "ADMIN"
}
```

**Sample Response:**
```json
{
  "organizationId": 1,
  "organizationName": "Example Organization",
  "userId": 5,
  "userEmail": "jane.doe@example.com",
  "userName": "Jane Doe",
  "previousRole": "MEMBER",
  "newRole": "ADMIN",
  "updatedAt": "2025-04-15T17:00:00",
  "updatedBy": "admin@example.com",
  "message": "Member role updated successfully."
}
```

## Testing Tips

1. **Authentication Requirements**:
   - All user management endpoints require authentication
   - Admin endpoints require a user with the "ADMIN" role
   - Organization admin endpoints require organization admin permissions

2. **Password Requirements**:
   - Passwords must be at least 8 characters long
   - Passwords must contain at least one uppercase letter, one lowercase letter, one number, and one special character
   - Password history prevents reuse of the last 5 passwords

3. **Account Security**:
   - Accounts are locked after 5 failed login attempts
   - Email verification is required for new accounts
   - Temporary passwords expire after 24 hours
   - Session tokens expire after 60 minutes by default

4. **Organization Management**:
   - Users can belong to only one organization
   - Organizations can have multiple admins
   - Only organization admins or system admins can manage organization members

5. **Common HTTP Status Codes**:
   - 200: Success
   - 201: Created (for POST requests that create new resources)
   - 400: Bad Request (invalid input)
   - 401: Unauthorized (not logged in)
   - 403: Forbidden (insufficient permissions)
   - 404: Not Found (resource doesn't exist)
   - 409: Conflict (e.g., email already in use)
   - 500: Server Error

6. **Performance Considerations**:
   - Use pagination for large result sets
   - Optimize queries when managing large organizations
   - Consider rate limiting for authentication endpoints to prevent brute force attacks

7. **Security Notes**:
   - All authentication attempts are logged
   - Password reset links expire after 1 hour
   - Sessions can be invalidated from the user profile
   - Multi-factor authentication is available but optional