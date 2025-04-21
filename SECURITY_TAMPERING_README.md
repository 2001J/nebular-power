# Security and Tampering Detection API Documentation

This document provides sample request/response examples for all endpoints in the Security and Tampering Detection Service, making it easier to test and understand the API.

## Table of Contents
- [Tampering Detection Endpoints](#tampering-detection-endpoints)
  - [Report Tampering Event](#report-tampering-event)
  - [Get Tampering History](#get-tampering-history)
  - [Get Tampering Alerts](#get-tampering-alerts)
  - [Update Alert Status](#update-alert-status)
- [System Security Endpoints](#system-security-endpoints)
  - [Get Security Alerts](#get-security-alerts)
  - [Get Suspicious Activities](#get-suspicious-activities)
  - [Report Security Event](#report-security-event)
  - [Get Security Summary](#get-security-summary)
- [Audit and Compliance Endpoints](#audit-and-compliance-endpoints)
  - [Get Audit Logs](#get-audit-logs)
  - [Get Compliance Report](#get-compliance-report)
  - [Verify Installation](#verify-installation)
  - [Get Verification Status](#get-verification-status)
- [Configuration Endpoints](#configuration-endpoints)
  - [Get Security Settings](#get-security-settings)
  - [Update Security Settings](#update-security-settings)
  - [Get Alerting Rules](#get-alerting-rules)
  - [Update Alerting Rules](#update-alerting-rules)

## Tampering Detection Endpoints

### Report Tampering Event

**Endpoint:** `POST /api/security/tampering/report`

**Description:** Endpoint for devices to report potential tampering events.

**Request Body:**
```json
{
  "installationId": 1,
  "deviceId": "DEV-2025-001",
  "timestamp": "2025-04-15T10:30:00",
  "tamperType": "PHYSICAL_INTRUSION",
  "confidence": 0.85,
  "sensorData": {
    "accelerometerX": 2.5,
    "accelerometerY": 0.5,
    "accelerometerZ": 9.8,
    "enclosureOpen": true,
    "motionDetected": true,
    "orientationChange": 45.5
  },
  "deviceLocation": {
    "latitude": 37.7749,
    "longitude": -122.4194,
    "accuracy": 5.0
  },
  "additionalInfo": "Device enclosure opened outside of scheduled maintenance window"
}
```

**Sample Response:**
```json
{
  "alertId": "TAMP-2025-04-15-001",
  "received": "2025-04-15T10:30:05",
  "severity": "HIGH",
  "status": "OPEN",
  "actionRequired": true,
  "acknowledgeUrl": "/api/security/tampering/alerts/TAMP-2025-04-15-001/acknowledge",
  "message": "Tampering alert created and notifications sent to system administrators"
}
```

### Get Tampering History

**Endpoint:** `GET /api/security/tampering/history/{installationId}`

**Path Parameters:**
- `installationId`: ID of the installation

**Query Parameters:**
- `startDate` (optional): Start date in ISO-8601 format
- `endDate` (optional): End date in ISO-8601 format
- `status` (optional): Filter by alert status (OPEN, ACKNOWLEDGED, RESOLVED, FALSE_POSITIVE)
- `page` (optional): Page number for pagination
- `size` (optional): Number of records per page

**Description:** Get tampering event history for a specific installation.

**Sample Request:**
```
GET /api/security/tampering/history/1?startDate=2025-01-01T00:00:00&endDate=2025-04-15T23:59:59&status=RESOLVED&page=0&size=10
```

**Sample Response:**
```json
{
  "events": [
    {
      "alertId": "TAMP-2025-04-15-001",
      "installationId": 1,
      "deviceId": "DEV-2025-001",
      "timestamp": "2025-04-15T10:30:00",
      "tamperType": "PHYSICAL_INTRUSION",
      "confidence": 0.85,
      "severity": "HIGH",
      "status": "RESOLVED",
      "resolutionTimestamp": "2025-04-15T11:45:00",
      "resolutionNote": "Authorized maintenance confirmed by service team",
      "resolvedBy": "service.tech@example.com"
    },
    {
      "alertId": "TAMP-2025-03-22-005",
      "installationId": 1,
      "deviceId": "DEV-2025-001",
      "timestamp": "2025-03-22T14:15:00",
      "tamperType": "ORIENTATION_CHANGE",
      "confidence": 0.75,
      "severity": "MEDIUM",
      "status": "RESOLVED",
      "resolutionTimestamp": "2025-03-22T16:30:00",
      "resolutionNote": "Panel adjustment by homeowner, verified by support call",
      "resolvedBy": "support@example.com"
    }
  ],
  "page": 0,
  "size": 10,
  "totalElements": 2,
  "totalPages": 1,
  "summary": {
    "totalEvents": 2,
    "byType": {
      "PHYSICAL_INTRUSION": 1,
      "ORIENTATION_CHANGE": 1
    },
    "bySeverity": {
      "HIGH": 1,
      "MEDIUM": 1
    }
  }
}
```

### Get Tampering Alerts

**Endpoint:** `GET /api/security/tampering/alerts`

**Query Parameters:**
- `status` (optional): Filter by alert status (OPEN, ACKNOWLEDGED, RESOLVED, FALSE_POSITIVE)
- `severity` (optional): Filter by severity (LOW, MEDIUM, HIGH, CRITICAL)
- `page` (optional): Page number for pagination
- `size` (optional): Number of records per page

**Description:** Get current tampering alerts across all installations.

**Sample Request:**
```
GET /api/security/tampering/alerts?status=OPEN&severity=HIGH&page=0&size=10
```

**Sample Response:**
```json
{
  "alerts": [
    {
      "alertId": "TAMP-2025-04-15-002",
      "installationId": 8,
      "deviceId": "DEV-2025-008",
      "customerName": "School Solar Array",
      "timestamp": "2025-04-15T11:45:00",
      "tamperType": "PHYSICAL_INTRUSION",
      "confidence": 0.92,
      "severity": "HIGH",
      "status": "OPEN",
      "sensorData": {
        "accelerometerX": 3.2,
        "accelerometerY": 1.5,
        "accelerometerZ": 9.1,
        "enclosureOpen": true,
        "motionDetected": true,
        "orientationChange": 10.5
      },
      "location": {
        "latitude": 37.7755,
        "longitude": -122.4130,
        "accuracy": 4.5,
        "address": "123 School St, Anytown, CA"
      },
      "createdAt": "2025-04-15T11:45:05",
      "lastUpdated": "2025-04-15T11:45:05"
    },
    {
      "alertId": "TAMP-2025-04-15-003",
      "installationId": 15,
      "deviceId": "DEV-2025-015",
      "customerName": "Industrial Plant B",
      "timestamp": "2025-04-15T12:10:00",
      "tamperType": "CONNECTION_MANIPULATION",
      "confidence": 0.88,
      "severity": "HIGH",
      "status": "OPEN",
      "sensorData": {
        "currentDrawAnomaly": true,
        "voltageFluctuation": 12.5,
        "impedanceChange": 22.3
      },
      "location": {
        "latitude": 37.8120,
        "longitude": -122.2530,
        "accuracy": 6.0,
        "address": "456 Industrial Ave, Othertown, CA"
      },
      "createdAt": "2025-04-15T12:10:05",
      "lastUpdated": "2025-04-15T12:10:05"
    }
  ],
  "page": 0,
  "size": 10,
  "totalElements": 2,
  "totalPages": 1,
  "summary": {
    "openAlerts": 2,
    "acknowledgedAlerts": 0,
    "criticalSeverity": 0,
    "highSeverity": 2
  }
}
```

### Update Alert Status

**Endpoint:** `PUT /api/security/tampering/alerts/{alertId}`

**Path Parameters:**
- `alertId`: ID of the alert

**Description:** Update the status of a tampering alert.

**Request Body:**
```json
{
  "status": "ACKNOWLEDGED",
  "note": "Investigating the alert with on-site personnel",
  "assignedTo": "service.tech@example.com"
}
```

**Sample Response:**
```json
{
  "alertId": "TAMP-2025-04-15-002",
  "previousStatus": "OPEN",
  "currentStatus": "ACKNOWLEDGED",
  "timestamp": "2025-04-15T13:30:00",
  "updatedBy": "admin@example.com",
  "note": "Investigating the alert with on-site personnel",
  "assignedTo": "service.tech@example.com"
}
```

## System Security Endpoints

### Get Security Alerts

**Endpoint:** `GET /api/security/alerts`

**Query Parameters:**
- `type` (optional): Filter by alert type (ACCESS, COMMUNICATION, DATA, SYSTEM)
- `status` (optional): Filter by alert status (OPEN, ACKNOWLEDGED, RESOLVED, FALSE_POSITIVE)
- `severity` (optional): Filter by severity (LOW, MEDIUM, HIGH, CRITICAL)
- `page` (optional): Page number for pagination
- `size` (optional): Number of records per page

**Description:** Get security alerts across all installations.

**Sample Request:**
```
GET /api/security/alerts?type=ACCESS&status=OPEN&severity=HIGH&page=0&size=10
```

**Sample Response:**
```json
{
  "alerts": [
    {
      "alertId": "SEC-2025-04-15-001",
      "timestamp": "2025-04-15T09:15:00",
      "type": "ACCESS",
      "subType": "UNAUTHORIZED_LOGIN_ATTEMPT",
      "description": "Multiple failed login attempts from unknown IP address",
      "severity": "HIGH",
      "status": "OPEN",
      "affectedSystem": "Customer Portal",
      "sourceIp": "192.168.1.100",
      "targetAccount": "admin@example.com",
      "failedAttempts": 5,
      "location": {
        "country": "Unknown",
        "city": "Unknown",
        "latitude": null,
        "longitude": null
      },
      "createdAt": "2025-04-15T09:15:05",
      "lastUpdated": "2025-04-15T09:15:05"
    },
    {
      "alertId": "SEC-2025-04-15-002",
      "timestamp": "2025-04-15T10:30:00",
      "type": "ACCESS",
      "subType": "PRIVILEGE_ESCALATION",
      "description": "Unauthorized attempt to escalate user privileges",
      "severity": "HIGH",
      "status": "OPEN",
      "affectedSystem": "Administration Console",
      "sourceIp": "10.0.0.15",
      "targetAccount": "user@example.com",
      "requestedRole": "ADMIN",
      "location": {
        "country": "United States",
        "city": "San Francisco",
        "latitude": 37.7749,
        "longitude": -122.4194
      },
      "createdAt": "2025-04-15T10:30:05",
      "lastUpdated": "2025-04-15T10:30:05"
    }
  ],
  "page": 0,
  "size": 10,
  "totalElements": 2,
  "totalPages": 1,
  "summary": {
    "openAlerts": 2,
    "acknowledgedAlerts": 0,
    "criticalSeverity": 0,
    "highSeverity": 2
  }
}
```

### Get Suspicious Activities

**Endpoint:** `GET /api/security/suspicious-activities`

**Query Parameters:**
- `startDate` (optional): Start date in ISO-8601 format
- `endDate` (optional): End date in ISO-8601 format
- `category` (optional): Filter by activity category
- `page` (optional): Page number for pagination
- `size` (optional): Number of records per page

**Description:** Get suspicious activities detected by the security system.

**Sample Request:**
```
GET /api/security/suspicious-activities?startDate=2025-04-14T00:00:00&endDate=2025-04-15T23:59:59&page=0&size=10
```

**Sample Response:**
```json
{
  "activities": [
    {
      "id": 1501,
      "timestamp": "2025-04-15T08:45:00",
      "category": "DATA_MANIPULATION",
      "description": "Unusual pattern of energy reading modifications",
      "confidence": 0.78,
      "sourceIp": "10.0.0.25",
      "userId": "operator@example.com",
      "affectedInstallations": [5, 8, 12],
      "affectedData": "Energy readings from April 10-14",
      "detectionMethod": "Anomaly Detection Algorithm",
      "potentialImpact": "Data integrity compromised, billing inaccuracies",
      "recommendedAction": "Verify data authenticity, lock affected accounts"
    },
    {
      "id": 1502,
      "timestamp": "2025-04-15T11:20:00",
      "category": "API_ABUSE",
      "description": "Excessive API requests from single source",
      "confidence": 0.85,
      "sourceIp": "192.168.5.10",
      "apiEndpoint": "/api/monitoring/readings",
      "requestRate": "450 requests/minute",
      "normalRate": "50 requests/minute",
      "detectionMethod": "Rate Limiting",
      "potentialImpact": "System performance degradation, denial of service",
      "recommendedAction": "Implement IP-based rate limiting, investigate source"
    }
  ],
  "page": 0,
  "size": 10,
  "totalElements": 2,
  "totalPages": 1,
  "summary": {
    "totalActivities": 2,
    "byCategory": {
      "DATA_MANIPULATION": 1,
      "API_ABUSE": 1
    },
    "byConfidence": {
      "HIGH": 1,
      "MEDIUM": 1
    }
  }
}
```

### Report Security Event

**Endpoint:** `POST /api/security/events`

**Description:** Report a security event detected by a device or system component.

**Request Body:**
```json
{
  "installationId": 1,
  "deviceId": "DEV-2025-001",
  "timestamp": "2025-04-15T14:30:00",
  "eventType": "AUTHENTICATION_FAILURE",
  "description": "Multiple failed device authentication attempts",
  "severity": "MEDIUM",
  "details": {
    "failedAttempts": 3,
    "lastAttemptTimestamp": "2025-04-15T14:29:45",
    "usedCredentials": "Device Token (partial): ABC***XYZ",
    "sourceIp": "10.0.0.30"
  },
  "deviceLocation": {
    "latitude": 37.7749,
    "longitude": -122.4194,
    "accuracy": 5.0
  }
}
```

**Sample Response:**
```json
{
  "eventId": "SEC-EV-2025-04-15-150",
  "received": "2025-04-15T14:30:05",
  "priority": "MEDIUM",
  "status": "RECORDED",
  "correlationId": "CORR-2025-04-15-045",
  "createAlert": true,
  "alertId": "SEC-2025-04-15-015",
  "message": "Security event recorded successfully"
}
```

### Get Security Summary

**Endpoint:** `GET /api/security/summary`

**Query Parameters:**
- `period` (optional): Time period (day, week, month, year)

**Description:** Get a summary of security-related information across the system.

**Sample Request:**
```
GET /api/security/summary?period=week
```

**Sample Response:**
```json
{
  "period": "WEEK",
  "startDate": "2025-04-09",
  "endDate": "2025-04-15",
  "tamperingAlerts": {
    "total": 8,
    "open": 2,
    "acknowledged": 1,
    "resolved": 5,
    "byType": {
      "PHYSICAL_INTRUSION": 3,
      "ORIENTATION_CHANGE": 2,
      "CONNECTION_MANIPULATION": 2,
      "COMMUNICATION_INTERFERENCE": 1
    },
    "bySeverity": {
      "LOW": 2,
      "MEDIUM": 3,
      "HIGH": 3,
      "CRITICAL": 0
    }
  },
  "securityAlerts": {
    "total": 12,
    "open": 4,
    "acknowledged": 3,
    "resolved": 5,
    "byType": {
      "ACCESS": 5,
      "COMMUNICATION": 3,
      "DATA": 2,
      "SYSTEM": 2
    },
    "bySeverity": {
      "LOW": 3,
      "MEDIUM": 4,
      "HIGH": 4,
      "CRITICAL": 1
    }
  },
  "suspiciousActivities": {
    "total": 7,
    "byCategory": {
      "DATA_MANIPULATION": 2,
      "API_ABUSE": 1,
      "ACCESS_PATTERN": 2,
      "DEVICE_BEHAVIOR": 2
    }
  },
  "securityEvents": {
    "total": 156,
    "byType": {
      "AUTHENTICATION_FAILURE": 45,
      "AUTHORIZATION_VIOLATION": 22,
      "CONFIGURATION_CHANGE": 35,
      "DEVICE_STATE_CHANGE": 28,
      "FIRMWARE_UPDATE": 15,
      "OTHER": 11
    }
  },
  "complianceStatus": {
    "compliantInstallations": 45,
    "nonCompliantInstallations": 3,
    "pendingVerification": 2
  },
  "topIssues": [
    {
      "description": "Authentication failures from specific IP ranges",
      "count": 45,
      "severity": "MEDIUM",
      "trend": "DECREASING"
    },
    {
      "description": "Physical tampering attempts on commercial installations",
      "count": 3,
      "severity": "HIGH",
      "trend": "STABLE"
    },
    {
      "description": "Unusual data access patterns from operator accounts",
      "count": 2,
      "severity": "HIGH",
      "trend": "NEW"
    }
  ]
}
```

## Audit and Compliance Endpoints

### Get Audit Logs

**Endpoint:** `GET /api/security/audit-logs`

**Query Parameters:**
- `startDate` (optional): Start date in ISO-8601 format
- `endDate` (optional): End date in ISO-8601 format
- `type` (optional): Filter by log type (USER_ACTION, SYSTEM_CHANGE, SECURITY_EVENT)
- `userId` (optional): Filter by user ID
- `page` (optional): Page number for pagination
- `size` (optional): Number of records per page

**Description:** Get audit logs for security and compliance purposes.

**Sample Request:**
```
GET /api/security/audit-logs?type=USER_ACTION&startDate=2025-04-15T00:00:00&endDate=2025-04-15T23:59:59&page=0&size=10
```

**Sample Response:**
```json
{
  "logs": [
    {
      "id": 2501,
      "timestamp": "2025-04-15T09:30:00",
      "type": "USER_ACTION",
      "userId": "admin@example.com",
      "action": "USER_ROLE_CHANGE",
      "description": "Changed user role from OPERATOR to ADMIN",
      "targetUserId": "user@example.com",
      "previousValue": "OPERATOR",
      "newValue": "ADMIN",
      "sourceIp": "10.0.0.15",
      "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      "success": true
    },
    {
      "id": 2505,
      "timestamp": "2025-04-15T10:45:00",
      "type": "USER_ACTION",
      "userId": "service.tech@example.com",
      "action": "DEVICE_CONFIGURATION_CHANGE",
      "description": "Updated device reporting frequency",
      "installationId": 8,
      "deviceId": "DEV-2025-008",
      "previousValue": "15 minutes",
      "newValue": "5 minutes",
      "sourceIp": "10.0.0.22",
      "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "success": true
    }
  ],
  "page": 0,
  "size": 10,
  "totalElements": 2,
  "totalPages": 1
}
```

### Get Compliance Report

**Endpoint:** `GET /api/security/compliance-report`

**Query Parameters:**
- `installationId` (optional): Filter for a specific installation
- `standard` (optional): Compliance standard (NERC-CIP, ISO27001, GDPR, SOC2)

**Description:** Get a compliance report for regulatory requirements.

**Sample Request:**
```
GET /api/security/compliance-report?standard=ISO27001
```

**Sample Response:**
```json
{
  "reportId": "COMP-2025-04-15-001",
  "generatedAt": "2025-04-15T15:00:00",
  "standard": "ISO27001",
  "version": "2022",
  "overallStatus": "COMPLIANT",
  "complianceScore": 92.5,
  "controlCategories": [
    {
      "category": "Access Control",
      "compliance": 95.0,
      "controls": [
        {
          "controlId": "A.9.2.3",
          "description": "Management of privileged access rights",
          "status": "COMPLIANT",
          "evidence": "Role-based access control implemented with principle of least privilege",
          "lastAssessed": "2025-04-10"
        },
        {
          "controlId": "A.9.4.2",
          "description": "Secure log-on procedures",
          "status": "COMPLIANT",
          "evidence": "Multi-factor authentication implemented for all privileged accounts",
          "lastAssessed": "2025-04-10"
        }
      ]
    },
    {
      "category": "Cryptography",
      "compliance": 90.0,
      "controls": [
        {
          "controlId": "A.10.1.1",
          "description": "Policy on the use of cryptographic controls",
          "status": "COMPLIANT",
          "evidence": "Encryption policy documented and implemented",
          "lastAssessed": "2025-04-10"
        },
        {
          "controlId": "A.10.1.2",
          "description": "Key management",
          "status": "PARTIALLY_COMPLIANT",
          "evidence": "Key rotation implemented but key recovery procedures need updating",
          "lastAssessed": "2025-04-10",
          "remediationPlan": "Update key recovery procedures by 2025-05-01",
          "assignedTo": "security.officer@example.com"
        }
      ]
    }
  ],
  "nonCompliantItems": [
    {
      "controlId": "A.10.1.2",
      "description": "Key management",
      "issue": "Key recovery procedures need updating",
      "severity": "MEDIUM",
      "remediation": "Update key recovery procedures",
      "dueDate": "2025-05-01"
    }
  ],
  "reportUrl": "/api/security/compliance-report/COMP-2025-04-15-001/download"
}
```

### Verify Installation

**Endpoint:** `POST /api/security/verify-installation/{installationId}`

**Path Parameters:**
- `installationId`: ID of the installation

**Description:** Request verification of an installation's security compliance.

**Request Body:**
```json
{
  "verificationType": "FULL",
  "verificationReason": "Annual compliance check",
  "requestedBy": "compliance@example.com",
  "targetStandards": ["ISO27001", "GDPR"],
  "includePhysicalInspection": true,
  "preferredSchedule": {
    "startDate": "2025-04-20",
    "endDate": "2025-04-30"
  }
}
```

**Sample Response:**
```json
{
  "verificationId": "VER-2025-04-15-001",
  "installationId": 1,
  "installationName": "Home Solar System",
  "status": "SCHEDULED",
  "verificationType": "FULL",
  "scheduledDate": "2025-04-25T10:00:00",
  "estimatedCompletionDate": "2025-04-25T16:00:00",
  "assignedVerifier": "inspector@example.com",
  "verificationSteps": [
    {
      "step": "Documentation Review",
      "status": "PENDING",
      "scheduledDate": "2025-04-25T10:00:00"
    },
    {
      "step": "Technical Security Assessment",
      "status": "PENDING",
      "scheduledDate": "2025-04-25T11:30:00"
    },
    {
      "step": "Physical Inspection",
      "status": "PENDING",
      "scheduledDate": "2025-04-25T14:00:00"
    },
    {
      "step": "Report Generation",
      "status": "PENDING",
      "scheduledDate": "2025-04-25T15:30:00"
    }
  ],
  "message": "Verification successfully scheduled"
}
```

### Get Verification Status

**Endpoint:** `GET /api/security/verification-status/{verificationId}`

**Path Parameters:**
- `verificationId`: ID of the verification request

**Description:** Get the status of a verification request.

**Sample Request:**
```
GET /api/security/verification-status/VER-2025-04-15-001
```

**Sample Response:**
```json
{
  "verificationId": "VER-2025-04-15-001",
  "installationId": 1,
  "installationName": "Home Solar System",
  "status": "IN_PROGRESS",
  "verificationType": "FULL",
  "scheduledDate": "2025-04-25T10:00:00",
  "startedAt": "2025-04-25T10:05:00",
  "estimatedCompletionTime": "2025-04-25T16:00:00",
  "progress": 25,
  "assignedVerifier": "inspector@example.com",
  "verificationSteps": [
    {
      "step": "Documentation Review",
      "status": "COMPLETED",
      "startedAt": "2025-04-25T10:05:00",
      "completedAt": "2025-04-25T11:15:00",
      "outcome": "PASSED",
      "notes": "All required documentation present and up to date"
    },
    {
      "step": "Technical Security Assessment",
      "status": "IN_PROGRESS",
      "startedAt": "2025-04-25T11:30:00",
      "completedAt": null,
      "progress": 50,
      "notes": "Firmware verification in progress"
    },
    {
      "step": "Physical Inspection",
      "status": "PENDING",
      "scheduledDate": "2025-04-25T14:00:00"
    },
    {
      "step": "Report Generation",
      "status": "PENDING",
      "scheduledDate": "2025-04-25T15:30:00"
    }
  ],
  "preliminaryFindings": [
    {
      "category": "Documentation",
      "status": "COMPLIANT",
      "notes": "All documentation meets standards"
    },
    {
      "category": "Technical Security",
      "status": "IN_PROGRESS",
      "notes": "Initial tests show proper encryption implementation"
    }
  ]
}
```

## Configuration Endpoints

### Get Security Settings

**Endpoint:** `GET /api/security/settings/{installationId}`

**Path Parameters:**
- `installationId`: ID of the installation

**Description:** Get security settings for a specific installation.

**Sample Request:**
```
GET /api/security/settings/1
```

**Sample Response:**
```json
{
  "installationId": 1,
  "lastUpdated": "2025-04-01T09:30:00",
  "updatedBy": "admin@example.com",
  "tamperDetectionSettings": {
    "enabled": true,
    "sensitivity": "HIGH",
    "accelerometerThreshold": 1.5,
    "orientationChangeThreshold": 15.0,
    "notifyCustomer": true,
    "automaticResponseEnabled": true,
    "automaticResponses": [
      {
        "trigger": "ENCLOSURE_OPEN",
        "action": "CAPTURE_DIAGNOSTICS",
        "severity": "HIGH"
      },
      {
        "trigger": "ORIENTATION_CHANGE",
        "action": "NOTIFY_ADMINS",
        "severity": "MEDIUM"
      },
      {
        "trigger": "CONNECTION_MANIPULATION",
        "action": "ACTIVATE_TAMPER_MODE",
        "severity": "HIGH"
      }
    ]
  },
  "communicationSettings": {
    "encryptionEnabled": true,
    "encryptionAlgorithm": "AES-256",
    "tokenLifetimeMinutes": 60,
    "tokenRotationEnabled": true,
    "failedAuthThreshold": 5,
    "lockoutPeriodMinutes": 30
  },
  "auditSettings": {
    "auditLogEnabled": true,
    "auditLogRetentionDays": 365,
    "logLevel": "DETAILED",
    "logUserActions": true,
    "logSystemEvents": true,
    "logSecurityEvents": true
  },
  "alertNotifications": {
    "emailEnabled": true,
    "smsEnabled": true,
    "pushEnabled": true,
    "recipients": [
      {
        "type": "EMAIL",
        "value": "security@example.com",
        "severities": ["HIGH", "CRITICAL"]
      },
      {
        "type": "SMS",
        "value": "+15555555555",
        "severities": ["CRITICAL"]
      }
    ]
  }
}
```

### Update Security Settings

**Endpoint:** `PUT /api/security/settings/{installationId}`

**Path Parameters:**
- `installationId`: ID of the installation

**Description:** Update security settings for a specific installation.

**Request Body:**
```json
{
  "tamperDetectionSettings": {
    "enabled": true,
    "sensitivity": "VERY_HIGH",
    "accelerometerThreshold": 1.0,
    "orientationChangeThreshold": 10.0,
    "notifyCustomer": true,
    "automaticResponseEnabled": true,
    "automaticResponses": [
      {
        "trigger": "ENCLOSURE_OPEN",
        "action": "CAPTURE_DIAGNOSTICS",
        "severity": "HIGH"
      },
      {
        "trigger": "ORIENTATION_CHANGE",
        "action": "NOTIFY_ADMINS",
        "severity": "MEDIUM"
      },
      {
        "trigger": "CONNECTION_MANIPULATION",
        "action": "ACTIVATE_TAMPER_MODE",
        "severity": "HIGH"
      }
    ]
  },
  "communicationSettings": {
    "encryptionEnabled": true,
    "encryptionAlgorithm": "AES-256",
    "tokenLifetimeMinutes": 30,
    "tokenRotationEnabled": true,
    "failedAuthThreshold": 3,
    "lockoutPeriodMinutes": 60
  },
  "auditSettings": {
    "auditLogEnabled": true,
    "auditLogRetentionDays": 365,
    "logLevel": "DETAILED",
    "logUserActions": true,
    "logSystemEvents": true,
    "logSecurityEvents": true
  },
  "alertNotifications": {
    "emailEnabled": true,
    "smsEnabled": true,
    "pushEnabled": true,
    "recipients": [
      {
        "type": "EMAIL",
        "value": "security@example.com",
        "severities": ["MEDIUM", "HIGH", "CRITICAL"]
      },
      {
        "type": "SMS",
        "value": "+15555555555",
        "severities": ["HIGH", "CRITICAL"]
      }
    ]
  }
}
```

**Sample Response:**
```json
{
  "success": true,
  "timestamp": "2025-04-15T16:00:00",
  "message": "Security settings updated successfully",
  "installationId": 1,
  "changes": [
    {
      "setting": "tamperDetectionSettings.sensitivity",
      "previousValue": "HIGH",
      "newValue": "VERY_HIGH"
    },
    {
      "setting": "tamperDetectionSettings.accelerometerThreshold",
      "previousValue": 1.5,
      "newValue": 1.0
    },
    {
      "setting": "tamperDetectionSettings.orientationChangeThreshold",
      "previousValue": 15.0,
      "newValue": 10.0
    },
    {
      "setting": "communicationSettings.tokenLifetimeMinutes",
      "previousValue": 60,
      "newValue": 30
    },
    {
      "setting": "communicationSettings.failedAuthThreshold",
      "previousValue": 5,
      "newValue": 3
    },
    {
      "setting": "communicationSettings.lockoutPeriodMinutes",
      "previousValue": 30,
      "newValue": 60
    },
    {
      "setting": "alertNotifications.recipients[0].severities",
      "previousValue": ["HIGH", "CRITICAL"],
      "newValue": ["MEDIUM", "HIGH", "CRITICAL"]
    },
    {
      "setting": "alertNotifications.recipients[1].severities",
      "previousValue": ["CRITICAL"],
      "newValue": ["HIGH", "CRITICAL"]
    }
  ]
}
```

### Get Alerting Rules

**Endpoint:** `GET /api/security/alerting-rules`

**Description:** Get the alerting rules configuration.

**Sample Request:**
```
GET /api/security/alerting-rules
```

**Sample Response:**
```json
{
  "rules": [
    {
      "id": 1,
      "name": "Physical Tampering Detection",
      "description": "Detects physical tampering with the device",
      "enabled": true,
      "triggers": [
        {
          "type": "ACCELEROMETER",
          "condition": "EXCEEDS",
          "threshold": 2.0,
          "timeWindowSeconds": 5,
          "confidence": 0.8
        },
        {
          "type": "ENCLOSURE",
          "condition": "EQUALS",
          "value": "OPEN",
          "confidence": 0.9
        }
      ],
      "logic": "ANY",
      "severity": "HIGH",
      "actions": [
        {
          "type": "CREATE_ALERT",
          "parameters": {
            "alertType": "TAMPERING",
            "priority": "HIGH"
          }
        },
        {
          "type": "NOTIFY",
          "parameters": {
            "channels": ["EMAIL", "SMS"],
            "roles": ["ADMIN", "SECURITY_OFFICER"]
          }
        },
        {
          "type": "COMMAND",
          "parameters": {
            "command": "CAPTURE_DIAGNOSTICS",
            "args": {
              "fullReport": true
            }
          }
        }
      ],
      "throttling": {
        "maxAlertsPerHour": 5,
        "suppressDuplicatesSeconds": 300
      },
      "lastUpdated": "2025-03-15T14:30:00",
      "updatedBy": "admin@example.com"
    },
    {
      "id": 2,
      "name": "Connection Tampering Detection",
      "description": "Detects tampering with power connections",
      "enabled": true,
      "triggers": [
        {
          "type": "VOLTAGE",
          "condition": "FLUCTUATION",
          "threshold": 10.0,
          "timeWindowSeconds": 30,
          "confidence": 0.75
        },
        {
          "type": "CURRENT",
          "condition": "FLUCTUATION",
          "threshold": 15.0,
          "timeWindowSeconds": 30,
          "confidence": 0.75
        },
        {
          "type": "IMPEDANCE",
          "condition": "CHANGE",
          "threshold": 20.0,
          "timeWindowSeconds": 60,
          "confidence": 0.8
        }
      ],
      "logic": "AT_LEAST_2",
      "severity": "HIGH",
      "actions": [
        {
          "type": "CREATE_ALERT",
          "parameters": {
            "alertType": "TAMPERING",
            "priority": "HIGH"
          }
        },
        {
          "type": "NOTIFY",
          "parameters": {
            "channels": ["EMAIL", "SMS"],
            "roles": ["ADMIN", "SECURITY_OFFICER", "SERVICE_TECH"]
          }
        }
      ],
      "throttling": {
        "maxAlertsPerHour": 3,
        "suppressDuplicatesSeconds": 600
      },
      "lastUpdated": "2025-03-20T10:15:00",
      "updatedBy": "admin@example.com"
    }
  ]
}
```

### Update Alerting Rules

**Endpoint:** `PUT /api/security/alerting-rules/{ruleId}`

**Path Parameters:**
- `ruleId`: ID of the alerting rule

**Description:** Update an alerting rule.

**Request Body:**
```json
{
  "name": "Enhanced Physical Tampering Detection",
  "description": "Improved detection of physical tampering with the device",
  "enabled": true,
  "triggers": [
    {
      "type": "ACCELEROMETER",
      "condition": "EXCEEDS",
      "threshold": 1.5,
      "timeWindowSeconds": 3,
      "confidence": 0.85
    },
    {
      "type": "ENCLOSURE",
      "condition": "EQUALS",
      "value": "OPEN",
      "confidence": 0.95
    },
    {
      "type": "ORIENTATION",
      "condition": "CHANGE",
      "threshold": 15.0,
      "timeWindowSeconds": 5,
      "confidence": 0.8
    }
  ],
  "logic": "ANY",
  "severity": "HIGH",
  "actions": [
    {
      "type": "CREATE_ALERT",
      "parameters": {
        "alertType": "TAMPERING",
        "priority": "HIGH"
      }
    },
    {
      "type": "NOTIFY",
      "parameters": {
        "channels": ["EMAIL", "SMS", "PUSH"],
        "roles": ["ADMIN", "SECURITY_OFFICER"]
      }
    },
    {
      "type": "COMMAND",
      "parameters": {
        "command": "CAPTURE_DIAGNOSTICS",
        "args": {
          "fullReport": true,
          "includeVideo": true
        }
      }
    },
    {
      "type": "COMMAND",
      "parameters": {
        "command": "ACTIVATE_TAMPER_MODE",
        "args": {
          "duration": 3600
        }
      }
    }
  ],
  "throttling": {
    "maxAlertsPerHour": 10,
    "suppressDuplicatesSeconds": 180
  }
}
```

**Sample Response:**
```json
{
  "id": 1,
  "name": "Enhanced Physical Tampering Detection",
  "previousVersion": {
    "name": "Physical Tampering Detection",
    "triggers": [
      {
        "type": "ACCELEROMETER",
        "threshold": 2.0,
        "timeWindowSeconds": 5,
        "confidence": 0.8
      },
      {
        "type": "ENCLOSURE",
        "value": "OPEN",
        "confidence": 0.9
      }
    ],
    "throttling": {
      "maxAlertsPerHour": 5,
      "suppressDuplicatesSeconds": 300
    }
  },
  "success": true,
  "timestamp": "2025-04-15T16:30:00",
  "message": "Alerting rule updated successfully",
  "changes": [
    {
      "field": "name",
      "previousValue": "Physical Tampering Detection",
      "newValue": "Enhanced Physical Tampering Detection"
    },
    {
      "field": "description",
      "previousValue": "Detects physical tampering with the device",
      "newValue": "Improved detection of physical tampering with the device"
    },
    {
      "field": "triggers[0].threshold",
      "previousValue": 2.0,
      "newValue": 1.5
    },
    {
      "field": "triggers[0].timeWindowSeconds",
      "previousValue": 5,
      "newValue": 3
    },
    {
      "field": "triggers[0].confidence",
      "previousValue": 0.8,
      "newValue": 0.85
    },
    {
      "field": "triggers.added",
      "previousValue": null,
      "newValue": "ORIENTATION change trigger"
    },
    {
      "field": "actions.added",
      "previousValue": null,
      "newValue": "ACTIVATE_TAMPER_MODE command"
    },
    {
      "field": "throttling.maxAlertsPerHour",
      "previousValue": 5,
      "newValue": 10
    },
    {
      "field": "throttling.suppressDuplicatesSeconds",
      "previousValue": 300,
      "newValue": 180
    }
  ]
}
```

## Testing Tips

1. **Authentication Requirements**:
   - All security endpoints require authentication
   - Admin endpoints require a user with the "ADMIN" role
   - Security officer endpoints require a user with the "SECURITY_OFFICER" role
   - Device-specific endpoints verify the device token

2. **Tampering Detection Best Practices**:
   - Use appropriate sensitivity levels based on installation environment
   - Configure notification settings according to severity
   - Test with simulated tampering events before deployment
   - Regularly review and update alerting rules

3. **Security Alert Response**:
   - Critical alerts should be addressed within 15 minutes
   - High severity alerts should be addressed within 1 hour
   - Create an incident response plan for different alert types
   - Document all steps taken to resolve security incidents

4. **Compliance Considerations**:
   - Different regions may have different regulatory requirements
   - Commercial installations typically have stricter compliance needs
   - Schedule regular compliance audits and verifications
   - Keep all documentation up to date

5. **Common HTTP Status Codes**:
   - 200: Success
   - 201: Created (for POST requests that create new resources)
   - 400: Bad Request (invalid input)
   - 401: Unauthorized (not logged in or invalid token)
   - 403: Forbidden (insufficient permissions)
   - 404: Not Found (resource doesn't exist)
   - 500: Server Error

6. **Security Performance Considerations**:
   - Alerting systems must be performant to handle real-time events
   - High volumes of security events may require specialized monitoring
   - Implement appropriate throttling to prevent alert fatigue
   - Consider geographic distribution for global deployments

7. **Debugging Security Issues**:
   - Use audit logs to trace security-related activities
   - Check tampering detection settings for false positives
   - Verify device authentication and encryption configurations
   - Review system logs for correlated events