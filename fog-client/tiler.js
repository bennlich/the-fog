// mostly translated from GDAL:
// https://github.com/OSGeo/gdal/blob/trunk/gdal/swig/python/scripts/gdal2tiles.py

function Tiler(tileSize) {
	// "Initialize the TMS Global Mercator pyramid"
	// radius of the earth = 6378137 meters
	this.tileSize = tileSize || 256;
	this.initialResolution = 2 * Math.PI * 6378137 / this.tileSize;
    // 156543.03392804062 meters/pixel for tileSize 256 pixels
    this.originShift = 2 * Math.PI * 6378137 / 2.0;
    // 20037508.342789244 meters
    
    // EPSG:900913 coordinate extent is
    // [-20037508.342789244, -20037508.342789244, 20037508.342789244, 20037508.342789244]

    // image coordinate extent is
    // [0, 0, image.width, image.height]
}

Tiler.prototype.Resolution = function(zoom) {
    // "Resolution (meters/pixel) for given zoom level (measured at Equator)"

    // return (2 * math.pi * 6378137) / (self.tileSize * 2**zoom)
    return this.initialResolution / (Math.pow(2, zoom));
}

Tiler.prototype.MetersToTile = function(mx, my, zoom) {
    // "Returns tile for given mercator coordinates"

    var p = this.MetersToPixels(mx, my, zoom);
    return this.PixelsToTile(p[0], p[1]);
}

Tiler.prototype.MetersToPixels = function(mx, my, zoom) {
    // "Converts EPSG:900913 to pyramid pixel coordinates in given zoom level"

    var res = this.Resolution( zoom ),
    	px = (mx + this.originShift) / res
    	py = (my + this.originShift) / res;
    return [px, py];
}

Tiler.prototype.PixelsToTile = function(px, py) {
    // "Returns a tile covering region in given pixel coordinates"

    var tx = Math.round( Math.ceil( px / this.tileSize ) - 1 ),
    	ty = Math.round( Math.ceil( py / this.tileSize ) - 1 );
    return [tx, ty];
}

Tiler.prototype.PixelsToMeters = function(px, py, zoom) {
    // "Converts pixel coordinates in given zoom level of pyramid to EPSG:900913"

    var res = this.Resolution( zoom ),
    	mx = px * res - this.originShift
    	my = py * res - this.originShift;
    return [mx, my];
}

Tiler.prototype.TileRect = function(tx, ty, zoom, imageWidth, imageHeight) {
    // "Returns bounds of the given tile in EPSG:900913 coordinates"

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
