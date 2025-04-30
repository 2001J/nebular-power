# Database Design

This document describes the database design for the Solar Energy Monitoring and Financing System, including the entity-relationship model, table structures, relationships, indexing strategy, and data migration approach.

## Entity-Relationship Diagram

The following diagram illustrates the main entities in the system and their relationships:

```
┌───────────────┐       ┌───────────────┐       ┌───────────────┐
│               │       │               │       │               │
│     User      │◄──────┤  Installation │◄──────┤  EnergyData   │
│               │       │               │       │               │
└───────────────┘       └───────────────┘       └───────────────┘
       ▲                       ▲                       ▲
       │                       │                       │
       │                       │                       │
       ▼                       ▼                       ▼
┌───────────────┐       ┌───────────────┐       ┌───────────────┐
│               │       │               │       │               │
│     Role      │       │EnergySummary  │       │  Payment      │
│               │       │               │       │               │
└───────────────┘       └───────────────┘       └───────────────┘
                                                       ▲
                                                       │
                                                       │
                                                       ▼
                                               ┌───────────────┐
                                               │               │
                                               │   Invoice     │
                                               │               │
                                               └───────────────┘
```

## Database Tables

### User Management Tables

#### User

Stores information about system users.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT | PK, NOT NULL | Unique identifier for the user |
| username | VARCHAR(50) | UNIQUE, NOT NULL | User's login name |
| email | VARCHAR(100) | UNIQUE, NOT NULL | User's email address |
| password | VARCHAR(255) | NOT NULL | Encrypted password |
| first_name | VARCHAR(50) | NOT NULL | User's first name |
| last_name | VARCHAR(50) | NOT NULL | User's last name |
| phone | VARCHAR(20) | | User's phone number |
| enabled | BOOLEAN | NOT NULL, DEFAULT TRUE | Whether the user account is active |
| account_non_expired | BOOLEAN | NOT NULL, DEFAULT TRUE | Whether the user account has expired |
| account_non_locked | BOOLEAN | NOT NULL, DEFAULT TRUE | Whether the user account is locked |
| credentials_non_expired | BOOLEAN | NOT NULL, DEFAULT TRUE | Whether the user's credentials have expired |
| created_at | TIMESTAMP | NOT NULL | When the user was created |
| updated_at | TIMESTAMP | NOT NULL | When the user was last updated |
| last_login | TIMESTAMP | | When the user last logged in |

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

#### Invoice

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

#### Invoice_Item

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

### Energy Monitoring Indexes

- `idx_energy_data_installation_timestamp`: Composite index on `EnergyData.installation_id` and `EnergyData.timestamp` for efficient time-series queries
- `idx_energy_summary_installation_period_date`: Composite index on `EnergySummary.installation_id`, `EnergySummary.period`, and `EnergySummary.date` for efficient summary retrieval
- `idx_installation_status`: Index on `SolarInstallation.status` for filtering installations by status

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

Migration scripts follow the naming convention:

```
V{version}__{description}.sql
```

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

For critical migrations, corresponding rollback scripts are created:

```
U{version}__{description}.sql
```

For example:
- `U3__alter_energy_data_add_efficiency.sql`

## Data Partitioning

For tables that are expected to grow significantly over time, partitioning strategies are implemented:

### Time-Based Partitioning

The `EnergyData` table is partitioned by month to improve query performance for time-range queries:

```sql
CREATE TABLE energy_data_y2023m01 PARTITION OF energy_data
    FOR VALUES FROM ('2023-01-01') TO ('2023-02-01');

CREATE TABLE energy_data_y2023m02 PARTITION OF energy_data
    FOR VALUES FROM ('2023-02-01') TO ('2023-03-01');
```

### Installation-Based Partitioning

For large-scale deployments with many installations, the `EnergySummary` table can be partitioned by installation ID ranges:

```sql
CREATE TABLE energy_summary_i0001_i1000 PARTITION OF energy_summary
    FOR VALUES FROM (1) TO (1001);

CREATE TABLE energy_summary_i1001_i2000 PARTITION OF energy_summary
    FOR VALUES FROM (1001) TO (2001);
```

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