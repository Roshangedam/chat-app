# GitHub Secrets Configuration

This document outlines the GitHub Secrets that need to be configured for successful deployment of the Chat App.

## Required GitHub Secrets

Add the following secrets to your GitHub repository (Settings > Secrets and variables > Actions > New repository secret):

### Database Configuration

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `MYSQL_DATABASE` | MySQL database name | `chatapp` |
| `MYSQL_USER` | MySQL username | `chatuser` |
| `MYSQL_PASSWORD` | MySQL user password | `chatpassword` |
| `MYSQL_ROOT_PASSWORD` | MySQL root password | `rootpassword` |
| `SPRING_DATASOURCE_URL` | JDBC URL for database connection | `jdbc:mysql://mysql:3306/chatapp?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true` |
| `SPRING_DATASOURCE_USERNAME` | Database username for Spring | `chatuser` |
| `SPRING_DATASOURCE_PASSWORD` | Database password for Spring | `chatpassword` |

### OAuth2 Configuration

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `GOOGLE_CLIENT_ID` | Google OAuth2 Client ID | `your-google-client-id` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth2 Client Secret | `your-google-client-secret` |

### Security Configuration

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `JWT_SECRET` | Secret key for JWT token generation | `your-jwt-secret-key` |
| `CORS_ALLOWED_ORIGINS` | CORS allowed origins | `http://your-domain.com` |

### GCP Deployment Configuration

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `GCP_SSH_KEY` | Private SSH key for GCP VM access | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `GCP_HOST` | GCP VM host address | `35.123.456.789` |
| `GCP_USER` | GCP VM username | `username` |

## How These Secrets Are Used

These secrets are used in the GitHub Actions workflow (`.github/workflows/deploy.yml`) to securely deploy the application to your Google Cloud Platform VM. The workflow:

1. Sets up SSH access to your GCP VM using the SSH keys
2. Copies the application code to the VM
3. Sets environment variables using the secrets
4. Runs Docker Compose with these environment variables

This approach ensures that sensitive information is not hardcoded in your repository and can be easily updated without changing code.