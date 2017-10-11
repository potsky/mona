############################################################
# Dockerfile to build container with MonaTiny
# Based on Debian
############################################################

### Build a Debian
FROM debian:jessie
MAINTAINER potsky <potsky@me.com>

### Env
ENV VERSION_GIT=2.14.1
ENV HOME=/root
ENV TERM=xterm
ENV INST_SCRIPTS=$HOME/install
ENV DEBIAN_FRONTEND=noninteractive
ENV LANG='en_US.UTF-8' LANGUAGE='en_US:en' LC_ALL='en_US.UTF-8'

### Install basics
RUN apt-get update && apt-get install -y \
	apt-utils \
	apt-transport-https \
	lsb-release \
	ca-certificates \
	curl \
	wget

### Add dotdeb
RUN echo "deb http://packages.dotdeb.org jessie all" >> /etc/apt/sources.list
RUN echo "deb-src http://packages.dotdeb.org jessie all" >> /etc/apt/sources.list
RUN wget https://www.dotdeb.org/dotdeb.gpg && apt-key add dotdeb.gpg && rm dotdeb.gpg

### Install Dependencies
RUN apt-get update && apt-get install -y \
	zsh \
	gcc \
	make \
	libcurl4-gnutls-dev libexpat1-dev gettext libz-dev libssl-dev \
	vim \
	bzip2 \
	net-tools \
	locales \
	htop \
	openssh-server \
	telnet \
	unzip \
	httpie \
	xvfb

### Install UTF8 locale
RUN locale-gen en_US.UTF-8

### Install GIT
RUN wget https://www.kernel.org/pub/software/scm/git/git-${VERSION_GIT}.tar.gz && tar -zxf git-${VERSION_GIT}.tar.gz
RUN cd git-${VERSION_GIT} && make prefix=/usr/local all && make prefix=/usr/local install
RUN rm -rf git-${VERSION_GIT}*

### Git Global
ADD files/gitignore-global /root/.gitignore-global
RUN git config --global core.excludesfile ~/.gitignore-global
RUN git config --global --add oh-my-zsh.hide-dirty 1

### Run oh my zsh
RUN wget https://github.com/robbyrussell/oh-my-zsh/raw/master/tools/install.sh -O - | zsh || true

### Configure System
ADD files/motd /etc/motd

### Configure SSH Server
RUN sed -ie 's/PermitRootLogin without-password/PermitRootLogin yes/g' /etc/ssh/sshd_config

### Set root password
RUN echo "root:root" | chpasswd
RUN chsh -s /bin/zsh root

### Configure Timezone
RUN echo "" >> /etc/profile
RUN echo "TZ='Europe/Paris'; export TZ" >> /etc/profile
RUN echo "" >> /etc/zsh/zshrc
RUN echo "TZ='Europe/Paris'; export TZ" >> /etc/zsh/zshrc
RUN echo "" >> /etc/zsh/zshrc
RUN echo "myip() { ip addr show | grep inet | grep eth0 | awk '{print \$2}' | cut -d'/' -f1 }" >> /etc/zsh/zshrc

### Ngrok
ADD files/ngrok /usr/local/bin/ngrok
RUN chmod +x /usr/local/bin/ngrok

### Install vimrc
ADD files/vimrc /root/.vimrc

### Open ports
EXPOSE 22
EXPOSE 80
EXPOSE 443
EXPOSE 1935

### Add install scripts
ADD ./install/ $INST_SCRIPTS/
RUN find $INST_SCRIPTS -name '*.sh' -exec chmod a+x {} +

### Install Mona
RUN $HOME/install/mona.sh
WORKDIR /home/MonaServer2/MonaTiny

### Run
RUN mkdir -p /root/script
ADD files/run.sh /root/script/run.sh
RUN chmod +x /root/script/run.sh

CMD [ "/root/script/run.sh" ]
