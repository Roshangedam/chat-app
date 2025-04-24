#!/bin/bash

# Create .ssh directory if it doesn't exist
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Create or append to authorized_keys file
touch ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# Add the SSH public key
echo "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQCml7whggp4c6q3M6UZ5I645TYvW+jgdy4ZUGRH4h2hH7KPrHhhUpJaicoA788yUq1CZzT64TZH9rRjC469sFFjq0N7BnDyRILVD/9LP5WpMawI4b9Snq/jJ8STCTIg4q/aGgGtRhyj/uoQWaPwS04pEmWf3A7ICaks6CI83n3JYqI4SsvggNDcGVynY/OAcPsABe90RDPdd4AzXthUrOoaO7wOdqyi+L7KJ/70v127kUD51rDuvGH6g9+SRsqaUD7qHb8uZzoXETKVkgg3xpcmVkw+eZwmEvqfum1flgfyY1Ax0Rv2gp4ZpP3laWsb5TuOvuLYXtmltuxNWYW9g8ocTmqlk3+Z34x5bsJxyiwrYHy78vQBkIi0cPkuSQKLd3nfTpHMVEyNl/zTPd85z3SAiYgjaS2ndGaeOeg8dbz4l4jUgHGW98zbE+f71pS22RmRzYeEgLUWQZqdebWd5YIDnxBNkXQ60f7PRoCvPcr3cv+cIMaWK4BM8usCWhYuHJK5Ixk1YA4oo8vkrPBawMBweeP6noQEPun5458JbmsdcL0lBwSEBxhVIx4fT5xDWX/YWkyISZcsGHTs2OTyl0OJIY3C+ZqJ+R/PwfVvUYvQ2wXVTugYJk+V989FGCZSx0y/05mS6Hp3my7BI8BHWTXAFUK8DUUQlboxp6AWZn7gnw== microproindia\rgedam@lap_rgedam" >> ~/.ssh/authorized_keys

# Print confirmation
echo "SSH key has been added to authorized_keys"
echo "Testing SSH configuration..."

# Test SSH configuration
sudo sshd -t
if [ $? -eq 0 ]; then
    echo "SSH configuration is valid"
else
    echo "SSH configuration has errors"
fi

# Show permissions
echo "Checking permissions..."
ls -la ~/.ssh/
