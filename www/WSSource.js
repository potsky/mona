var _Rates = [ 0, 5512, 7350, 8000, 11025, 12000, 16000, 18900, 22050, 24000, 32000, 37800, 44056, 44100, 47250, 48000, 50000, 50400, 64000, 88200, 96000, 176400, 192000, 352800, 2822400, 5644800, 0, 0, 0, 0, 0, 0 ];


WSSource = function(url, onVideo, onAudio, onData, onEnd, parameters) {
	var _this = this;
	
	var query = '';
	for(var parameter in parameters) {
	   if(!query)
		   query = '?';
	   else
		   query += '&';
	   query += parameter + '=' + parameters[parameter];
	}

	var iQuery = url.lastIndexOf('?');
	if(iQuery==-1)
		iQuery = url.length;
	var iStream = url.lastIndexOf('/');
	var stream;
	if(iStream>5 && iStream<iQuery) {// after wws:// but before '?'
		stream = url.substring(iStream+1);
		url = url.substring(0, iStream);
	}
	if(!stream)
		stream = 'test';
	var socket = new WebSocket(url+query);

	socket.binaryType = "arraybuffer";
	socket.onopen = function(event){ socket.send('["@subscribe","' + stream + '"]'); };
	socket.onmessage = function(event){
		// audio and video data
		if(typeof(event.data)=="string") {
			var params; 
			try {
				params = JSON.parse(event.data);
			} catch(e) {
				throw new Error(e.message+", "+event.data);
			}
			var handler = params[0];
			switch(handler) {
				case "@publishing":
					break;
				case "@unpublishing":
					onEnd();
					break;
				default:
					onData.apply(_this, params);
			}
			return;
		}

		// Audio or Video
		var data = new Uint8Array(event.data);
	
		if(data[0]&0x80) {
			if(data[0]&0x40) {
				// VIDEO
				var tag = { codec: data[0]&0x3F, frame: data[1]>>3, compositionOffset:0 };
				var timePos = 2 + (data[1]&1); // add 1 if track present (should never happen)
				if(data[1]&2) {
					tag.compositionOffset = (data[2]<<8 | data[3]);
					timePos += 2;
				}
				tag.time = ((data[timePos]<<24) | (data[timePos+1]<<16) | (data[timePos+2]<<8) | data[timePos+3]);
				onVideo(tag, new Uint8Array(data.buffer, timePos+4));
			} else {
				// AUDIO
				var tag = { codec: data[0]&0x3F, channels: data[1], rate: _Rates[data[2]>>3], isConfig: data[2]&2 };	
				var timePos = 3 + (data[2]&1); // add 1 if track present (should never happen)
				tag.time = ((data[timePos]<<24) | (data[timePos+1]<<16) | (data[timePos+2]<<8) | data[timePos+3]);
				onAudio(tag, new Uint8Array(data.buffer, timePos+4));
			}
		} // else data, should never happen
		
		/*
		var now = (new Date()).getTime()
		if(_tagTime && _tag)
			console.log((now-_tagTime)-(tag.time-_tag.time))
		if(!_buffering) {
			if(_tag && tag.time>_tag.time && (now-_tagTime)>(tag.time-_tag.time)) {
				// elapsed real time > streaming timestamp elapsed => new wave => minimum buffers
				if(_audios.length>_latency) {
					console.log("Seek audio live", _audios.length, _latency);
					while(_audios.length>_latency && !_audios[0].tag.isConfig)
						_audios.shift();
				}
			}
			
			
		}
		_tagTime = now;
		_tag = tag;*/
	};
	socket.onclose = function(event){ onEnd(); };
};

