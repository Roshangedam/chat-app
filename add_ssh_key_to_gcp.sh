#!/bin/bash

# Create .ssh directory if it doesn't exist
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Create or append to authorized_keys file
touch ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# Add the SSH public key
echo "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQC+fS+B2LMflc/E8fWu7gKhaJ/0Y+uAM5YqpCNgzDsEWpqjRgDBisLkenZ+Ilkqjj3IJ4F/Gp47xI6y0kcR95nB6/+pKL3dxk65tU9M+AXyShlzysE+F6fvXcOxeLzc8f8YluRJQTmQJu+KJQYayvfSIv3FxgmpFgErxqbJcg94LpU93cqSs6yG3F4whbotNNXiRQ1EXmyxtaZulAfxJk0hKJ30D3CMzqa7uwqHMStr36whimN665tFLtUtcd/PbkVj37Rxai3kiMHfM60abYLprGN8XTJcZ/IcX+l+gE6QXw0lZCy0ZS3cTI4KEsfrOlL9anjlYzVdouE7Yxgm67uTBYeNqLrnpMalbo5It+7EwaCD9JLRaX0LiQ+z741KtTQlf1N21FrlyOeLXWYcdnP59iU15X3OWE3cBPLLettnMyZ+/vK8Xk1FXIM+rv9DzyNMT42OTtcoWc8UUSQVn/GKZj6QnB8UhH3Fx6nqJ6w3tWjQA2Ne8kzlhcnZDVNQ3LzFML1coZbs+0DwH2lwIvAq9cftXVcKQF2opHswiL59Fw5zSZw7fEPbgwd52kKy5fSj+htOU6MUFH6SL2qbL/55n8zbo/nQYjEN/uznjmdJqphJmLUFEqFwOmlBwULAuFN9BmkkySE3wcM4+bLoKxBGrseXUuX7pa3kwf/wojyC2Q== microproindia\rgedam@lap_rgedam" >> ~/.ssh/authorized_keys

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
