// (function() {
// 	var cookies = 'WAGAGAGA';
// 	console.log(cookies);
// })()

var httpRef = new Firebase('https://acequia.firebaseio.com/fog/'),
	filer = new Filer(),
	binaryClient = new BinaryClient('ws://localhost:8080');

function init() {
	filer.init({persistent: false, size: 1024 * 1024}, function(fs) {
	  // filer.size == Filer.DEFAULT_FS_SIZE
	  // filer.isOpen == true
	  // filer.fs == fs
	  console.log('initialized filesystem');
	}, onError);

	binaryClient.on('open', function() {
		console.log('opened connection to binary server');
	});

	binaryClient.on('close', function() {
		console.log('lost connection to binary server');
	});

	console.log('listening to ' + httpRef.toString());

	// listen for incoming http requests
	httpRef.endAt().limit(1).on('child_added', function(childSnapshot) {
		var req = childSnapshot.child('request').val(),
			resRef = childSnapshot.ref().child('response');

		console.log('received request', req);

		if (!req.pathname) {
			console.warn("request was missing a pathname argument; sent no reply");
			return;
		}

		req.pathname = decodeURI(req.pathname);

		if (req.pathname.lastIndexOf('/') == (req.pathname.length - 1)) {
			handleDirectoryRequest(req, resRef);
		}
		else {
			handleFileRequest(req, resRef);
		}

		// Stephen's code for running code in a client
		// if (req.query && req.query.hasOwnProperty('command')) {
		// 	console.log('> ' + req.query.command);
		// 	res = eval(req.query.command);
		// 	resRef.set(res);
		// }
	});
}

function handleDirectoryRequest(req, resRef) {
	ls(req.pathname, function(err, entries) {

		if (err) {
			handleError(err, resRef);
			return;
		}
		
		var res = {
			status: 200,
			body: {
				'@context': 'http://remotestorage.io/spec/folder-description',
				'itemsArray': []
			}
		};

		var q = queue();
		
		entries.forEach(function(entry) {
			if (entry.isFile) {
				q.defer(openFile, entry);
			}
			else if (entry.isDirectory) {
				res.body.itemsArray.push({
					key: entry.name,
					value: {
						'ETag': 'if only I knew how to create an ETag'
					}
				});
			}
		});
		
		q.awaitAll(function(error, results) {
			console.log('error', error, 'results', results);
			results.forEach(function(file) {
				res.body.itemsArray.push({
					key: file.name,
					value: {
						'Content-Type': file.type,
						'Content-Length': file.size,
						'ETag': file.lastModifiedDate
					}
				});
			});
			resRef.set(res);
		});
	});
}

function handleFileRequest(req, resRef) {
	openFile(req.pathname, function(err, file) {
		if (err) {
			handleError(err, resRef);
			return;
		}

		var headers = {
			'Content-Type': file.type,
			'Content-Length': file.size,
			'ETag': file.lastModifiedDate
		};
		binaryClient.send(file, { headers: headers, id: req.id });
	});
}

function handleError(err, resRef) {
	console.log(err);
	// TODO: Finish handling all error types
	// see http://tools.ietf.org/html/draft-dejong-remotestorage-02#section-5
	// compared with https://developer.mozilla.org/en-US/docs/Web/API/FileError
	var res = {
		body: err.message
	};
	switch (err.code) {
		case FileError.NOT_FOUND_ERR:
			res.status = 404;
			break;
		case FileError.SECURITY_ERR:
			res.status = 401;
			break;
		case FileError.QUOTA_EXCEEDED_ERR:
			res.status = 507;
			break;
	}
	resRef.set(res);
}

// wrappers for filer functions that convert f(result), f(err) -> f(err, result)
function openFile(path, callback) {
	filer.open(path, function(result) {
		callback && callback(null, result);
	}, function(err) {
		callback && callback(err);
	});
}

function ls(path, callback) {
	filer.ls(path, function(result) {
		callback && callback(null, result);
	}, function(err) {
		callback && callback(err);
	});
}

// adapted from https://github.com/ebidel/filer.js
function onImportDirectory(e) {
	var files = e.target.files;
	if (files.length) {
		var count = 0;
		Util.toArray(files).forEach(function(file, i) {

			var folders = file.webkitRelativePath.split('/');
			folders = folders.slice(0, folders.length - 1);

			// Add each directory. If it already exists, then a noop.
			filer.mkdir(folders.join('/'), false, function(dirEntry) {
				var path = file.webkitRelativePath;
				count += 1;

				// Write each file by it's path. Skipt '/.' (which is a directory).
				if (path.lastIndexOf('/.') != path.length - 2) {
					
					filer.write(path, { data: file }, function(fileEntry, fileWriter) {
						// fogRef.child(path).set(1);
					}, onError);

					if (count == files.length) {
						filer.ls('.', function(entries) {
							console.log('done');
							console.log('entries:', entries);
						}, onError);
					}
				}
			}, onError);
		});
	}
}

function onImportFile(e) {
	var files = e.target.files;
	if (files.length) {
		Util.toArray(files).forEach(function(file, i) {
			filer.write(file.name, { data: file }, function(fileEntry, fileWriter) {
				// fogRef.child(path).set(1);
			}, onError);
		});
	}
}

function onError(e) {
	console.log('Error', e);
}