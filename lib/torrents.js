
var events = require('events');
var torrents = module.exports = new events.EventEmitter();

var async = require('async');
var parse = require('parse-torrent');
var Archive = require('zip-stream');
var request = require('request');
var torrentStream = require('torrent-stream');

var File = require("./file");
var backend = require('./backend');

torrents.filesDownloading = 0;
var list = torrents.list = [];

//=============
// every second, check the status of all active torrents

setInterval(function() {
	var changed = false;

	var filesDownloading = 0;

	for(var i = 0; i < list.length; i++) {
		var t = list[i];

		if(!t.$engine)
			continue;

		//check torrent speed
		var swarm = t.$engine.swarm;

		var status = {
			down: swarm.downloaded,
			downps: swarm.downloadSpeed(),
			up: swarm.uploaded,
			upps: swarm.uploadSpeed()
		};

		for(var k in status)
			if(status[k] !== t.status[k])
				changed = true;

		if(t.zipping)
			filesDownloading++;

		//check file status
		t.files.forEach(function(f) {
			if(f.uploading)
				filesDownloading++;
		});
		t.status = status;
	}

	if(torrents.filesDownloading !== filesDownloading) {
		torrents.filesDownloading = filesDownloading;
		changed = true;
	}

	if(changed)
		torrents.emit("update");
}, 1000);

//=============


var fs = require("fs");
var rm = require("rimraf");
var path = require("path");
var TMP_DIR = path.resolve("./tmp");
var TS_DIR = path.join(TMP_DIR, "torrent-stream");

//on start, reopen existing torrents
setTimeout(function() {
	if(!fs.existsSync(TS_DIR))
		return;
	var files = fs.readdirSync(TS_DIR);
	if(!files)
		return;
	files.filter(function(f) {
		return /\.torrent$/.test(f);
	}).forEach( function(f) {
		var buff = fs.readFileSync(path.join(TS_DIR, f));
		load(parse(buff), function(err) {
			if(!err)
				console.log("Restored torrent", f);
		});
	});
});


//=============
//helpers

var findTorrent = function(hash) {
	for(var i = 0; i < list.length; i++) {
		var t = list[i];
		if(t.hash === hash)
			return t;
	}
	return null;
};

var findFile = function(torrent, path) {
	for(var i = 0; i < torrent.files.length; i++) {
		var f = torrent.files[i];
		if(f.path === path)
			return f;
	}
	return null;
};

//=============

var load = function(t, callback) {
	if(!t)
		return callback("Invalid torrent");
	if(!t.infoHash)
		return callback("Missing hash");

	var torrent = findTorrent(t.infoHash);
	if(torrent)
		return callback("Torrent already exists");

	torrent = {
		$engine: null,
		hash: t.infoHash,
		name: t.name,
		trackers: t.announce,
		magnet: parse.toMagnetURI(t),
		files: [],
		status: {}
	};
	list.push(torrent);
	torrents.emit("update");

	//loaded, now open it
	torrents.open({ hash:torrent.hash }, callback);
};

torrents.load = function(data, callback) {
	if(data.magnet) {
		load(parse(data.magnet), callback);
	} else if(data.torrent) {
		request({
			method: "GET",
			url: data.torrent,
			gzip: true,
			encoding: null //buffer!
		}, function(err, resp, body) {
			if(err)
				return callback("Invalid URL");
			var t;
			try {
				t =  parse(body) ;
			} catch(e) {
				return callback("Failed to parse torrent");
			}
			load(t, callback);			
		});
	} else {
		return callback("Invalid request");
	}
};

torrents.open = function(data, callback) {
	var torrent = findTorrent(data.hash);
	if(!torrent)
		return callback("Torrent missing");
	if(torrent.$engine)
		return callback("Torrent already open");

	//dont wait - open torrent stream, mark openning and callback
	var engine = torrentStream(torrent.magnet, {
		connections: 100,
		uploads: 0, //TODO should upload, though we can be highly CPU/mem bound
		tmp: TMP_DIR,
		verify: true,
		dht: true
	});

	torrent.$engine = engine;
	torrent.openning = true;
	torrents.emit("update");
	callback(null);

	engine.on('error', function(err) {
		//TODO destroy torrent
		console.error("torrent '%s' error: %s", torrent.name, err);
	});

	engine.on('ready', function() {
		//overwrite magnet name with real name
		torrent.name = engine.torrent.name;
		torrent.files = engine.files.map(function(f, i) {
			return new File(f, i, torrent);
		});
		torrent.openning = false;
		torrent.open = true;
		torrents.emit("update");
	});
};

torrents.close = function(data, callback) {
	var torrent = findTorrent(data.hash);
	if(!torrent)
		return callback("Torrent missing");
	if(!torrent.$engine)
		return callback("Torrent not open");

	torrent.$engine.destroy(function() {

		//ensure all files are stopped
		if(torrent.files) {
			torrent.files.forEach(function(f) {
				f.cancel();
			});
		}

		torrent.files = null;
		torrent.open = false;
		torrent.$engine = null;
		torrents.emit("update");
		callback(null);
	});
};

torrents.remove = function(data, callback) {
	var torrent = findTorrent(data.hash);
	if(!torrent)
		return callback("Torrent missing");
	if(torrent.$engine)
		return callback("Torrent is still open");
	var i = list.indexOf(torrent);
	list.splice(i, 1);
	torrents.emit("update");

	//clear torrent files and torrent
	rm(path.join(TS_DIR, torrent.hash), function(err) {
		if(err) console.log("failed to delete: %s", torrent.hash);
	});
	rm(path.join(TS_DIR, torrent.hash+".torrent"), function(err) {
		if(err) console.log("failed to delete: %s.torrent", torrent.hash);
	});

	callback(null);
};

torrents.downloadFile = function(data, callback) {
	var torrent = findTorrent(data.hash);
	if(!torrent)
		return callback("Missing torrent");
	var file = findFile(torrent, data.path);
	if(!file)
		return callback("Missing file");
	if(file.downloading)
		return callback("Already downloading");

	//callback to user early since uploads can take hours...
	//user receives updates via websockets
	callback(null);
	file.uploading = true;
	torrents.emit("update");

	//pass copy of file to backend
	backend.upload({
		path: file.path,
		length: file.length,
		createReadStream: file.createReadStream.bind(file)
	}, function(err) {
		file.uploading = false;
		//receive result from backend
		if(err && err !== "cancelled") {
			file.downloadError = "Backend Error";
			torrents.emit("update");
			return console.error("backend error: ", err);
		}
		torrents.emit("update");

		//success, now re-list
		backend.list(function(err, files) {
			if(err) return console.error("failed to list");
			torrents.emit("update", files);
		});
	});
};

torrents.cancelFile = function(data, callback) {
	var torrent = findTorrent(data.hash);
	if(!torrent)
		return callback("Missing torrent");
	var file = findFile(torrent, data.path);
	if(!file)
		return callback("Missing file");
	if(!file.downloading)
		return callback("Not downloading");

	var success = file.cancel();
	callback(success ? null : "Failed to close file");
};


torrents.zipAll = function(data, callback) {
	var torrent = findTorrent(data.hash);
	if(!torrent)
		return callback("Missing torrent");

	var files = torrent.files;

	var archive = new Archive();

	archive.on('error', function(err) {
		console.error("zip error:", err);
	});

	async.series(files.map(function(f, i) {
		return function(cb) {
			archive.entry(f.createReadStream(), { name: f.path }, function(err) {
				if(err)
					return cb(err);
				cb(null);
			});
		};
	}), function(err) {
		if(err) {
			torrent.zipping = false;
			torrents.emit("update");
			return console.error("zip archive error:", err);
		}
		archive.finish();
	});

	torrent.zipping = true;
	torrents.emit("update");

	//callback to user early since uploads can take hours...
	//user receives updates via websockets
	callback(null);

	//pass zip stream to backend
	backend.upload({
		path: torrent.name + ".zip",
		length: files.reduce(function(len, f) { return len+f.length; }, 0),
		createReadStream: function() { return archive; }
	}, function(err) {
		torrent.zipping = false;
		torrents.emit("update");
		if(err) {
			return console.error("zip upload error:", err);
		}
		backend.list(function(err, files) {
			if(err) return console.error("failed to list");
			torrents.emit("update", files);
		});
	});
};

torrents.trash = function(data, callback) {

	if(!data.path)
		return callback("Missing path");

	backend.remove(data.path, function(err) {
		if(err) return callback("Failed to trash: " + err);

		backend.list(function(err, files) {
			if(err) return callback("Failed to list: " + err);
			torrents.emit("update", files);
			callback(null);
		});
	});
};
