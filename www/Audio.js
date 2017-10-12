var _Rates = [ 96000, 88200, 64000, 48000, 44100, 32000, 24000, 22050, 16000, 12000, 11025, 8000, 7350 ];


Audio = {};


Audio.Decoder = function(onDecoded) {	
	if(typeof(AV) === 'undefined')
		throw new Error('No AV API, include AV.js before Audio.js')
	var _decoder = new AV.Decoder();
	var _frame, _codec, _context = {};

	this.decode = function(tag, data){
		if(_codec !== tag.codec)
			_decoder.openAudio(_codec = tag.codec);	
		if(_codec==AV.AudioCodec.AAC) {
			// convert to ADTS format, libavcodec doesn't support AAC raw data!
			var size = data.byteLength;
			if(tag.isConfig) {
				if(size>=2) {
					_context.codecType = data[0]>>3;
					if(_context.codecType) {
						--_context.codecType;
						_context.rateIndex = ((data[0] & 3)<<1) | (data[1]>>7);
						_context.channels = (data[1] >> 3) & 0x0F;
					} else
						console.warn("AAC configuration packet invalid");
				} else
					console.warn("AAC configuration packet must have a minimum size of 2 bytes");
				return;
			}
			var header = new Uint8Array(7);
			size += 7;
			header[0] = 0xFF;
			header[1] = 0xF1;
			header[2] = (_context.codecType<<6) | ((_context.codecType ? _context.rateIndex : RateToIndex(tag.rate)) << 2) | (((_context.channels || tag.channels) >> 2) & 0x01);
			header[3] = ((_context.channels || tag.channels)&0x03)<<6 | ((size>>11)&0x03);
			header[4] = (size>>3) & 0xFF;
			header[5] = ((size&0x07)<<5) | 0x1F;
			header[6] = 0xFC;
			_decoder.writeData(header, data);
		} else
			_decoder.writeData(data);
		var frame;
		while(frame = _decoder.readFrame(_frame))
			onDecoded((_frame = frame).build());
	}
	this.clear = function() {
		// release resources
		if(_codec) {
			_decoder.close();
			_codec = null;
		}
		if(_frame) {
			_frame.delete();
			_frame = null;
		}
		_context = {};
	}
	
	function RateToIndex(rate) {
		for (var i = 0; i < _Rates.length; ++i) {
			if(rate==_Rates[i])
				return i;
			if(rate>_Rates[i])
				break;
		}
		console.warn("Audio rate doesn't match any audio standardized rate");
		return i;
	}
};


Audio.Mixer = function() {
	var _lastValues = [0, 0, 0, 0, 0, 0], _position = 1;
	
	/* Returns output fills!
	<0 => if miss space to consume input (space<available)
	>0 => if space >= available */
	this.mix = function(input, output) {
		if(!output.offset)
			output.offset = 0;
		if(!input.offset)
			input.offset = 0;
		if(!input.length)
			return output.offset; // no input channels!
		var step = (input.rate && output.rate) ? (input.rate / output.rate) : 1;
		if(step==1) {
			 //BYPASS (copy more faster than interpolate)
			_position = 1;
			copy(input, output);
		} else
			interpolate(input, step, output);
//		console.log(input[0].length, input.offset, output.offset);
		return input.offset<input[0].length ? -output.offset : output.offset;
	}
	
	function interpolate(input, step, output) {
		var channels = input.length;
		if(channels>6)
			channels = 6;  // ignore other channels!
		while(input.offset<input[0].length) {
			for (var channel = 0; channel < channels; ++channel) {
				var value = input[channel][input.offset];
				if(_position<=1) {
					// write ouput
					_lastValues[channel] = value = (_lastValues[channel] * (1-_position)) + (value * _position);
					// see https://www.w3.org/TR/2013/WD-webaudio-20131010/#ChannelLayouts
					switch(channels) {
						case 1:
							output[2][output.offset] = value; // mono to 5.1 (2 = center)
							break;
						case 4:
							output[channel<2 ? channel : (channel+2)][output.offset] = value;
							break;
						case 5: // no subwoofer
							output[channel<3 ? channel : (channel+1)][output.offset] = value;
							break;
						default:
							output[channel][output.offset] = value;
							break;
					}
				} else // else downsamping => high frequency filter
					_lastValues[channel] = (_lastValues[channel]+value)/2;
			}
			if(_position>=1) {
				++input.offset;
				if(--_position)
					continue; // _position was superior to 1, nothing has been written!
			}
			_position += step;
			if(++output.offset>=output[0].length)
				break;
		}
	}
	
	function copy(input, output) {
		var offset = output.offset;
		var space = output[0].length - offset;
		var available = input[0].length - input.offset;
		// see https://www.w3.org/TR/2013/WD-webaudio-20131010/#ChannelLayouts
		
		switch(input.length) {
			case 1:
				output[2].set(input[0].subarray(input.offset), offset); // mono to 5.1 (2 = center)
				break;
			case 4:
				output[0].set(input[0].subarray(input.offset), offset);
				output[1].set(input[1].subarray(input.offset), offset);
				output[4].set(input[2].subarray(input.offset), offset);
				output[5].set(input[3].subarray(input.offset), offset);
				break;
			case 5: // no subwoofer
				output[0].set(input[0].subarray(input.offset), offset);
				output[1].set(input[1].subarray(input.offset), offset);
				output[2].set(input[2].subarray(input.offset), offset);
				output[4].set(input[3].subarray(input.offset), offset);
				output[5].set(input[4].subarray(input.offset), offset);
				break;
			default:
				for(var channel = 0; channel<input.length; ++channel) {
					output[channel].set(input[channel].subarray(input.offset), offset);
					if(channel==5)
						break; // ignore other channels!
				}
		}
		if(space>available) {
			input.offset += space;
			output.offset += space;
		} else {
			input.offset += available;
			output.offset += available;
		}
	}
	
}

