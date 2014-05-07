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
	var files = e.target.files,
		q = queue();

	if (files.length) {
		Util.toArray(files).forEach(function(file, i) {
			if (file.name !== '.DS_Store' && file.name !== '.') {
				q.defer(write, '/images/'+file.name, { data: file });
			}			
		});

		q.awaitAll(function(err, results) {
			console.log('done with all writes');
			if (err) {
				console.log(err);
			}
			if (results) {
				results.forEach(function(fileEntry, fileWriter) {
					console.log("Saved /images/"+fileEntry.name+".");
				});	
			}
			resetFormElement($(e.target));
			showFiles();
		});
	}

	function resetFormElement(el) {
		el.wrap('<form>').closest('form').get(0).reset();
		el.unwrap();
	}
}

function onError(e) {
	console.log('Error', e);
}