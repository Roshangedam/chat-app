# Deployment Checklist

Use this checklist to ensure your GitHub CI/CD deployment is properly set up.

## Prerequisites

- [ ] GitHub repository is set up
- [ ] GCP VM is running and accessible
- [ ] Docker and Docker Compose are installed on the GCP VM
- [ ] SSH key pair has been generated
- [ ] Public key has been added to the GCP VM
- [ ] Private key has been added to GitHub Secrets

## SSH Key Setup

- [ ] Generate SSH key pair:
  ```
  ssh-keygen -t rsa -b 4096 -f ~/.ssh/gcp_deploy_key
  ```

- [ ] Copy the `add_key_to_gcp.sh` script to your GCP VM
- [ ] Run the script on your GCP VM:
  ```
  chmod +x add_key_to_gcp.sh
  ./add_key_to_gcp.sh
  ```

- [ ] Test the SSH connection from your local machine:
  ```
  ./scripts/local/test_gcp_connection.ps1
  ```

## GitHub Secrets

- [ ] Add the following secrets to your GitHub repository:
  - [ ] `GCP_SSH_KEY`: Private SSH key
  - [ ] `GCP_HOST`: GCP VM IP address (35.226.143.5)
  - [ ] `GCP_USER`: GCP VM username (roshangedam1998)
  - [ ] `MYSQL_ROOT_PASSWORD`: MySQL root password
  - [ ] `GOOGLE_CLIENT_ID`: Google OAuth client ID
  - [ ] `GOOGLE_CLIENT_SECRET`: Google OAuth client secret
  - [ ] `CORS_ALLOWED_ORIGINS`: CORS allowed origins
  - [ ] `JWT_SECRET`: Secret for JWT token generation

## GitHub Actions Workflow

- [ ] Verify the workflow file (.github/workflows/deploy.yml) is properly configured
- [ ] Make sure the workflow is triggered on push to the master branch
- [ ] Check that the workflow includes steps for:
  - [ ] Setting up SSH
  - [ ] Cleaning the old app on the VM
  - [ ] Copying code to the VM
  - [ ] Running Docker Compose on the VM

## Testing Deployment

- [ ] Make a small change to any file in your repository
- [ ] Commit and push the change to the master branch
- [ ] Go to the Actions tab in your GitHub repository
- [ ] Monitor the workflow run to ensure it completes successfully
- [ ] Verify the application is running on your GCP VM:
  ```
  ssh -i ~/.ssh/gcp_deploy_key roshangedam1998@35.226.143.5 "docker ps"
  ```

## Troubleshooting

If the deployment fails, check:

- [ ] SSH key configuration
- [ ] GitHub Secrets
- [ ] GCP VM firewall settings
- [ ] Docker and Docker Compose installation on the GCP VM
- [ ] GitHub Actions workflow logs for specific errors
