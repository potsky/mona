Video = {}

Video.Frame = {
	KEY: 			  1,
	INTER: 			  2,
	DISPOSABLE_INTER: 3,
	INFO: 			  5,
	CONFIG:			  7
}

Video.Decoder = function(onDecoded) {	
	if(typeof(AV) === 'undefined')
		throw new Error('No AV API, include AV.js before Video.js')
	var _buffers = [];
	var _worker = new Worker("AV.js"), _codec;

	this.decode = function(tag, data){
		if(_codec !== tag.codec)
			_worker.postMessage([AV.Decoder.OpenVideo, _codec = tag.codec, 'nal_length_size=4&is_avc=true']);
		_buffers.push(data.buffer);
		_worker.postMessage([AV.Decoder.Decode, data, _buffers.slice(0, -1)], _buffers);
		_buffers = [];
	}
	this.clear = function() {
		// release resources
		if(_codec) {
			_worker.postMessage([AV.Decoder.Close]);
			_codec = null;
		}
		_buffers = []
	}

	_worker.onmessage = function(e) {
		switch(e.data[0]) {
			case AV.Decoder.Decode:
				onDecoded(e.data[1], _buffers);
				break;
			default:
				throw new Error("AV worker response "+e.data[0]+" unknown");
		}
	};
};
 
