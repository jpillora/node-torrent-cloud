
var WebSocket = require('ws');

var json = "";
var data = null;
var conns = [];
var THROTTLE = 100;
var queued = false;

//send keepalive pings
setInterval(function() {
	conns.forEach(function(conn) {
		conn.ssend("ping");
	});
}, 30*1000);

exports.install = function(server) {

	var ws = new WebSocket.Server({ server: server });

	//this is required to allow the error to fall
	//through to the http server
	ws.on("error", function() {});

	ws.on('connection', function connection(conn) {
		//safe send
		conn.ssend = function(str){ 
			if(this.readyState === WebSocket.OPEN)
				this.send(str);
		};
		//track all connections
		conns.push(conn);
		conn.on('close', function() {
			var i = conns.indexOf(conn);
			if(i >= 0) conns.splice(i, 1);
		});

		//noop (dont buffer data)
		conn.on('data', function() {
		});

		//initially sends the last broadcast
		if(json) conn.ssend(json);
	});
};

function broadcast() {
	queued = false;
	//don't include $properties
	json = JSON.stringify(data, function(k,v){
		return typeof k === "string" && k[0] === "$" ? undefined : v;
	}, 2);
	conns.forEach(function(conn) {
		conn.ssend(json);
	});
}

//actually just throttles to the private 'broadcast' function
exports.broadcast = function(d) {
	data = d; //always use latest broadcast
	if(queued) return;
	queued = true;
	setTimeout(broadcast, THROTTLE);
};