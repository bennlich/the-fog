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
			filer.write('/images/'+file.name, { data: file }, function(fileEntry, fileWriter) {
				console.log("Saved /images/"+file.name+".");
			}, onError);
		});
	}
}

function onError(e) {
	console.log('Error', e);
}