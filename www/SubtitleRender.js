SubtitleRender = function(player) {
	var _subtitles = new Array();
	
	this.draw = function(text) {
		var subtitle = document.createElement("div");
	
		subtitle.style.position='absolute';
		subtitle.style.padding = subtitle.style.margin = 0;
		subtitle.style.left = subtitle.style.right = 0;
		subtitle.style.bottom = subtitle.bottom = 50;
		subtitle.style.width = "50%";
		subtitle.style.margin = "auto";
		subtitle.style.textAlign = "center";
		subtitle.style.zIndex = 100;
		subtitle.style.opacity = 0;

		subtitle.style.color = "white";
		subtitle.style.backgroundColor =  "rgba(0, 0, 0, .6)";
		subtitle.style.fontFamily = "Arial, Helvetica, sans-serif";
		subtitle.style.fontSize = 17;
		subtitle.style.whiteSpace = "pre-wrap";
		
		subtitle.style.transitionProperty = 'bottom, opacity';
		subtitle.style.transitionDuration = '500ms';
		subtitle.style.transitionTimingFunction = 'cubic-bezier(0,0,0.1,1)';
		

		subtitle.innerHTML = "  " + text + "  ";
		
		player.appendChild(subtitle);
	
		// change position of displaying subtitle
		subtitle.time = new Date().getTime();
		subtitle.timeout = 0;
		var i;
		for(i = 0; i < _subtitles.length; ++i) {
			var sub = _subtitles[i];
			sub.style.bottom = sub.bottom += subtitle.clientHeight;
			sub.style.opacity -= 0.2;
			if(i)
				continue;
			var timeout = sub.timeout - (subtitle.time - sub.time);
			if(timeout>0)
				subtitle.timeout = timeout;
		}
		if(i<5)// rollup max to 4!
			subtitle.timeout += Math.min((Math.max(text.length/20, 3) * 1000), 10000-(i*2000));
		else
			subtitle.timeout += 1000;
		_subtitles.splice(0, 0, subtitle);

		setTimeout(onHide, subtitle.timeout, subtitle);
		
		subtitle.style.opacity = 1;
	}
	
	function onHide(subtitle) {
		subtitle.style.opacity = 0;
		setTimeout(onRemove, 1000, subtitle);
	}
	
	function onRemove(subtitle) {
		player.removeChild(subtitle);
		_subtitles.pop();
	}
	
	/// INIT
	player.style.transform = "translateZ(0)"; // to fix a rendering bug in chrome!
};
