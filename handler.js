var util = require('util');
var path = require('path');
var fs = require('fs');
var async = require('async');
var existsSync = fs.existsSync || path.existsSync;


//Utils

function Utils() {}

Utils.extend = function(target) {
	var sources = [].slice.call(arguments, 1);
	sources.forEach(function(source) {
		for (var prop in source) {
			target[prop] = source[prop];
		}
	});
	return target;
};


Utils.errMsg = function(msg) {
	return {
		'error': {
			'message': msg.toString()
		}
	};
};


var Handler = function(model, options, appOptions) {
	this.adapter = this.getAdapter(options);
	if (!this.adapter) {
		console.log("Adapter: " + options.adapter + "not found.");
		return false;
	}
	this.model = model;
	this.schemaDefinition = null;
	this.options = {
		query: {}
	};
	Utils.extend(this.options, options);
	this.appOptions = appOptions;
	this.adapter.init(model, this.options);
	this.hooks = {
		'pre': {},
		'post': {}
	};

	this.buildHook('pre');
	this.buildHook('post');
};



Handler.prototype.buildHook = function(event) {
	if (this.options && this.options[event]) {
		for (var method in this.options[event]) {
			var callback = this.options[event][method];
			if (util.isArray(callback)) {
				for (var i = 0; i < callback.length; i++) {
					this.addCallback(event, method, callback[i]);
				}
			} else if (typeof callback == 'function') {
				this.addCallback(event, method, callback);
			} else {
				throw new Error('Invalid Hook(pre,post) handler');
			}
		}
	}
};

Handler.prototype.getAdapter = function(options) {
	var adapterName = options.adapter || 'mongoose';
	if (typeof adapterName === 'object') {
		return adapterName;
	} else if (adapterName.match(/^\//)) {
		// try absolute path
		return require(adapterName);
	} else if (existsSync(__dirname + '/adapters/' + adapterName + '.js')) {
		// try built-in adapter
		return require('./adapters/' + adapterName);
	} else {
		return false;
	}
};


Handler.prototype.cleanData = function(data, callback) {
	this.schema(function(err, schema) {
		var fields = schema.fields;
		for (var i in fields) {
			if (!data[i] && fields[i].ref) {
				delete data[i];
			}
		}
		if (callback) {
			callback(data);
		}
	});
};


Handler.prototype.list = function(req, res, callback) {
	var self = this;
	var options = Utils.extend(req.params, req.query, this.options.query || {});
	this.adapter.list(this.model, options, function(err, result) {
		if (err) return callback(err);
		self.adapter.meta(self.model, options, function(err, meta) {
			meta.count = result.length;
			res.setHeader('Restize-Meta', JSON.stringify(meta));
			callback(null, result);
		});
	});
};


Handler.prototype.read = function(req, res, callback) {
	this.adapter.read(this.model, req.params, callback);
};


Handler.prototype.create = function(req, res, callback) {
	this.adapter.create(this.model, req.body, callback);
};

Handler.prototype.update = function(req, res, callback) {
	var self = this;
	self.cleanData(req.body, function(data) {
		self.adapter.update(self.model, req.params.id, data, callback);
	});
};

Handler.prototype.destroy = function(req, res, callback) {
	this.adapter.destroy(this.model, req.params.id, callback);
};


Handler.prototype.schema = function(callback) {
	var self = this;
	if (callback) {
		self.adapter.schema(self.model, function(err, result) {
			if (!err) {
				result.url = self.options.path;
				if (self.options.backend) {
					result.backend = self.options.backend;
				}
				if (self.options.display_field) {
					result.display_field = self.options.display_field;
				} else if (result.fields.name) {
					result.display_field = '%name';
				}

				self.schemaDefinition = result;
			}
			callback(err, result);
		});
		return;
	}

	return function(req, res) {
		if (self.schemaDefinition) {
			return res.send(self.schemaDefinition);
		}
		self.adapter.schema(self.model, function(err, result) {
			if (!err) {
				result.url = self.options.path;
				if (self.options.backend) {
					result.backend = self.options.backend;
				}
				if (self.options.display_field) {
					result.display_field = self.options.display_field;
				} else if (result.fields.name) {
					result.display_field = '%name';
				}
				self.schemaDefinition = result;
				res.send(result);
			} else {
				res.send(Utils.errMsg(err));
			}
		});
	};
};

Handler.prototype.auth = function(method) {
	if (this.options && (!this.options.no_auth || !this.options.no_auth[method])) {
		if (typeof this.options.auth == 'function') {
			return this.options.auth;
		} else if (this.appOptions && typeof this.appOptions.auth == 'function') {
			return this.appOptions.auth;
		}
	}
	return emptyMiddleware;
};

function emptyMiddleware(err, req, res, next) {
	next();
}



Handler.prototype.addCallback = function(event, method, callback) {
	if (!this.hooks[event][method]) {
		this.hooks[event][method] = [];
	}
	this.hooks[event][method].push(callback);
};

Handler.prototype.pre = function(method, callback) {
	this.addCallback('pre', method, callback);
};


Handler.prototype.post = function(method, callback) {
	this.addCallback('post', method, callback);
};


Handler.prototype.getIdValidator = function() {
	return this.adapter.getIdValidator();
};


Handler.prototype.dispatch = function(method) {
	var self = this;
	return function(req, res) {
		if (req.params[0]) {
			req.params.id = req.params[0];
		}
		var hpre = self.hooks.pre[method] || [];
		async.series(hpre.map(function(fn) {
			return function(cb) {
				var ctx = {
					options: self.options,
					req: req
				};
				fn(ctx, cb);
			};
		}), function(err, data) {
			if (!err) {
				var hpost = self.hooks.post[method] || [];
				self[method](req, res, function(err, result) {
					if (err) {
						res.status(400);
						res.send(Utils.errMsg(err));
					} else {
						result = self.adapter.toObject(result);
						//Process post hooks
						async.series(hpost.map(function(fn) {
							return function(cb) {
								var ctx = {
									options: self.options,
									req: req,
									res: res,
									data: result
								};
								fn(ctx, cb);
							};
						}), function(err, cbdata) {
							if (!err) {
								if (result) {
									if (method=='create'){
										res.status(201);
									}
									res.send(result);
								} else {
									res.send(404);
								}
							} else {
								res.send(Utils.errMsg(err));
							}
						});
					}
				});
			} else {
				res.send(Utils.errMsg(err));
			}
		});
	};
};

Handler.prototype.admin = function(method) {
	var self = this;
	return function(req, res) {
		if (req.params[0]) {
			req.params.id = req.params[0];
		}
		self[method](req, res, function(err, result) {
			if (!err) {
				if (result) {
					res.send(result);
				} else {
					res.send(404);
				}
			} else {
				res.send(Utils.errMsg(err));
			}
		});
	};
};

module.exports = Handler;
