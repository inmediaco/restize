/**
 * Very basic CRUD route creation utility for models.
 * For validation, simply override the model's save method.
 */
(function(exports) {
	'use strict';

	var mongoose = require('mongoose');
	var _ = require('lodash');

	var fields = {};
	var populate = {};
	var functionsName = [];
	var ifCount = true;


	var opEquivalence = {
		'lt': '$lt',
		'lte': '$lte',
		'gt': '$gt',
		'gte': '$gte',
		'like': '',
		'nlike': '$not',
		'ne': '$ne',
		'in': '$in',
		'nin': '$nin',
		'isnull': '',
		'size': '$size'
	};

	var defaultDiacriticsRemovalMapSingle = {
		'A': '[\u0041\u24B6\uFF21\u00C0\u00C1\u00C2\u1EA6\u1EA4\u1EAA\u1EA8\u00C3\u0100\u0102\u1EB0\u1EAE\u1EB4\u1EB2\u0226\u01E0\u00C4\u01DE\u1EA2\u00C5\u01FA\u01CD\u0200\u0202\u1EA0\u1EAC\u1EB6\u1E00\u0104\u023A\u2C6F]',
		'B': '[\u0042\u24B7\uFF22\u1E02\u1E04\u1E06\u0243\u0182\u0181]',
		'C': '[\u0043\u24B8\uFF23\u0106\u0108\u010A\u010C\u00C7\u1E08\u0187\u023B\uA73E]',
		'D': '[\u0044\u24B9\uFF24\u1E0A\u010E\u1E0C\u1E10\u1E12\u1E0E\u0110\u018B\u018A\u0189\uA779]',
		'E': '[\u0045\u24BA\uFF25\u00C8\u00C9\u00CA\u1EC0\u1EBE\u1EC4\u1EC2\u1EBC\u0112\u1E14\u1E16\u0114\u0116\u00CB\u1EBA\u011A\u0204\u0206\u1EB8\u1EC6\u0228\u1E1C\u0118\u1E18\u1E1A\u0190\u018E]',
		'F': '[\u0046\u24BB\uFF26\u1E1E\u0191\uA77B]',
		'G': '[\u0047\u24BC\uFF27\u01F4\u011C\u1E20\u011E\u0120\u01E6\u0122\u01E4\u0193\uA7A0\uA77D\uA77E]',
		'H': '[\u0048\u24BD\uFF28\u0124\u1E22\u1E26\u021E\u1E24\u1E28\u1E2A\u0126\u2C67\u2C75\uA78D]',
		'I': '[\u0049\u24BE\uFF29\u00CC\u00CD\u00CE\u0128\u012A\u012C\u0130\u00CF\u1E2E\u1EC8\u01CF\u0208\u020A\u1ECA\u012E\u1E2C\u0197]',
		'J': '[\u004A\u24BF\uFF2A\u0134\u0248]',
		'K': '[\u004B\u24C0\uFF2B\u1E30\u01E8\u1E32\u0136\u1E34\u0198\u2C69\uA740\uA742\uA744\uA7A2]',
		'L': '[\u004C\u24C1\uFF2C\u013F\u0139\u013D\u1E36\u1E38\u013B\u1E3C\u1E3A\u0141\u023D\u2C62\u2C60\uA748\uA746\uA780]',
		'M': '[\u004D\u24C2\uFF2D\u1E3E\u1E40\u1E42\u2C6E\u019C]',
		'N': '[\u004E\u24C3\uFF2E\u01F8\u0143\u00D1\u1E44\u0147\u1E46\u0145\u1E4A\u1E48\u0220\u019D\uA790\uA7A4]',
		'O': '[\u004F\u24C4\uFF2F\u00D2\u00D3\u00D4\u1ED2\u1ED0\u1ED6\u1ED4\u00D5\u1E4C\u022C\u1E4E\u014C\u1E50\u1E52\u014E\u022E\u0230\u00D6\u022A\u1ECE\u0150\u01D1\u020C\u020E\u01A0\u1EDC\u1EDA\u1EE0\u1EDE\u1EE2\u1ECC\u1ED8\u01EA\u01EC\u00D8\u01FE\u0186\u019F\uA74A\uA74C]',
		'P': '[\u0050\u24C5\uFF30\u1E54\u1E56\u01A4\u2C63\uA750\uA752\uA754]',
		'Q': '[\u0051\u24C6\uFF31\uA756\uA758\u024A]',
		'R': '[\u0052\u24C7\uFF32\u0154\u1E58\u0158\u0210\u0212\u1E5A\u1E5C\u0156\u1E5E\u024C\u2C64\uA75A\uA7A6\uA782]',
		'S': '[\u0053\u24C8\uFF33\u1E9E\u015A\u1E64\u015C\u1E60\u0160\u1E66\u1E62\u1E68\u0218\u015E\u2C7E\uA7A8\uA784]',
		'T': '[\u0054\u24C9\uFF34\u1E6A\u0164\u1E6C\u021A\u0162\u1E70\u1E6E\u0166\u01AC\u01AE\u023E\uA786]',
		'U': '[\u0055\u24CA\uFF35\u00D9\u00DA\u00DB\u0168\u1E78\u016A\u1E7A\u016C\u00DC\u01DB\u01D7\u01D5\u01D9\u1EE6\u016E\u0170\u01D3\u0214\u0216\u01AF\u1EEA\u1EE8\u1EEE\u1EEC\u1EF0\u1EE4\u1E72\u0172\u1E76\u1E74\u0244]',
		'V': '[\u0056\u24CB\uFF36\u1E7C\u1E7E\u01B2\uA75E\u0245]',
		'W': '[\u0057\u24CC\uFF37\u1E80\u1E82\u0174\u1E86\u1E84\u1E88\u2C72]',
		'X': '[\u0058\u24CD\uFF38\u1E8A\u1E8C]',
		'Y': '[\u0059\u24CE\uFF39\u1EF2\u00DD\u0176\u1EF8\u0232\u1E8E\u0178\u1EF6\u1EF4\u01B3\u024E\u1EFE]',
		'Z': '[\u005A\u24CF\uFF3A\u0179\u1E90\u017B\u017D\u1E92\u1E94\u01B5\u0224\u2C7F\u2C6B\uA762]',
		'a': '[\u0061\u24D0\uFF41\u1E9A\u00E0\u00E1\u00E2\u1EA7\u1EA5\u1EAB\u1EA9\u00E3\u0101\u0103\u1EB1\u1EAF\u1EB5\u1EB3\u0227\u01E1\u00E4\u01DF\u1EA3\u00E5\u01FB\u01CE\u0201\u0203\u1EA1\u1EAD\u1EB7\u1E01\u0105\u2C65\u0250]',
		'b': '[\u0062\u24D1\uFF42\u1E03\u1E05\u1E07\u0180\u0183\u0253]',
		'c': '[\u0063\u24D2\uFF43\u0107\u0109\u010B\u010D\u00E7\u1E09\u0188\u023C\uA73F\u2184]',
		'd': '[\u0064\u24D3\uFF44\u1E0B\u010F\u1E0D\u1E11\u1E13\u1E0F\u0111\u018C\u0256\u0257\uA77A]',
		'e': '[\u0065\u24D4\uFF45\u00E8\u00E9\u00EA\u1EC1\u1EBF\u1EC5\u1EC3\u1EBD\u0113\u1E15\u1E17\u0115\u0117\u00EB\u1EBB\u011B\u0205\u0207\u1EB9\u1EC7\u0229\u1E1D\u0119\u1E19\u1E1B\u0247\u025B\u01DD]',
		'f': '[\u0066\u24D5\uFF46\u1E1F\u0192\uA77C]',
		'g': '[\u0067\u24D6\uFF47\u01F5\u011D\u1E21\u011F\u0121\u01E7\u0123\u01E5\u0260\uA7A1\u1D79\uA77F]',
		'h': '[\u0068\u24D7\uFF48\u0125\u1E23\u1E27\u021F\u1E25\u1E29\u1E2B\u1E96\u0127\u2C68\u2C76\u0265]',
		'i': '[\u0069\u24D8\uFF49\u00EC\u00ED\u00EE\u0129\u012B\u012D\u00EF\u1E2F\u1EC9\u01D0\u0209\u020B\u1ECB\u012F\u1E2D\u0268\u0131]',
		'j': '[\u006A\u24D9\uFF4A\u0135\u01F0\u0249]',
		'k': '[\u006B\u24DA\uFF4B\u1E31\u01E9\u1E33\u0137\u1E35\u0199\u2C6A\uA741\uA743\uA745\uA7A3]',
		'l': '[\u006C\u24DB\uFF4C\u0140\u013A\u013E\u1E37\u1E39\u013C\u1E3D\u1E3B\u017F\u0142\u019A\u026B\u2C61\uA749\uA781\uA747]',
		'm': '[\u006D\u24DC\uFF4D\u1E3F\u1E41\u1E43\u0271\u026F]',
		'n': '[\u006E\u24DD\uFF4E\u01F9\u0144\u00F1\u1E45\u0148\u1E47\u0146\u1E4B\u1E49\u019E\u0272\u0149\uA791\uA7A5]',
		'o': '[\u006F\u24DE\uFF4F\u00F2\u00F3\u00F4\u1ED3\u1ED1\u1ED7\u1ED5\u00F5\u1E4D\u022D\u1E4F\u014D\u1E51\u1E53\u014F\u022F\u0231\u00F6\u022B\u1ECF\u0151\u01D2\u020D\u020F\u01A1\u1EDD\u1EDB\u1EE1\u1EDF\u1EE3\u1ECD\u1ED9\u01EB\u01ED\u00F8\u01FF\u0254\uA74B\uA74D\u0275]',
		'p': '[\u0070\u24DF\uFF50\u1E55\u1E57\u01A5\u1D7D\uA751\uA753\uA755]',
		'q': '[\u0071\u24E0\uFF51\u024B\uA757\uA759]',
		'r': '[\u0072\u24E1\uFF52\u0155\u1E59\u0159\u0211\u0213\u1E5B\u1E5D\u0157\u1E5F\u024D\u027D\uA75B\uA7A7\uA783]',
		's': '[\u0073\u24E2\uFF53\u00DF\u015B\u1E65\u015D\u1E61\u0161\u1E67\u1E63\u1E69\u0219\u015F\u023F\uA7A9\uA785\u1E9B]',
		't': '[\u0074\u24E3\uFF54\u1E6B\u1E97\u0165\u1E6D\u021B\u0163\u1E71\u1E6F\u0167\u01AD\u0288\u2C66\uA787]',
		'u': '[\u0075\u24E4\uFF55\u00F9\u00FA\u00FB\u0169\u1E79\u016B\u1E7B\u016D\u00FC\u01DC\u01D8\u01D6\u01DA\u1EE7\u016F\u0171\u01D4\u0215\u0217\u01B0\u1EEB\u1EE9\u1EEF\u1EED\u1EF1\u1EE5\u1E73\u0173\u1E77\u1E75\u0289]',
		'v': '[\u0076\u24E5\uFF56\u1E7D\u1E7F\u028B\uA75F\u028C]',
		'w': '[\u0077\u24E6\uFF57\u1E81\u1E83\u0175\u1E87\u1E85\u1E98\u1E89\u2C73]',
		'x': '[\u0078\u24E7\uFF58\u1E8B\u1E8D]',
		'y': '[\u0079\u24E8\uFF59\u1EF3\u00FD\u0177\u1EF9\u0233\u1E8F\u00FF\u1EF7\u1E99\u1EF5\u01B4\u024F\u1EFF]',
		'z': '[\u007A\u24E9\uFF5A\u017A\u1E91\u017C\u017E\u1E93\u1E95\u01B6\u0225\u0240\u2C6C\uA763]'
	};
	var defaultDiacriticsRemovalMapDoble = {
		'AA': '[\uA732]',
		'AE': '[\u00C6\u01FC\u01E2]',
		'AO': '[\uA734]',
		'AU': '[\uA736]',
		'AV': '[\uA738\uA73A]',
		'AY': '[\uA73C]',
		'DZ': '[\u01F1\u01C4]',
		'Dz': '[\u01F2\u01C5]',
		'LJ': '[\u01C7]',
		'Lj': '[\u01C8]',
		'NJ': '[\u01CA]',
		'Nj': '[\u01CB]',
		'OI': '[\u01A2]',
		'OO': '[\uA74E]',
		'OU': '[\u0222]',
		'TZ': '[\uA728]',
		'VY': '[\uA760]',
		'aa': '[\uA733]',
		'ae': '[\u00E6\u01FD\u01E3]',
		'ao': '[\uA735]',
		'au': '[\uA737]',
		'av': '[\uA739\uA73B]',
		'ay': '[\uA73D]',
		'dz': '[\u01F3\u01C6]',
		'hv': '[\u0195]',
		'lj': '[\u01C9]',
		'nj': '[\u01CC]',
		'oi': '[\u01A3]',
		'ou': '[\u0223]',
		'oo': '[\uA74F]',
		'tz': '[\uA729]',
		'vy': '[\uA761]'
	};

	function removeDiacritics(str) {
		var n_str = '';
		for (var x in defaultDiacriticsRemovalMapSingle) {
			str = str.replace(new RegExp(defaultDiacriticsRemovalMapSingle[x], 'g'), x);
		}
		for (var i = 0; i < str.length; i++) {
			var char = str.charAt(i);
			var reg = defaultDiacriticsRemovalMapSingle[char];
			if (reg) {
				n_str += reg;
			} else {
				n_str += char;
			}
		}
		return n_str;
	}

	function errMsg(msg) {
		return {
			'error': {
				'message': msg.toString()
			}
		};
	}

	function deepSet(obj1, obj2, deep) {
		if (!deep) {
			deep = '';
		}
		for (var x in obj2) {
			if (_.isObject(obj2[x])) {
				deepSet(obj1, obj2[x], deep + x + '.');
			} else {
				_.set(obj1, deep + x, obj2[x]);
			}
		}
	};


	function getQuery(model, data) {
		var query = {};
		if (data && Object.keys(data).length) {
			for (var param in data) {
				//Tastypie query style
				var p = param.match(/(.+)__(lt|lte|gt|gte|like|nlike|ne|in|nin|isnull|empty|nempty|size|sizelt|sizelte|sizegt|sizegte)$/);
				if (p && p.length > 0) {
					var condition = query[p[1]] || {};
					var operator = opEquivalence[p[2]];
					var c1 = {},
						c2 = {};
					if (p[2] == 'in' || p[2] == 'nin') {
						condition[operator] = data[param].split(',');
					} else if (p[2] == 'like') {
						condition = {
							'$regex': removeDiacritics(data[param]),
							'$options': 'i'
						};
					} else if (p[2] == 'nlike') {
						condition[operator] = new RegExp(removeDiacritics(data[param]) + '.*', 'i');
					} else if (p[2] == 'isnull') {
						condition = null;
					} else if (p[2] == 'empty') {
						c1 = {};
						c2 = {};
						condition = [];
						c1[p[1]] = {
							$exists: false
						};
						c2.$where = 'this.' + p[1] + '.length === 0';
						condition.push(c1, c2);
						p[1] = '$or';
					} else if (p[2] == 'nempty') {
						c1 = {};
						c2 = {};
						condition = [];
						c1[p[1]] = {
							$exists: true
						};
						c2.$where = 'this.' + p[1] + '.length > 0';
						condition.push(c1, c2);
						p[1] = '$and';
					} else if (p[2] == 'sizelt') {
						c1 = {};
						c2 = {};
						condition = [];
						c1[p[1]] = {
							$exists: true
						};
						c2.$where = 'this.' + p[1] + '.length < ' + data[param];
						condition.push(c1, c2);
						p[1] = '$and';
					} else if (p[2] == 'sizelte') {
						c1 = {};
						c2 = {};
						condition = [];
						c1[p[1]] = {
							$exists: true
						};
						c2.$where = 'this.' + p[1] + '.length <= ' + data[param];
						condition.push(c1, c2);
						p[1] = '$and';
					} else if (p[2] == 'sizegt') {
						c1 = {};
						c2 = {};
						condition = [];
						c1[p[1]] = {
							$exists: true
						};
						c2.$where = 'this.' + p[1] + '.length > ' + data[param];
						condition.push(c1, c2);
						p[1] = '$and';
					} else if (p[2] == 'sizegte') {
						c1 = {};
						c2 = {};
						condition = [];
						c1[p[1]] = {
							$exists: true
						};
						c2.$where = 'this.' + p[1] + '.length >= ' + data[param];
						condition.push(c1, c2);
						p[1] = '$and';
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
			if (name != 'id' && name != '__v') {
				var field = tree[name];
				var opts = {};
				if (typeof field === 'object') {
					if (field.length !== undefined) {
						opts.type = 'Array';
						if (field.length > 0) {
							if (typeof field[0] === 'object') {
								var subschema = (field[0].tree) ? field[0].tree : field[0];
								//Handles array of references
								if (subschema.ref) {
									opts.of = {};
									for (var s in subschema) {
										opts.of[s] = (typeof subschema[s] == 'function') ? subschema[s].name : subschema[s];
									}
								} else {
									//Array of objects
									opts.of = {
										type: 'Object',
										fields: buildSchema(subschema)
									};
								}

							} else {
								opts.of = (typeof field[0] == 'function') ? field[0].name : field[0];
							}
						}
					} else {
						//NESTED OBJECT
						if (!field.type) {
							opts.type = 'Object';
							opts.fields = buildSchema(field);
						} else {
							for (var p in field) {
								opts[p] = (typeof field[p] == 'function') ? field[p].name : field[p];
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
		functionsName = options.functionsName;
		ifCount = options.count;
	};


	function getPagination(data) {
		var pagination = {};
		if (data._limit) {
			pagination.limit = parseInt(data._limit);
			if (data._page) {
				pagination.skip = (parseInt(data._page) - 1) * pagination.limit;
			}
		}
		if (data._sort) {
			pagination.sort = data._sort;
			pagination.sortObj = {};
			var s = data._sort.split(' ');
			for (var i = 0; i < s.length; i++) {
				if (s[i][0] === '-') {
					pagination.sortObj[s[i].replace('-', '')] = -1;
				} else {
					pagination.sortObj[s[i]] = 1;
				}
			}

		}
		return pagination;
	}

	//------------------------------
	// Aggregate
	//
	exports.aggregate = function(model, data, aggregate, callback) {
		var model_name = model.modelName;
		var pagination = getPagination(data);

		var query = getQuery(model, data);

		for (var x in query) {
			if (query[x].match(/[0-9a-fA-F]{24}/g)) {
				query[x] = mongoose.Types.ObjectId(query[x]);
			}
		}




		var opt = [{
			$match: query
		}, {
			$group: aggregate
		}];
		if (data._sort) {
			opt.push({
				$sort: pagination.sortObj
			});
		}
		if (data._page) {
			opt.push({
				$skip: pagination.skip
			});
		}
		if (data._limit) {
			opt.push({
				$limit: pagination.limit
			});
		}

		if (aggregate) {
			var m = model.aggregate(opt);
			if (functionsName) {
				for (var i = 0; i < functionsName.length; i++) {
					m[functionsName[i]]();
				}
			}

			m.exec(callback);
		} else {
			callback(null, null);
		}
	};
	exports.meta_a = function(model, data, aggregate, callback) {
		var model_name = model.modelName;
		var pagination = getPagination(data);
		var meta = {
			limit: parseInt(pagination.limit) || null,
			page: parseInt(data._page) || 1,
			sort: pagination.sort || ''
		};
		if (ifCount) {
			var m = model.aggregate({
				$group: {
					_id: aggregate._id
				}
			});
			if (functionsName) {
				for (var i = 0; i < functionsName.length; i++) {
					m[functionsName[i]]();
				}
			}

			m.exec(function(err, result) {
				if (err) return callback(err);
				meta.total = result.length;
				callback(null, meta);
			});
		} else {
			callback(null, meta);
		}
	};

	//------------------------------
	// List
	//
	exports.list = function(model, data, callback) {
		var model_name = model.modelName;
		var pagination = getPagination(data);
		var m = model.find(getQuery(model, data), fields[model_name], pagination);

		if (functionsName) {
			for (var i = 0; i < functionsName.length; i++) {
				m[functionsName[i]]();
			}
		}

		m.populate(populate[model_name])
			.exec(function(err, result) {
				if (err) return callback(err);
				callback(null, result);
			});
	};

	exports.meta = function(model, data, callback) {
		var model_name = model.modelName;
		var pagination = getPagination(data);
		var meta = {
			limit: parseInt(pagination.limit) || null,
			page: parseInt(data._page) || 1,
			sort: pagination.sort || ''
		};
		if (ifCount) {
			var m = model.find(getQuery(model, data));

			if (functionsName) {
				for (var i = 0; i < functionsName.length; i++) {
					m[functionsName[i]]();
				}
			}

			m.count(function(err, result) {
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
		var m = model.findById(data.id, fields[model_name]);

		if (functionsName) {
			for (var i = 0; i < functionsName.length; i++) {
				m[functionsName[i]]();
			}
		}


		m.populate(populate[model_name])
			.exec(callback);
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
			deepSet(doc, data);
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
				return (typeof item.toObject === "function" ? item.toObject() : item);
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

