#!/usr/bin/env bash
set -e

# Install GIT
wget https://www.kernel.org/pub/software/scm/git/git-${VERSION_GIT}.tar.gz && tar -zxf git-${VERSION_GIT}.tar.gz
cd git-${VERSION_GIT} && make prefix=/usr/local all && make prefix=/usr/local install
cd .. && rm -rf git-${VERSION_GIT}*

# Git Global
git config --global core.excludesfile ~/.gitignore-global

