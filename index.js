var express = require("express");
var Handler = require('./handler.js');
var services = [];
var handlers = {};
var adminAuth;

var appHandler,
	appOptions;


function emptyMiddleware(err, req, res, next) {
	next();
}

exports.init = function(app, options) {
	appHandler = app;
	appOptions = options || {};
	appOptions.admin_base = appOptions.admin_base || '/admin';
	adminAuth = appOptions.admin_auth || appOptions.auth || emptyMiddleware;
	appHandler.use('/admin', express.static(__dirname + appOptions.admin_base));
	appHandler.get(appOptions.admin_base + '/services', adminAuth, function(req, res) {
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


exports.pre = function(path, method, callback) {
	return handlers[path] && handlers[path].pre(method, callback);
};

exports.post = function(path, method, callback) {
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

	var handler = new Handler(model, options, appOptions);
	pathWithId = new RegExp('^'+options.path + '/' + handler.getIdValidator()+'$');


	// Restize URLs
	appHandler.get(pathWithId, handler.getMiddlewares('read'));
	appHandler.get(options.path, handler.getMiddlewares('list'));
	appHandler.get(options.path + '/schema', handler.schema());
	appHandler.post(options.path, handler.getMiddlewares('create'));
	appHandler.put(pathWithId, handler.getMiddlewares('update'));
	appHandler.del(pathWithId, handler.getMiddlewares('destroy'));


	var adminPath = appOptions.admin_base + options.path;
	var adminPathWithId = new RegExp('^'+adminPath + '/' + handler.getIdValidator()+'$');


	// Admin URLs
	appHandler.get(adminPath, handler.getMiddlewares('list', true));
	appHandler.get(adminPathWithId, handler.getMiddlewares('read', true));
	appHandler.get(adminPath + '/schema', handler.schema());
	appHandler.post(adminPath, handler.getMiddlewares('create',true));
	appHandler.put(adminPathWithId, handler.getMiddlewares('update',true));
	appHandler.del(adminPathWithId, handler.getMiddlewares('destroy',true));

	handlers[options.path] = handler;

	services.push(
		adminPath + "/schema"
	);


	console.log('REGISTERING ' + options.path);

	//calls schema function
	if (typeof callback === "function") {
		handler.schema(callback);
	}

	return options.path + "/schema";
};