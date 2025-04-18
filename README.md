🧠 AI Prompt: Scalable Real-Time Chat App with Angular + Spring Boot + WebSocket + Kafka + OAuth2 + MySQL + Docker (Standard Coding Practices)
Build a production-grade, modular, real-time chat application using a monorepo architecture. The system should use Spring Boot (WebSocket + Kafka + OAuth2), a responsive Angular frontend, MySQL for persistence, and Docker for local development. All code must follow industry-standard best practices and clean code principles.

✅ Tech Stack
Frontend: Angular (latest) + Angular Material or Tailwind CSS

Backend: Spring Boot (latest) with Spring WebSocket, Kafka, Spring Security OAuth2

Database: MySQL

Auth: OAuth2 (Google or internal provider), using JWT

Messaging: Kafka for real-time message/event stream

Infra: Docker, Docker Compose

Architecture: Modular monorepo (frontend & backend)

Code Quality:

Follows clean architecture principles

Uses standard naming conventions, DTOs, Service layers, and error handling

Linting, formatting, and unit/integration testing in place

All endpoints documented with Swagger/OpenAPI

📦 Monorepo Project Structure
bash
Copy
Edit
/chat-app
├── /frontend/                    # Angular workspace
│   ├── /src/app/chat-module/    # Reusable chat components/services
│   ├── /src/app/auth-module/    # OAuth2 login + profile
│   └── angular.json             # Project config
├── /backend/
│   ├── /chat-service/           # Spring Boot WebSocket + Kafka producer
│   ├── /auth-service/           # OAuth2 & JWT issuance
│   ├── /user-service/           # User CRUD, presence, profiles
│   ├── /common-lib/             # Shared DTOs, configs, constants
│   └── pom.xml                  # Maven multi-module project
├── docker-compose.yml
└── README.md
✨ Key Features
🔐 Authentication
OAuth2 login (Google/internal) → Spring Security

JWT token management

Role-based access control (optional)

Token-based WebSocket security

💬 Chat System
1-to-1 & group chat

Kafka-based message queue (chat-messages)

Message persistence in MySQL

Read receipts

Typing indicators (optional)

WebSocket with STOMP

👥 User & Presence
Online/Offline/Away status via WebSocket heartbeat

Kafka topic: presence-status

Realtime user list updates

👤 Profile Management
Editable profile (name, avatar, bio)

OAuth2 login auto-creates user

JWT + MySQL user persistence

📲 Responsive UI
Angular Material or Tailwind

Desktop & mobile layouts

Modern chat UX: sidebar + chat window

Angular services for API & WebSocket integration

🧼 Code Practices & Standards
🔁 Backend (Spring Boot)
Layered architecture: Controller -> Service -> Repository

DTOs for request/response

@Validated inputs, global exception handling (@ControllerAdvice)

Use MapStruct or manual mapping for DTO ↔ Entity

Swagger/OpenAPI documentation

Logging with SLF4J + centralized config

Kafka producers/consumers structured via services

JUnit + Mockito for unit tests

🧹 Frontend (Angular)
Lazy-loaded feature modules (chat, auth)

@Injectable services for APIs, state, and sockets

Strong typings (interfaces for DTOs)

Global error handling (HTTP interceptors)

Prettier + ESLint for formatting/linting

RxJS best practices (unsubscribe, shareReplay)

Responsive design: mobile-first

🐳 Docker Environment
docker-compose.yml includes:

MySQL

Kafka + Zookeeper

Angular app

Spring Boot services

.env support for environment-specific configs

Volumes for persistent MySQL/Kafka data

✅ Deliverables
Monorepo codebase: Angular + Spring Boot

Dockerized setup for full stack

OAuth2 login flow

Secured, scalable WebSocket communication

Kafka-backed chat message/event pipeline

Responsive UI with chat UX

Clean, documented, maintainable code