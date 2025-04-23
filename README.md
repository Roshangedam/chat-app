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

### 2. Build and start the application

```bash
docker-compose up -d
```

This command will:
- Build the frontend and backend Docker images
- Start all required services (MySQL, Zookeeper, Kafka, backend, frontend)
- Set up the necessary networks and volumes

### 3. Access the application

Once all containers are up and running, you can access the application at:

- **Frontend**: http://localhost:4200
- **Backend API**: http://localhost:8080
- **Swagger UI**: http://localhost:8080/swagger-ui.html

### 4. Stop the application

To stop all running containers:

```bash
docker-compose down
```

To stop and remove all volumes (this will delete all data including the database):

```bash
docker-compose down -v
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

The backend application can be configured using environment variables or by modifying the `application.properties` file. Key configuration options include:

- `SPRING_DATASOURCE_URL`: Database connection URL
- `SPRING_DATASOURCE_USERNAME`: Database username
- `SPRING_DATASOURCE_PASSWORD`: Database password
- `SPRING_KAFKA_BOOTSTRAP_SERVERS`: Kafka bootstrap servers
- `CORS_ALLOWED_ORIGINS`: CORS allowed origins

### Frontend Configuration

The frontend application can be configured by modifying the environment files in the `frontend/src/environments` directory.

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
├── docker-compose.yml            # Docker Compose configuration
└── README.md                     # This file
```

## License

[MIT License](LICENSE)


