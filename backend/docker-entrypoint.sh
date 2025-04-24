#!/bin/sh
set -e

echo "=== Chat App Backend Startup ==="

# Extract database connection details from JDBC URL
echo "Parsing database connection details..."
DB_URL=${SPRING_DATASOURCE_URL:-jdbc:mysql://mysql:3306/chatapp}
DB_USER=${SPRING_DATASOURCE_USERNAME:-root}
DB_PASSWORD=${SPRING_DATASOURCE_PASSWORD:-rootpassword}

# Extract host and port from JDBC URL
DB_HOST=$(echo $DB_URL | sed -E 's/.*mysql:\/\/([^:\/]+).*/\1/')
DB_PORT=$(echo $DB_URL | sed -E 's/.*:([0-9]+).*/\1/')
DB_NAME=$(echo $DB_URL | sed -E 's/.*\/([^?]+).*/\1/')

echo "Database connection: Host=$DB_HOST, Port=$DB_PORT, Database=$DB_NAME"

# Wait for MySQL to be available with timeout
echo "Checking MySQL connection..."
RETRY_COUNT=0
MAX_RETRIES=15

until mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" -e "SELECT 1;" > /dev/null 2>&1; do
  RETRY_COUNT=$((RETRY_COUNT+1))
  if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
    echo "Warning: Could not connect to MySQL after $MAX_RETRIES attempts, but will continue startup"
    break
  fi
  echo "MySQL is unavailable (attempt $RETRY_COUNT/$MAX_RETRIES) - sleeping"
  sleep 2
done

if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
  echo "MySQL is up - executing initialization script"
  # Run the initialization script if it exists
  if [ -f /app/db/init.sql ]; then
    mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" < /app/db/init.sql
  else
    echo "No initialization script found, skipping"
  fi
fi

# Basic network configuration to help with service discovery
echo "Setting up network configuration..."
echo "127.0.0.1 localhost $(hostname)" > /etc/hosts

# Add Kafka host entry
KAFKA_HOST=${SPRING_KAFKA_BOOTSTRAP_SERVERS:-kafka:9092}
KAFKA_HOST=$(echo $KAFKA_HOST | sed -E 's/(.+):.*/\1/')
echo "Adding Kafka host entry: $KAFKA_HOST"
getent hosts $KAFKA_HOST || echo "Note: DNS resolution for $KAFKA_HOST will be handled by Docker"

# Display DNS configuration for debugging
echo "DNS configuration:"
cat /etc/resolv.conf

echo "Starting Spring Boot application..."
echo "Note: The application is configured to handle Kafka connectivity issues gracefully"

# Start the application with appropriate JVM options
exec java -XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -jar app.jar