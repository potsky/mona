#!/usr/bin/env bash
set -e

echo "Install Mona dependencies"
echo "deb http://ftp.us.debian.org/debian testing main contrib non-free" >> /etc/apt/sources.list

apt-get update && apt-get install -y \
g++ \
xvfb

echo "Compile Mona"
cd /home
git clone https://github.com/MonaSolutions/MonaServer2.git
cd MonaServer2
make
