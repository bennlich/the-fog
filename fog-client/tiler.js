function Tiler(tileSize) {
	this.tileSize = tileSize || 256;
	this.cache = {};
}

Tiler.prototype.TileRect = function(tx, ty, zoom, imageWidth, imageHeight) {
    // returns the rect for the image tile (tx, ty) at the specified zoom

    var tileCoordExtent = this.tileSize * Math.pow(2, zoom),
    	imageCoordExtent = this.SmallestPowerOf2GreaterThan(Math.max(imageWidth, imageHeight)),
    	scale = imageCoordExtent / tileCoordExtent;

    var x = tx * this.tileSize * scale,
    	y = ty * this.tileSize * scale,
    	size = this.tileSize * scale;

    return [x, y, size, size];
}

Tiler.prototype.createTile = function(path, callback) {
	var self = this;
	var splitPath = path.split('/');
	var filename = splitPath[1],
		z = splitPath[2],
		x = splitPath[3],
		y = splitPath[4].replace('.png','');

	var imgUrl = this.cache[filename];
	if (imgUrl) {

		var img = document.createElement('img');
		img.onload = function() {
			callback && callback(null, createCanvasTile(img).toDataURL());
		}
		img.src = imgUrl;

		// console.log('using cache');
		// callback && callback(null, createCanvasTile(img).toDataURL());
		return;
	}

	function createCanvasTile(img) {
		var canvas = document.createElement('canvas'),
			ctx = canvas.getContext('2d');

		canvas.width = canvas.height = self.tileSize;

		var tileRect = self.TileRect(x, y, z, img.width, img.height);

		ctx.drawImage(img, tileRect[0], tileRect[1], tileRect[2], tileRect[3],
			0, 0, canvas.width, canvas.height);
		
		document.getElementById('debug-canvas').getContext('2d')
			.drawImage(img, tileRect[0], tileRect[1], tileRect[2], tileRect[3],
			0, 0, canvas.width, canvas.height);

		return canvas;
	}

	openFile('/images/'+filename, function(err, file) {

		if (err) {
			callback && callback(err);
			return;
		}

		var url = URL.createObjectURL(file),
			img = document.createElement('img');

		console.log('image url', url);
		console.log('added image url to cache');
		self.cache[filename] = url;

		img.onload = function() {
			// console.log('added image to cache');
			// self.cache[filename] = img;
			callback && callback(null, createCanvasTile(img).toDataURL());
			// URL.revokeObjectURL(url);
		}

		img.src = url;
	});
}

Tiler.prototype.SmallestPowerOf2GreaterThan = function(num) {
	var exponent = Math.ceil(Math.log(num) / Math.log(2));
	return Math.pow(2, exponent);
}
