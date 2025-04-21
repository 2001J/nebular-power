# Energy Monitoring Service API Documentation

This document provides sample request/response examples for all endpoints in the Energy Monitoring Service, making it easier to test and understand the API.

## Table of Contents
- [Energy Data Endpoints](#energy-data-endpoints)
  - [Submit Energy Reading](#submit-energy-reading)
  - [Get Customer Dashboard](#get-customer-dashboard)
  - [Get Installation Dashboard](#get-installation-dashboard)
  - [Get Recent Readings](#get-recent-readings)
  - [Get Readings In Date Range](#get-readings-in-date-range)
  - [Get System Energy Data](#get-system-energy-data)
- [Energy Summaries Endpoints](#energy-summaries-endpoints)
  - [Get Daily Summaries](#get-daily-summaries)
  - [Get Weekly Summaries](#get-weekly-summaries)
  - [Get Monthly Summaries](#get-monthly-summaries)
  - [Get Summaries By Date Range](#get-summaries-by-date-range)
  - [Generate Daily Summary](#generate-daily-summary)
  - [Generate Weekly Summary](#generate-weekly-summary)
  - [Generate Monthly Summary](#generate-monthly-summary)
- [Installation Management Endpoints](#installation-management-endpoints)
  - [Get Installations By Customer](#get-installations-by-customer)
  - [Get Installation By ID](#get-installation-by-id)
  - [Create Installation](#create-installation)
  - [Update Installation](#update-installation)
  - [Update Device Status](#update-device-status)
  - [Get System Overview](#get-system-overview)
  - [Get Top Producers](#get-top-producers)
  - [Get Customer Distribution](#get-customer-distribution)

## Energy Data Endpoints

### Submit Energy Reading

**Endpoint:** `POST /monitoring/readings`

**Description:** Endpoint for devices to submit energy readings.

**Request Body:**
```json
{
  "installationId": 1,
  "deviceToken": "abc123-device-token",
  "timestamp": "2025-04-15T10:30:00",
  "powerGenerationWatts": 4235.75,
  "powerConsumptionWatts": 2850.25,
  "dailyYieldKWh": 12.456,
  "totalYieldKWh": 3456.789,
  "batteryLevel": 85.5,
  "voltage": 220.0,
  "currentAmps": 19.3
}
```

**Sample Response:**
```json
{
  "id": 1001,
  "installationId": 1,
  "timestamp": "2025-04-15T10:30:00",
  "powerGenerationWatts": 4235.75,
  "powerConsumptionWatts": 2850.25,
  "dailyYieldKWh": 12.456,
  "totalYieldKWh": 3456.789,
  "batteryLevel": 85.5,
  "voltage": 220.0,
  "currentAmps": 19.3,
  "efficiency": 0.78,
  "isSimulated": true
}
```

### Get Customer Dashboard

**Endpoint:** `GET /monitoring/dashboard/customer/{customerId}`

**Path Parameters:**
- `customerId`: ID of the customer

**Description:** Get current energy stats for a specific customer.

**Sample Request:**
```
GET /monitoring/dashboard/customer/1
```

**Sample Response:**
```json
{
  "customerName": "John Doe",
  "totalInstallations": 2,
  "activeInstallations": 2,
  "todayTotalGenerationKWh": 25.45,
  "todayTotalConsumptionKWh": 18.32,
  "currentPowerGenerationWatts": 3560.5,
  "currentPowerConsumptionWatts": 2100.0,
  "totalGenerationMTD": 350.65,
  "totalGenerationYTD": 4250.87,
  "averageEfficiency": 0.82,
  "recentReadings": [
    {
      "id": 1001,
      "installationId": 1,
      "timestamp": "2025-04-15T10:30:00",
      "powerGenerationWatts": 4235.75,
      "powerConsumptionWatts": 2850.25,
      "dailyYieldKWh": 12.456,
      "totalYieldKWh": 3456.789,
      "batteryLevel": 85.5,
      "efficiency": 0.78,
      "isSimulated": true
    },
    {
      "id": 999,
      "installationId": 1,
      "timestamp": "2025-04-15T10:00:00",
      "powerGenerationWatts": 4150.25,
      "powerConsumptionWatts": 2800.50,
      "dailyYieldKWh": 10.123,
      "totalYieldKWh": 3444.333,
      "batteryLevel": 86.0,
      "efficiency": 0.79,
      "isSimulated": true
    }
  ],
  "installations": [
    {
      "id": 1,
      "name": "Home Solar System",
      "installedCapacityKW": 5.0,
      "location": "123 Main St, Anytown",
      "installationDate": "2024-01-15T09:00:00",
      "status": "ACTIVE",
      "lastReading": {
        "timestamp": "2025-04-15T10:30:00",
        "powerGenerationWatts": 4235.75,
        "powerConsumptionWatts": 2850.25,
        "dailyYieldKWh": 12.456
      }
    },
    {
      "id": 2,
      "name": "Vacation Home System",
      "installedCapacityKW": 3.5,
      "location": "45 Beach Rd, Seaside",
      "installationDate": "2024-02-20T10:00:00",
      "status": "ACTIVE",
      "lastReading": {
        "timestamp": "2025-04-15T10:28:00",
        "powerGenerationWatts": 2850.50,
        "powerConsumptionWatts": 1500.25,
        "dailyYieldKWh": 8.345
      }
    }
  ]
}
```

### Get Installation Dashboard

**Endpoint:** `GET /monitoring/dashboard/installation/{installationId}`

**Path Parameters:**
- `installationId`: ID of the installation

**Description:** Get current energy stats for a specific installation.

**Sample Request:**
```
GET /monitoring/dashboard/installation/1
```

**Sample Response:**
```json
{
  "installationName": "Home Solar System",
  "installedCapacityKW": 5.0,
  "location": "123 Main St, Anytown",
  "installationDate": "2024-01-15T09:00:00",
  "status": "ACTIVE",
  "todayGenerationKWh": 12.456,
  "todayConsumptionKWh": 10.123,
  "currentPowerGenerationWatts": 4235.75,
  "currentPowerConsumptionWatts": 2850.25,
  "totalGenerationMTD": 180.75,
  "totalGenerationYTD": 2150.45,
  "currentEfficiency": 0.78,
  "averageEfficiency": 0.81,
  "lastUpdated": "2025-04-15T10:30:00",
  "totalYieldKWh": 3456.789,
  "recentReadings": [
    {
      "id": 1001,
      "timestamp": "2025-04-15T10:30:00",
      "powerGenerationWatts": 4235.75,
      "powerConsumptionWatts": 2850.25,
      "dailyYieldKWh": 12.456,
      "totalYieldKWh": 3456.789,
      "batteryLevel": 85.5,
      "efficiency": 0.78,
      "isSimulated": true
    },
    {
      "id": 999,
      "timestamp": "2025-04-15T10:00:00",
      "powerGenerationWatts": 4150.25,
      "powerConsumptionWatts": 2800.50,
      "dailyYieldKWh": 10.123,
      "totalYieldKWh": 3444.333,
      "batteryLevel": 86.0,
      "efficiency": 0.79,
      "isSimulated": true
    }
  ]
}
```

### Get Recent Readings

**Endpoint:** `GET /monitoring/readings/{installationId}/recent`

**Path Parameters:**
- `installationId`: ID of the installation

**Query Parameters:**
- `limit` (default: 10): Maximum number of readings to return

**Description:** Get recent energy readings for a specific installation.

**Sample Request:**
```
GET /monitoring/readings/1/recent?limit=5
```

**Sample Response:**
```json
[
  {
    "id": 1001,
    "installationId": 1,
    "timestamp": "2025-04-15T10:30:00",
    "powerGenerationWatts": 4235.75,
    "powerConsumptionWatts": 2850.25,
    "dailyYieldKWh": 12.456,
    "totalYieldKWh": 3456.789,
    "batteryLevel": 85.5,
    "voltage": 220.0,
    "currentAmps": 19.3,
    "efficiency": 0.78,
    "isSimulated": true
  },
  {
    "id": 999,
    "installationId": 1,
    "timestamp": "2025-04-15T10:00:00",
    "powerGenerationWatts": 4150.25,
    "powerConsumptionWatts": 2800.50,
    "dailyYieldKWh": 10.123,
    "totalYieldKWh": 3444.333,
    "batteryLevel": 86.0,
    "voltage": 220.0,
    "currentAmps": 18.9,
    "efficiency": 0.79,
    "isSimulated": true
  }
]
```

### Get Readings In Date Range

**Endpoint:** `GET /monitoring/readings/{installationId}/range`

**Path Parameters:**
- `installationId`: ID of the installation

**Query Parameters:**
- `startDate`: Start date and time in ISO-8601 format
- `endDate`: End date and time in ISO-8601 format

**Description:** Get energy readings for a specific installation within a date range.

**Sample Request:**
```
GET /monitoring/readings/1/range?startDate=2025-04-15T00:00:00&endDate=2025-04-15T23:59:59
```

**Sample Response:**
```json
[
  {
    "id": 1001,
    "installationId": 1,
    "timestamp": "2025-04-15T10:30:00",
    "powerGenerationWatts": 4235.75,
    "powerConsumptionWatts": 2850.25,
    "dailyYieldKWh": 12.456,
    "totalYieldKWh": 3456.789,
    "batteryLevel": 85.5,
    "voltage": 220.0,
    "currentAmps": 19.3,
    "efficiency": 0.78,
    "isSimulated": true
  },
  {
    "id": 999,
    "installationId": 1,
    "timestamp": "2025-04-15T10:00:00",
    "powerGenerationWatts": 4150.25,
    "powerConsumptionWatts": 2800.50,
    "dailyYieldKWh": 10.123,
    "totalYieldKWh": 3444.333,
    "batteryLevel": 86.0,
    "voltage": 220.0,
    "currentAmps": 18.9,
    "efficiency": 0.79,
    "isSimulated": true
  }
]
```

### Get System Energy Data

**Endpoint:** `GET /monitoring/admin/system-data/{period}`

**Path Parameters:**
- `period`: Time period (day, week, month, year)

**Description:** Get aggregated energy data for the entire system for a specific time period.

**Sample Request:**
```
GET /monitoring/admin/system-data/week
```

**Sample Response:**
```json
[
  {
    "date": "2025-04-09",
    "totalGenerationKWh": 1450.75,
    "totalConsumptionKWh": 980.25,
    "numberOfActiveInstallations": 45,
    "averageEfficiency": 0.81
  },
  {
    "date": "2025-04-10",
    "totalGenerationKWh": 1510.50,
    "totalConsumptionKWh": 1050.75,
    "numberOfActiveInstallations": 46,
    "averageEfficiency": 0.82
  },
  {
    "date": "2025-04-11",
    "totalGenerationKWh": 1480.25,
    "totalConsumptionKWh": 1030.50,
    "numberOfActiveInstallations": 47,
    "averageEfficiency": 0.82
  },
  {
    "date": "2025-04-12",
    "totalGenerationKWh": 1350.00,
    "totalConsumptionKWh": 920.75,
    "numberOfActiveInstallations": 47,
    "averageEfficiency": 0.80
  },
  {
    "date": "2025-04-13",
    "totalGenerationKWh": 1400.75,
    "totalConsumptionKWh": 950.25,
    "numberOfActiveInstallations": 47,
    "averageEfficiency": 0.81
  },
  {
    "date": "2025-04-14",
    "totalGenerationKWh": 1490.50,
    "totalConsumptionKWh": 1020.75,
    "numberOfActiveInstallations": 48,
    "averageEfficiency": 0.82
  },
  {
    "date": "2025-04-15",
    "totalGenerationKWh": 1520.25,
    "totalConsumptionKWh": 1060.50,
    "numberOfActiveInstallations": 48,
    "averageEfficiency": 0.83
  }
]
```

## Energy Summaries Endpoints

### Get Daily Summaries

**Endpoint:** `GET /monitoring/summaries/{installationId}/daily`

**Path Parameters:**
- `installationId`: ID of the installation

**Description:** Get daily energy summaries for a specific installation.

**Sample Request:**
```
GET /monitoring/summaries/1/daily
```

**Sample Response:**
```json
[
  {
    "id": 101,
    "installationId": 1,
    "date": "2025-04-15",
    "period": "DAILY",
    "totalGenerationKWh": 25.45,
    "totalConsumptionKWh": 18.32,
    "peakGenerationWatts": 4235.75,
    "peakConsumptionWatts": 2850.25,
    "averageEfficiency": 0.82,
    "averageBatteryLevel": 85.5,
    "carbonSaved": 12.25
  },
  {
    "id": 85,
    "installationId": 1,
    "date": "2025-04-14",
    "period": "DAILY",
    "totalGenerationKWh": 24.85,
    "totalConsumptionKWh": 17.95,
    "peakGenerationWatts": 4150.50,
    "peakConsumptionWatts": 2750.75,
    "averageEfficiency": 0.81,
    "averageBatteryLevel": 84.0,
    "carbonSaved": 11.95
  }
]
```

### Get Weekly Summaries

**Endpoint:** `GET /monitoring/summaries/{installationId}/weekly`

**Path Parameters:**
- `installationId`: ID of the installation

**Description:** Get weekly energy summaries for a specific installation.

**Sample Request:**
```
GET /monitoring/summaries/1/weekly
```

**Sample Response:**
```json
[
  {
    "id": 52,
    "installationId": 1,
    "date": "2025-04-13",
    "period": "WEEKLY",
    "totalGenerationKWh": 175.65,
    "totalConsumptionKWh": 125.45,
    "peakGenerationWatts": 4235.75,
    "peakConsumptionWatts": 2850.25,
    "averageEfficiency": 0.81,
    "averageBatteryLevel": 84.5,
    "carbonSaved": 85.32
  },
  {
    "id": 45,
    "installationId": 1,
    "date": "2025-04-06",
    "period": "WEEKLY",
    "totalGenerationKWh": 165.85,
    "totalConsumptionKWh": 120.75,
    "peakGenerationWatts": 4050.50,
    "peakConsumptionWatts": 2750.25,
    "averageEfficiency": 0.80,
    "averageBatteryLevel": 83.5,
    "carbonSaved": 80.25
  }
]
```

### Get Monthly Summaries

**Endpoint:** `GET /monitoring/summaries/{installationId}/monthly`

**Path Parameters:**
- `installationId`: ID of the installation

**Description:** Get monthly energy summaries for a specific installation.

**Sample Request:**
```
GET /monitoring/summaries/1/monthly
```

**Sample Response:**
```json
[
  {
    "id": 4,
    "installationId": 1,
    "date": "2025-04-01",
    "period": "MONTHLY",
    "totalGenerationKWh": 750.35,
    "totalConsumptionKWh": 525.85,
    "peakGenerationWatts": 4235.75,
    "peakConsumptionWatts": 2850.25,
    "averageEfficiency": 0.81,
    "averageBatteryLevel": 84.0,
    "carbonSaved": 360.45
  },
  {
    "id": 3,
    "installationId": 1,
    "date": "2025-03-01",
    "period": "MONTHLY",
    "totalGenerationKWh": 725.65,
    "totalConsumptionKWh": 510.45,
    "peakGenerationWatts": 4150.50,
    "peakConsumptionWatts": 2800.75,
    "averageEfficiency": 0.80,
    "averageBatteryLevel": 83.0,
    "carbonSaved": 350.75
  }
]
```

### Get Summaries By Date Range

**Endpoint:** `GET /monitoring/summaries/{installationId}/{period}/range`

**Path Parameters:**
- `installationId`: ID of the installation
- `period`: Summary period (DAILY, WEEKLY, MONTHLY)

**Query Parameters:**
- `startDate`: Start date in ISO-8601 format (yyyy-MM-dd)
- `endDate`: End date in ISO-8601 format (yyyy-MM-dd)

**Description:** Get energy summaries for a specific installation and period within a date range.

**Sample Request:**
```
GET /monitoring/summaries/1/DAILY/range?startDate=2025-04-01&endDate=2025-04-15
```

**Sample Response:**
```json
[
  {
    "id": 101,
    "installationId": 1,
    "date": "2025-04-15",
    "period": "DAILY",
    "totalGenerationKWh": 25.45,
    "totalConsumptionKWh": 18.32,
    "peakGenerationWatts": 4235.75,
    "peakConsumptionWatts": 2850.25,
    "averageEfficiency": 0.82,
    "averageBatteryLevel": 85.5,
    "carbonSaved": 12.25
  },
  {
    "id": 85,
    "installationId": 1,
    "date": "2025-04-14",
    "period": "DAILY",
    "totalGenerationKWh": 24.85,
    "totalConsumptionKWh": 17.95,
    "peakGenerationWatts": 4150.50,
    "peakConsumptionWatts": 2750.75,
    "averageEfficiency": 0.81,
    "averageBatteryLevel": 84.0,
    "carbonSaved": 11.95
  }
]
```

### Generate Daily Summary

**Endpoint:** `POST /monitoring/summaries/{installationId}/generate/daily`

**Path Parameters:**
- `installationId`: ID of the installation

**Query Parameters:**
- `date`: Date in ISO-8601 format (yyyy-MM-dd)

**Description:** Generate a daily summary for a specific installation and date.

**Sample Request:**
```
POST /monitoring/summaries/1/generate/daily?date=2025-04-15
```

**Sample Response:**
```json
{
  "id": 101,
  "installationId": 1,
  "date": "2025-04-15",
  "period": "DAILY",
  "totalGenerationKWh": 25.45,
  "totalConsumptionKWh": 18.32,
  "peakGenerationWatts": 4235.75,
  "peakConsumptionWatts": 2850.25,
  "averageEfficiency": 0.82,
  "averageBatteryLevel": 85.5,
  "carbonSaved": 12.25
}
```

### Generate Weekly Summary

**Endpoint:** `POST /monitoring/summaries/{installationId}/generate/weekly`

**Path Parameters:**
- `installationId`: ID of the installation

**Query Parameters:**
- `weekStartDate`: Start date of the week in ISO-8601 format (yyyy-MM-dd)

**Description:** Generate a weekly summary for a specific installation and week.

**Sample Request:**
```
POST /monitoring/summaries/1/generate/weekly?weekStartDate=2025-04-13
```

**Sample Response:**
```json
{
  "id": 52,
  "installationId": 1,
  "date": "2025-04-13",
  "period": "WEEKLY",
  "totalGenerationKWh": 175.65,
  "totalConsumptionKWh": 125.45,
  "peakGenerationWatts": 4235.75,
  "peakConsumptionWatts": 2850.25,
  "averageEfficiency": 0.81,
  "averageBatteryLevel": 84.5,
  "carbonSaved": 85.32
}
```

### Generate Monthly Summary

**Endpoint:** `POST /monitoring/summaries/{installationId}/generate/monthly`

**Path Parameters:**
- `installationId`: ID of the installation

**Query Parameters:**
- `monthStartDate`: Start date of the month in ISO-8601 format (yyyy-MM-dd)

**Description:** Generate a monthly summary for a specific installation and month.

**Sample Request:**
```
POST /monitoring/summaries/1/generate/monthly?monthStartDate=2025-04-01
```

**Sample Response:**
```json
{
  "id": 4,
  "installationId": 1,
  "date": "2025-04-01",
  "period": "MONTHLY",
  "totalGenerationKWh": 750.35,
  "totalConsumptionKWh": 525.85,
  "peakGenerationWatts": 4235.75,
  "peakConsumptionWatts": 2850.25,
  "averageEfficiency": 0.81,
  "averageBatteryLevel": 84.0,
  "carbonSaved": 360.45
}
```

## Installation Management Endpoints

### Get Installations By Customer

**Endpoint:** `GET /monitoring/installations/customer/{customerId}`

**Path Parameters:**
- `customerId`: ID of the customer

**Description:** Get all installations for a specific customer.

**Sample Request:**
```
GET /monitoring/installations/customer/1
```

**Sample Response:**
```json
[
  {
    "id": 1,
    "name": "Home Solar System",
    "userId": 1,
    "userName": "John Doe",
    "installedCapacityKW": 5.0,
    "location": "123 Main St, Anytown",
    "installationDate": "2024-01-15T09:00:00",
    "lastMaintenanceDate": "2025-02-15T14:30:00",
    "status": "ACTIVE",
    "type": "RESIDENTIAL",
    "deviceId": "DEV-2025-001",
    "firmwareVersion": "v1.2.3",
    "lastCommunication": "2025-04-15T10:30:00",
    "tamperDetected": false,
    "lastTamperCheck": "2025-04-15T09:00:00"
  },
  {
    "id": 2,
    "name": "Vacation Home System",
    "userId": 1,
    "userName": "John Doe",
    "installedCapacityKW": 3.5,
    "location": "45 Beach Rd, Seaside",
    "installationDate": "2024-02-20T10:00:00",
    "lastMaintenanceDate": "2025-03-10T11:15:00",
    "status": "ACTIVE",
    "type": "RESIDENTIAL",
    "deviceId": "DEV-2025-002",
    "firmwareVersion": "v1.2.3",
    "lastCommunication": "2025-04-15T10:28:00",
    "tamperDetected": false,
    "lastTamperCheck": "2025-04-15T09:15:00"
  }
]
```

### Get Installation By ID

**Endpoint:** `GET /monitoring/installations/{installationId}`

**Path Parameters:**
- `installationId`: ID of the installation

**Description:** Get details for a specific installation.

**Sample Request:**
```
GET /monitoring/installations/1
```

**Sample Response:**
```json
{
  "id": 1,
  "name": "Home Solar System",
  "userId": 1,
  "userName": "John Doe",
  "installedCapacityKW": 5.0,
  "location": "123 Main St, Anytown",
  "installationDate": "2024-01-15T09:00:00",
  "lastMaintenanceDate": "2025-02-15T14:30:00",
  "status": "ACTIVE",
  "type": "RESIDENTIAL",
  "deviceId": "DEV-2025-001",
  "firmwareVersion": "v1.2.3",
  "lastCommunication": "2025-04-15T10:30:00",
  "tamperDetected": false,
  "lastTamperCheck": "2025-04-15T09:00:00"
}
```

### Create Installation

**Endpoint:** `POST /monitoring/installations`

**Description:** Create a new solar installation.

**Request Body:**
```json
{
  "name": "New Solar System",
  "userId": 1,
  "installedCapacityKW": 6.0,
  "location": "789 Oak St, Newtown",
  "installationDate": "2025-04-10T10:00:00",
  "status": "ACTIVE",
  "type": "RESIDENTIAL",
  "deviceId": "DEV-2025-025"
}
```

**Sample Response:**
```json
{
  "id": 25,
  "name": "New Solar System",
  "userId": 1,
  "userName": "John Doe",
  "installedCapacityKW": 6.0,
  "location": "789 Oak St, Newtown",
  "installationDate": "2025-04-10T10:00:00",
  "lastMaintenanceDate": null,
  "status": "ACTIVE",
  "type": "RESIDENTIAL",
  "deviceId": "DEV-2025-025",
  "firmwareVersion": null,
  "lastCommunication": null,
  "tamperDetected": false,
  "lastTamperCheck": null
}
```

### Update Installation

**Endpoint:** `PUT /monitoring/installations/{installationId}`

**Path Parameters:**
- `installationId`: ID of the installation

**Description:** Update an existing solar installation.

**Request Body:**
```json
{
  "name": "Updated Solar System",
  "installedCapacityKW": 7.0,
  "location": "789 Oak St, Newtown",
  "status": "MAINTENANCE",
  "type": "RESIDENTIAL",
  "deviceId": "DEV-2025-025"
}
```

**Sample Response:**
```json
{
  "id": 25,
  "name": "Updated Solar System",
  "userId": 1,
  "userName": "John Doe",
  "installedCapacityKW": 7.0,
  "location": "789 Oak St, Newtown",
  "installationDate": "2025-04-10T10:00:00",
  "lastMaintenanceDate": "2025-04-15T11:30:00",
  "status": "MAINTENANCE",
  "type": "RESIDENTIAL",
  "deviceId": "DEV-2025-025",
  "firmwareVersion": "v1.2.3",
  "lastCommunication": "2025-04-15T11:00:00",
  "tamperDetected": false,
  "lastTamperCheck": "2025-04-15T10:00:00"
}
```

### Update Device Status

**Endpoint:** `POST /monitoring/installations/device-status`

**Description:** Update the status of a device.

**Request Body:**
```json
{
  "installationId": 1,
  "deviceToken": "abc123-device-token",
  "status": "ONLINE",
  "batteryLevel": 90.5,
  "signalStrength": 85,
  "firmwareVersion": "v1.2.4",
  "internalTemperature": 32.5,
  "lastError": null
}
```

**Sample Response:**
```json
{
  "id": 1,
  "name": "Home Solar System",
  "userId": 1,
  "userName": "John Doe",
  "installedCapacityKW": 5.0,
  "location": "123 Main St, Anytown",
  "installationDate": "2024-01-15T09:00:00",
  "lastMaintenanceDate": "2025-02-15T14:30:00",
  "status": "ACTIVE",
  "type": "RESIDENTIAL",
  "deviceId": "DEV-2025-001",
  "firmwareVersion": "v1.2.4",
  "lastCommunication": "2025-04-15T11:45:00",
  "tamperDetected": false,
  "lastTamperCheck": "2025-04-15T09:00:00",
  "batteryLevel": 90.5,
  "signalStrength": 85,
  "internalTemperature": 32.5
}
```

### Get System Overview

**Endpoint:** `GET /monitoring/admin/system-overview`

**Description:** Get an overview of the entire system's status and performance.

**Sample Request:**
```
GET /monitoring/admin/system-overview
```

**Sample Response:**
```json
{
  "totalInstallations": 48,
  "activeInstallations": 45,
  "inactiveInstallations": 3,
  "todayTotalGenerationKWh": 1520.25,
  "todayTotalConsumptionKWh": 1060.50,
  "currentTotalPowerGenerationWatts": 195250.75,
  "currentTotalPowerConsumptionWatts": 125850.25,
  "monthToDateGenerationKWh": 21450.65,
  "yearToDateGenerationKWh": 82550.87,
  "averageSystemEfficiency": 0.83,
  "alertCount": 3,
  "maintenanceCount": 2,
  "totalInstalledCapacityKW": 250.5,
  "recentlyActiveInstallations": [
    {
      "id": 1,
      "name": "Home Solar System",
      "userName": "John Doe",
      "status": "ACTIVE",
      "lastCommunication": "2025-04-15T10:30:00",
      "currentPowerGenerationWatts": 4235.75
    },
    {
      "id": 2,
      "name": "Vacation Home System",
      "userName": "John Doe",
      "status": "ACTIVE",
      "lastCommunication": "2025-04-15T10:28:00",
      "currentPowerGenerationWatts": 2850.50
    }
  ]
}
```

### Get Top Producers

**Endpoint:** `GET /monitoring/admin/top-producers`

**Description:** Get the top producing installations.

**Sample Request:**
```
GET /monitoring/admin/top-producers
```

**Sample Response:**
```json
[
  {
    "installationId": 10,
    "installationName": "Commercial Building A",
    "customerName": "ABC Corp",
    "installedCapacityKW": 25.0,
    "currentPowerGenerationWatts": 21500.75,
    "todayGenerationKWh": 125.45,
    "efficiency": 0.86,
    "utilizationRate": 0.92
  },
  {
    "installationId": 15,
    "installationName": "Industrial Plant B",
    "customerName": "XYZ Manufacturing",
    "installedCapacityKW": 30.0,
    "currentPowerGenerationWatts": 25750.50,
    "todayGenerationKWh": 145.75,
    "efficiency": 0.85,
    "utilizationRate": 0.90
  },
  {
    "installationId": 8,
    "installationName": "School Solar Array",
    "customerName": "Anytown School District",
    "installedCapacityKW": 20.0,
    "currentPowerGenerationWatts": 17250.25,
    "todayGenerationKWh": 95.35,
    "efficiency": 0.84,
    "utilizationRate": 0.89
  }
]
```

### Get Customer Distribution

**Endpoint:** `GET /monitoring/admin/customer-distribution`

**Description:** Get the distribution of installations by customer type.

**Sample Request:**
```
GET /monitoring/admin/customer-distribution
```

**Sample Response:**
```json
[
  {
    "name": "Residential",
    "value": 32,
    "percentage": 66.7
  },
  {
    "name": "Commercial",
    "value": 10,
    "percentage": 20.8
  },
  {
    "name": "Industrial",
    "value": 4,
    "percentage": 8.3
  },
  {
    "name": "Government",
    "value": 2,
    "percentage": 4.2
  }
]
```

## Testing Tips

1. **Authentication Requirements**:
   - Admin endpoints require a user with the "ADMIN" role
   - Customer endpoints authenticate the current user and only return their own data
   - Security checks prevent users from accessing other customers' installations

2. **WebSocket Support**:
   - Real-time updates are available via WebSocket connections
   - Clients can subscribe to topics:
     - `/topic/installation/{id}/energy-data`
     - `/topic/installation/{id}/status`
     - `/topic/installation/{id}/tamper-alert`
     - `/topic/admin/system-update`
     - `/topic/admin/tamper-alerts`

3. **Scheduled Tasks**:
   - Daily summaries are automatically generated at 1:00 AM
   - Weekly summaries are automatically generated on Mondays at 2:00 AM
   - Monthly summaries are automatically generated on the 1st of each month at 3:00 AM

4. **Performance Considerations**:
   - For date range queries, limit the range to avoid performance issues
   - Pagination is recommended for endpoints that return large lists

5. **Common HTTP Status Codes**:
   - 200: Success
   - 201: Created (for POST requests that create new resources)
   - 400: Bad Request (invalid input)
   - 401: Unauthorized (not logged in)
   - 403: Forbidden (insufficient permissions)
   - 404: Not Found (resource doesn't exist)
   - 500: Server Error

6. **Date Formats**:
   - All date fields use ISO-8601 format: "YYYY-MM-DDThh:mm:ss"
   - Date-only fields can use "YYYY-MM-DD"