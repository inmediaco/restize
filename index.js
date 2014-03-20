var express = require("express");
var passport = require('passport');
var DigestStrategy = require('passport-http').DigestStrategy;

var Handler = require('./handler.js');
var services = [];
var handlers = {};
var adminAuth;

var restize_admins = [];

function findAdmin(username, fn) {
	for (var i = 0; i < restize_admins.length; i++) {
		if (restize_admins[i].username === username) {
			return fn(restize_admins[i]);
		}
	}
	return fn(null);
}

var appHandler,
	appOptions;

exports.init = function(app, options) {
	appHandler = app;
	appOptions = options || {};
	restize_admins = options.admins || [];

	//TODO: define url within options
	appHandler.use('/admin', express.static(__dirname + "/admin"));

	app.use(passport.initialize());
	// app.use(passport.session());

	passport.use(new DigestStrategy({
			qop: 'auth'
		},
		function(username, done) {
			findAdmin(username, function(user) {
				return done(null, user, user ? user.password : null);
			});
		},
		function(params, done) {
			process.nextTick(function() {
				return done(null, true);
			});
		}
	));

	adminAuth = passport.authenticate('digest', {
		session: false
	});

	//TODO: define url within options
	appHandler.get('/__ADMIN__/services', adminAuth, function(req, res) {
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
	var adminPath = path  + '/__ADMIN__' || '/' + modelName + '/__ADMIN__';
	pathWithId = new RegExp(options.path + '/' + '([0-9a-fA-F]{24})');
	var adminPathWithId = new RegExp(adminPath + '/' + '([0-9a-fA-F]{24})');
	console.log('REGISTERING ' + options.path);


	var handler = new Handler(model, options, appOptions);

	// Restize URLs
	appHandler.get(pathWithId, handler.auth('read'), handler.dispatch('read'));
	appHandler.get(options.path, handler.auth('list'), handler.dispatch('list'));
	appHandler.get(options.path + '/schema', handler.auth('schema'), handler.schema());
	appHandler.post(options.path, handler.auth('create'), handler.dispatch('create'));
	appHandler.put(pathWithId, handler.auth('update'), handler.dispatch('update'));
	appHandler.del(pathWithId, handler.auth('destroy'), handler.dispatch('destroy'));

	// Admin URLs
	appHandler.get(adminPathWithId, adminAuth, handler.admin('read'));
	appHandler.get(adminPath, adminAuth, handler.admin('list'));
	appHandler.get(adminPath + '/schema', adminAuth, handler.schema());
	appHandler.post(adminPath, adminAuth, handler.admin('create'));
	appHandler.put(adminPathWithId, adminAuth, handler.admin('update'));
	appHandler.del(adminPathWithId, adminAuth, handler.admin('destroy'));

	handlers[options.path] = handler;

	services.push(
		options.path + "/__ADMIN__/schema"
	);

	//calls schema function
	if (typeof callback === "function") {
		handler.schema(callback);
	}



	return options.path + "/schema";
};