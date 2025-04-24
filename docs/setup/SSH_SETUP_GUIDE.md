# SSH Setup Guide for GitHub Actions and GCP VM

This guide explains how to set up SSH keys for GitHub Actions to deploy to a Google Cloud Platform (GCP) VM.

## 1. Generate SSH Key Pair

First, generate an SSH key pair on your local machine:

```bash
# Generate a new SSH key pair (no passphrase for CI/CD)
ssh-keygen -t rsa -b 4096 -f ~/.ssh/gcp_deploy_key -N ""
```

This will create:
- `~/.ssh/gcp_deploy_key` (private key)
- `~/.ssh/gcp_deploy_key.pub` (public key)

## 2. Add Public Key to GCP VM

You need to add the public key to the `authorized_keys` file on your GCP VM:

```bash
# Copy the public key content
cat ~/.ssh/gcp_deploy_key.pub
```

Now, connect to your GCP VM and add this key to the authorized_keys file:

```bash
# On your GCP VM
mkdir -p ~/.ssh
chmod 700 ~/.ssh
touch ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
nano ~/.ssh/authorized_keys  # Or use any text editor
```

Paste the public key content at the end of the file and save.

## 3. Add Private Key to GitHub Secrets

The private key needs to be added as a secret in your GitHub repository:

1. Copy the private key content:
   ```bash
   cat ~/.ssh/gcp_deploy_key
   ```

2. Go to your GitHub repository
3. Navigate to Settings > Secrets and variables > Actions
4. Click "New repository secret"
5. Name: `GCP_SSH_KEY`
6. Value: Paste the entire private key content (including BEGIN and END lines)
7. Click "Add secret"

## 4. Add Other Required Secrets

Make sure you have also added these secrets to your GitHub repository:

- `GCP_HOST`: Your GCP VM's IP address or hostname
- `GCP_USER`: Username for SSH login to your GCP VM
- `MYSQL_ROOT_PASSWORD`: MySQL root password
- `GOOGLE_CLIENT_ID`: Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret
- `CORS_ALLOWED_ORIGINS`: CORS allowed origins

## 5. Test SSH Connection

You can test the SSH connection from your local machine:

```bash
ssh -i ~/.ssh/gcp_deploy_key YOUR_USERNAME@YOUR_GCP_VM_IP
```

If this works, GitHub Actions should be able to connect as well.

## 6. Troubleshooting

If you're still having SSH connection issues:

1. Check VM firewall settings:
   - Make sure port 22 is open in your GCP firewall rules

2. Check SSH configuration on the VM:
   - Ensure `PubkeyAuthentication yes` is set in `/etc/ssh/sshd_config`
   - Restart SSH service: `sudo systemctl restart sshd`

3. Check permissions:
   - `~/.ssh` directory should be 700 (chmod 700 ~/.ssh)
   - `~/.ssh/authorized_keys` file should be 600 (chmod 600 ~/.ssh/authorized_keys)

4. Check the format of the key in GitHub Secrets:
   - Make sure the entire key is included, with BEGIN and END lines
   - There should be no extra spaces or line breaks

5. Enable SSH debugging in GitHub Actions:
   - Use `ssh -v` for verbose output to see where the connection fails
