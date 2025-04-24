#!/bin/sh

# Wait for MySQL to be ready
echo "Waiting for MySQL..."
sleep 10

# Check if MySQL credentials are provided as environment variables, otherwise use defaults
DB_HOST=${SPRING_DATASOURCE_URL:-jdbc:mysql://mysql:3306/chatapp}
DB_USER=${SPRING_DATASOURCE_USERNAME:-chatuser}
DB_PASSWORD=${SPRING_DATASOURCE_PASSWORD:-chatpassword}

# Extract host and port from JDBC URL
HOST=$(echo $DB_HOST | sed -E 's/.*mysql:\/\/([^:]+):.*/\1/')
PORT=$(echo $DB_HOST | sed -E 's/.*:([0-9]+).*/\1/')

# Wait for MySQL to be available
echo "Checking MySQL connection..."
until mysql -h"$HOST" -P"$PORT" -u"$DB_USER" -p"$DB_PASSWORD" -e "SELECT 1;" > /dev/null 2>&1; do
  echo "MySQL is unavailable - sleeping"
  sleep 2
done

echo "MySQL is up - executing initialization script"

# Run the initialization script
mysql -h"$HOST" -P"$PORT" -u"$DB_USER" -p"$DB_PASSWORD" < /app/db/init.sql

# Wait for Kafka to be ready
echo "Waiting for Kafka..."
KAFKA_HOST=${KAFKA_HOST:-kafka}
KAFKA_PORT=9092

# Try to ping Kafka
echo "Checking Kafka connection..."
echo "Attempting to resolve Kafka host: $KAFKA_HOST"
getent hosts $KAFKA_HOST || echo "DNS resolution failed for $KAFKA_HOST"

# Try multiple ways to get Kafka IP
KAFKA_IP=$(getent hosts $KAFKA_HOST | awk '{ print $1 }')
if [ -z "$KAFKA_IP" ]; then
  echo "Trying to resolve Kafka IP through Docker network..."
  # Try to get IP from Docker DNS
  KAFKA_IP=$(dig +short $KAFKA_HOST || echo "")
fi

if [ -n "$KAFKA_IP" ]; then
  echo "Found Kafka IP: $KAFKA_IP"
else
  echo "Warning: Could not resolve Kafka IP, will use hostname"
fi

# Add hosts entry for Kafka (in case DNS resolution fails)
echo "Setting up /etc/hosts file..."
echo "127.0.0.1 localhost" > /etc/hosts
if [ -n "$KAFKA_IP" ]; then
  echo "$KAFKA_IP $KAFKA_HOST" >> /etc/hosts
fi
cat /etc/hosts

# Try to connect to Kafka with timeout
echo "Attempting to connect to Kafka at $KAFKA_HOST:$KAFKA_PORT..."
RETRY_COUNT=0
MAX_RETRIES=30
until nc -z $KAFKA_HOST $KAFKA_PORT > /dev/null 2>&1; do
  RETRY_COUNT=$((RETRY_COUNT+1))
  if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
    echo "Warning: Could not connect to Kafka after $MAX_RETRIES attempts, but will continue startup"
    break
  fi
  echo "Kafka is unavailable (attempt $RETRY_COUNT/$MAX_RETRIES) - sleeping"
  sleep 2
done

echo "Proceeding with application startup..."

# Start the application
exec java -jar app.jar