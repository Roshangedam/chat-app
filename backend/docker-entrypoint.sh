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
until nc -z $KAFKA_HOST $KAFKA_PORT > /dev/null 2>&1; do
  echo "Kafka is unavailable - sleeping"
  sleep 2
done

echo "Kafka is up - starting the application"

# Add hosts entry for Kafka (in case DNS resolution fails)
echo "127.0.0.1 localhost" > /etc/hosts
echo "$(getent hosts $KAFKA_HOST | awk '{ print $1 }') $KAFKA_HOST" >> /etc/hosts
cat /etc/hosts

# Start the application
exec java -jar app.jar