# Chat App

A scalable real-time chat application built with Angular, Spring Boot, WebSocket, Kafka, OAuth2, MySQL, and Docker.

## Project Overview

This is a production-grade, modular, real-time chat application using a monorepo architecture. The system uses Spring Boot (WebSocket + Kafka + OAuth2), a responsive Angular frontend, MySQL for persistence, and Docker for local development.

## Tech Stack

- **Frontend**: Angular with Angular Material
- **Backend**: Spring Boot with Spring WebSocket, Kafka, Spring Security OAuth2
- **Database**: MySQL
- **Authentication**: OAuth2 (Google) and JWT
- **Messaging**: Kafka for real-time message/event stream
- **Infrastructure**: Docker, Docker Compose

## Prerequisites

Before running the application, make sure you have the following installed on your system:

- [Docker](https://www.docker.com/products/docker-desktop/) (version 20.10.0 or higher)
- [Docker Compose](https://docs.docker.com/compose/install/) (version 2.0.0 or higher)
- [Git](https://git-scm.com/downloads) (optional, for cloning the repository)

## Running the Application with Docker Compose

### 1. Clone the repository (if not already done)

```bash
git clone <repository-url>
cd chat-app
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory with the following content:

```
# Database Configuration
MYSQL_ROOT_PASSWORD=rootpassword
MYSQL_DATABASE=chatapp
MYSQL_USER=chatuser
MYSQL_PASSWORD=chatpassword

# Spring Datasource Configuration
SPRING_DATASOURCE_URL=jdbc:mysql://mysql:3306/chatapp?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true
SPRING_DATASOURCE_USERNAME=root
SPRING_DATASOURCE_PASSWORD=rootpassword

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# CORS Configuration
CORS_ALLOWED_ORIGINS=*

# JWT Configuration
JWT_SECRET=verySecretKeyThatShouldBeChangedInProduction
```

Replace `your-google-client-id` and `your-google-client-secret` with your actual Google OAuth credentials.

### 3. Build and start the application

```bash
# Build and start all services in detached mode
docker-compose up -d

# To build without using cache (useful after major changes)
docker-compose build --no-cache
docker-compose up -d

# To see logs while starting up
docker-compose up
```

This command will:
- Build the frontend and backend Docker images
- Start all required services (MySQL, Zookeeper, Kafka, backend, frontend)
- Set up the necessary networks and volumes

### 4. Check container status

```bash
# List all running containers
docker-compose ps

# Check logs for a specific service
docker-compose logs backend
docker-compose logs frontend
docker-compose logs mysql

# Follow logs in real-time
docker-compose logs -f backend
```

### 5. Access the application

Once all containers are up and running, you can access the application at:

- **Frontend**: http://localhost:80
- **Backend API**: http://localhost:8080
- **Swagger UI**: http://localhost:8080/swagger-ui.html

### 6. Restart services

If you need to restart a specific service:

```bash
# Restart the backend service
docker-compose restart backend

# Restart the frontend service
docker-compose restart frontend

# Restart the database
docker-compose restart mysql
```

### 7. Stop the application

```bash
# Stop all running containers
docker-compose down

# Stop and remove all volumes (this will delete all data including the database)
docker-compose down -v

# Stop, remove volumes, and remove images
docker-compose down -v --rmi all
```

### 8. Troubleshooting

If you encounter database connection issues:

```bash
# Check if MySQL is running
docker-compose ps mysql

# Check MySQL logs
docker-compose logs mysql

# Connect to MySQL container
docker-compose exec mysql mysql -uroot -prootpassword

# Inside MySQL container, verify database and user
mysql> SHOW DATABASES;
mysql> SELECT User, Host FROM mysql.user;
mysql> GRANT ALL PRIVILEGES ON chatapp.* TO 'root'@'%' IDENTIFIED BY 'rootpassword';
mysql> FLUSH PRIVILEGES;
```

For other services:

```bash
# Check container logs
docker-compose logs [service_name]

# Restart a specific service
docker-compose restart [service_name]

# Rebuild a specific service
docker-compose up -d --build [service_name]
```

## Running for Development

If you want to run the application for development purposes, you can run the frontend and backend separately.

### Backend (Spring Boot)

1. Navigate to the backend directory:

```bash
cd backend
```

2. Run the application using Maven:

```bash
./mvnw spring-boot:run
```

The backend will be available at http://localhost:8080.

### Frontend (Angular)

1. Navigate to the frontend directory:

```bash
cd frontend
```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm start
```

The frontend will be available at http://localhost:4200.

## Environment Configuration

### Backend Configuration

The backend application can be configured using environment variables or by modifying the `application.yml` file. Key configuration options include:

- `SPRING_DATASOURCE_URL`: Database connection URL
- `SPRING_DATASOURCE_USERNAME`: Database username
- `SPRING_DATASOURCE_PASSWORD`: Database password
- `SPRING_KAFKA_BOOTSTRAP_SERVERS`: Kafka bootstrap servers
- `CORS_ALLOWED_ORIGINS`: CORS allowed origins
- `GOOGLE_CLIENT_ID`: Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret
- `JWT_SECRET`: Secret key for JWT token generation

### Docker Environment Variables

When running with Docker Compose, you can configure the application by setting environment variables in the `.env` file in the project root. This file is automatically loaded by Docker Compose.

```
# Create .env file in project root
touch .env

# Add required environment variables
echo "MYSQL_ROOT_PASSWORD=rootpassword" >> .env
echo "SPRING_DATASOURCE_USERNAME=root" >> .env
echo "SPRING_DATASOURCE_PASSWORD=rootpassword" >> .env
echo "GOOGLE_CLIENT_ID=your-client-id" >> .env
echo "GOOGLE_CLIENT_SECRET=your-client-secret" >> .env
```

### Frontend Configuration

The frontend application can be configured by modifying the environment files in the `frontend/src/environments` directory:

- `environment.ts`: Development environment
- `environment.prod.ts`: Production environment
- `environment.docker.ts`: Docker environment

## Features

- OAuth2 login (Google/internal) with Spring Security
- JWT token management
- 1-to-1 & group chat
- Kafka-based message queue
- Message persistence in MySQL
- Read receipts
- Online/Offline/Away status via WebSocket heartbeat
- Editable user profiles
- Responsive UI for desktop & mobile layouts

## Project Structure

```
/chat-app
├── /frontend/                    # Angular workspace
├── /backend/                     # Spring Boot application
│   ├── /src/                     # Source code
│   ├── /docker-entrypoint.sh     # Docker entry point script
│   └── /Dockerfile               # Backend Docker configuration
├── /docs/                        # Documentation
│   ├── /setup/                   # Setup guides
│   └── /deployment/              # Deployment guides
├── /scripts/                     # Scripts
│   ├── /local/                   # Scripts for local development
│   └── /deployment/              # Scripts for deployment
├── /docker-compose.yml           # Docker Compose configuration
├── /.env                         # Environment variables (create this file)
└── /README.md                    # This file
```

## CI/CD Configuration

This project is configured for CI/CD with GitHub Actions and deployment to Google Cloud Platform (GCP). The following secrets are used in the GitHub repository:

- `CORS_ALLOWED_ORIGINS`: Allowed origins for CORS
- `GCP_HOST`: GCP VM instance hostname
- `GCP_SSH_KEY`: SSH key for GCP VM access
- `GCP_USER`: Username for GCP VM access
- `GOOGLE_CLIENT_ID`: Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret
- `MYSQL_ROOT_PASSWORD`: MySQL root password
- `SPRING_DATASOURCE_USERNAME`: Database username
- `SPRING_DATASOURCE_PASSWORD`: Database password
- `JWT_SECRET`: Secret for JWT token generation

### Setting Up SSH for GitHub Actions

For the CI/CD pipeline to work correctly, you need to set up SSH authentication between GitHub Actions and your GCP VM. See the [SSH Setup Guide](docs/setup/SSH_SETUP_GUIDE.md) for detailed instructions on:

1. Generating SSH key pairs
2. Adding the public key to your GCP VM
3. Adding the private key to GitHub Secrets
4. Troubleshooting SSH connection issues

### Project Documentation

For more detailed documentation, please refer to:

- [Setup Documentation](docs/setup/README.md): Guides for setting up the development environment
- [Deployment Documentation](docs/deployment/README.md): Information about deployment processes
- [Scripts Documentation](scripts/README.md): Information about utility scripts

## License

[MIT License](LICENSE)


use cmd to add public key to gcp
nano ~/.ssh/authorized_keys
