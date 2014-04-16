/**
 * Very basic CRUD route creation utility for models.
 * For validation, simply override the model's save method.
 */
(function(exports) {
	"use strict";

	var fields = {};
	var populate = {};


	var opEquivalence = {
		'lt': '$lt',
		'lte': '$lte',
		'gt': '$gt',
		'gte': '$gte',
		'like': '',
		'nlike': '$not',
		'ne': '$ne',
		'in': '$in',
		'isnull': ''

	};

	function errMsg(msg) {
		return {
			'error': {
				'message': msg.toString()
			}
		};
	}

	function getQuery(model, data) {
		var query = {};
		if (data && Object.keys(data).length) {
			for (var param in data) {
				//Tastypie query style
				var p = param.match(/(.+)__(lt|lte|gt|gte|like|nlike|ne|in|isnull)$/);
				if (p && p.length > 0) {
					var condition = {};
					var operator = opEquivalence[p[2]];
					if (p[2] == 'in') {
						condition[operator] = data[param].split(',');
					} else if (p[2] == 'like') {
						condition = {
							'$regex': data[param],
							'$options': 'i'
						};
					} else if (p[2] == 'nlike') {
						condition[operator] = new RegExp(data[param] + '.*', "i");
					} else if (p[2] == 'isnull') {
						condition = null;
					} else {
						condition[operator] = data[param];
					}
					query[p[1]] = condition;

				} else {
					if (param[0] != '_' || param == '_id') {
						query[param] = data[param];
					}
				}
			}
		}
		return query;
	}


	function buildSchema(tree) {
		var fields = {};
		for (var name in tree) {
			if (name != "id" && name != "__v") {
				var field = tree[name];
				var opts = {};
				if (typeof field === "object") {
					if (field.length !== undefined) {
						opts.type = 'Array';
						if (field.length > 0) {
							if (typeof field[0] === "object") {
								var subschema = (field[0].tree) ? field[0].tree : field[0];
								//Handles array of references
								if (subschema.ref) {
									opts.of = {};
									for (var s in subschema) {
										opts.of[s] = (typeof subschema[s] == "function") ? subschema[s].name : subschema[s];
									}
								} else {
									//Array of objects
									opts.of = {
										type: 'Object',
										fields: buildSchema(subschema)
									};
								}

							} else {
								opts.of = (typeof field[0] == "function") ? field[0].name : field[0];
							}
						}
					} else {
						//NESTED OBJECT
						if (!field.type) {
							opts.type = 'Object';
							opts.fields = buildSchema(field);
						} else {
							for (var p in field) {
								opts[p] = (typeof field[p] == "function") ? field[p].name : field[p];
							}

						}
					}
				} else if (typeof field === 'function') {
					opts.type = field.name;
				}
				fields[name] = opts;
			}
		}
		return fields;
	}

	exports.init = function(model, options) {
		var model_name = model.modelName;
		fields[model_name] = options.fields;
		populate[model_name] = options.populate;
	};


	function getPagination(data) {
		var pagination = {};
		if (data._limit) {
			pagination.limit = data._limit;
			if (data._page) {
				pagination.skip = (data._page - 1) * pagination.limit;
			}
		}
		if (data._sort) {
			pagination.sort = data._sort;
		}
		return pagination;
	}


	//------------------------------
	// List
	//
	exports.list = function(model, data, callback) {
		var model_name = model.modelName;
		var pagination = getPagination(data);
		model.find(getQuery(model, data), fields[model_name], pagination, callback).populate(populate[model_name]);
	};

	exports.meta = function(model, data, callback) {
		var model_name = model.modelName;
		var pagination = getPagination(data);
		var meta = {
			limit: pagination.limit || "",
			page: pagination.page || 1,
			sort: pagination.sort || ""
		};
		if (data._limit) {
			model.find(getQuery(model, data)).count(function(err, result) {
				if (err) return callback(err);
				meta.total = result;
				callback(null, meta);
			});
		} else {
			callback(null, meta);
		}
	};

	//------------------------------
	// Read
	//
	exports.read = function(model, data, callback) {
		var model_name = model.modelName;
		model.findById(data.id, fields[model_name], callback).populate(populate[model_name]);
	};
	//------------------------------
	// Create
	//
	exports.create = function(Model, data, callback) {
		var m = new Model(data);
		m.save(callback);
	};
	//------------------------------
	// Update
	//
	exports.update = function(model, id, data, callback) {
		if (data._id) {
			delete data._id;
		}
		//Dont use findAndUpdate Reason: http://github.com/LearnBoost/mongoose/issues/964
		model.findById(id, function(err, doc) {
			for (var field in data) {
				doc[field] = data[field];
			}
			doc.save(callback);
		});
	};
	//------------------------------
	// Destroy
	//
	exports.destroy = function(model, id, callback) {
		model.findByIdAndRemove(id, callback);
	};
	//------------------------------
	// Schema
	//
	exports.schema = function(model, callback) {
		var related = {};
		callback(null, {
			'name': model.modelName,
			fields: buildSchema(model.schema.tree)
		});
	};
	//------------------------------
	// toObject
	//
	exports.toObject = function(doc) {
		if (!doc) {
			return doc;
		}
		var result = false;
		//transform objects
		if (Array.isArray(doc)) {
			return doc.map(function(item) {
				return item.toObject();
			});
		}
		return doc.toObject();
	};

	//------------------------------
	// toObject
	//
	exports.getIdValidator = function() {
		return '([0-9a-fA-F]{24})';
	};


}(exports));