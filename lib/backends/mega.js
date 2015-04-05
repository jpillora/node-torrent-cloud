var async = require("async");
var mega = require("mega");


//this backend will be used if *all* of these env 'vars' are present
exports.vars = ["MEGA_EMAIL", "MEGA_PASS"];

var storage = null;

//if these 'vars' are present, 'init' will be called on module load
exports.init = function(config) {
  storage = mega({
    email: config.MEGA_EMAIL,
    password: config.MEGA_PASS
  }, function(err) {
    if(err) {
      console.log("Mega login failed: %s", err);
      process.exit(1);
    }
    console.log("Mega login success");
  });
};

//upload will be called to upload a downloading torrent file
exports.upload = function(torrentFile, callback) {
  if(!storage.root)
    callback("Not ready");

  var dirs = torrentFile.path.split("/");
  var name = dirs.pop();
  var dir = null;
  var root = storage.root;

  //call back when all dirs made
  mkdirp(dirs, root, function(err, dir) {
    if(err)
      return callback(err);
    upload(dir);
  });

  //before we can upload, we need to mkdirp
  function mkdirp(dirs, parent, cb) {
    var d = dirs.shift();
    storage.mkdir({
      name: d,
      target: parent
    }, function(err, dir) {
      if(err)
        return cb(err);
      if(dirs.length > 0) //dont callback yet!
        mkdirp(dirs, dir, cb);
      else
        cb(null, dir);
    });
  }

  function upload(dir) {
    var upload = storage.upload({
      name: name,
      size: torrentFile.length,
      target: dir
    });

    var stream = torrentFile.createReadStream();

    stream.pipe(upload);

    upload.on("error", function(err) {
      callback(err);
    });

    //callback when stream has been fully uploaded
    upload.on("complete", function(f) {
      console.log("uploaded", f.name);
      callback(null);
    });
  }
};

//list will be called to list all stored files
exports.list = function(callback) {

  storage.reload(function(err) {
    if(err)
      return callback("Mega list-dir failed: " + err);

    var fetches = [];
    var files = {};

    eachFile(function(f) {
      if(f.directory)
        return;
      var path = getPath(f);
      var tcldFile = { length: f.size, url: null };
      fetches.push(function fetchUrl(cb) {
        f.link(function(err, url) {
          if(err) return cb(err);
          tcldFile.url = url;
          cb(null);
        });
      });
      //url is null until it is fetched
      files[path] = tcldFile;
    });

    //fetch all links, 6 at a time
    async.parallelLimit(fetches, 6, function(err) {
      if(err)
        return callback("Mega fetch-url failed: " + err);
      // console.log("list success", files);
      callback(null, files);
    });
  });
};

//removes a file at the given path (torrentFile.path)
exports.remove = function(path, callback) {

  var parts = path.split("/");
  var file = null;
  var dir = storage.root;

  while(parts.length) {
    var p = parts.shift();
    if(!dir.directory)
      return callback("Missing");

    var f = null;
    for(var i = 0; i < dir.children.length; i++) {
      var c = dir.children[i];
      if(c.name === p) {
        f = c;
        break;
      }
    }

    if(!f)
      return callback("Missing");
    dir = file = f;
  }

  f.delete(function(err) {
    if(err)
      return callback(err);
    console.log("deleted", path);
    setTimeout(callback, 5000);
  });
};


//========

function eachFile(fn) {
  Object.keys(storage.files).forEach(function(id) {
    var f = storage.files[id];
    fn(f);
  });
}

// function getRoot() {
// }

function getPath(f) {
  var path = "";
  while(f) {
    var name = f.name;
    if(name === "Cloud Drive")
      break;
    if(f.directory)
      name += "/";
    path = name + path;
    f = f.parent;
  }
  return path;
}