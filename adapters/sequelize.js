/**
 * Very basic CRUD route creation utility for models.
 * For validation, simply override the model's save method.
 */ (function(exports) {
	"use strict";
	var dataTypes = {
		'VARCHAR(255)': 'String',
		'TEXT': 'Text',
		'INTEGER': 'Integer',
		'BIGINT': 'Integer',
		'DATETIME': 'Date',
		'TINYINT(1)': 'Boolean',
		'FLOAT': 'Float',
		'NOW': 'Now'
	};

	var attrEquivalence = {
		'allowNull': 'null',
		'primaryKey': 'pk',
		'autoIncrement': 'auto'
	};

	var opEquivalence = {
		'lt': '<',
		'lte': '<=',
		'gt': '>',
		'gte': '>=',
		'like': 'like',
		'nlike': 'not like',
		'ne': '<>'

	};

	var fields = {};
	var populate = {};
	var cachedRelations = {};

	/**
	 *
	 */

	function buildSchema(model, showRelations) {
		var schema = {
			'name': model.name,
			'fields': {}
		};
		for (var i in model.rawAttributes) {
			var raw = model.rawAttributes[i];
			if (typeof raw !== "object") {
				schema.fields[i] = {
					'type': getRestType(raw)
				};
			} else if (raw.type) {
				schema.fields[i] = {};
				//copy fields to avoid original object modification
				for (var p in raw) {
					schema.fields[i][getEquivalence(p)] = raw[p];
				}
				schema.fields[i].type = getRestType(raw.type);
			}
		}

		if (showRelations) {
			schema.related = {};
			var rels = getRelations(model);
			for (i in rels) {
				var r = rels[i];

				if (!schema.related[r.model.name]) {
					schema.related[r.model.name] = buildSchema(r.model, false);
				}
				schema.fields[r.as] = {
					type: r.model.name,
					foreign_key: r.foreign_key,
					relation_type: r.relation_type
				};
			}
		}

		return schema;
	}

	/**
	 *
	 */

	function getEquivalence(attr) {
		return attrEquivalence[attr] || attr;
	}

	/**
	 *
	 */

	function getRelations(model) {
		var model_name = model.name;
		if (cachedRelations[model_name]) {
			return cachedRelations[model_name];
		}
		cachedRelations[model_name] = [];
		var as = model.associations;
		if (populate[model_name].length > 0) {
			for (var i in as) {
				var relation = as[i];
				var name = relation.options.as;
				if (populate[model_name] && populate[model_name].indexOf(name) > -1) {
					cachedRelations[model_name].push({
						'model': relation.target,
						'as': name,
						'foreign_key': relation.options.foreignKey,
						'relation_type': relation.associationType
					});
				}
			}
		}
		return cachedRelations[model_name];

	}


	function getQuery(model, data) {
		var query = {};
		if (data && Object.keys(data).length) {
			query.where = [];
			var sql = '';
			var where = [];
			for (var param in data) {
				//Tastypie query style
				var op = param.match(/(.+)__(lt|lte|gt|gte|like|nlike|ne)$/);
				if (where.length > 0) {
					sql += " AND ";
				}
				if (op && op.length > 0) {
					sql += op[1] + " " + opEquivalence[op[2]] + " ?";
				} else {
					sql += model.tableName + "." + param + " = ?";
				}
				where.push(data[param]);
			}
			where.unshift(sql);
			query.where = where;

		}
		query.attributes = fields[model.name];
		var tmp = getRelations(model);
		if (tmp.length > 0) {
			query.include = [];
			//Clones relations info to avoid relations overwriting
			for (var i in tmp) {
				query.include.push({
					'model': tmp[i].model,
					'as': tmp[i].as
				});
			}
		}
		return query;
	}


	function getRestType(type) {
		return (dataTypes[type] || 'Undefined');
	}

	/**
	 *
	 */

	function errMsg(msg) {
		return {
			'error': {
				'message': msg.toString()
			}
		};
	}

	/**
	 *
	 *@param {Object} options
	 */
	exports.init = function(model, options) {
		var model_name = model.name;
		fields[model_name] = options.fields || [];
		populate[model_name] = options.populate || [];
	};
	//------------------------------
	// List
	//
	/**
	 *
	 * @param {Object} model
	 * @param {Object} data
	 * @param {Object} callback
	 */
	exports.list = function(model, data, callback) {
		model.findAll(getQuery(model, data)).success(function(result) {
			callback(null, JSON.stringify(result));
		}).error(function(err) {
			callback(err);
		});
	};
	//------------------------------
	// Read
	//
	/**
	 *
	 * @param {Object} model
	 * @param {Object} data
	 * @param {Object} callback
	 */
	exports.read = function(model, data, callback) {
		model.find(getQuery(model, data)).success(function(result) {
			callback(null, result);
		}).error(function(err) {
			callback(err);
		});
	};
	//------------------------------
	// Create
	//
	/**
	 *
	 * @param {Object} model
	 * @param {Object} data
	 * @param {Object} callback
	 */
	exports.create = function(model, data, callback) {
		return function(req, res) {
			//console.log('create', req.body);
			var m = new model(req.body);
			m.save(function(err) {
				if (!err) {
					res.send(m);
				} else {
					res.send(errMsg(err));
				}
			});
		};
	};
	//------------------------------
	// Update
	//
	/**
	 *
	 * @param {Object} model
	 * @param {Object} data
	 * @param {Object} callback
	 */
	exports.update = function(model, data, callback) {
		return function(req, res) {
			//console.log('update', req.body);
			model.findById(req.params.id, function(err, result) {
				var key;
				for (key in req.body) {
					result[key] = req.body[key];
				}
				result.save(function(err) {
					if (!err) {
						res.send(result);
					} else {
						res.send(errMsg(err));
					}
				});
			});
		};
	};
	//------------------------------
	// Destroy
	//
	/**
	 *
	 * @param {Object} model
	 * @param {Object} data
	 * @param {Object} callback
	 */
	exports.destroy = function(model, data, callback) {
		return function(req, res) {
			//console.log('delete', req.body);
			model.findById(req.params.id, function(err, result) {
				if (err) {
					res.send(errMsg(err));
				} else {
					result.remove();
					result.save(function(err) {
						if (!err) {
							res.send({});
						} else {
							res.send(errMsg(err));
						}
					});
				}
			});
		};
	};
	//------------------------------
	// Schema
	//
	exports.schema = function(model, callback) {
		callback(null, buildSchema(model, true));
	};
}(exports));