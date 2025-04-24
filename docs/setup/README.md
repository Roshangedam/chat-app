# Setup Documentation

This directory contains guides for setting up various aspects of the Chat App project.

## Files

- **SSH_SETUP_GUIDE.md**: Comprehensive guide for setting up SSH keys for GitHub Actions and GCP VM
- **UPDATE_GITHUB_SECRETS.md**: Guide for updating GitHub repository secrets for CI/CD

## SSH Key Setup

The SSH key setup is critical for the CI/CD pipeline to work correctly. Follow the instructions in [SSH_SETUP_GUIDE.md](SSH_SETUP_GUIDE.md) to:

1. Generate SSH key pairs
2. Add the public key to your GCP VM
3. Add the private key to GitHub Secrets
4. Troubleshoot SSH connection issues

## GitHub Secrets

For the CI/CD pipeline to work, you need to set up several secrets in your GitHub repository. Follow the instructions in [UPDATE_GITHUB_SECRETS.md](UPDATE_GITHUB_SECRETS.md) to update these secrets.
