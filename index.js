
var express = require("express");
var Handler = require('./handler.js');
var services = [];
var handlers = {};


var appHandler,
	appOptions;

exports.init = function(app, options) {
	appHandler = app;
	appOptions = options || {};
	//TODO: define url within options
	appHandler.use('/admin', express.static(__dirname + "/admin"));
	//TODO: define url within options
	appHandler.use('/services', function(req, res) {
		res.send(services);
	});
	
};

//CROSS middleware
exports.allowCrossDomain = function(req, res, next) {
	var oneof = false;
	if (req.headers.origin) {
		res.header('Access-Control-Allow-Origin', req.headers.origin);
		oneof = true;
	}
	if (req.headers['access-control-request-method']) {
		res.header('Access-Control-Allow-Methods', req.headers['access-control-request-method']);
		oneof = true;
	}
	if (req.headers['access-control-request-headers']) {
		res.header('Access-Control-Allow-Headers', req.headers['access-control-request-headers']);
		oneof = true;
	}
	if (oneof) {
		res.header('Access-Control-Max-Age', 60 * 60 * 24 * 365);
	}

	// intercept OPTIONS method
	if (oneof && req.method == 'OPTIONS') {
		res.send(200);
	} else {
		next();
	}
};


exports.pre = function(path, method,callback) {
	return handlers[path] && handlers[path].pre(method, callback);
};

exports.post = function(path, method,callback) {
	return handlers[path] && handlers[path].post(method, callback);
};


exports.register = function(path, options, callback) {
	var model = options.model;
	var pathWithId;

	if (!appHandler) {
		console.log("App is NOT initialized");
		return;
	}

	if (!model) {
		console.log("Invalid Model");
		return;
	}

	var modelName = model.name.toLowerCase();
	options.path = path || '/' + modelName;
	pathWithId = options.path + '/:id';
	console.log('REGISTERING ' + options.path);
	
    

	var handler = new Handler(model, options, appOptions);

	

	//NOTE: don't change get order
	appHandler.get(options.path, handler.auth('list'), handler.dispatch('list'));
	appHandler.get(options.path + '/schema', handler.auth('schema'), handler.schema());
	appHandler.get(pathWithId, handler.auth('read'), handler.dispatch('read'));

	appHandler.post(options.path, handler.auth('create'), handler.dispatch('create'));
	appHandler.put(pathWithId, handler.auth('update'), handler.dispatch('update'));
	appHandler.del(pathWithId, handler.auth('destroy'), handler.dispatch('destroy'));

	handlers[options.path] = handler;

	services.push(
		options.path + "/schema"
	);

	//calls schema function
	if (typeof callback === "function") {
		handler.schema(callback);
	}



	return options.path + "/schema";
};