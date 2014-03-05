var path = require('path');
var fs = require('fs');
var express = require("express");

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


function Handler(model, options) {
	this.adapter = this.getAdapter(options);
	if (!this.adapter) {
		console.log("Adapter: " + options.adapter + "not found.");
		return false;
	}
	this.model = model;
	this.schemaDefinition = null;
	this.options = options;
	this.adapter.init(model, this.options);
}

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

Handler.prototype.list = function() {
	var self = this;
	return function(req, res) {
		self.adapter.list(self.model, Utils.extend(req.params, req.query, self.options.query || {}), function(err, result) {
			if (!err) {
				res.send(result);
			} else {
				res.send(Utils.errMsg(err));
			}
		});
	};
};

Handler.prototype.read = function() {
	var self = this;
	return function(req, res) {
		self.adapter.read(self.model, req.params, function(err, result) {
			if (!err) {
				res.send(result);
			} else {
				res.send(Utils.errMsg(err));
			}
		});
	};
};

Handler.prototype.create = function() {
	var self = this;
	return function(req, res) {
		self.adapter.create(self.model, req.body, function(err, result) {
			if (!err) {
				res.send(result);
			} else {
				res.send(Utils.errMsg(err));
			}
		});
	};
};

Handler.prototype.update = function() {
	var self = this;
	return function(req, res) {
		self.cleanData(req.body, function(data) {
			self.adapter.update(self.model, req.params.id, data, function(err, result) {
				if (!err) {
					res.send(result);
				} else {
					res.send(Utils.errMsg(err));
				}
			});
		});

	};
};


Handler.prototype.destroy = function() {
	var self = this;
	return function(req, res) {
		console.log('entro');
		self.adapter.destroy(self.model, req.params.id, function(err, result) {
			if (!err) {
				res.send(result);
			} else {
				res.send(Utils.errMsg(err));
			}
		});
	};
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
					result.display_field = self.options.display_field
				}  else if(result.fields.name) {
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
					result.display_field = self.options.display_field
				}  else if(result.fields.name) {
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



var appHandler;

exports.init = function(app) {
	appHandler = app;
	app.use('/admin', express.static(__dirname + "/admin"));
};

exports.register = function(options, callback) {
	var model = options.model,
		path, pathWithId;

	if (!appHandler) {
		console.log("App is NOT initialized");
		return;
	}

	if (!model) {
		console.log("Invalid Model");
		return;
	}

	options.path = options.path || '/' + model.name.toLowerCase();
	pathWithId = options.path + '/:id';
	console.log('REGISTERING ' + options.path);
	var handler = new Handler(model, options);

	//NOTE: don't change get order
	appHandler.get(options.path, handler.list());
	appHandler.get(options.path + '/schema', handler.schema());
	appHandler.get(pathWithId, handler.read());

	appHandler.post(options.path, handler.create());
	appHandler.put(pathWithId, handler.update());
	appHandler.del(pathWithId, handler.destroy());

	//calls schema function
	if (typeof callback === "function") {
		handler.schema(callback);
	}
	return options.path + "/schema";
};