#!/usr/bin/env bash
set -e

apt-get install -y g++

echo "Compile Mona"
cd $HOME
git clone https://github.com/MonaSolutions/MonaServer2.git
cd MonaServer2
make
