
var request = require("request");
var cheerio = require("cheerio");
var $ = cheerio.load("");

var template = function(str, data) {
	return str.replace(/\{\s*(\w+)\s*\}/g, function(all, key) {
		return encodeURIComponent(data[key]);
	});
};

var load = function(url, callback) {
	request({
		method: "GET",
		url: url,
		gzip: true,
		headers: {
			//just a regular browser, nothing to see here...
			"User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/537.36 " + 
				"(KHTML, like Gecko) Chrome/40.0.2214.91 Safari/537.36"
		}
	}, function(err, httpResponse, body) {
		// require("fs").writeFileSync("./prototype/results.html", body);
		if(err)
			return callback("Failed to load: '" + url + "': " + err);
		var root = cheerio.load(body);
		root.find = root;
		callback(null, root);
	});
};

var val = function(elem, selector) {

	if(!elem.find)
		elem = $(elem);

	//regex selector?
	if(/^\/(.+)\/$/.test(selector)) {
		var re = new RegExp(RegExp.$1);
		//test against html
		if(re.test(elem.html()))
			return RegExp.$1.replace("&nbsp;", " ").replace("&#xA0;", " ");
		return "";
	}

	//attribute selector?
	var attr;
	selector = selector.replace(/^(.+)@(\w+)$/, function(all, sel, a) {
		attr = a;
		return sel;
	});

	var e = elem.find(selector);
	// console.log("selector '%s' [attr: %s] [results: %s]",  selector, attr, e ? e.length: null);
	if(!e || e.length === 0)
		return null;
	return attr ? e.attr(attr) : e.text();
};

//==========

exports.list = function(p, data, callback) {
	if(!data || !data.query)
		return callback("Missing query");

	var page = data.page || 1;

	var url = template(p.list.url, {
		page: page,
		zpage: page-1,//zero-indexed page
		query: data.query
	});

	var origin = /(https?:\/\/[^\/]+)/.test(url) && RegExp.$1;
	if(!origin)
		return callback("Invalid URL");

	load(url, function (err, root) {
		if(err)
			return callback("Search provider could not reached");

		var items = root.find(p.list.items);

		// console.log("loaded %s, selector '%s' yeilds %s results",  url, p.list.items, items.length);

		var results = [];
		for(var i = 0; i < items.length; i++) {
			var item = items[i];
			var missing = false;
			var result = {};
			for(var k in p.list.item) {
				var v = val(item, p.list.item[k]);
				//exclude items with missing values
				if(!v) {
					missing = true;
					break;
				}
				//url convert rela->abs
				if(k === "url" && v && v[0] === "/")
					v = origin + v;
				//insert
				result[k] = v;
			}

			if(!missing)
				results.push(result);
		}

		callback(null, results);
	});
};

exports.item = function(p, data, callback) {

	if(!p.item)
		return callback("Provider cannot retrieve items");
	if(!data.url)
		return callback("Missing url");

	load(data.url, function(err, root) {
		if(err)
			return callback("Failed to load: " + data.url);

		var result = {};
		for(var k in p.item) {
			var v = val(root, p.item[k]);
			if(v) result[k] = v;
		}

		// console.log(data.url, result);
		callback(null, result);
	});
};
