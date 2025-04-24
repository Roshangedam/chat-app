FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

# Copy the POM file
COPY pom.xml .

# Copy the source code
COPY src ./src

# Build the application
RUN mvn clean package -DskipTests

# Runtime stage
FROM eclipse-temurin:21-jre
WORKDIR /app

# Install MySQL client and netcat for database and Kafka connectivity checks
RUN apt-get update && apt-get install -y default-mysql-client netcat-openbsd curl iputils-ping dnsutils && rm -rf /var/lib/apt/lists/*

# Copy the built JAR file from the build stage
COPY --from=build /app/target/*.jar app.jar

# Create directory for database scripts
RUN mkdir -p /app/db

# Copy the database initialization script
COPY src/main/resources/db/init.sql /app/db/

# Copy the entrypoint script
COPY docker-entrypoint.sh /app/
RUN chmod +x /app/docker-entrypoint.sh

# Set the entrypoint to our custom script
ENTRYPOINT ["/app/docker-entrypoint.sh"]