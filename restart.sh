#!/bin/bash

# Stop and remove all containers
echo "Stopping and removing containers..."
docker-compose down

# Rebuild and start containers
echo "Rebuilding and starting containers..."
docker-compose up -d

# Show container status
echo "Container status:"
docker-compose ps

echo "Logs from backend container (press Ctrl+C to exit):"
docker-compose logs -f backend
