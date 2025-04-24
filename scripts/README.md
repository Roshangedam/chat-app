# Scripts

This directory contains scripts for various tasks related to the Chat App project.

## Folders

- **local**: Scripts for local development and testing
- **deployment**: Scripts for deployment and server configuration

## Usage

### Local Scripts

The scripts in the `local` folder are designed to be run on your local development machine:

- **restart.ps1**: PowerShell script to restart Docker containers (Windows)
- **restart.sh**: Bash script to restart Docker containers (Linux/Mac)
- **test_ssh_connection.ps1**: PowerShell script to test SSH connection to the GCP VM

### Deployment Scripts

The scripts in the `deployment` folder are designed to be run on the deployment server:

- **add_ssh_key_to_gcp.sh**: Script to add your SSH public key to the GCP VM's authorized_keys file
