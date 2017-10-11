# Docker 4 MonaTiny

## Instructions

- Run 
	```
	docker run -v ~/Work/GitHub/mona/www:/home/MonaServer2/MonaTiny/www -p 2722:22 -p 2780:80 -p 2443:443 -p 21935:1935 -ti --rm potsky/mona
	```
	
	> Replace `~/Work/GitHub/mona/www` by the path of the `www` directory of this repository.

- Open <http://localhost:2780/vod.html> on our computer to play video 
- Open <http://localhost:2780/player/live.html> on our computer to play the `test` RTMP application
- Open <http://localhost:2780/player/livejs.html> on our computer to play the `test` RTMP application with WS

- You can connect via SSH to the docker image `ssh -l root -p 2722 localhost`. Root password is `root`

## Dev on the image

Build image 

```
docker build -t mona .
```

Run image 

```
docker run -v ~/Work/GitHub/mona/www:/home/MonaServer2/MonaTiny/www -p 2722:22 -p 2780:80 -p 2443:443 -p 21935:1935 -ti --rm mona
```
