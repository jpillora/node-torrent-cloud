
var events = require('events');
var search = module.exports = new events.EventEmitter();

var types = {
	"screen-scraper": require("./searchers/screen-scraper"),
	"json-api": require("./searchers/json-api")
};

var providers = {};
search.providers = [];

var request = require("request");

//==============

//expose list and item methods - pass straight to search type
["list", "item"].forEach(function(fnName) {
	search[fnName] = function(data, callback) {

		var p = providers[data.provider];
		if(!p)
			return callback("Missing provider: " + data.provider);

		var type = types[p.type];
		if(!type)
			return callback("Invalid type");

		type[fnName](p, data, callback);
	};
});

//==============

search.setproviders = function(data, callback) {
	if(!data.url)
		return callback("Missing url");
	request.get(data.url, function(err, httpResponse, body) {
		if(err)
			return callback("Failed to load: " + data.url);
		try {
			var newProviders = JSON.parse(body);
			//expose only the "names" to the frontend
			var names = {};
			for(var id in newProviders) {
				var p = newProviders[id];
				names[id] = p.name;
			}
			providers = newProviders;
			search.providers = names;
			search.emit("update");
			console.log("loaded search providers: %s", Object.keys(names).join(", "));
			callback(null, names);
		} catch(err) {
			return callback("Invalid JSON");
		}
	});
};

var url = process.env.SEARCH_PROVIDERS_URL;
if(url) search.setproviders({url:url}, function(err, p) {
	if(err) console.error("Failed to load search providers from: %s (%s)", url, err);	
});

