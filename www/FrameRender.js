FrameRender = function(player) {
	var _canvas = document.createElement("canvas");
	var _fps=0, _startTime=0, _frameNumber=0;
	var _gl, _program;
	var _textureY, _textureU, _textureV, _isRGB=false;
	var _this = this;
	
	this.width = function() { return player.clientWidth; }
	this.height = function() { return player.clientHeight; }
	this.videoWidth = function() { return _canvas.width; }
	this.videoHeight = function() { return _canvas.height; }
	this.fps = function() {
		var now = new Date().getTime();
		var elapsed = now - _startTime;
		if(elapsed>=1000) {
			// compute every seconds (>1000)
			_fps = Math.floor(_frameNumber / elapsed / 1000);
			_startTime = now;
			_frameNumber = 0;
		}
		return _fps;
	};
	this.clear = function() {
		// clear color buffer
		_gl.viewport(0, 0, _canvas.width, _canvas.height);
		_gl.clearColor(0.0, 0.0, 0.0, 0.0);
		_gl.clear(_gl.COLOR_BUFFER_BIT);
		// reset video size
		_canvas.width = _canvas.height = null;
	};
	this.refresh = function() {
		if(!_canvas.width || !_canvas.height)
			return; // nothing to do!
		// resize canvas in respecting video ratio
		var ratio = _canvas.width / _canvas.height;
		if(player.clientWidth > (player.clientHeight * ratio)) {
			// height is the constraint
			_canvas.style.height = "100%";
			_canvas.style.width = _canvas.clientHeight * ratio;
		} else {
			// width is the constraint
			_canvas.style.width = "100%";
			_canvas.style.height = _canvas.clientWidth / ratio;
		}
	}
	/*
		frame.width
		frame.height
		
		frame.y => Uint8Array
		[frame.yWidth]
		[frame.yHeight]
		frame.u => Uint8Array
		[frame.uWidth]
		[frame.uHeight]
		frame.v => Uint8Array 
		[frame.vWidth]
		[frame.vHeight]
		OR
		frame.r => Uint8Array
		frame.g => Uint8Array 
		frame.b => Uint8Array
	*/
	this.draw = function(frame, buffers) {
		if(!frame.width || !frame.height)
			throw new Error('Frame must have valid width and height properties');
		++_frameNumber;

		// Fill textures
		if(frame.r) {
			if(!_isRGB)
				_gl.uniform1i(_gl.getUniformLocation(_program, "isRGB"), _isRGB = true);
			fillTexture( _textureY, _gl.TEXTURE0, frame.width, frame.height, frame.r, buffers);
			fillTexture( _textureU, _gl.TEXTURE1, frame.width, frame.height, frame.g, buffers);
			fillTexture( _textureV, _gl.TEXTURE2, frame.width, frame.height, frame.b, buffers);
		} else {
			if(_isRGB)
				_gl.uniform1i(_gl.getUniformLocation(_program, "isRGB"), _isRGB = false);
			fillTexture( _textureY, _gl.TEXTURE0, frame.yWidth || frame.width, frame.yHeight || frame.height, frame.y, buffers);
			fillTexture( _textureU, _gl.TEXTURE1, frame.uWidth || frame.width, frame.uHeight || frame.height, frame.u, buffers);
			fillTexture( _textureV, _gl.TEXTURE2, frame.vWidth || frame.width, frame.vHeight || frame.height, frame.v, buffers);
		}

		// Aaaaand draw stuff.
		if(_canvas.width!==frame.width || _canvas.height!==frame.height) {
			_gl.viewport(0, 0, _canvas.width = frame.width, _canvas.height = frame.height);
			_this.refresh();
		}
		_gl.drawArrays(_gl.TRIANGLE_STRIP, 0, 4);
	}

	function fillBufferPos(bufferPos, rectangle) {
		_gl.bindBuffer(_gl.ARRAY_BUFFER, bufferPos);
		_gl.bufferData(_gl.ARRAY_BUFFER, new Float32Array(rectangle), _gl.DYNAMIC_DRAW);
	}
	function fillTexture(texture, register, width, height, data, buffers) {
		_gl.activeTexture(register);
		_gl.bindTexture(_gl.TEXTURE_2D, texture);
		_gl.texImage2D(_gl.TEXTURE_2D, 0, _gl.LUMINANCE, width, height, 0, _gl.LUMINANCE, _gl.UNSIGNED_BYTE, data);
		if(buffers)
			buffers.push(data.buffer);
	}
	
	
	/// INIT
	player.style.position='relative';
	player.style['background-color']='black';
	player.style.padding = player.style.margin = 0;
	// _canvas.style['background-color']='white'; uncomment for debug canvas position!
	_canvas.style.position='absolute';
	_canvas.style.padding = 0;
	_canvas.style.margin = 'auto';
	_canvas.style.top = _canvas.style.bottom = _canvas.style.left = _canvas.style.right = 0;
	_canvas.width = _canvas.height = null; // no video!
	_canvas.style.height = "100%";
	_canvas.style.width = "100%";
	player.appendChild(_canvas);

	_gl = _canvas.getContext('webgl') || _canvas.getContext('experimental-webgl');
	if (!_gl)
		throw new Error('WebGL unavailable');

	// Create program
	
	_program = _gl.createProgram();
	
	// Build shaders
	
	function createShader(type, source) {
		var shader = _gl.createShader(type);
		_gl.shaderSource(shader, source);
		_gl.compileShader(shader);
		if (!_gl.getShaderParameter(shader, _gl.COMPILE_STATUS)) {
			var err = _gl.getShaderInfoLog(shader);
			_gl.deleteShader(shader);
			throw new Error('GL shader compilation for ' + type + ' failed: ' + err);
		}
		_gl.attachShader(_program, shader);
	}
	createShader(_gl.VERTEX_SHADER,
		"attribute vec2 aPosition;\
		 attribute vec2 aFramePosition;\
		 varying vec2 vFramePosition;\
		 void main() {\
			gl_Position = vec4(aPosition, 0, 1);\
			vFramePosition = aFramePosition;\
		 }");
	createShader(_gl.FRAGMENT_SHADER,
		"precision mediump float;\
		 uniform sampler2D uTextureY;\
		 uniform sampler2D uTextureU;\
		 uniform sampler2D uTextureV;\
		 uniform bool isRGB; \
		 varying vec2 vFramePosition;\
		 void main() {\
			float fY = texture2D(uTextureY, vFramePosition).r;\
			float fU = texture2D(uTextureU, vFramePosition).r;\
			float fV = texture2D(uTextureV, vFramePosition).r;\
			if(!isRGB) {\
				float fYmul = fY * 1.1643828125;\
				gl_FragColor = vec4( \
					fYmul + 1.59602734375 * fV - 0.87078515625, \
					fYmul - 0.39176171875 * fU - 0.81296875 * fV + 0.52959375, \
					fYmul + 2.017234375   * fU - 1.081390625, \
					1 \
				); \
			} else\
				gl_FragColor = vec4(fY, fU, fV, 1);\
		 }");

	_gl.linkProgram(_program);
	if (!_gl.getProgramParameter(_program, _gl.LINK_STATUS)) {
		var err = _gl.getProgramInfoLog(_program);
		_gl.deleteProgram(_program);
		throw new Error('GL program linking failed: ' + err);
	}
	_gl.useProgram(_program);
	
	
	// create buffers
	function createBufferPos(varname, rectangle) {
		var bufferPos = _gl.createBuffer();
		_gl.bindBuffer(_gl.ARRAY_BUFFER, bufferPos);
		_gl.bufferData(_gl.ARRAY_BUFFER, new Float32Array(rectangle), _gl.STATIC_DRAW);
		var aPosition = _gl.getAttribLocation(_program, varname);
		_gl.enableVertexAttribArray(aPosition);
		_gl.vertexAttribPointer(aPosition, 2, _gl.FLOAT, false, 0, 0);
		return bufferPos;
	}
	createBufferPos('aPosition', [1, 1, -1, 1, 1, -1, -1, -1]);
	createBufferPos('aFramePosition', [1, 0, 0, 0, 1, 1, 0, 1]);

	// Create textures
	function createTexture(varname, index) {
		var texture = _gl.createTexture();
		_gl.uniform1i(_gl.getUniformLocation(_program, varname), index);
		_gl.bindTexture(_gl.TEXTURE_2D, texture);
		_gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_WRAP_S, _gl.CLAMP_TO_EDGE);
		_gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_WRAP_T, _gl.CLAMP_TO_EDGE);
		_gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_MIN_FILTER, _gl.LINEAR);
		_gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_MAG_FILTER, _gl.LINEAR);
		return texture;
	}
	_textureY = createTexture('uTextureY', 0);
	_textureU = createTexture('uTextureU', 1);
	_textureV = createTexture('uTextureV', 2);
	_gl.uniform1i(_gl.getUniformLocation(_program, "isRGB"), _isRGB);
};
