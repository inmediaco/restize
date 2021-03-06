-(function($, _, Backbone) {
	var Models = {}, Collections = {}, Schemas = {};

	function buildCollection(name, noform, nocache) {
		var schema = Schemas[name];
		var model = buildModel(name, noform, nocache);
		if (!model) {
			return false;
		}

		var backend = schema.backend;
		var Collection = null;

		if (backend && backend.type === "firebase") {
			Collection = Backbone.Collection.extend({
				model: model,
				firebase: new Backbone.Firebase(backend.endpoint)
			});
		} else {
			Collection = Backbone.Collection.extend({
				model: model,
				url: schema.url
			});
		}
		if (!nocache) {
			Collections[name] = Collection;
		}
		return Collection;
	}



	function buildModel(name, noform, nocache) {
		var schema = Schemas[name];
		if (!schema) {
			return false;
		}
		if (!nocache && Models[name]) {
			return Models[name];
		}
		var modelDef = {
			toString: function() {
				if (!this.id) {
					return "";
				}
				var label = this.get("name") || this.id;
				if (schema.display_field) {
					label = getLabel(schema.display_field, this.attributes);
				}
				return label;
			}
		};
		var backend = schema.backend;

		if (!backend || backend.type !== 'firebase') {
			//TODO: read from schema
			modelDef.idAttribute = "_id";
			modelDef.urlRoot = schema.url;
		}
		if (!noform) {
			modelDef.schema = getFormSchema(schema);
			modelDef.defaults = getDefaults(schema);
		}
		var Model = Backbone.Model.extend(modelDef);
		if (!nocache) {
			Models[name] = Model;
		}
		return Model;
	}



	function loadModels(urls, callback) {
		var deferreds = [];
		_.each(urls, function(url) {
			deferreds.push(
				$.getJSON(url, function(schema) {
					var name = schema.name.toLowerCase();
					schema.url = '.'+schema.url;
					Schemas[name] = schema;
					$('#menu').append(
						$('<li/>').append(
							$('<a/>').attr('href', '#' + name).html(schema.name)
						)
					);

				}));
		});
		$.when.apply(null, deferreds).done(function() {
			_.each(Schemas, function(schema, name) {
				buildCollection(name);
			});
			if (typeof callback === 'function') {
				callback();
			}
		});
	}


	function getDefaults(schema) {
		var defaults = {};
		_.each(schema.fields, function(def, field) {
			if (def['default'] !== undefined) {
				defaults[field] = def['default'];
			}
		});
		return defaults;
	}

	function getLabel(displayText, obj) {
		var result = displayText;
		var v = result.match(/%([a-zA-Z\_])+/gi).map(function(val) {
			return val.substr(1);
		});

		for (var i = 0; i < v.length; i++) {
			result = result.replace('%' + v[i], obj[v[i]]);
		}
		return result;
	}

	function getRefField(refname, aslist) {
		var Collection = buildCollection(refname, true, true);
		var fieldDef = {
			type: 'Text'
		};
		if (Collection) {
			if (!aslist) {
				fieldDef.type = 'Select';
			} else {
				fieldDef.type = 'List';
				fieldDef.itemType = 'Select';
			}
			var col = new Collection();
			//TODO: Handle empty values
			col.fetch().done(function() {
				//handles empty option
				col.unshift({});
			});
			fieldDef.options = col;
		}
		return fieldDef;
	}

	function getFormSchema(schema) {
		var formSchema = {};
		_.each(schema.fields, function(def, field) {
			fieldDef = {};
			if (def.auto) {
				return;
			} else if (def.type === 'Boolean') {
				fieldDef = {
					type: 'InlineRadio',
					options: [{
						label: 'Yes',
						val: 'true'
					}, {
						label: 'No',
						val: 'false'
					}]
				};
			} else if (def.enum) {
				def.enum.unshift('');
				fieldDef = {
					type: 'Select',
					options: def.enum
				};

			} else if (def.type == 'Object') {
				fieldDef = {
					type: 'Object',
					subSchema: getFormSchema(def)
				};
			} else if (def.ref) {
				var refname = def.ref.toLowerCase();
				fieldDef = getRefField(refname);

			} else if (def.type == 'Date') {
				fieldDef = {
					type: 'DateTime'
				};
			} else if (def.type == "Array") {
				if (def.of && def.of.type == 'Object') {
					fieldDef = {
						type: 'List',
						itemType: 'Object',
						subSchema: getFormSchema(def.of),
						itemToString: function(obj) {
							var label = obj.name || obj._id;
							return label;
						}
					};
				} else {
					if (def.of.ref) {
						var refname = def.of.ref.toLowerCase();
						fieldDef = getRefField(refname, true);
					} else {
						fieldDef = {
							type: 'List',
							itemType: 'Text'
						};
					}
				}
			} else {
				fieldDef = {
					type: 'Text'
				};
			}

			fieldDef.help = def.help;
			formSchema[field] = fieldDef;
		});

		return formSchema;
	}



	$(document).ready(function() {
		Backbone.Form.editors.List.Modal.ModalAdapter = Backbone.BootstrapModal;

		var AdminItemView = Backbone.View.extend({
			tagName: 'tr',
			template: _.template($('#admin-item').html()),
			events: {
				"click .delete": "deleteItem"
			},
			initialize: function() {
				_.bindAll(this, 'render', 'remove');
				this.model.on('change', this.render);
				this.model.on('destroy', this.remove);
			},
			render: function(url) {
				$(this.el).html(this.template({
					id: this.model.id,
					item: this.model.toJSON(),
					display_name: this.model.toString(),
					url: url
				}));
				return this;
			},
			deleteItem: function() {
				var r = confirm("Are you sure?");
				if (r === true) {
					this.model.destroy({
						success: function(model, response) {
							if (!response.error) {
								alert('Item deleted successfully!.');
							} else {
								alert(response.error.message);
							}
						},
						error: function() {
							alert('Item could NOT be deleted.');
						}
					});
				}
				return false;
			}
		});

		var AdminIndexView = Backbone.View.extend({
			tagName: 'div',
			collection: {},
			template: _.template($('#admin-index').html()),

			initialize: function(options) {
				this.$el.html(this.template({
					headers: ['display name'],
					url: this.url
				}));
				this.listenTo(this.collection, 'reset', this.addAll);
				this.listenTo(this.collection, 'add', this.addOne);
				this.collection.fetch({
					reset: true
				});
			},

			showAll: function(ev) {
				console.log(ev);
			},

			addAll: function(ev) {
				this.collection.each(this.addOne, this);
			},
			addOne: function(item) {
				var view = new AdminItemView({
					model: item
				});
				this.$('#items').append(view.render(this.url).el);
			},
			render: function() {
				return this;
			}
		});

		var cleanData = function(attributes, schema) {
			if (schema.fields) {
				_.each(attributes, function(value, name) {
					if (!schema.fields[name]) {
						delete attributes[name];
					} else if (schema.fields[name].type == 'Object') {
						cleanData(value, schema.fields[name]);
					} else if (schema.fields[name].type == 'Array' && schema.fields[name].of.ref) {
						for (var i = 0; i < value.length; i++) {
							if (!value[i]) {
								delete value[i];
							}
						};
					} else if (schema.fields[name].type == 'ObjectId' && !value) {
						delete attributes[name];
					}
				});
			}
		};

		var AdminRouter = Backbone.Router.extend({
			routes: {
				"": "home",
				"home": "home",
				":model": "list",
				":model/page/:page": "list",
				":model/add": "add",
				":model/:id": "edit"
			},
			collections: {},
			//TODO: change
			calendar: null,

			initialize: function() {},

			home: function() {
				$('#title').html("Welcome");
				$('#content').html("");
			},

			list: function(model) {
				$('#title').html(model);
				var collection = this._createCollection(model);
				var view = AdminIndexView.extend({
					collection: collection,
					url: model
				});

				var listView = new view();
				$('#content').html(listView.render().el);
			},

			edit: function(model, id) {
				var self = this;
				$('#title').html(model);
				var m = this.collections[model].get(id);
				var form = new Backbone.Form({
					model: m
				});
				$('#content').html(form.render().el);
				self._appendButtons(model, m, form);
			},

			add: function(model) {
				$('#title').html(model);
				var m = new Models[model]();
				var form = new Backbone.Form({
					model: m
				}).render();
				$('#content').html(form.el);
				this._appendButtons(model, m, form);

			},
			_appendButtons: function(model_name, model, form) {
				var self = this;
				var submitBtn = $('<button/>').addClass('btn btn-primary').html('Save');
				submitBtn.click(function() {
					form.commit();
					self.collections[model_name].add(model);
					cleanData(model.attributes,Schemas[model_name]);
					model.save({}, {
						success: function(model, resp) {
							if (!resp.error) {
								alert('Model has been saved successfully.' + model.id);
								self.navigate(model_name, {
									trigger: true
								});
							} else {
								alert("ERROR: " + resp.error);
							}
						},
						error: function(model, resp) {
							alert("ERROR: " + resp.responseText);
						}
					});
				});
				$('#content').append(submitBtn);
			},

			_createCollection: function(model_name) {
				if (!this.collections[model_name]) {
					this.collections[model_name] = new Collections[model_name]();
				}
				return this.collections[model_name];
			}
		});


		//Starts app after Model Initialization
		$.getJSON('./services', function(services) {
			loadModels(services, function() {
				app = new AdminRouter();
				Backbone.history.start();
			});
		});
	});

})(jQuery, _, Backbone);