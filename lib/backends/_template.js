
//this backend will be used if *all* of these env 'vars' are present
exports.vars = ["MY_VAR_1", "MY_VAR_2"];

//if these 'vars' are present, 'init' will be called on module load
exports.init = function(config) {
	config.MY_VAR_1
};

//upload will be called to upload a downloading torrent file
exports.upload = function(torrentFile, callback) {
	//torrentFile is an object, with properties:
	//	path - string
	//	length - length of file (IMPORTANT: when zipping all files,
	// 			we don't know exact length, so always try to use multipart uploads where length
	//			is not required, else buffer the file)
	//	createReadStream - function() begins to download file, returns a stream object
	//						you must handle the "error" event!
	//				(note: stream staggered to prevent backlog from slow uploads)
	
	//callback when stream has been fully uploaded
	callback(null);
};

//list will be called to list all stored files
exports.list = function(callback) {
	callback(null, {
		//original path to file (torrentFile.path)
		"path1": {
			length: 0, //total length of file in bytes
			url: "" //public url to file
		},
		"path2": {
			//...
		}
	});
};

//removes a file at the given path (will be torrentFile.path)
exports.remove = function(path, callback) {
	callback(null);
};