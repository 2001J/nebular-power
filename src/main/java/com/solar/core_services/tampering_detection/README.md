# Tamper Detection Module

This module provides comprehensive tamper detection capabilities for solar installations, allowing for monitoring, detection, and response to potential tampering events.

## Key Features

- **Real-time Monitoring**: Continuous monitoring of solar installations for signs of tampering
- **Multiple Detection Types**: Detection of physical movement, voltage fluctuations, connection interruptions, and location changes
- **Configurable Sensitivity**: Adjustable thresholds for different types of tamper events
- **Automated Responses**: Configurable automatic responses to tampering based on severity
- **Security Logging**: Detailed logging of all security-related activities
- **Alert Management**: Configuration of alert levels, notification methods, and response actions
- **Scheduled Tasks**: Automated diagnostics and monitoring status checks

## Components

### Models

- **TamperEvent**: Represents a detected tampering event with details about type, severity, and status
- **TamperResponse**: Represents a response action taken for a tamper event
- **AlertConfig**: Configuration for alert levels and notification preferences
- **SecurityLog**: Log of security-related activities

### Services

- **TamperDetectionService**: Core service for monitoring installations and detecting tampering
- **TamperResponseService**: Service for managing responses to tamper events
- **AlertConfigService**: Service for managing alert configurations
- **SecurityLogService**: Service for logging security-related activities

### Controllers

- **TamperDetectionController**: API endpoints for tamper detection operations
- **TamperEventController**: API endpoints for managing tamper events
- **TamperResponseController**: API endpoints for managing tamper responses
- **AlertConfigController**: API endpoints for managing alert configurations
- **SecurityLogController**: API endpoints for accessing security logs

### Scheduler

- **TamperDetectionScheduler**: Scheduled tasks for diagnostics, alert escalation, and monitoring status checks

## API Endpoints

### Tamper Detection

- `POST /api/tamper-detection/start/{installationId}`: Start monitoring for an installation
- `POST /api/tamper-detection/stop/{installationId}`: Stop monitoring for an installation
- `GET /api/tamper-detection/status/{installationId}`: Check monitoring status
- `POST /api/tamper-detection/diagnostics/{installationId}`: Run diagnostics
- `POST /api/tamper-detection/sensitivity/{installationId}`: Adjust sensitivity thresholds

### Tamper Events

- `POST /api/tamper-events`: Create a new tamper event
- `GET /api/tamper-events/{id}`: Get a tamper event by ID
- `GET /api/tamper-events/installation/{installationId}`: Get tamper events for an installation
- `GET /api/tamper-events/user`: Get tamper events for the current user
- `POST /api/tamper-events/{id}/acknowledge`: Acknowledge a tamper event
- `POST /api/tamper-events/{id}/resolve`: Resolve a tamper event

### Tamper Responses

- `POST /api/tamper-responses`: Create a new tamper response
- `GET /api/tamper-responses/{id}`: Get a tamper response by ID
- `GET /api/tamper-responses/event/{eventId}`: Get responses for a tamper event
- `GET /api/tamper-responses/installation/{installationId}`: Get responses for an installation
- `POST /api/tamper-responses/execute/{eventId}`: Execute an automatic response

### Alert Configurations

- `GET /api/alert-configs/installation/{installationId}`: Get alert config for an installation
- `PUT /api/alert-configs/installation/{installationId}`: Update alert config for an installation
- `GET /api/alert-configs/user/{userId}`: Get alert configs for a user
- `GET /api/alert-configs/level/{level}`: Get alert configs by alert level

### Security Logs

- `GET /api/security-logs/installation/{installationId}`: Get security logs for an installation
- `GET /api/security-logs/activity/{activityType}`: Get security logs by activity type
- `GET /api/security-logs/user`: Get security logs for the current user

## Usage Examples

### Starting Monitoring

```java
// Inject the service
@Autowired
private TamperDetectionService tamperDetectionService;

// Start monitoring for an installation
tamperDetectionService.startMonitoring(installationId);
```

### Processing Sensor Data

```java
// Process physical movement data
tamperDetectionService.processPhysicalMovementData(
    installationId, 
    0.75, // movement value in g
    "{\"acceleration\": 0.75, \"timestamp\": \"2023-06-15T14:30:00\"}" // raw data
);

// Process voltage fluctuation data
tamperDetectionService.processVoltageFluctuationData(
    installationId,
    220.5, // voltage value
    "{\"voltage\": 220.5, \"normal_voltage\": 240, \"timestamp\": \"2023-06-18T09:15:00\"}" // raw data
);
```

### Configuring Alerts

```java
// Inject the service
@Autowired
private AlertConfigService alertConfigService;

// Update alert configuration
AlertConfig config = alertConfigService.getAlertConfigByInstallationId(installationId);
config.setAlertLevel(AlertConfig.AlertLevel.HIGH);
config.setNotificationEmail("user@example.com");
config.setAutoResponseEnabled(true);
alertConfigService.updateAlertConfig(config);
```

## Security Considerations

- All sensitive operations require appropriate authentication and authorization
- ADMIN role is required for most configuration and management operations
- CUSTOMER role has limited access to view their own installations and events
- All security-related activities are logged for audit purposes
- Automatic responses can be configured based on severity levels

## Integration Points

- Integrates with the User Management module for authentication and authorization
- Integrates with the Solar Installation module for installation data
- Can be extended to integrate with external notification systems (email, SMS, etc.)
- Can be extended to integrate with external security systems for advanced responses 