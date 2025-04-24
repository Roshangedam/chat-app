# Test SSH connection to GCP VM
# Replace these variables with your actual values
$GCP_USER = "roshangedam1998"
$GCP_HOST = "35.226.143.5"
$SSH_KEY_PATH = "C:\Users\rgedam\.ssh\gcp_deploy_key"

Write-Host "Testing SSH connection to $GCP_USER@$GCP_HOST using key $SSH_KEY_PATH" -ForegroundColor Cyan

# Test SSH connection with verbose output
ssh -v -i $SSH_KEY_PATH $GCP_USER@$GCP_HOST "echo 'SSH connection successful!'; hostname; whoami"

# Check the exit code
if ($LASTEXITCODE -eq 0) {
    Write-Host "SSH connection successful!" -ForegroundColor Green
} else {
    Write-Host "SSH connection failed with exit code $LASTEXITCODE" -ForegroundColor Red
    
    # Provide troubleshooting tips
    Write-Host "`nTroubleshooting tips:" -ForegroundColor Yellow
    Write-Host "1. Make sure the public key is added to ~/.ssh/authorized_keys on the GCP VM" -ForegroundColor Yellow
    Write-Host "2. Check that the SSH service is running on the GCP VM" -ForegroundColor Yellow
    Write-Host "3. Verify that port 22 is open in the GCP firewall rules" -ForegroundColor Yellow
    Write-Host "4. Check the permissions of the ~/.ssh directory and files on the GCP VM" -ForegroundColor Yellow
}
