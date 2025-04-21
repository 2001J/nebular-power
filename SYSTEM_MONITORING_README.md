# System Monitoring Service API Documentation

This document provides sample request/response examples for all endpoints in the System Monitoring Service, making it easier to test and understand the API.

## Table of Contents
- [Device Heartbeat Endpoints](#device-heartbeat-endpoints)
  - [Submit Device Heartbeat](#submit-device-heartbeat)
  - [Get Device Status](#get-device-status)
  - [Get System Health Overview](#get-system-health-overview)
- [Command Management Endpoints](#command-management-endpoints)
  - [Get Pending Commands](#get-pending-commands)
  - [Submit Command Response](#submit-command-response)
  - [Create Command](#create-command)
  - [Cancel Command](#cancel-command)
- [Operational Log Endpoints](#operational-log-endpoints)
  - [Get System Logs](#get-system-logs)
  - [Get Installation Logs](#get-installation-logs)
  - [Get Error Logs](#get-error-logs)
  - [Create Maintenance Log](#create-maintenance-log)
- [Health Check Endpoints](#health-check-endpoints)
  - [Run System Diagnostics](#run-system-diagnostics)
  - [Get Device Diagnostics](#get-device-diagnostics)
  - [Get Communication Quality](#get-communication-quality)

## Device Heartbeat Endpoints

### Submit Device Heartbeat

**Endpoint:** `POST /api/service/system/device-heartbeat`

**Description:** Endpoint for devices to submit periodic heartbeat signals.

**Request Body:**
```json
{
  "installationId": 1,
  "deviceId": "DEV-2025-001",
  "timestamp": "2025-04-15T10:30:00",
  "status": "ONLINE",
  "batteryLevel": 85.5,
  "powerStatus": true,
  "connectionType": "CELLULAR",
  "signalStrength": 92,
  "firmwareVersion": "v1.2.3",
  "diagnostics": {
    "cpuTemperature": 45.2,
    "memoryUsage": 512.5,
    "diskSpace": 2048.0,
    "uptime": 259200,
    "errorCodes": []
  }
}
```

**Sample Response:**
```json
{
  "success": true,
  "timestamp": "2025-04-15T10:30:05",
  "message": "Heartbeat processed successfully",
  "pendingCommandsCount": 0
}
```

### Get Device Status

**Endpoint:** `GET /api/service/system/device-status/{installationId}`

**Path Parameters:**
- `installationId`: ID of the installation

**Description:** Get the current status of a device.

**Sample Request:**
```
GET /api/service/system/device-status/1
```

**Sample Response:**
```json
{
  "installationId": 1,
  "deviceId": "DEV-2025-001",
  "lastHeartbeat": "2025-04-15T10:30:00",
  "status": "ONLINE",
  "batteryLevel": 85.5,
  "powerStatus": true,
  "connectionType": "CELLULAR",
  "signalStrength": 92,
  "firmwareVersion": "v1.2.3",
  "isResponsive": true,
  "timeoutWarning": false,
  "lowBatteryWarning": false,
  "poorConnectivityWarning": false,
  "diagnostics": {
    "cpuTemperature": 45.2,
    "memoryUsage": 512.5,
    "diskSpace": 2048.0,
    "uptime": 259200,
    "errorCodes": []
  }
}
```

### Get System Health Overview

**Endpoint:** `GET /api/service/system/health-overview`

**Description:** Get a system-wide health overview.

**Sample Request:**
```
GET /api/service/system/health-overview
```

**Sample Response:**
```json
{
  "totalDevices": 48,
  "onlineDevices": 45,
  "offlineDevices": 3,
  "devicesWithWarnings": 5,
  "averageBatteryLevel": 82.5,
  "averageSignalStrength": 87,
  "systemUptime": 3456789,
  "lastSystemCheck": "2025-04-15T10:00:00",
  "pendingCommands": 7,
  "recentErrors": [
    {
      "installationId": 12,
      "deviceId": "DEV-2025-012",
      "errorCode": "E001",
      "errorMessage": "Communication timeout",
      "timestamp": "2025-04-15T09:45:00",
      "severity": "WARNING"
    },
    {
      "installationId": 22,
      "deviceId": "DEV-2025-022",
      "errorCode": "E015",
      "errorMessage": "Low battery",
      "timestamp": "2025-04-15T09:30:00",
      "severity": "WARNING"
    }
  ],
  "deviceStatusSummary": [
    {
      "status": "ONLINE",
      "count": 45,
      "percentage": 93.75
    },
    {
      "status": "OFFLINE",
      "count": 2,
      "percentage": 4.17
    },
    {
      "status": "ERROR",
      "count": 1,
      "percentage": 2.08
    }
  ]
}
```

## Command Management Endpoints

### Get Pending Commands

**Endpoint:** `GET /api/service/commands/{installationId}`

**Path Parameters:**
- `installationId`: ID of the installation

**Description:** Retrieve pending commands for a specific installation.

**Sample Request:**
```
GET /api/service/commands/1
```

**Sample Response:**
```json
[
  {
    "id": 15,
    "installationId": 1,
    "deviceId": "DEV-2025-001",
    "commandType": "RESTART_DEVICE",
    "parameters": {
      "delaySeconds": 30,
      "preserveSettings": true
    },
    "priority": "HIGH",
    "status": "PENDING",
    "createdAt": "2025-04-15T09:30:00",
    "expiresAt": "2025-04-15T21:30:00",
    "lastAttempt": null,
    "attemptCount": 0,
    "createdBy": "admin@example.com"
  },
  {
    "id": 16,
    "installationId": 1,
    "deviceId": "DEV-2025-001",
    "commandType": "UPDATE_FIRMWARE",
    "parameters": {
      "firmwareUrl": "https://updates.solarsystem.com/firmware/v1.2.4.bin",
      "firmwareVersion": "v1.2.4",
      "md5Hash": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
      "installAfterReboot": true
    },
    "priority": "MEDIUM",
    "status": "PENDING",
    "createdAt": "2025-04-15T10:00:00",
    "expiresAt": "2025-04-16T10:00:00",
    "lastAttempt": null,
    "attemptCount": 0,
    "createdBy": "admin@example.com"
  }
]
```

### Submit Command Response

**Endpoint:** `POST /api/service/system/command-response`

**Description:** Submit the response to a command.

**Request Body:**
```json
{
  "commandId": 15,
  "installationId": 1,
  "deviceId": "DEV-2025-001",
  "status": "COMPLETED",
  "timestamp": "2025-04-15T10:35:00",
  "result": "SUCCESS",
  "message": "Device restarted successfully",
  "diagnostics": {
    "executionTime": 25.5,
    "memoryUsage": 480.2
  }
}
```

**Sample Response:**
```json
{
  "success": true,
  "timestamp": "2025-04-15T10:35:05",
  "message": "Command response processed successfully",
  "command": {
    "id": 15,
    "status": "COMPLETED",
    "completedAt": "2025-04-15T10:35:00"
  }
}
```

### Create Command

**Endpoint:** `POST /api/service/commands`

**Description:** Create a new command for a device.

**Request Body:**
```json
{
  "installationId": 1,
  "deviceId": "DEV-2025-001",
  "commandType": "COLLECT_DIAGNOSTICS",
  "parameters": {
    "fullReport": true,
    "includePowerProfile": true,
    "includeNetworkDiagnostics": true
  },
  "priority": "MEDIUM",
  "expiresAt": "2025-04-16T10:30:00"
}
```

**Sample Response:**
```json
{
  "id": 17,
  "installationId": 1,
  "deviceId": "DEV-2025-001",
  "commandType": "COLLECT_DIAGNOSTICS",
  "parameters": {
    "fullReport": true,
    "includePowerProfile": true,
    "includeNetworkDiagnostics": true
  },
  "priority": "MEDIUM",
  "status": "PENDING",
  "createdAt": "2025-04-15T10:40:00",
  "expiresAt": "2025-04-16T10:30:00",
  "lastAttempt": null,
  "attemptCount": 0,
  "createdBy": "admin@example.com"
}
```

### Cancel Command

**Endpoint:** `DELETE /api/service/commands/{commandId}`

**Path Parameters:**
- `commandId`: ID of the command

**Description:** Cancel a pending command.

**Sample Request:**
```
DELETE /api/service/commands/17
```

**Sample Response:**
```json
{
  "success": true,
  "timestamp": "2025-04-15T10:45:00",
  "message": "Command canceled successfully",
  "command": {
    "id": 17,
    "status": "CANCELED",
    "canceledAt": "2025-04-15T10:45:00"
  }
}
```

## Operational Log Endpoints

### Get System Logs

**Endpoint:** `GET /api/service/logs/system`

**Query Parameters:**
- `startDate` (optional): Start date in ISO-8601 format
- `endDate` (optional): End date in ISO-8601 format
- `severity` (optional): Log severity (INFO, WARNING, ERROR, CRITICAL)
- `page` (optional): Page number for pagination
- `size` (optional): Number of logs per page

**Description:** Get system-wide operational logs.

**Sample Request:**
```
GET /api/service/logs/system?severity=WARNING&startDate=2025-04-14T00:00:00&endDate=2025-04-15T23:59:59&page=0&size=10
```

**Sample Response:**
```json
{
  "logs": [
    {
      "id": 1245,
      "timestamp": "2025-04-15T09:45:00",
      "installationId": 12,
      "deviceId": "DEV-2025-012",
      "category": "COMMUNICATION",
      "severity": "WARNING",
      "message": "Communication timeout after 3 attempts",
      "details": {
        "lastSuccessfulCommunication": "2025-04-15T06:30:00",
        "attemptCount": 3,
        "networkType": "CELLULAR"
      }
    },
    {
      "id": 1238,
      "timestamp": "2025-04-15T09:30:00",
      "installationId": 22,
      "deviceId": "DEV-2025-022",
      "category": "POWER",
      "severity": "WARNING",
      "message": "Low battery detected: 15.5%",
      "details": {
        "batteryLevel": 15.5,
        "estimatedRemainingTime": "4h 30m",
        "charging": false
      }
    }
  ],
  "page": 0,
  "size": 10,
  "totalElements": 2,
  "totalPages": 1
}
```

### Get Installation Logs

**Endpoint:** `GET /api/service/logs/installation/{installationId}`

**Path Parameters:**
- `installationId`: ID of the installation

**Query Parameters:**
- `startDate` (optional): Start date in ISO-8601 format
- `endDate` (optional): End date in ISO-8601 format
- `severity` (optional): Log severity (INFO, WARNING, ERROR, CRITICAL)
- `page` (optional): Page number for pagination
- `size` (optional): Number of logs per page

**Description:** Get operational logs for a specific installation.

**Sample Request:**
```
GET /api/service/logs/installation/1?startDate=2025-04-14T00:00:00&endDate=2025-04-15T23:59:59&page=0&size=10
```

**Sample Response:**
```json
{
  "logs": [
    {
      "id": 1250,
      "timestamp": "2025-04-15T10:35:00",
      "installationId": 1,
      "deviceId": "DEV-2025-001",
      "category": "COMMAND",
      "severity": "INFO",
      "message": "Device restart command executed successfully",
      "details": {
        "commandId": 15,
        "executionTime": 25.5,
        "status": "COMPLETED"
      }
    },
    {
      "id": 1230,
      "timestamp": "2025-04-15T09:00:00",
      "installationId": 1,
      "deviceId": "DEV-2025-001",
      "category": "SYSTEM",
      "severity": "INFO",
      "message": "Daily system check completed",
      "details": {
        "checkDuration": 45.2,
        "checksCompleted": ["memory", "storage", "connectivity", "sensors"],
        "status": "PASSED"
      }
    }
  ],
  "page": 0,
  "size": 10,
  "totalElements": 2,
  "totalPages": 1
}
```

### Get Error Logs

**Endpoint:** `GET /api/service/logs/errors`

**Query Parameters:**
- `startDate` (optional): Start date in ISO-8601 format
- `endDate` (optional): End date in ISO-8601 format
- `errorCode` (optional): Specific error code
- `page` (optional): Page number for pagination
- `size` (optional): Number of logs per page

**Description:** Get error logs across the system.

**Sample Request:**
```
GET /api/service/logs/errors?startDate=2025-04-14T00:00:00&endDate=2025-04-15T23:59:59&page=0&size=10
```

**Sample Response:**
```json
{
  "logs": [
    {
      "id": 1245,
      "timestamp": "2025-04-15T09:45:00",
      "installationId": 12,
      "deviceId": "DEV-2025-012",
      "category": "COMMUNICATION",
      "severity": "WARNING",
      "errorCode": "E001",
      "message": "Communication timeout after 3 attempts",
      "details": {
        "lastSuccessfulCommunication": "2025-04-15T06:30:00",
        "attemptCount": 3,
        "networkType": "CELLULAR"
      }
    },
    {
      "id": 1238,
      "timestamp": "2025-04-15T09:30:00",
      "installationId": 22,
      "deviceId": "DEV-2025-022",
      "category": "POWER",
      "severity": "WARNING",
      "errorCode": "E015",
      "message": "Low battery detected: 15.5%",
      "details": {
        "batteryLevel": 15.5,
        "estimatedRemainingTime": "4h 30m",
        "charging": false
      }
    }
  ],
  "errorCodeSummary": [
    {
      "errorCode": "E001",
      "count": 1,
      "percentage": 50.0
    },
    {
      "errorCode": "E015",
      "count": 1,
      "percentage": 50.0
    }
  ],
  "page": 0,
  "size": 10,
  "totalElements": 2,
  "totalPages": 1
}
```

### Create Maintenance Log

**Endpoint:** `POST /api/service/logs/maintenance`

**Description:** Log a maintenance activity.

**Request Body:**
```json
{
  "installationId": 1,
  "deviceId": "DEV-2025-001",
  "maintenanceType": "SCHEDULED",
  "maintenanceDate": "2025-04-15T13:00:00",
  "technician": "John Smith",
  "actions": [
    "Cleaned solar panels",
    "Replaced battery connectors",
    "Updated firmware to v1.2.4"
  ],
  "notes": "System performance improved by approximately 15% after maintenance",
  "nextScheduledMaintenance": "2025-07-15T13:00:00"
}
```

**Sample Response:**
```json
{
  "id": 1260,
  "installationId": 1,
  "deviceId": "DEV-2025-001",
  "timestamp": "2025-04-15T13:00:00",
  "category": "MAINTENANCE",
  "severity": "INFO",
  "message": "Scheduled maintenance completed by John Smith",
  "details": {
    "maintenanceType": "SCHEDULED",
    "technician": "John Smith",
    "actions": [
      "Cleaned solar panels",
      "Replaced battery connectors",
      "Updated firmware to v1.2.4"
    ],
    "notes": "System performance improved by approximately 15% after maintenance",
    "nextScheduledMaintenance": "2025-07-15T13:00:00"
  }
}
```

## Health Check Endpoints

### Run System Diagnostics

**Endpoint:** `POST /api/service/system/diagnostics`

**Description:** Run a system-wide diagnostic check.

**Request Body:**
```json
{
  "checkLevels": ["BASIC", "NETWORK", "STORAGE", "PERFORMANCE"],
  "includeOfflineDevices": false,
  "generateReport": true
}
```

**Sample Response:**
```json
{
  "diagnosticId": "DIAG-2025-04-15-001",
  "timestamp": "2025-04-15T14:00:00",
  "status": "COMPLETED",
  "devicesTested": 45,
  "devicesPassed": 43,
  "devicesFailed": 2,
  "executionTimeSeconds": 120,
  "summary": "System diagnostics completed successfully with 2 devices reporting issues",
  "reportUrl": "/api/service/system/diagnostics/DIAG-2025-04-15-001/report",
  "issues": [
    {
      "installationId": 12,
      "deviceId": "DEV-2025-012",
      "category": "NETWORK",
      "severity": "WARNING",
      "message": "Poor signal strength: 25%",
      "recommendedAction": "Check antenna positioning or consider signal booster"
    },
    {
      "installationId": 22,
      "deviceId": "DEV-2025-022",
      "category": "POWER",
      "severity": "WARNING",
      "message": "Battery health degraded to 65%",
      "recommendedAction": "Schedule battery replacement within next 3 months"
    }
  ]
}
```

### Get Device Diagnostics

**Endpoint:** `GET /api/service/system/device-diagnostics/{installationId}`

**Path Parameters:**
- `installationId`: ID of the installation

**Description:** Get detailed diagnostics for a specific device.

**Sample Request:**
```
GET /api/service/system/device-diagnostics/1
```

**Sample Response:**
```json
{
  "installationId": 1,
  "deviceId": "DEV-2025-001",
  "timestamp": "2025-04-15T14:15:00",
  "systemInfo": {
    "firmwareVersion": "v1.2.3",
    "hardwareVersion": "H2023-REV-B",
    "serialNumber": "SN12345678",
    "manufacturerDate": "2023-11-15",
    "uptime": 1209600,
    "lastReboot": "2025-04-01T00:00:00"
  },
  "powerStatus": {
    "batteryLevel": 85.5,
    "batteryHealth": 92.0,
    "chargingStatus": "CHARGING",
    "solarInputVoltage": 18.5,
    "solarInputCurrent": 2.7,
    "batteryTemperature": 28.5,
    "estimatedRemainingTime": "72h 30m"
  },
  "networkStatus": {
    "connectionType": "CELLULAR",
    "signalStrength": 92,
    "ipAddress": "10.45.67.89",
    "lastConnectionTime": "2025-04-15T14:10:00",
    "packetLoss": 0.5,
    "latency": 120.5
  },
  "storageStatus": {
    "totalSpace": 8192.0,
    "usedSpace": 2048.0,
    "freeSpace": 6144.0,
    "healthStatus": "GOOD",
    "readSpeed": 25.6,
    "writeSpeed": 18.3
  },
  "performanceMetrics": {
    "cpuUsage": 15.5,
    "memoryUsage": 512.5,
    "cpuTemperature": 45.2,
    "averageProcessingTime": 65.3,
    "maxProcessingTime": 150.2
  },
  "selfTestResults": {
    "status": "PASSED",
    "testsRun": [
      {
        "name": "Memory Test",
        "result": "PASSED",
        "details": "All memory blocks accessible and functioning"
      },
      {
        "name": "Storage Test",
        "result": "PASSED",
        "details": "No bad sectors detected"
      },
      {
        "name": "Sensor Test",
        "result": "PASSED",
        "details": "All sensors reporting expected values"
      },
      {
        "name": "Network Test",
        "result": "PASSED",
        "details": "Network connectivity stable with good signal strength"
      }
    ]
  }
}
```

### Get Communication Quality

**Endpoint:** `GET /api/service/system/communication-quality/{installationId}`

**Path Parameters:**
- `installationId`: ID of the installation

**Query Parameters:**
- `days` (optional): Number of days to analyze, default is 7

**Description:** Get communication quality metrics for a specific installation.

**Sample Request:**
```
GET /api/service/system/communication-quality/1?days=7
```

**Sample Response:**
```json
{
  "installationId": 1,
  "deviceId": "DEV-2025-001",
  "startDate": "2025-04-09T00:00:00",
  "endDate": "2025-04-15T23:59:59",
  "overallQuality": "EXCELLENT",
  "reliabilityScore": 98.5,
  "averageLatency": 135.6,
  "packetLossPercentage": 0.75,
  "uptime": 99.97,
  "signalStrengthAverage": 90.5,
  "signalStrengthVariance": 2.3,
  "disconnections": 2,
  "communicationIssues": 1,
  "dailyMetrics": [
    {
      "date": "2025-04-09",
      "averageSignalStrength": 89.5,
      "packetLoss": 0.8,
      "latency": 140.2,
      "uptime": 100.0,
      "disconnections": 0
    },
    {
      "date": "2025-04-10",
      "averageSignalStrength": 90.2,
      "packetLoss": 0.7,
      "latency": 138.5,
      "uptime": 100.0,
      "disconnections": 0
    },
    {
      "date": "2025-04-11",
      "averageSignalStrength": 91.0,
      "packetLoss": 0.6,
      "latency": 135.0,
      "uptime": 100.0,
      "disconnections": 0
    },
    {
      "date": "2025-04-12",
      "averageSignalStrength": 92.5,
      "packetLoss": 0.5,
      "latency": 130.3,
      "uptime": 100.0,
      "disconnections": 0
    },
    {
      "date": "2025-04-13",
      "averageSignalStrength": 91.8,
      "packetLoss": 0.6,
      "latency": 132.1,
      "uptime": 100.0,
      "disconnections": 0
    },
    {
      "date": "2025-04-14",
      "averageSignalStrength": 85.5,
      "packetLoss": 1.5,
      "latency": 165.8,
      "uptime": 99.8,
      "disconnections": 1
    },
    {
      "date": "2025-04-15",
      "averageSignalStrength": 92.8,
      "packetLoss": 0.5,
      "latency": 128.7,
      "uptime": 99.95,
      "disconnections": 1
    }
  ]
}
```

## Testing Tips

1. **Authentication Requirements**:
   - All system monitoring endpoints require authentication
   - Device-specific endpoints verify the device token
   - Admin endpoints require a user with the "ADMIN" role
   - Service technician endpoints require a user with the "SERVICE_TECH" role

2. **Device Heartbeat Frequency**:
   - Devices should send heartbeats every 5-15 minutes
   - Devices are considered unresponsive if no heartbeat is received for 30 minutes
   - Critical devices may have stricter heartbeat requirements

3. **Command Processing**:
   - Commands have priorities (LOW, MEDIUM, HIGH, CRITICAL)
   - Devices should process commands in priority order
   - Commands with expired timestamps should be ignored
   - Failed commands will be retried up to 3 times by default

4. **Error Handling**:
   - Error codes follow a standardized format (e.g., E001, E002)
   - Complete error code documentation is available in the Error Handling Guide
   - Proper error reporting helps with remote diagnostics and problem resolution

5. **Common HTTP Status Codes**:
   - 200: Success
   - 201: Created (for POST requests that create new resources)
   - 400: Bad Request (invalid input)
   - 401: Unauthorized (not logged in or invalid device token)
   - 403: Forbidden (insufficient permissions)
   - 404: Not Found (resource doesn't exist)
   - 500: Server Error

6. **Performance Considerations**:
   - For date range queries, limit the range to avoid performance issues
   - Diagnostics can be resource-intensive, especially for large installations
   - Use the appropriate diagnostic level when troubleshooting

7. **Security Notes**:
   - All API calls are logged for security and audit purposes
   - Devices use token-based authentication with regular rotation
   - Communication is encrypted using TLS
   - Device commands require proper authorization