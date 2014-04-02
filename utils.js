var extend = function(target) {
	var sources = [].slice.call(arguments, 1);
	sources.forEach(function(source) {
		for (var prop in source) {
			target[prop] = source[prop];
		}
	});
	return target;
};

//Makes a deep copy
var clone = function(obj) {
	var copy = null;
	// Handle the 3 simple types, and null or undefined
	if (null === obj || "object" != typeof obj) return obj;

	// Handle Date
	if (obj instanceof Date) {
		copy = new Date();
		copy.setTime(obj.getTime());
		return copy;
	}

	// Handle Array
	if (obj instanceof Array) {
		copy = [];
		for (var i = 0, len = obj.length; i < len; i++) {
			copy[i] = clone(obj[i]);
		}
		return copy;
	}

	// Handle Object
	if (obj instanceof Object) {
		copy = {};
		for (var attr in obj) {
			if (obj.hasOwnProperty(attr)) copy[attr] = clone(obj[attr]);
		}
		return copy;
	}

	throw new Error("Unable to copy obj! Its type isn't supported.");
};

exports.extend = extend;
exports.clone = clone;