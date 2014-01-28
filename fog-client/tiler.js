function Tiler(tileSize) {
	this.tileSize = tileSize || 256;
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
	var filename = '/' + splitPath[1],
		z = splitPath[2],
		x = splitPath[3],
		y = splitPath[4];

	openFile(filename, function(err, file) {

		if (err) {
			callback && callback(err);
			return;
		}

		var url = URL.createObjectURL(file),
			img = document.createElement('img'),
			canvas = document.createElement('canvas'),
			ctx = canvas.getContext('2d');

		canvas.width = canvas.height = self.tileSize;

		img.onload = function() {
			var tileRect = self.TileRect(x, y, z, img.width, img.height);
			console.log('tileRect', tileRect);
			ctx.drawImage(img, tileRect[0], tileRect[1], tileRect[2], tileRect[3],
				0, 0, canvas.width, canvas.height);

			var prefix = /^data.+;base64,/;
			var data = canvas.toDataURL().replace(prefix, "");
			console.log(canvas.toDataURL());
			callback && callback(null, canvas.toDataURL());
		}

		img.src = url;
	});
}

Tiler.prototype.SmallestPowerOf2GreaterThan = function(num) {
	var exponent = Math.ceil(Math.log(num) / Math.log(2));
	return Math.pow(2, exponent);
}
