# Local Scripts

This directory contains scripts for local development and testing.

## Files

- **restart.ps1**: PowerShell script to restart Docker containers (Windows)
- **restart.sh**: Bash script to restart Docker containers (Linux/Mac)
- **test_ssh_connection.ps1**: PowerShell script to test SSH connection to the GCP VM

## Usage

### Restart Docker Containers

#### Windows:

```powershell
.\restart.ps1
```

#### Linux/Mac:

```bash
chmod +x restart.sh
./restart.sh
```

### Test SSH Connection

To test the SSH connection to your GCP VM:

```powershell
.\test_gcp_connection.ps1
```

This script will:
1. Attempt to connect to your GCP VM using the SSH key
2. Display verbose output for debugging
3. Provide troubleshooting tips if the connection fails
