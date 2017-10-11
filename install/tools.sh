#!/usr/bin/env bash
### every exit != 0 fails the script
set -e

echo "Install common tools"
apt-get update 
apt-get install -y \
		net-tools \
		locales \
		vim \
		wget \
		curl \
		zsh \
		htop \
		telnet \
		unzip \
		bzip2 \
		openssh-server \
		apt-utils \
		apt-transport-https \
		software-properties-common \
		lsb-release \
		pciutils \
		lshw \
		ca-certificates \
		gcc \
		make \
		libcurl4-gnutls-dev libexpat1-dev gettext libz-dev libssl-dev \
		nodejs \
		git \
		xvfb

apt-get clean -y

echo "Generate locales"
locale-gen en_US.UTF-8