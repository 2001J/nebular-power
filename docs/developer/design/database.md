# Database Design (as implemented)

This document reflects the entities and relationships defined in the codebase and keeps a tight link to source so it remains accurate.

## Overview & ER Sketch

```
User (users)
   ▲            
   │1..* owner
   │           
SolarInstallation (solar_installations)
   │1..*                │1..*                 │1..1
   ├── EnergyData       ├── EnergySummary     ├── AlertConfig (+ channels)
   ├── PaymentPlan ─┐   └── ServiceStatus     └── MonitoringStatus
   │                └── Payment ──┐
   │                                └── PaymentReminder
   ├── DeviceCommand
   └── OperationalLog

TamperEvent, SecurityLog → SolarInstallation
```

## Entities & Key Fields

Note: Types shown here are conceptual; see code excerpts for authoritative definitions.

### User (users)
- id (PK), email (unique), password, fullName, phoneNumber, role, enabled, emailVerified, passwordChangeRequired, failedLoginAttempts, accountLocked, lockTime, lastLogin, createdAt, updatedAt

Code excerpt
```java
@Entity @Table(name = "users")
public class User {
  @Id @GeneratedValue(strategy = IDENTITY) Long id;
  @Column(nullable=false, unique=true) String email;
  @Column(nullable=false) String password;
  @Enumerated(EnumType.STRING) @Column(nullable=false) UserRole role;
  @Column(nullable=false) boolean enabled = true;
  @Column(nullable=false) boolean emailVerified = false;
  @Column(name="last_login") LocalDateTime lastLogin;
}
```

#### Role

Stores information about user roles.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT | PK, NOT NULL | Unique identifier for the role |
| name | VARCHAR(50) | UNIQUE, NOT NULL | Role name (e.g., ROLE_ADMIN) |
| description | VARCHAR(255) | | Description of the role |
| created_at | TIMESTAMP | NOT NULL | When the role was created |
| updated_at | TIMESTAMP | NOT NULL | When the role was last updated |

#### User_Role

Maps users to roles (many-to-many relationship).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| user_id | BIGINT | PK, FK, NOT NULL | Reference to User.id |
| role_id | BIGINT | PK, FK, NOT NULL | Reference to Role.id |

#### User_Preference

Stores user preferences.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT | PK, NOT NULL | Unique identifier for the preference |
| user_id | BIGINT | FK, NOT NULL | Reference to User.id |
| preference_key | VARCHAR(50) | NOT NULL | Preference key |
| preference_value | VARCHAR(255) | | Preference value |
| created_at | TIMESTAMP | NOT NULL | When the preference was created |
| updated_at | TIMESTAMP | NOT NULL | When the preference was last updated |

### Energy Monitoring Tables

#### SolarInstallation

Stores information about solar installations.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT | PK, NOT NULL | Unique identifier for the installation |
| name | VARCHAR(100) | NOT NULL | Installation name |
| location | VARCHAR(255) | NOT NULL | Physical location of the installation |
| capacity_kw | DECIMAL(10,2) | NOT NULL | Installed capacity in kilowatts |
| installation_date | DATE | NOT NULL | When the installation was completed |
| status | VARCHAR(20) | NOT NULL | Current status (ACTIVE, INACTIVE, MAINTENANCE) |
| owner_id | BIGINT | FK, NOT NULL | Reference to User.id (owner) |
| created_at | TIMESTAMP | NOT NULL | When the record was created |
| updated_at | TIMESTAMP | NOT NULL | When the record was last updated |

#### EnergyData

Stores raw energy production and consumption data.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT | PK, NOT NULL | Unique identifier for the data point |
| installation_id | BIGINT | FK, NOT NULL | Reference to SolarInstallation.id |
| timestamp | TIMESTAMP | NOT NULL | When the data was recorded |
| power_output_kw | DECIMAL(10,2) | NOT NULL | Power output in kilowatts |
| energy_generated_kwh | DECIMAL(10,2) | NOT NULL | Energy generated in kilowatt-hours |
| energy_consumed_kwh | DECIMAL(10,2) | NOT NULL | Energy consumed in kilowatt-hours |
| temperature_celsius | DECIMAL(5,2) | | Panel temperature in Celsius |
| irradiance_w_m2 | DECIMAL(10,2) | | Solar irradiance in watts per square meter |
| efficiency_percentage | DECIMAL(5,2) | | Calculated efficiency percentage |
| created_at | TIMESTAMP | NOT NULL | When the record was created |

#### EnergySummary

Stores aggregated energy summaries.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT | PK, NOT NULL | Unique identifier for the summary |
| installation_id | BIGINT | FK, NOT NULL | Reference to SolarInstallation.id |
| period | VARCHAR(20) | NOT NULL | Summary period (DAILY, WEEKLY, MONTHLY, YEARLY) |
| date | DATE | NOT NULL | Date of the summary |
| total_generation_kwh | DECIMAL(10,2) | NOT NULL | Total energy generated in kilowatt-hours |
| total_consumption_kwh | DECIMAL(10,2) | NOT NULL | Total energy consumed in kilowatt-hours |
| peak_power_kw | DECIMAL(10,2) | NOT NULL | Peak power output in kilowatts |
| average_power_kw | DECIMAL(10,2) | NOT NULL | Average power output in kilowatts |
| efficiency_percentage | DECIMAL(5,2) | NOT NULL | Average efficiency percentage |
| weather_condition | VARCHAR(50) | | Average weather condition |
| created_at | TIMESTAMP | NOT NULL | When the summary was created |
| updated_at | TIMESTAMP | NOT NULL | When the summary was last updated |

#### Installation_User

Maps installations to users who have access to them (many-to-many relationship).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| installation_id | BIGINT | PK, FK, NOT NULL | Reference to SolarInstallation.id |
| user_id | BIGINT | PK, FK, NOT NULL | Reference to User.id |
| access_level | VARCHAR(20) | NOT NULL | Level of access (OWNER, MANAGER, VIEWER) |
| created_at | TIMESTAMP | NOT NULL | When the access was granted |

### Financial Management Tables

#### Payment

Stores payment information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT | PK, NOT NULL | Unique identifier for the payment |
| installation_id | BIGINT | FK, NOT NULL | Reference to SolarInstallation.id |
| amount | DECIMAL(10,2) | NOT NULL | Payment amount |
| currency | VARCHAR(3) | NOT NULL | Currency code (e.g., USD) |
| payment_date | DATE | NOT NULL | Date of payment |
| payment_method | VARCHAR(50) | NOT NULL | Method of payment |
| status | VARCHAR(20) | NOT NULL | Payment status (PENDING, COMPLETED, FAILED) |
| reference | VARCHAR(100) | | External payment reference |
| description | VARCHAR(255) | | Payment description |
| created_at | TIMESTAMP | NOT NULL | When the record was created |
| updated_at | TIMESTAMP | NOT NULL | When the record was last updated |

#### Invoice (not implemented)

Stores invoice information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT | PK, NOT NULL | Unique identifier for the invoice |
| installation_id | BIGINT | FK, NOT NULL | Reference to SolarInstallation.id |
| invoice_number | VARCHAR(50) | UNIQUE, NOT NULL | Invoice number |
| issue_date | DATE | NOT NULL | Date the invoice was issued |
| due_date | DATE | NOT NULL | Date the invoice is due |
| total_amount | DECIMAL(10,2) | NOT NULL | Total invoice amount |
| currency | VARCHAR(3) | NOT NULL | Currency code (e.g., USD) |
| status | VARCHAR(20) | NOT NULL | Invoice status (DRAFT, ISSUED, PAID, OVERDUE) |
| notes | TEXT | | Additional notes |
| created_at | TIMESTAMP | NOT NULL | When the record was created |
| updated_at | TIMESTAMP | NOT NULL | When the record was last updated |

#### Invoice_Item (not implemented)

Stores individual line items for invoices.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT | PK, NOT NULL | Unique identifier for the item |
| invoice_id | BIGINT | FK, NOT NULL | Reference to Invoice.id |
| description | VARCHAR(255) | NOT NULL | Item description |
| quantity | DECIMAL(10,2) | NOT NULL | Quantity |
| unit_price | DECIMAL(10,2) | NOT NULL | Price per unit |
| amount | DECIMAL(10,2) | NOT NULL | Total amount (quantity * unit_price) |
| created_at | TIMESTAMP | NOT NULL | When the record was created |

#### Financial_Parameter

Stores financial parameters for calculations.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT | PK, NOT NULL | Unique identifier for the parameter |
| installation_id | BIGINT | FK, NOT NULL | Reference to SolarInstallation.id |
| parameter_key | VARCHAR(50) | NOT NULL | Parameter key |
| parameter_value | DECIMAL(10,4) | NOT NULL | Parameter value |
| effective_date | DATE | NOT NULL | Date from which the parameter is effective |
| end_date | DATE | | Date until which the parameter is effective |
| created_at | TIMESTAMP | NOT NULL | When the record was created |
| updated_at | TIMESTAMP | NOT NULL | When the record was last updated |

### Notification Tables

#### Notification

Stores system notifications.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT | PK, NOT NULL | Unique identifier for the notification |
| user_id | BIGINT | FK, NOT NULL | Reference to User.id |
| title | VARCHAR(100) | NOT NULL | Notification title |
| message | TEXT | NOT NULL | Notification message |
| type | VARCHAR(20) | NOT NULL | Notification type (INFO, WARNING, ERROR, SUCCESS) |
| read | BOOLEAN | NOT NULL, DEFAULT FALSE | Whether the notification has been read |
| created_at | TIMESTAMP | NOT NULL | When the notification was created |
| read_at | TIMESTAMP | | When the notification was read |

#### Alert

Stores system alerts.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT | PK, NOT NULL | Unique identifier for the alert |
| installation_id | BIGINT | FK, NOT NULL | Reference to SolarInstallation.id |
| alert_type | VARCHAR(50) | NOT NULL | Type of alert |
| severity | VARCHAR(20) | NOT NULL | Alert severity (LOW, MEDIUM, HIGH, CRITICAL) |
| message | TEXT | NOT NULL | Alert message |
| status | VARCHAR(20) | NOT NULL | Alert status (ACTIVE, ACKNOWLEDGED, RESOLVED) |
| created_at | TIMESTAMP | NOT NULL | When the alert was created |
| acknowledged_at | TIMESTAMP | | When the alert was acknowledged |
| resolved_at | TIMESTAMP | | When the alert was resolved |
| acknowledged_by | BIGINT | FK | Reference to User.id who acknowledged the alert |
| resolved_by | BIGINT | FK | Reference to User.id who resolved the alert |

### System Tables

#### System_Configuration

Stores system configuration parameters.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT | PK, NOT NULL | Unique identifier for the configuration |
| config_key | VARCHAR(50) | UNIQUE, NOT NULL | Configuration key |
| config_value | TEXT | | Configuration value |
| description | VARCHAR(255) | | Description of the configuration |
| created_at | TIMESTAMP | NOT NULL | When the configuration was created |
| updated_at | TIMESTAMP | NOT NULL | When the configuration was last updated |

#### Audit_Log

Stores audit logs for system activities.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT | PK, NOT NULL | Unique identifier for the log entry |
| user_id | BIGINT | FK | Reference to User.id (null for system actions) |
| action | VARCHAR(50) | NOT NULL | Action performed |
| entity_type | VARCHAR(50) | NOT NULL | Type of entity affected |
| entity_id | BIGINT | | ID of the entity affected |
| details | TEXT | | Additional details about the action |
| ip_address | VARCHAR(45) | | IP address from which the action was performed |
| user_agent | VARCHAR(255) | | User agent information |
| timestamp | TIMESTAMP | NOT NULL | When the action occurred |

## Indexing Strategy

The following indexes are implemented to optimize query performance:

### User Management Indexes

- `idx_user_email`: Index on `User.email` for fast user lookup by email
- `idx_user_username`: Index on `User.username` for fast user lookup by username
- `idx_user_last_login`: Index on `User.last_login` for reporting on user activity

### Energy Monitoring Entities

SolarInstallation (solar_installations)
- id, name, installedCapacityKW/capacity, location, type, installationDate, status (ACTIVE/SUSPENDED/MAINTENANCE), tamperDetected, lastTamperCheck, user_id (FK)

Code excerpt
```java
@Entity @Table(name = "solar_installations")
public class SolarInstallation {
  @Id @GeneratedValue(strategy=IDENTITY) Long id;
  @Column(nullable=false) String name;
  @Column(nullable=false) String location;
  @Enumerated(EnumType.STRING) @Column(nullable=false) InstallationStatus status = ACTIVE;
  @ManyToOne(fetch=LAZY) @JoinColumn(name="user_id") User user;
}
```

EnergyData (energy_data)
- id, installation_id (FK), powerGenerationWatts, powerConsumptionWatts, timestamp, dailyYieldKWh, totalYieldKWh, isSimulated
- Index: (installation_id, timestamp) as `idx_energy_data_install_ts`

Code excerpt
```java
@Entity
@Table(name="energy_data", indexes={@Index(name="idx_energy_data_install_ts", columnList="installation_id,timestamp")})
public class EnergyData {
  @ManyToOne(fetch=LAZY) @JoinColumn(name="installation_id", nullable=false)
  private SolarInstallation installation;
  @Column(nullable=false) private double powerGenerationWatts;
  @Column(nullable=false) private LocalDateTime timestamp;
}
```

EnergySummary (energy_summaries)
- id, installation_id (FK), date, period (DAILY/WEEKLY/MONTHLY/YEARLY), totalGenerationKWh, totalConsumptionKWh, peakGenerationWatts, peakConsumptionWatts, efficiencyPercentage, readingsCount, periodStart, periodEnd

### Payment Compliance Entities

PaymentPlan (payment_plans)
- id, installation_id (FK), name, description, totalAmount, remainingAmount, numberOfPayments, installmentAmount, frequency, startDate, endDate, status, interestRate, lateFeeAmount, gracePeriodDays

Payment (payments)
- id, installation_id (FK), payment_plan_id (FK), amount, dueDate, paidAt, status, statusReason, statusUpdatedAt, daysOverdue, transactionId, paymentMethod, notes, lateFee, createdAt, updatedAt

Code excerpt
```java
@Entity @Table(name = "payments")
public class Payment {
  @ManyToOne @JoinColumn(name="installation_id", nullable=false)
  private SolarInstallation installation;
  @Enumerated(EnumType.STRING) @Column(nullable=false)
  private PaymentStatus status; // PENDING, PAID, OVERDUE, ...
}
```

PaymentReminder (payment_reminders)
- id, payment_id (FK), sentDate, reminderType, deliveryStatus, deliveryChannel, recipientAddress, messageContent, retryCount, lastRetryDate, errorMessage

ReminderConfig (reminder_configs)
- id, autoSendReminders, firstReminderDays, secondReminderDays, finalReminderDays, reminderMethod, createdAt, updatedAt, createdBy, updatedBy, version

GracePeriodConfig (grace_period_configs)
- id, numberOfDays, reminderFrequency, autoSuspendEnabled, lateFeesEnabled, lateFeePercentage, lateFeeFixedAmount, createdAt, updatedAt, createdBy, updatedBy, version

### Service Control Entities

ServiceStatus (service_status)
- id, installation_id (FK), status (ACTIVE, SUSPENDED_* …), updatedAt, updatedBy, scheduledChange, scheduledTime, statusReason, active

DeviceCommand (device_commands)
- id, installation_id (FK), command, parameters, status, sentAt, processedAt, expiresAt, responseMessage, initiatedBy, retryCount, lastRetryAt, correlationId

Code excerpt
```java
@Entity @Table(name = "device_commands")
public class DeviceCommand {
  @ManyToOne(fetch=LAZY) @JoinColumn(name="installation_id", nullable=false)
  private SolarInstallation installation;
  @Enumerated(EnumType.STRING) @Column(nullable = false)
  private CommandStatus status; // PENDING, SENT, EXECUTED, ...
}
```

OperationalLog (operational_logs)
- id, installation_id (FK), timestamp, operation, initiator, details, sourceSystem, sourceAction, ipAddress, userAgent, success, errorDetails

### Tampering Detection & Security Entities

TamperEvent (tamper_events)
- id, installation_id (FK), eventType, timestamp, severity, description, resolved, resolvedAt, resolvedBy, confidenceScore, rawSensorData, status

SecurityLog (security_logs)
- id, installation_id (FK), timestamp, activityType, details, ipAddress, location, userId

MonitoringStatus (tamper_monitoring_status)
- id, installation_id (FK), monitoring, updatedAt

AlertConfig (alert_configs) + alert_notification_channels
- id, installation_id (FK, unique), alertLevel, notificationChannels (EMAIL/SMS/PUSH/IN_APP), autoResponseEnabled, thresholds, samplingRateSeconds, createdAt, updatedAt

## Relationships
- SolarInstallation → User: many‑to‑one (owner)
- EnergyData, EnergySummary, PaymentPlan, Payment, ServiceStatus, DeviceCommand, OperationalLog, TamperEvent, SecurityLog → SolarInstallation: many‑to‑one
- Payment → PaymentPlan: many‑to‑one
- PaymentReminder → Payment: many‑to‑one
- AlertConfig → SolarInstallation: one‑to‑one; channels via element collection

## Indexing & Performance Notes
- energy_data has a composite index on (installation_id, timestamp).
- Consider adding indexes on common FK columns and date/status columns (e.g., payments.installation_id, payments.dueDate; service_status.installation_id; tamper_events.installation_id,timestamp).

## Schema Export / Migration
- H2 schema export is supported via `SchemaExportConfig` using properties:
  - `app.schema.export.enabled` (default false)
  - `app.schema.export.file` (default `target/schema.sql`)
  - `app.schema.export.include-data` (default false)
- Migrations (Flyway) are not configured in this repository; recommended if you plan multi‑env DB evolution.

## Short Code Excerpts (verified)
EnergyData fields
```java
@Table(name = "energy_data", indexes = {
  @Index(name = "idx_energy_data_install_ts", columnList = "installation_id,timestamp")
})
private SolarInstallation installation;
@Column(nullable = false) private double powerGenerationWatts;
@Column(nullable = false) private LocalDateTime timestamp;
```

Payment status enum
```java
public enum PaymentStatus {
  PENDING, PAID, OVERDUE, CANCELLED, REFUNDED,
  PARTIALLY_PAID, SCHEDULED, UPCOMING, DUE_TODAY,
  GRACE_PERIOD, SUSPENSION_PENDING
}
```

DeviceCommand timing fields
```java
@Column(nullable = false) private LocalDateTime sentAt;
@Column private LocalDateTime processedAt;
@Column private LocalDateTime expiresAt;
@PrePersist protected void onCreate() {
  if (sentAt == null) sentAt = LocalDateTime.now();
  if (status == null) status = CommandStatus.PENDING;
}
```

## Open Items / Gaps
- No migration tool configured (e.g., Flyway). Add migrations to manage schema changes across environments.
- Add DB indexes on high‑traffic FKs and date/status fields beyond those already present.
- Review monetary fields for consistent precision/scale and currency handling; consider enums for `paymentMethod`.
- Define retention/archiving strategy for large time‑series tables (EnergyData, SecurityLog, TamperEvent).
- Consider unique or partial indexes to enforce invariants (e.g., one active ServiceStatus per installation if required by business rules).

### Financial Management Indexes

- `idx_payment_installation_date`: Composite index on `Payment.installation_id` and `Payment.payment_date` for efficient payment history queries
- `idx_invoice_installation_status`: Composite index on `Invoice.installation_id` and `Invoice.status` for filtering invoices by status
- `idx_invoice_due_date`: Index on `Invoice.due_date` for identifying overdue invoices

### Notification Indexes

- `idx_notification_user_read`: Composite index on `Notification.user_id` and `Notification.read` for efficient retrieval of unread notifications
- `idx_alert_installation_status`: Composite index on `Alert.installation_id` and `Alert.status` for filtering active alerts

## Data Relationships

### One-to-Many Relationships

- User to SolarInstallation: One user can own multiple installations
- SolarInstallation to EnergyData: One installation can have multiple energy data points
- SolarInstallation to EnergySummary: One installation can have multiple energy summaries
- SolarInstallation to Payment: One installation can have multiple payments
- SolarInstallation to Invoice: One installation can have multiple invoices
- Invoice to Invoice_Item: One invoice can have multiple line items
- User to Notification: One user can have multiple notifications
- SolarInstallation to Alert: One installation can have multiple alerts

### Many-to-Many Relationships

- User to Role: Users can have multiple roles, and roles can be assigned to multiple users
- User to SolarInstallation: Users can have access to multiple installations, and installations can be accessed by multiple users

## Database Constraints

### Primary Keys

All tables have a primary key, typically an auto-incrementing `id` column.

### Foreign Keys

Foreign key constraints are implemented to maintain referential integrity:

- `User_Role.user_id` references `User.id`
- `User_Role.role_id` references `Role.id`
- `User_Preference.user_id` references `User.id`
- `SolarInstallation.owner_id` references `User.id`
- `EnergyData.installation_id` references `SolarInstallation.id`
- `EnergySummary.installation_id` references `SolarInstallation.id`
- `Installation_User.installation_id` references `SolarInstallation.id`
- `Installation_User.user_id` references `User.id`
- `Payment.installation_id` references `SolarInstallation.id`
- `Invoice.installation_id` references `SolarInstallation.id`
- `Invoice_Item.invoice_id` references `Invoice.id`
- `Financial_Parameter.installation_id` references `SolarInstallation.id`
- `Notification.user_id` references `User.id`
- `Alert.installation_id` references `SolarInstallation.id`
- `Alert.acknowledged_by` references `User.id`
- `Alert.resolved_by` references `User.id`
- `Audit_Log.user_id` references `User.id`

### Unique Constraints

- `User.email` is unique
- `User.username` is unique
- `Role.name` is unique
- `Invoice.invoice_number` is unique
- `System_Configuration.config_key` is unique

## Data Migration

The system uses Flyway for database migration management, which provides version control for the database schema and ensures consistent database states across environments.

### Migration Strategy

1. **Baseline Migration**: Initial schema creation with all tables, constraints, and indexes
2. **Incremental Migrations**: Subsequent changes to the schema are applied as incremental migrations
3. **Data Migrations**: When necessary, data migrations are performed to transform existing data to match schema changes

### Migration Naming Convention

Migration scripts typically follow the naming convention `V{version}__{description}.sql`.

For example:
- `V1__initial_schema.sql`
- `V2__add_weather_data_table.sql`
- `V3__alter_energy_data_add_efficiency.sql`

### Migration Process

1. **Development**: Migrations are created and tested in development environments
2. **Testing**: Migrations are applied to test environments to verify correctness
3. **Staging**: Migrations are applied to staging environments for final verification
4. **Production**: Migrations are applied to production during scheduled maintenance windows

### Rollback Strategy

For critical migrations, corresponding rollback scripts can be created, for example `U3__alter_energy_data_add_efficiency.sql`.

## Data Partitioning

Note: Table partitioning is not configured in this repository. The following strategies are optional for large datasets:

- Time‑based partitioning for `EnergyData` (e.g., monthly partitions) to improve time‑range queries.
- Installation ID range partitioning for `EnergySummary` in very large deployments.

## Data Archiving

To manage the growth of time-series data, an archiving strategy is implemented:

1. **Retention Policy**: Raw `EnergyData` is retained for 2 years
2. **Archiving Process**: Data older than the retention period is moved to archive tables
3. **Archive Access**: Archived data remains accessible through views that union current and archive tables
4. **Summarization**: Before archiving, data is summarized to preserve historical trends while reducing storage requirements

## Performance Considerations

### Query Optimization

- Queries are optimized to use indexes effectively
- Complex queries are analyzed using EXPLAIN to identify performance bottlenecks
- Materialized views are used for complex, frequently-accessed reports

### Connection Pooling

HikariCP is used for connection pooling with the following configuration:

- Maximum pool size: 10 connections per application instance
- Minimum idle connections: 5
- Connection timeout: 30 seconds
- Idle timeout: 10 minutes
- Maximum lifetime: 30 minutes

### Caching Strategy

- First-level cache: Hibernate's entity cache
- Second-level cache: Ehcache for frequently accessed, rarely changing data
- Query cache: For frequently executed queries with the same parameters

## Database Security

### Access Control

- Database users are created with the principle of least privilege
- Application connects to the database using a dedicated user with limited permissions
- Direct database access is restricted to database administrators

### Data Encryption

- Sensitive data (passwords, financial information) is encrypted before storage
- Transport Layer Security (TLS) is used for all database connections

### Audit Logging

- All significant database operations are logged in the `Audit_Log` table
- Database-level auditing is enabled for critical tables

## Backup and Recovery

### Backup Strategy

- Full database backups are performed daily
- Transaction log backups are performed hourly
- Backups are stored in multiple locations, including off-site storage

### Recovery Strategy

- Point-in-time recovery is supported through transaction log backups
- Recovery procedures are documented and tested regularly
- Recovery time objectives (RTO) and recovery point objectives (RPO) are defined and monitored
