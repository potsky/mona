# Docker 4 MonaTiny

[![](https://images.microbadger.com/badges/version/potsky/mona.svg)](https://hub.docker.com/r/potsky/mona)
[![](https://images.microbadger.com/badges/image/potsky/mona.svg)](https://microbadger.com/images/potsky/mona)

## Install

- Build the image

	```
	docker build -t my_mona .
	```

## Run

- With a local build

	```
	docker run -v ~/Work/GitHub/mona/www:/home/MonaServer2/MonaTiny/www -p 722:22 -p 780:80 -p 7443:443 -p 1935:1935 -p 5901:5901 -p 6901:6901 -ti --rm my_mona
	```

	> Replace `~/Work/GitHub/mona/www` by the path of the `www` directory of this repository

- On production

	```
	docker pull potsky/mona
	docker run -v ~/Work/GitHub/mona/www:/home/MonaServer2/MonaTiny/www -p 722:22 -p 780:80 -p 7443:443 -p 1935:1935 -p 5901:5901 -p 6901:6901 -ti --rm potsky/mona
	```

	> Replace `~/Work/GitHub/mona/www` by the path of the `www` directory of this repository

## Connect

- You can connect to SSH with `root` as the `root` password

	```
	ssh -l root -p 2722 localhost
	```

- You can connect to VNC to test on Chromium on Ubuntu

	- with a VNC client on port `5901` with password `vncpwd`
	- With your browser at <http://localhost:6901?password=vncpwd>

## Work
	
- In the docker image, run `ffmpeg -re -f lavfi -i testsrc=n=3 -vcodec libx264 -pix_fmt yuv420p -tune zerolatency -preset ultrafast -f flv rtmp://localhost/live/test`
- Open <http://localhost:780/vod.html> on our computer for Rick (xo) 
- Open <http://localhost:780/live.html> for live
- Open <http://localhost:780/livejs.html> for ws live

