# Test SSH connection to GCP VM
# This script tests the SSH connection to your GCP VM using the newly generated SSH key

# GCP VM details
$GCP_USER = "roshangedam1998"
$GCP_HOST = "35.226.143.5"
$SSH_KEY_PATH = "C:\Users\rgedam\.ssh\gcp_deploy_key"

Write-Host "Testing SSH connection to $GCP_USER@$GCP_HOST using key $SSH_KEY_PATH" -ForegroundColor Cyan
Write-Host "This will help verify if your SSH key is properly set up for GitHub Actions deployment." -ForegroundColor Cyan
Write-Host ""

# Test SSH connection with verbose output
Write-Host "Attempting SSH connection..." -ForegroundColor Yellow
ssh -v -i $SSH_KEY_PATH $GCP_USER@$GCP_HOST "echo 'Connection successful!'; hostname; whoami; echo 'Current directory:'; pwd"

# Check the exit code
if ($LASTEXITCODE -eq 0) {
    Write-Host "`nSSH connection successful!" -ForegroundColor Green
    Write-Host "Your SSH key is properly configured for GitHub Actions deployment." -ForegroundColor Green
} else {
    Write-Host "`nSSH connection failed with exit code $LASTEXITCODE" -ForegroundColor Red
    
    # Provide troubleshooting tips
    Write-Host "`nTroubleshooting tips:" -ForegroundColor Yellow
    Write-Host "1. Make sure you've copied the add_key_to_gcp.sh script to your GCP VM and run it" -ForegroundColor Yellow
    Write-Host "2. Check that the SSH service is running on the GCP VM: sudo systemctl status sshd" -ForegroundColor Yellow
    Write-Host "3. Verify that port 22 is open in the GCP firewall rules" -ForegroundColor Yellow
    Write-Host "4. Check the permissions of the ~/.ssh directory and files on the GCP VM:" -ForegroundColor Yellow
    Write-Host "   - ~/.ssh directory should be 700 (chmod 700 ~/.ssh)" -ForegroundColor Yellow
    Write-Host "   - ~/.ssh/authorized_keys file should be 600 (chmod 600 ~/.ssh/authorized_keys)" -ForegroundColor Yellow
    Write-Host "5. Try connecting with the -o StrictHostKeyChecking=no option:" -ForegroundColor Yellow
    Write-Host "   ssh -i $SSH_KEY_PATH -o StrictHostKeyChecking=no $GCP_USER@$GCP_HOST" -ForegroundColor Yellow
}
