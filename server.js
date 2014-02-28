/*

	a node server that proxies HTTP requests to Firebase

*/

var app = require('http').createServer(handleRequest),
	BinaryServer = require('binaryjs').BinaryServer,
	base64 = require('base64-stream'),
	firebase = require('firebase'),
	url = require('url');

var baseURL = 'https://acequia.firebaseio.com/fog/',
	rootRef = new firebase(baseURL),
	pendingRequests = [];

binaryServer = BinaryServer({ server: app });
app.listen(8962);

binaryServer.on('connection', function(client) {
	client.on('stream', function(stream, meta) {
		console.log('incoming stream');
		var request = pendingRequests[meta.id], httpRes;
		if (request && (httpRes = request.httpRes)) {

			stream.on('data', function(chunk) {
				console.log('received chunk');
			});
			
			stream.on('end', function() {
				console.log('finished receiving stream');
			});

			if (meta.headers['Content-Transfer-Encoding'] &&
				meta.headers['Content-Transfer-Encoding'] == 'base64') {
				delete meta.headers['Content-Transfer-Encoding'];
				console.log('piping encoded response');
				httpRes.writeHead(200, meta.headers);
				stream.pipe(base64.decode()).pipe(httpRes);
			}
			else {
				httpRes.writeHead(200, meta.headers);
				stream.pipe(httpRes);
			}

			destroyPendingRequest(meta.id);
		}
		else {
			console.log('failed to find request for incoming stream');
		}
	});
});

rootRef.child('online').set(true);
rootRef.child('online').onDisconnect().set(false);

function destroyPendingRequest(id) {
	var pendingRequest = pendingRequests[id];
	if (pendingRequest.resRef) {
		pendingRequest.resRef.off();
		pendingRequest.resRef.remove();
	}

	// pendingRequest.reqRef && pendingRequest.reqRef.remove();
	delete pendingRequests[id];
}

function handleRequest(httpReq, httpRes) {
	if (httpReq.url === '/favicon.ico') {
		httpRes.writeHead(200, {
			'Content-Type': 'image/x-icon'
		});
		httpRes.end();
		return;
	}

	var urlParts = url.parse(httpReq.url, true),
		splitPath = urlParts.pathname.split("/");

	if (splitPath.length < 3) {
		var msg = 'Bad request. ' +
			'Request format: /<storage-name>/path/to/file';
		respondWithError(httpRes, msg);
		return;
	}

	var reqId = Math.floor(Math.random()*10000000),
		storageName = splitPath[1],
		pathname = "/" + splitPath.slice(2).join("/"),
		requestFields = {
			'id': reqId,
			'url': httpReq.url,
			'pathname': pathname,
			'query': urlParts.query,
			'headers': httpReq.headers,
			'method': httpReq.method,
			'timestamp': new Date()
		};

	var illegalChars = /[\[\]\.\/\$\#]/;
	if (illegalChars.test(storageName)) {
		var msg = 'One or more illegal characters in storage name ( . # / [ ] $ ). ' +
			'Request format: /<storage-name>/path/to/file';
		respondWithError(httpRes, msg);
		return;
	}

	console.log(new Date() + ': ----------------------------------------');
	console.log(urlParts, storageName, pathname);
	console.log(requestFields.headers);

	var reqRef = rootRef.child(storageName).child('requests').push({
		'request': requestFields
	}, function(error) {
		if (error) {
			console.log('firebase request push failed.');
			response.write('failed');
		}
	});

	resRef = rootRef.child(storageName).child('responses/'+reqRef.name());

	pendingRequests[reqId] = {
		httpRes: httpRes,
		resRef: resRef,
		reqRef: reqRef
	};

	resRef.on('value', function(snap) {
		var status = snap.child('status').val(),
			res = snap.child('body').val();
		
		if (snap.val()) {
			console.log('received firebase response', status);
			switch(status) {
				case 200:
					httpRes.writeHead(status);
					if (res['itemsArray']) {
						res.items = {};
						res.itemsArray.forEach(function(item) {
							res.items[item.key] = item.value;
						});
						delete res.itemsArray;
						httpRes.write(JSON.stringify(res));
					}
					else if (res['Content-Type']) {
						// it's a file
						// webrtc the file over
					}
					else {
						// httpRes.write(res.toString());
					}
					break;
				default:
					status = status || 500;
					httpRes.writeHead(status);
					httpRes.write(JSON.stringify(res));
			}
			httpRes.end();

			destroyPendingRequest(reqId);
		}
	});

}

function respondWithError(httpRes, msg) {
	console.log(msg);
	httpRes.writeHead(404);
	httpRes.write(msg);
	httpRes.end();
}