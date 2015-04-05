var stream = require('stream');
var Transform = stream.Transform;
 
module.exports = function through(opts, transform, flush) {
 
	//use default options
	if (typeof opts !== 'object') {
		flush = transform;
		transform = opts;
		opts = {
			objectMode: true
		};
	}
 
	//always allow objects
	var t = new Transform(opts);
 
	//depending on transform fn arity, pass in diff args
	t._transform =
		typeof transform !== 'function' ? function throughzero(data, enc, next) {
			next(null, data);
		} :
		transform.length === 3 ? transform :
		transform.length === 2 ? function throughtwo(obj, enc, next) {
			transform.call(this, obj, next);
		} :
		transform.length === 1 ? function throughone(obj, enc, next) {
			transform.call(this, obj);
			next();
		} :
		null;
 
	//give stream objects names
	if (transform && transform.name)
		t.name = transform.name;
 
	t._flush = flush;
	return t;
};