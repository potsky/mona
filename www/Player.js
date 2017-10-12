/// UTILS ///
function Require(file, onLoaded) {
	// Adding the script tag to the head as suggested before
	var head = document.getElementsByTagName('head')[0];
	var script = document.createElement('script');
	script.type = 'text/javascript';
	script.src = file;
	if(!onLoaded)
		onLoaded = function() { console.log(file, "loaded"); }
	// Then bind the event to the callback function.
	// There are several events for cross browser compatibility.
	script.onreadystatechange = onLoaded;
	script.onload = onLoaded;
	// Fire the loading
	head.appendChild(script);
};
function ParseQuery(query) {
	var params = {};
	var parts = query.split('&');
	var key,value;
	for (var i = 0; i < parts.length; ++i) {
		var nv = parts[i].split('=');
		if (!nv[0])
			continue;
		
		if(nv[0].substring(0, 3).toLowerCase()=="url") {
			if(key) {
				params[key] = value || true;
				key = null;
			}
			if(nv[1]) {
				value = nv[1]
				// search '?' after '/'
				if(value.indexOf('?')>value.indexOf('/')) {
					if(nv[2])
						value += "%3D" + nv[2];
					key=nv[0]
					continue;
				}
				value = null;
			}
		}
		
		if(value) {
			value += "%26" + nv[0] + "%3D";
			value += nv[1] || "true";
			continue;
		}
		
		params[nv[0]] = nv[1] || true;
	}
	if(key)
		params[key] = value || true;
	return params;
}
/// INCLUDES ///
Require("FrameRender.js");
Require("SubtitleRender.js");
Require("AV.js");
Require("Video.js");
Require("Audio.js");
Require("WSSource.js");


PlayerState = {
	STOPPED:   0,
	WAITING:   1,
	BUFFERING: 2,
	PLAYING:   3
}

Player = function(player, parameters) {
	var _this = this;
	var _state = PlayerState.STOPPED;
	var _source;
	var _videos = new Array(); _audios = new Array();
	var _latency = 0, _buffering = true;
	var _context, _engine;
	var _subtitleRender = new SubtitleRender(player);
	var _frameRender = new FrameRender(player);
	
	var _audioDecoder , _videoDecoder;
	var _audioMixer = new Audio.Mixer();
	var _samples = [];

	this.parameters = function() { return parameters; }
	this.state 	    = function() { return _state; }
	this.refresh 	= function() { _frameRender.refresh(); }
	
	this.play = function(url) {
		_this.stop();
		var protocol = url.substr(0,url.indexOf(':'));
		if(!protocol)
			throw new Error('Invalid '+url+' url');
		if(protocol == 'ws' || protocol == 'wss')
			_source = new WSSource(url, onVideo, onAudio, onData, onEnd);
		else
			throw new Error("Player doesn't support ",protocol,' protocol');
	}
	
	this.stop = function() {
		_source = null;
		// release resources
		_videoDecoder.clear();
		_audioDecoder.clear();
		_frameRender.clear();
	}
	
	this.subtitle = function(text) {
		_subtitleRender.draw(text);
	}
	
	
	function start() {
		if(_state == PlayerState.STOPPED)
			return;
		_latency= 0;
		_buffering = true;
		_state = PlayerState.WAITING;
	}
	function onVideo(tag, data) { start(); _videos.push({tag:tag, data:data}); }
	function onAudio(tag, data) { start(); _audios.push({tag:tag, data:data}); }
	function onData(handler) {
		start();
		switch(handler) {
			case "@text":
				_videos.push({subtitle:arguments[1]});
				break;
			default:
				console.log(JSON.stringify(arguments, null, 4));
		}
	}
	function onEnd(tag, data) {
		_buffering = true; // because can't suspend/resume context!
		_state=PlayerState.STOPPED
		// release resource
		_videos = new Array();
		_audios = new Array();
	}
	
	function onAudioDecoded(samples) { _samples.push(samples); }
	function onVideoDecoded(frame, buffers) { _frameRender.draw(frame, buffers); }
	
	function renderAudio(output) {	
		// Process _samples if present
		var filled;
		for(var i = 0; i<_samples.length; ++i) {
			filled = _audioMixer.mix(_samples[i], output);
			if(Math.abs(filled)>=_engine.bufferSize)
				break; // wait more space on output buffer (decoding nothing else)
		}
		if(filled>=0)
			++i; // remove the current sample too!
		_samples.splice(0,i);
		return Math.abs(filled);
	}
	
	function decodeVideo(delta) {
		if(!_videos.length)
			return _audios.length; // no video, decode audio

		var canDecodeAudio = false;
		var timeRef;

		// Sync with possible audio data (reduce the decoded portion)
		if(_audios.length) {
			timeRef = _audios[0].tag.time+delta;
			canDecodeAudio = true;
		}

		var iTo = 0;
		var iFrom=0;
		var video=null;
		for(iTo; iTo<_videos.length; ++iTo) {
			video = _videos[iTo];
			if(!video.tag) {
				 // subtitle or other, no tag!
				if(video.subtitle)
					_subtitleRender.draw(video.subtitle);
				continue;
			}
			if(timeRef && video.tag.time>timeRef) {
				if(!iTo)
					return canDecodeAudio; // no video to decode
				break;
			}
			if(video.tag.frame==Video.Frame.KEY)
				iFrom = iTo;
		}
		// here iTo>0!

		var config = null;
		while(iFrom--) {
			video = _videos.shift();
			if(video.tag && video.tag.frame == Video.Frame.CONFIG)
				config = video;
			--iTo;
		}
		
		// Render required frames
		if(config)
			_videoDecoder.decode(config.tag, config.data);
		while(iTo--) {
			video = _videos.shift();
			if(video.tag)
				_videoDecoder.decode(video.tag, video.data);
		}
		return canDecodeAudio;
	}

	// INIT
	_audioDecoder = new Audio.Decoder(onAudioDecoded);
	_videoDecoder = new Video.Decoder(onVideoDecoded);
	
	
	if(typeof(parameters)==='string')
		parameters = ParseQuery(parameters); // was query!
	try {
		_context = window.AudioContext ? new window.AudioContext() : new window.webkitAudioContext();
	} catch(e) {
		throw new Error('Web Audio API is not supported in this browser');
	}
	
	_engine = _context.createScriptProcessor(1024, 0, 6); // 6 to support 5.1!
	_engine.onaudioprocess = function(e) {
		// Call every around 20 ms
		//var now = (new Date()).getTime();
		//var elapsed = now-_lastDecodingTime;
		//_lastDecodingTime = now;
		
		
		var output = [e.outputBuffer.getChannelData(0), e.outputBuffer.getChannelData(1), e.outputBuffer.getChannelData(2),
						e.outputBuffer.getChannelData(3), e.outputBuffer.getChannelData(4), e.outputBuffer.getChannelData(5)];
		output.rate = _context.sampleRate;
		
		// Process _samples if present
		var filled = renderAudio(output);
		if(filled>=_engine.bufferSize)
			return;
		
		// Now we can add decoding!
		// Process configs packet in first
		while(_audios.length && _audios[0].tag.isConfig) {
			var audio = _audios.shift();
			if(!audio.data.byteLength) {
				_buffering = true;
				console.log("Audio end")
			} else
				_audioDecoder.decode(audio.tag, audio.data);
		}

		if(_buffering) {
			if(_audios.length>_latency)
				_buffering = false;
		} else if(!_audios.length) {
			// Increase in real-time the latency, never decrease it,
			// the entiere socket session looks required this latency for audio,
			// if could decrease, sounds right to restart playing session (socket reconnection)
			_buffering = true;
			++_latency;
			console.log("Increase audio latency",_latency);
		}
		
		// decode video in front of audio
		var audio;
		while(audio = ((decodeVideo((e.playbackTime-_context.currentTime)*1000) && !_buffering) ? _audios.shift() : null)) {
			_audioDecoder.decode(audio.tag, audio.data);
			filled = renderAudio(output);
			if(filled>=_engine.bufferSize)
				return;
		}
		if(audio) {
			// audio data missing!
			_buffering = true;
			++_latency;
			console.log("Increase audio latency",_latency);
		}
		// fill with empty!
		for (var channel = 0; channel < 6; ++channel)
			output[channel].fill(0, filled);
	}
	_engine.connect(_context.destination);
};


  