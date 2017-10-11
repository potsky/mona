#!/bin/bash
### every exit != 0 fails the script
set -e

# Start SSH
service ssh start

# Start VNC
$STARTUPDIR/vnc_startup.sh > /var/log/vnc.log 2>&1 &

# Start Mona
$STARTUPDIR/mona_startup.sh > /var/log/mona.log 2>&1 &

# Gime gime gime a shell after midnight
zsh

