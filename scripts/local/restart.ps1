# Stop and remove all containers
Write-Host "Stopping and removing containers..." -ForegroundColor Cyan
docker-compose down

# Rebuild and start containers
Write-Host "Rebuilding and starting containers..." -ForegroundColor Cyan
docker-compose up -d

# Show container status
Write-Host "Container status:" -ForegroundColor Cyan
docker-compose ps

Write-Host "Logs from backend container (press Ctrl+C to exit):" -ForegroundColor Cyan
docker-compose logs -f backend
