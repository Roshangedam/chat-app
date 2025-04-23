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

# Start the application
exec java -jar app.jar