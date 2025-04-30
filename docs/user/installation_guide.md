# Installation Guide

This guide provides step-by-step instructions for installing and configuring the Solar Energy Monitoring and Financing System. Please ensure that your environment meets the [system requirements](./system_requirements.md) before proceeding with the installation.

## Prerequisites

Before installing the system, ensure you have the following:

1. **Java Development Kit (JDK)**: OpenJDK 21 or compatible JDK installed
2. **Database**: PostgreSQL 14 or newer installed and running
3. **Web Server**: Apache Tomcat 10 or newer (optional, as Spring Boot includes an embedded server)
4. **Maven**: Apache Maven 3.8 or newer for building from source (optional)
5. **Git**: Git version control system (optional, for cloning the repository)

## Installation Options

The Solar Energy Monitoring and Financing System can be installed using one of the following methods:

1. **Docker Deployment** (Recommended for quick setup)
2. **Manual Installation** (For customized deployments)
3. **Cloud Deployment** (For scalable, managed environments)

## 1. Docker Deployment

Docker provides the easiest way to get the system up and running quickly.

### Step 1: Install Docker

If you don't have Docker installed, follow the instructions for your operating system:
- [Docker for Windows](https://docs.docker.com/desktop/install/windows-install/)
- [Docker for macOS](https://docs.docker.com/desktop/install/mac-install/)
- [Docker for Linux](https://docs.docker.com/engine/install/)

### Step 2: Clone the Repository

```bash
git clone https://github.com/your-organization/solar-energy-system.git
cd solar-energy-system
```

### Step 3: Configure Environment Variables

Create a `.env` file in the project root directory with the following variables:

```
DB_HOST=postgres
DB_PORT=5432
DB_NAME=solar_db
DB_USER=solar_user
DB_PASSWORD=your_secure_password
JWT_SECRET=your_jwt_secret_key
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=initial_admin_password
```

Adjust the values according to your environment.

### Step 4: Start the Containers

```bash
docker-compose up -d
```

This command will start the following containers:
- PostgreSQL database
- Solar Energy System backend
- Solar Energy System frontend
- Nginx web server (for serving the frontend and proxying API requests)

### Step 5: Verify Installation

Open your web browser and navigate to:
```
http://localhost:8080
```

You should see the login page of the Solar Energy Monitoring and Financing System.

## 2. Manual Installation

### Step 1: Install and Configure PostgreSQL

1. Install PostgreSQL following the [official documentation](https://www.postgresql.org/download/)
2. Create a database and user:

```sql
CREATE DATABASE solar_db;
CREATE USER solar_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE solar_db TO solar_user;
```

### Step 2: Download and Configure the Application

1. Download the latest release from the [releases page](https://github.com/your-organization/solar-energy-system/releases)
2. Extract the archive to your desired location
3. Configure the application by editing `application.properties`:

```properties
# Database Configuration
spring.datasource.url=jdbc:postgresql://localhost:5432/solar_db
spring.datasource.username=solar_user
spring.datasource.password=your_secure_password

# Server Configuration
server.port=8080

# JWT Configuration
jwt.secret=your_jwt_secret_key
jwt.expiration=86400000

# Initial Admin User
admin.email=admin@example.com
admin.password=initial_admin_password
```

### Step 3: Run the Application

Navigate to the application directory and run:

```bash
java -jar solar-system.jar
```

For production environments, it's recommended to set up the application as a service:

#### For Linux (systemd)

Create a service file at `/etc/systemd/system/solar-system.service`:

```
[Unit]
Description=Solar Energy Monitoring and Financing System
After=network.target postgresql.service

[Service]
User=solar
ExecStart=/usr/bin/java -jar /path/to/solar-system.jar
SuccessExitStatus=143
TimeoutStopSec=10
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
sudo systemctl enable solar-system
sudo systemctl start solar-system
```

### Step 4: Deploy the Frontend

1. Download the frontend distribution from the [releases page](https://github.com/your-organization/solar-energy-system-frontend/releases)
2. Extract the archive to your web server's document root
3. Configure your web server (Apache, Nginx, etc.) to serve the frontend and proxy API requests to the backend

#### Example Nginx Configuration

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    root /var/www/solar-frontend;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 3. Cloud Deployment

### AWS Deployment

1. Create an RDS PostgreSQL instance
2. Deploy the backend to Elastic Beanstalk or ECS
3. Deploy the frontend to S3 with CloudFront
4. Configure security groups and load balancers

Detailed AWS deployment instructions are available in the [AWS Deployment Guide](./cloud/aws_deployment.md).

### Azure Deployment

1. Create an Azure Database for PostgreSQL
2. Deploy the backend to Azure App Service
3. Deploy the frontend to Azure Static Web Apps
4. Configure networking and security

Detailed Azure deployment instructions are available in the [Azure Deployment Guide](./cloud/azure_deployment.md).

## Post-Installation Configuration

After installing the system, follow these steps to complete the setup:

### Step 1: Initial Login

1. Open your web browser and navigate to the system URL
2. Log in using the admin credentials specified during installation:
   - Email: admin@example.com
   - Password: initial_admin_password

### Step 2: Change Default Password

1. After logging in, go to "Profile" > "Security Settings"
2. Change the default admin password to a secure password

### Step 3: Configure System Settings

1. Navigate to "Administration" > "System Settings"
2. Configure the following settings:
   - Company Information
   - Email Notifications
   - Data Retention Policies
   - Security Settings
   - Integration Settings

### Step 4: Set Up Users and Roles

1. Navigate to "Administration" > "User Management"
2. Create user accounts for your team members
3. Assign appropriate roles based on their responsibilities

### Step 5: Register Solar Installations

1. Navigate to "Installations" > "Add New Installation"
2. Enter the details of your solar installations
3. Configure monitoring settings for each installation

## Troubleshooting

If you encounter issues during installation, refer to the following common problems and solutions:

### Database Connection Issues

- Verify that PostgreSQL is running: `pg_isready -h localhost -p 5432`
- Check database credentials in `application.properties`
- Ensure the database user has appropriate permissions

### Application Won't Start

- Check Java version: `java -version`
- Verify that the JAR file is not corrupted
- Check application logs for detailed error messages

### Frontend Connection Issues

- Verify that the API URL is correctly configured in the frontend
- Check for CORS issues in the browser developer console
- Ensure the web server is correctly proxying API requests

For more troubleshooting information, refer to the [Troubleshooting Guide](./troubleshooting.md).

## Upgrading

To upgrade to a newer version of the system:

1. Back up your database and configuration files
2. Download the new version
3. Stop the current application
4. Replace the JAR file with the new version
5. Start the application

For Docker deployments:

```bash
git pull
docker-compose down
docker-compose up -d
```

## Security Recommendations

- Use HTTPS for all communications
- Implement a strong password policy
- Regularly update the system to the latest version
- Set up regular database backups
- Configure a firewall to restrict access to the server
- Use a reverse proxy with rate limiting to prevent abuse

## Next Steps

After completing the installation, refer to the [User Guide](./user_guide.md) for information on how to use the system effectively.