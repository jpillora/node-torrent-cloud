var torrents = require("./torrents");
var stream = require("stream");
var through = require('./util/through');

//in effect, this controls the size of the download buffer,
//it gets cleared as the upload progresses (prevents buffering the entire download in memory)
var MIN_PIECE_SIZE = 50*1024*1024;//~50Mb

function File(f, index, torrent) {
	var file = this;
	file.$f = f;
	//TODO (@jpillora) make downloads actually fall at piece boundaries
	var pieceSize = torrent.$engine.torrent.pieceLength;
	file.$pieceSize = Math.ceil(MIN_PIECE_SIZE/pieceSize)*pieceSize;
	
	file.i = index;
	file.downloading = false;
	file.name = f.name;
	file.path = f.path;
	file.length = f.length;
};

File.prototype = {
	createReadStream: function() {
		var file = this;

		//already created
		if(file.$r)
			return file.$r;

		//start download
		file.downloadError = undefined;
		file.cancelled = undefined;
		file.downloading = true;
		file.downloadLength = 0;
		torrents.emit("update");

		var piece = 0;
		var piecing = false;
		var waiting = false;
		var r = file.$r = new stream.Readable();

		var read = r._read = function() {

			//completed early
			if(file.cancelled)
				return;

			//download one piece at a time
			if(piecing) {
				waiting = true;
				return;
			}
			piecing = true;
			waiting = false;

			var s = piece * file.$pieceSize;
			var e = Math.min(s + file.$pieceSize, file.length);

			//EOF completed successfully
			if(s >= file.length)
				return file.$complete();

			//pull the next piece
			var download = file.$d = file.$f.createReadStream({
				start: s,
				end: e - 1
			});

			//extract chunk, place in this file
			var monitor = through(function transform(b) {
				file.downloadLength += b.length;
				torrents.emit("update");
				r.push(b);
			}, function(flush) {
				//next piece
				piece++;
				piecing = false;
				if(waiting)
					read();
				flush();
			});

			download.pipe(monitor);
		};

		return r;
	},
	cancel: function() {
		var file = this;
		//not open
		if(!file.$r || file.cancelled)
			return null;

		//attempt to close current download
		if(file.$d)
			file.$d.destroy();

		//close!
		file.cancelled = true;
		file.$complete("cancelled");
		file.$r = null;
		return true;
	},
	$complete: function(err) {
		var file = this;
		if(!file.downloading)
			return;
		file.downloading = false;
		torrents.emit("update");
		if(!file.$r)
			return;

		if(err)
			file.$r.emit("error", err);
		else
			file.$r.push(null);//EOF
	}
};

module.exports = File;