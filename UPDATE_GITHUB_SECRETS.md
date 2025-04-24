# Updating GitHub Secrets for CI/CD

Follow these steps to update the SSH key in your GitHub repository secrets:

## 1. Copy Your Private SSH Key

Run the following command in PowerShell to display your private key:

```powershell
type C:\Users\rgedam\.ssh\gcp_deploy_key
```

Copy the entire output, including the `-----BEGIN OPENSSH PRIVATE KEY-----` and `-----END OPENSSH PRIVATE KEY-----` lines.

## 2. Update GitHub Secrets

1. Go to your GitHub repository
2. Click on "Settings" (tab at the top)
3. In the left sidebar, click on "Secrets and variables" → "Actions"
4. Find the `GCP_SSH_KEY` secret and click on "Update"
5. Paste the entire private key content you copied in step 1
6. Click "Update secret"

## 3. Verify Other Secrets

Make sure these other secrets are also set correctly:

- `GCP_HOST`: `35.226.143.5` (your GCP VM IP address)
- `GCP_USER`: `roshangedam1998` (your GCP VM username)
- `MYSQL_ROOT_PASSWORD`: Your MySQL root password
- `GOOGLE_CLIENT_ID`: Your Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Your Google OAuth client secret

## 4. Trigger a New Workflow Run

After updating the secrets, trigger a new workflow run:

1. Make a small change to any file in your repository
2. Commit and push the change to the `master` branch
3. Go to the "Actions" tab in your GitHub repository to monitor the workflow run

## 5. Troubleshooting

If you still encounter SSH issues:

1. Check the workflow logs for detailed error messages
2. Verify that the SSH key has been added to your GCP VM by running the `add_ssh_key_to_gcp.sh` script
3. Test the SSH connection locally using the `test_ssh_connection.ps1` script
