# Deployment Documentation

This directory contains documentation related to deploying the Chat App to various environments.

## CI/CD Pipeline

The project uses GitHub Actions for CI/CD. The workflow is defined in [.github/workflows/deploy.yml](../../.github/workflows/deploy.yml).

## Deployment Environments

### Local Development

For local development using Docker, see the [main README.md](../../README.md#running-the-application-with-docker-compose).

### Google Cloud Platform (GCP)

The application is deployed to a Google Cloud Platform VM using GitHub Actions. The deployment process:

1. Connects to the GCP VM using SSH
2. Copies the code to the VM
3. Builds and starts the Docker containers
4. Configures the environment variables

## Required Secrets

For deployment to work, the following secrets must be set in GitHub:

- `CORS_ALLOWED_ORIGINS`: Allowed origins for CORS
- `GCP_HOST`: GCP VM instance hostname
- `GCP_SSH_KEY`: SSH key for GCP VM access
- `GCP_USER`: Username for GCP VM access
- `GOOGLE_CLIENT_ID`: Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret
- `MYSQL_ROOT_PASSWORD`: MySQL root password
- `SPRING_DATASOURCE_USERNAME`: Database username
- `SPRING_DATASOURCE_PASSWORD`: Database password
- `JWT_SECRET`: Secret for JWT token generation

## Troubleshooting

If you encounter issues with deployment, check:

1. SSH key configuration (see [SSH Setup Guide](../setup/SSH_SETUP_GUIDE.md))
2. GitHub Secrets (see [Update GitHub Secrets](../setup/UPDATE_GITHUB_SECRETS.md))
3. GCP VM firewall settings (ensure port 22 is open)
4. Docker and Docker Compose installation on the GCP VM
