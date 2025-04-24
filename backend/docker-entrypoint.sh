#!/bin/sh
# Simple startup script for the backend service
echo "=== Chat App Backend Startup ==="

# Wait for MySQL to be ready
echo "Waiting for MySQL..."
sleep 5

# Extract database connection details
DB_HOST=${SPRING_DATASOURCE_URL:-jdbc:mysql://mysql:3306/chatapp}
DB_HOST=$(echo $DB_HOST | sed -E 's/.*mysql:\/\/([^:\/]+).*/\1/')
DB_USER=${SPRING_DATASOURCE_USERNAME:-root}
DB_PASSWORD=${SPRING_DATASOURCE_PASSWORD:-rootpassword}

echo "Database host: $DB_HOST"

# Basic check for MySQL
echo "Checking MySQL connection..."
for i in $(seq 1 10); do
  echo "Attempt $i: Checking MySQL connection..."
  mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASSWORD" -e "SELECT 1;" > /dev/null 2>&1
  if [ $? -eq 0 ]; then
    echo "MySQL is available!"

    # Run initialization script if it exists
    if [ -f /app/db/init.sql ]; then
      echo "Running initialization script..."
      mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASSWORD" < /app/db/init.sql
    fi
    break
  fi
  echo "MySQL not available yet, waiting..."
  sleep 2
done

# Simple hosts file setup
echo "Setting up hosts file..."
echo "127.0.0.1 localhost" > /etc/hosts
echo "127.0.0.1 $(hostname)" >> /etc/hosts

# Start the application
echo "Starting Spring Boot application..."
exec java -jar app.jar