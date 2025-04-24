# Deployment Scripts

This directory contains scripts for deployment and server configuration.

## Files

- **add_ssh_key_to_gcp.sh**: Script to add your SSH public key to the GCP VM's authorized_keys file

## Usage

### Add SSH Key to GCP VM

To add your SSH public key to the GCP VM:

1. Copy the script to your GCP VM using SCP, the GCP Cloud Console, or any other method
2. Make the script executable:
   ```bash
   chmod +x add_ssh_key_to_gcp.sh
   ```
3. Run the script:
   ```bash
   ./add_ssh_key_to_gcp.sh
   ```

This script will:
1. Create the `.ssh` directory if it doesn't exist
2. Set the correct permissions on the `.ssh` directory
3. Create or append to the `authorized_keys` file
4. Add your SSH public key to the `authorized_keys` file
5. Set the correct permissions on the `authorized_keys` file
6. Test the SSH configuration
7. Display the permissions of the `.ssh` directory and files
