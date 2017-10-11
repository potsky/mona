#!/usr/bin/env bash
set -e

echo "Set root password"
echo "root:root" | chpasswd
chsh -s /bin/zsh root

echo "Configure SSH Server"
sed -ie 's/PermitRootLogin without-password/PermitRootLogin yes/g' /etc/ssh/sshd_config
sed -ie 's/PermitRootLogin prohibit-password/PermitRootLogin yes/g' /etc/ssh/sshd_config

echo "Run oh my zsh"
wget https://github.com/robbyrussell/oh-my-zsh/raw/master/tools/install.sh -O - | zsh || true
sed -i -- 's/plugins=(git)/plugins=(git)/g' /root/.zshrc
git config --global --add oh-my-zsh.hide-dirty 1

echo "Configure Timezone"
echo "" >> /etc/profile
echo "TZ='Europe/Paris'; export TZ" >> /etc/profile
echo "" >> /etc/zsh/zshrc
echo "TZ='Europe/Paris'; export TZ" >> /etc/zsh/zshrc
echo "" >> /etc/zsh/zshrc
echo "myip() { ip addr show | grep inet | grep eth0 | awk '{print \$2}' | cut -d'/' -f1 }" >> /etc/zsh/zshrc
echo "" >> /etc/zsh/zshrc

