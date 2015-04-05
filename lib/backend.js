//backend is a generic backend
//when 'required' it chooses from a list of defined
//backends based on present environment variables

var config = require("../config.json");
var fs = require('fs');
//list all backends
var backends = fs.readdirSync(__dirname+"/backends").filter(function(js) {
	return js !== "_template.js" && (/\.js$/).test(js);
});

//exit helper
function exit(msg) {
	console.log(msg);
	process.exit(1);
}

var matched = false;

//load the *first* viable backend
backends.forEach(function(name) {

	if(matched)
		return;//break

	var backend = require("./backends/"+name);
	
	var vars = backend.vars;

	if(!backend.init)
		exit("Backend " + name + " missing 'vars' array");

	var vals = vars.map(function(v) {
		var val = process.env[v];
		if(!val)
			backend = null;
		return val;
	});

	if(!backend)
		return;//continue

	//backend has been chosen by env vars,
	//now check its validity

	backend.name = name;

	if(!backend.init)
		exit("Backend " + name + " missing 'init(env vars...)' function");

	backend.init(config);

	if(typeof backend.upload !== "function")
		exit("Backend " + name + " missing 'upload(torrent file, callback)' function");

	if(typeof backend.remove !== "function")
		exit("Backend " + name + " missing 'remove(path, callback)' function");

	if(typeof backend.list !== "function")
		exit("Backend " + name + " missing 'list(callback)' function");

	//backend ready!
	module.exports = backend;
	matched = true;
});

if(!matched)
	exit("No backend match. "+
		"Environment variables missing for: " + 
		backends.join(", "));




