let Client = require('ssh2-sftp-client');

exports.vars = ["SSH_HOST", "SSH_USERNAME", "SSH_PASSWORD", "SSH_PORT", "SSH_ROOT"];


let sftp = new Client();
let SSH_ROOT;


exports.init = function(config) {
SSH_ROOT = config.SSH_ROOT;

const sshOptions = {
  host: config.SSH_HOST,
  port: config.SSH_PORT,
  username: config.SSH_USERNAME,
  password: config.SSH_PASSWORD
}
sftp.connect(sshOptions)
  .then(() => console.log("SSH login success"))
  .catch((err) => {
    console.log("SSH login failed: %s", err);
    process.exit(1);
  });

};

//upload will be called to upload a downloading torrent file
exports.upload = function(torrentFile, done) {
	var dirs = torrentFile.path.split("/");
	var name = dirs.length === 1 ? dirs :dirs.pop();
  var dir = null;
  var root = SSH_ROOT;

  //call back when all dirs made
  mkdirp(dirs, root, function(err, dir) {
    if(err) return done(err);
    upload(dir);
  });


  //before we can upload, we need to mkdirp
  function mkdirp(dirs, parent, cb) {
    const d = dirs.shift();
    sftp.mkdir(parent + d, true)
      .then((data) => cb(null, parent + d ))
      .catch((err) => cb(err));
  }

  function upload(dir) {
    name = name.length === 0 ? torrentFile.path : name;
		const stream = torrentFile.createReadStream();
		sftp.put(stream, dir +'/'+ name, true)
			.then(() => done())
			.catch((err) => done(err));
	}
};


//list will be called to list all stored files
exports.list = function(done) {
	sftp.list(SSH_ROOT)
		.then((data) => {
      var files = {};
      data.forEach(f => {
        const path = f.name;
        const tmp = {
          url: null
        }
      files[path] = tmp;
      });
      done(null, files);
		})
    .catch((err) => {
      if(err) console.log(err);
    });
};


exports.remove = function(path, done) {
  sftp.rmdir(SSH_ROOT +  path, true)
    .then(() => done(null))
    .catch((err) => done(err));
};
