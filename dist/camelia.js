/**
 * @product CameliaJS (c) 2014 Vedana http://www.vedana.com
 * @license Creative Commons - The licensor permits others to copy, distribute,
 *          display, and perform the work. In return, licenses may not use the
 *          work for commercial purposes -- unless they get the licensor's
 *          permission.
 * @author olivier.oeuillot@vedana.com
 */

(function(window, angular, undefined) {
	"use strict";

	var camelia = angular.module("camelia.core", []);
	camelia.factory("camelia.core",
			[ "$q",
				"$rootScope",
				"$log",
				"$exceptionHandler",
				"$injector",
				function($q, $rootScope, $log, $exceptionHandler, $injector) {

					var cmTypeMatchRegexp = /cm_([a-z]*)_.*/i;

					function int(str) {
						return parseInt(str, 10);
					}

					var msie;

					return {
						Assert: function(arg, name /* , message */) {
							if (arg) {
								return;
							}

							var ps = Array.prototype.slice.call(arguments, 2);

							ps.unshift("Assert error:'", (name || "?"), "':");

							var message = this.format(ps);
							var error = new Error(message);

							$exceptionHandler(error);
						},

						IsMSIE: function() {
							if (msie !== undefined) {
								return msie;
							}

							var agent = navigator.userAgent.toLowerCase();
							msie = int((/msie (\d+)/.exec(agent) || [])[1]);
							if (isNaN(msie)) {
								msie = int((/trident\/.*; rv:(\d+)/.exec(agent) || [])[1]);
							}
							return msie;
						},
						createElement: function(parent, tagName, properties) {

							if (parent.injector) {
								parent = parent[0];
							}

							var doc;
							if (parent.nodeType == 9) {
								doc = parent;
								parent = doc.body.parentNode;

							} else {
								doc = parent.ownerDocument;
							}

							var element;

							for (var i = 1; i < arguments.length;) {
								tagName = arguments[i++];
								properties = arguments[i++];

								this.Assert(typeof (tagName) == "string", "createElement", "Invalid 'tagName' parameter (" + tagName +
										")");
								this.Assert(properties === undefined || typeof (properties) == "object", "createElement",
										"Invalid properties parameter (" + properties + ")");

								if (this.IsMSIE() <= 6 && tagName.toLowerCase() == "input" && properties && properties.type &&
										properties.name) {
									element = doc.createElement("<input name=\"" + properties.name + "\" type=\"" + properties.type +
											"\">");
									delete properties.name;
									delete properties.type;

								} else {
									element = doc.createElement(tagName);
								}

								var textNode = null;
								var innerHtml = null;
								if (properties) {
									for ( var name in properties) {
										var value = properties[name];

										switch (name.toLowerCase()) {
										case "classname":
										case "styleclass":
										case "class":
											if (angular.isArray(value)) {
												value = value.join(" ");
											}
											element.className = value;
											break;

										case "textnode":
											textNode = value;
											break;

										case "innerhtml":
											innerHtml = value;
											break;

										case "role":
										case "aria-live":
										case "aria-atomic":
										case "aria-relevant":
											element.setAttribute(name, value);
											break;

										case "style":
											var rs = value.split(";");
											for (var j = 0; j < rs.length; j++) {
												var rs2 = rs[j].split(":");

												var rname = this.trim(rs2[0]);
												var rvalue = this.trim(rs2[1]);

												element.style[rname] = rvalue;
											}
											break;

										default:
											if (!name.indexOf("css")) { /* ==0 !!! */
												element.style[name.substring(3, 4).toLowerCase() + name.substring(4)] = value;
												break;
											}

											switch (typeof (value)) {
											case "function":
											case "object":
												element[name] = value;
												break;

											default:
												if (name.charAt(0) != "$") {
													element.setAttribute(name, value);
												} else {
													element[name.substring(1)] = value;
												}
											}

										}
									}
								}

								if (parent.appendChild) {
									parent.appendChild(element);
								} else {
									parent.append(element);
								}

								if (textNode !== null) {
									element.appendChild(doc.createTextNode(textNode));
								}

								if (innerHtml !== null) {
									element.innerHTML = innerHtml;
								}

								parent = element;
							}

							return angular.element(element);
						},
						MixClasses: function(element, bases, extensions, constantClasses) {
							function mat(ret, prefix, index) {
								for (var i = index; i < extensions.length;) {
									// With extension segment
									var np = prefix + extensions[i++];
									ret.push(np);
									mat(ret, np, i);

									// Without extension segment
									// mat(ret, prefix, i);
								}
							}

							var classes = [];
							for (var j = 0; j < bases.length; j++) {
								var base = this.trim(bases[j]);
								if (!base) {
									continue;
								}

								classes.push(base);
								mat(classes, base, 0);
							}

							if (element.injector) {
								element = element[0];
							}

							if (constantClasses) {
								classes = classes.concat(constantClasses);
							}

							var className = classes.join(" ");
							if (element.className == className) {
								return false;
							}

							element.className = className;
							return true;
						},

						BubbleEvent: function(element, eventName, eventData) {
							if (element[0]) {
								element = element[0];
							}
							var jqLite = angular.element;

							var cache = jqLite.cache;
							var expando = jqLite.expando;

							eventData = eventData || [];

							var event = {
								type: eventName,
								currentTarget: element,
								relatedTarget: element,
								preventDefault: angular.noop,
								stopPropagation: function() {
									this.stop = true;
								}
							};

							angular.extend(event, eventData);

							var params = [ event ];

							for (; element && element.nodeType == 1 && !event.stop; element = element.parentNode) {

								var expandoId = element[expando];
								if (!expandoId) {
									continue;
								}
								var expandoStore = cache[expandoId];
								if (!expandoStore) {
									continue;
								}
								var events = expandoStore.events;
								if (!events) {
									continue;
								}
								var eventFns = events[eventName];
								if (!eventFns) {
									continue;
								}

								angular.forEach(eventFns, function(fn) {
									if (event.stop) {
										return;
									}

									try {
										if (fn.call) {
											fn.call(element, event);
											return;
										}
										if (fn.handler) {
											fn.handler.call(element, event);
										}
									} catch (e) {
										$exceptionHandler(e);
									}
								});
							}
						},
						format: function(as) {
							var cycles = [];
							var sp = [];
							var self = this;
							var f = function(args) {
								angular.forEach(args, function(arg) {
									if (angular.isElement(arg)) {
										sp.push(arg.tagName + "." + arg.className + "#" + arg.id);
										return;
									}
									if (arg === null) {
										sp.push("null");
										return;
									}
									if (arg === undefined) {
										sp.push("undefined");
										return;
									}
									if (angular.isFunction(arg)) {
										sp.push("<<FUNC>>");
										return;
									}
									if (self.isPromise(arg)) {
										sp.push("<<PROMISE>>");
										return;
									}

									if (angular.isObject(arg)) {
										for (var i = 0; i < cycles.length; i++) {
											if (cycles[i] === arg) {
												sp.push("**cycle**");
												return;
											}
										}
										cycles.push(arg);

										sp.push("{");
										var first = true;
										angular.forEach(arg, function(v, k) {
											if (first) {
												first = false;
											} else {
												sp.push(",");
											}
											sp.push(k + ":");

											f([ v ]);
										});
										sp.push("}");
										return;
									}

									sp.push(String(arg));
								});
							};

							f(as);

							return sp.join(" ");
						},
						log: function() {
							var format = this.format(arguments);

							$log.info(format);
						},
						trim: function(string) {
							return string.trim();
						},

						CloneArray: function(array) {
							if (!array) {
								return array;
							}
							if (array.slice) {
								return array.slice();
							}

							return Array.prototype.slice.call(array);
						},

						LoadProvider: function(providerName) {
							var myInjector = $injector;
							var idx = providerName.indexOf(":");
							if (idx > 0) {
								var moduleName = providerName.substring(0, idx);
								providerName = providerName.substring(idx + 1);

								myInjector = angular.injector([ "ng", "camelia.core", moduleName ]);
							}

							var provider = myInjector.get(providerName);
							return provider;
						},

						CloneAttributes: function(element) {
							var unboundAttrs = {};

							var attrs = element[0].attributes;
							for (var i = 0; i < attrs.length; i++) {
								var attr = attrs[i];

								unboundAttrs[attr.name] = attr.value;
							}

							return unboundAttrs;
						},
						isPromise: function(object) {
							return object && angular.isFunction(object.then);
						},
						toBoolean: function(value, defaultValue) {
							if (value === true) {
								return value;
							}

							if (value && value.length) {
								var v = value.toLowerCase();
								return !(v == "f" || v == "0" || v == "false" || v == "no" || v == "n" || v == "[]");
							}

							return !!defaultValue;
						},

						appendTextNode: function(parent, message, breakLine) {
							if (!message) {
								return;
							}
							var idx = 0;
							for (;;) {
								var next = message.indexOf('\n', idx);
								if (next < 0) {
									parent.appendChild(document.createTextNode(message.substring(idx)));
									break;
								}

								if (idx + 1 < next) {
									if (!breakLine) {
										next++;
									}
									parent.appendChild(document.createTextNode(message.substring(idx, next)));
								}

								if (breakLine) {
									parent.appendChild(document.createElement("br"));
								}

								idx = next + 1;
							}
						},

						setFocus: function(element) {

							// this.log("SetFocus ", element);

							try {
								element.focus();

							} catch (x) {
								$log.error(x);
							}
						},

						lang: function(bundle, labelName, params) {
							var label = bundle.en[labelName];
							if (!label || !params) {
								return label;
							}

							var formatted = [];
							var reg = /\{\w+\}/g;

							var last = 0;
							for (;;) {
								var ret = reg.exec(label);
								if (!ret) {
									break;
								}

								if (ret.index) {
									formatted.push(label.substring(last, ret.index));
								}
								var p = params[ret[0].substring(1, ret[0].length - 1)];
								formatted.push((p === undefined) ? '?' : p);

								last = reg.lastIndex;
							}

							if (!last) {
								return label;
							}

							formatted.push(label.substring(last));
							return formatted.join('');
						},

						setAudioDescription: function(parent, text, type) {
							if (parent[0]) {
								parent = parent[0];
							}

							if (!type) {
								type = "main";
							}

							var qs = parent.querySelectorAll(".cm_audioDescription");
							for (var i = 0; i < qs.length; i++) {
								var ad = qs[i];

								if (ad.type != type) {
									continue;
								}

								var elt = angular.element(ad).empty();
								if (text) {
									elt.text(text);
								}
								return;
							}

							if (!text) {
								return;
							}

							this.createElement(parent, "SPAN", {
								className: "cm_audioDescription",
								$type: type,
								textnode: text
							});
						},

						getProto: function(type) {
							return (Object.getPrototypeOf && Object.getPrototypeOf(type)) || type.__proto__;
						},

						inheritScope: function(obj, parentScope, isolate) {
							var prototype = this.getProto(obj);

							var scope = (parentScope || $rootScope).$new(isolate !== false);
							if (Object.setPrototypeOf) {
								Object.setPrototypeOf(obj, scope);
								Object.setPrototypeOf(scope, prototype);
								return;
							}

							obj.__proto__ = scope;
							scope.__proto__ = prototype;
						},
						extend: function(clazz, parentClass, members) {
							return this.extendProto(clazz, parentClass.prototype, members);
						},
						extendProto: function(clazz, parentProto, members) {
							var proto = Object.create(parentProto);
							clazz.prototype = proto;
							angular.extend(proto, members || {});

							proto.constructor = clazz;
							proto.$super = parentProto;

							return clazz;
						},
						on: function(target, type, listener, useCapture, scope) {
							if (target[0]) {
								target = target[0];
							}

							var listenerApply = function(event) {
								var self = this;

								var ret;
								(scope || $rootScope).$apply(function() {
									ret = listener.call(self, event);
								});

								return ret;
							};

							target.addEventListener(type, listenerApply, useCapture);

							return function() {
								target.removeEventListener(type, listenerApply, useCapture);
							};
						}
					};
				} ]);

})(window, window.angular);
/**
 * @product CameliaJS (c) 2014 Vedana http://www.vedana.com
 * @license Creative Commons - The licensor permits others to copy, distribute,
 *          display, and perform the work. In return, licenses may not use the
 *          work for commercial purposes -- unless they get the licensor's
 *          permission.
 * @author olivier.oeuillot@vedana.com
 */

(function(window, angular, undefined) {
	"use strict";

	var camelia = angular.module("camelia.core");
	camelia.factory("camelia.cmTypes", [ "camelia.core", function(cc) {

		var cmTypeMatchRegexp = /cm_([a-z]*)_.*/i;

		return {
			GetCMType: function(node) {
				if (!node || node.nodeType != 1) {
					return null;
				}

				var type = node.cm_type;
				if (type) {
					return type;
				}

				var id = node.id;
				if (!id) {
					return null;
				}

				var match = cmTypeMatchRegexp.exec(id);
				if (!match) {
					return null;
				}

				type = match[1];
				return type;
			},

			SearchElements: function(ret, stopType, node) {
				for (; node; node = node.parentNode) {
					var type = this.GetCMType(node);
					if (!type) {
						continue;
					}

					ret[type] = node;

					if (type == stopType) {
						break;
					}
				}
				return ret;
			},

			MixElementClasses: function(element, classes, constantClasses) {
				if (element[0]) {
					element = element[0];
				}

				var extensions = [];

				if (element._ascending) {
					extensions.push("_ascending");
				}

				if (element._collapsed) {
					extensions.push("_collapsed");
				}

				if (element._cursor) {
					extensions.push("_cursor");
				}

				if (element._descending) {
					extensions.push("_descending");
				}

				if (element._filtreable) {
					extensions.push("_filtreable");
				}

				if (element._filtred) {
					extensions.push("_filtred");
				}

				if (element._focus) {
					extensions.push("_focus");
				}

				if (element._mouseDown) {
					extensions.push("_mouseDown");
				}

				if (element._openedPopup) {
					extensions.push("_openedPopup");
				}

				if (element._over) {
					extensions.push("_over");
				}

				if (element._selected) {
					extensions.push("_selected");
				}

				if (element._sortable) {
					extensions.push("_sortable");
				}

				cc.MixClasses(element, classes, extensions, constantClasses);
			},

			ForEachElement: function(elements, type, func) {
				var map = !angular.isString(type);

				var length = elements.length;
				for (var i = 0; i < length; i++) {
					var child = elements[i];

					var ctype = this.GetCMType(child);
					if (!ctype) {
						continue;
					}
					if (map) {
						if (!type[ctype]) {
							continue;
						}
					} else {
						if (ctype != type) {
							continue;
						}
					}

					if (func(child, ctype) === false) {
						return false;
					}
				}
			},

			GetPreviousVisibleType: function(viewPort, child, type, func) {
				if (viewPort[0]) {
					viewPort = viewPort[0];
				}
				if (viewPort.offsetHeight == viewPort.scrollHeight) {
					return this.GetPreviousType(child, type, func);
				}

				var scrollTop = viewPort.scrollTop;
				var clientHeight = viewPort.clientHeight;

				var last = null;
				this.GetPreviousType(child, type, function(child, ctype) {
					if (last) {
						return;
					}
					if (func && func(child, ctype) !== true) {
						return false;
					}

					if (child.offsetTop + child.offsetHeight / 2 - scrollTop > clientHeight) {
						return;
					}

					last = child;
				});

				return last;
			},

			GetPreviousType: function(child, type, func) {
				var map = !angular.isString(type);

				for (; child; child = child.previousSibling) {
					if (child.nodeType != 1) {
						continue;
					}

					var ctype = this.GetCMType(child);
					if (!ctype) {
						continue;
					}
					if (map) {
						if (!type[ctype]) {
							continue;
						}
					} else {
						if (ctype != type) {
							continue;
						}
					}

					if (func && func(child, ctype) !== true) {
						continue;
					}

					return child;
				}

				return null;
			},

			GetNextVisibleType: function(viewPort, child, type, func) {
				if (viewPort[0]) {
					viewPort = viewPort[0];
				}
				if (viewPort.offsetHeight == viewPort.scrollHeight) {
					return this.GetNextType(child, type, func);
				}

				var scrollTop = viewPort.scrollTop;
				var clientHeight = viewPort.clientHeight;

				var last = null;
				this.GetNextType(child, type, function(child, ctype) {
					if (last) {
						return;
					}
					if (func && func(child, ctype) !== true) {
						return false;
					}

					if (child.offsetTop + child.offsetHeight / 2 < scrollTop) {
						return;
					}

					last = child;
				});

				return last;
			},

			GetNextType: function(child, type, func) {
				var map = !angular.isString(type);

				for (; child; child = child.nextSibling) {
					if (child.nodeType != 1) {
						continue;
					}

					var ctype = this.GetCMType(child);
					if (!ctype) {
						continue;
					}
					if (map) {
						if (!type[ctype]) {
							continue;
						}
					} else {
						if (ctype != type) {
							continue;
						}
					}

					if (func && func(child, ctype) !== true) {
						continue;
					}

					return child;
				}

				return null;
			},

			SwitchOnState: function(renderContext, elements, stateName, callback) {

				var prefixedStateName = "_" + stateName;

				// cc.log("StateOn[" + stateName + "] target=", target, " elements=",
				// elements);

				angular.forEach(elements, function(element, type) {
					var propertyName = type + "_" + stateName;

					var oldElementId = renderContext[propertyName];
					if (oldElementId && (!element || oldElementId != element.id)) {
						renderContext[propertyName] = null;

						var oldElement = document.getElementById(oldElementId);
						if (oldElement && oldElement[prefixedStateName]) {
							oldElement[prefixedStateName] = false;

							cc.BubbleEvent(oldElement, "cm_update");
						}
					}
				});

				angular.forEach(elements, function(element, type) {
					if (!element) {
						return;
					}

					var propertyName = type + "_" + stateName;

					if (!renderContext[propertyName]) {
						renderContext[propertyName] = element.id;

						if (!element[prefixedStateName]) {
							element[prefixedStateName] = true;

							cc.BubbleEvent(element, "cm_update");
						}
					}
				});

				if (callback) {
					callback(elements);
				}
			},

			SwitchOffState: function(renderContext, elements, stateName, callback) {
				var prefixedStateName = "_" + stateName;

				// cc.log("StateOff[" + stateName + "] target=", target, " elements=",
				// elements);

				angular.forEach(elements, function(element, type) {
					var propertyName = type + "_" + stateName;

					var oldElementId = renderContext[propertyName];
					if (oldElementId && (!element || oldElementId != element.id)) {
						renderContext[propertyName] = null;

						var oldElement = document.getElementById(oldElementId);

						if (oldElement && oldElement[prefixedStateName]) {
							oldElement[prefixedStateName] = false;

							cc.BubbleEvent(oldElement, "cm_update");
						}
					}
				});

				if (callback) {
					callback(elements);
				}
			},

			ClearState: function(renderContext, elements, stateName, callback) {
				// cc.log("ClearState[" + stateName + "]");

				var prefixedStateName = "_" + stateName;
				var callbackElements = {};

				angular.forEach(elements, function(element, type) {
					var propertyName = type + "_" + stateName;

					var oldElementId = renderContext[propertyName];
					if (oldElementId) {
						renderContext[propertyName] = null;

						var oldElement = document.getElementById(oldElementId);

						if (oldElement && oldElement[prefixedStateName]) {
							oldElement[prefixedStateName] = false;
							callbackElements[type] = oldElement;

							cc.BubbleEvent(oldElement, "cm_update");
						}
					}
				});

				if (callback) {
					callback(callbackElements);
				}
			}
		};
	} ]);
})(window, window.angular);
/**
 * @product CameliaJS (c) 2014 Vedana http://www.vedana.com
 * @license Creative Commons - The licensor permits others to copy, distribute,
 *          display, and perform the work. In return, licenses may not use the
 *          work for commercial purposes -- unless they get the licensor's
 *          permission.
 * @author olivier.oeuillot@vedana.com
 */

(function(window, angular, undefined) {
	'use strict';

	var module = angular.module('camelia.cursorProvider', [ "camelia.core" ]);

	module.factory('camelia.CursorProvider', [ "$rootScope", "camelia.core", function($rootScope, cc) {

		var scopeProto = cc.getProto($rootScope);

		function CursorProvider($parentScope) {
			cc.inheritScope(this, $parentScope);
		}

		CursorProvider.CURSOR_REQUESTED = "cm:cursorRequested";
		CursorProvider.CURSOR_CHANGED = "cm:cursorChanged";

		cc.extendProto(CursorProvider, scopeProto, {

			getRow: function() {
				var rowValue = this._rowCursor;

				return rowValue;
			},

			getColumn: function() {
				var column = this._columnCursor;

				return column;
			},

			setCursor: function(row, column, sourceEvent) {

				cc.log("SetCursor row=", row, " column=", (column) ? column.id : null, " event=", sourceEvent);

				if (this._rowCursor === row && this._columnCursor === column) {
					return;
				}

				var oldRow = this._rowCursor;
				var oldColumn = this._columnCursor;

				this._rowCursor = row;
				this._columnCursor = column;

				this.$emit(CursorProvider.CURSOR_CHANGED, {
					row: row,
					column: column,
					oldRow: oldRow,
					oldColumn: oldColumn,
					sourceEvent: sourceEvent
				});
			},

			requestCursor: function(row, column, event) {

				this.setCursor(row, column, event);

				if (false) {
					this.$emit(CursorProvider.REQUEST_CURSOR, {
						row: row,
						column: column
					});
				}
			}
		});

		return CursorProvider;
	} ]);

})(window, window.angular);
/**
 * @product CameliaJS (c) 2014 Vedana http://www.vedana.com
 * @license Creative Commons - The licensor permits others to copy, distribute,
 *          display, and perform the work. In return, licenses may not use the
 *          work for commercial purposes -- unless they get the licensor's
 *          permission.
 * @author olivier.oeuillot@vedana.com
 */

(function(window, angular, undefined) {
	'use strict';

	var module = angular.module('camelia.dataModel', [ 'camelia.core', 'ngResource' ]);

	module.factory('camelia.DataModel', [ "$q",
		"$rootScope",
		"camelia.core",
		"$injector",
		"$resource",
		function($q, $rootScope, cc, $injector, $resource) {

			var scopeProto = cc.getProto($rootScope);
			var resourceProto = cc.getProto($resource());

			function DataModel() {
				cc.inheritScope(this);

				var self = this;
				this.$on("$destroy", function() {

					var deRegistration = self._watcherDeRegistration;
					if (deRegistration) {
						self._watcherDeRegistration = undefined;

						deRegistration();
					}

					self._wrappedData = undefined;
					self._sorters = undefined;
					self._filters = undefined;
					self._dataScope = undefined;
					self._fetchProperties = undefined;
				});
			}

			DataModel.DATA_REQUESTING = "c:dataRequesting";

			DataModel.DATA_LOADING = "c:dataLoading";

			DataModel.DATA_LOADED = "c:dataLoaded";

			DataModel.DATA_MODEL_CHANGED_EVENT = "cm:dataModelChanged";

			DataModel.DATA_MODEL_UPDATED_EVENT = "cm:dataModelUpdated";

			DataModel.From = function(parameter) {

				if (parameter instanceof DataModel) {
					return parameter;
				}

				var parameterProto = parameter && cc.getProto(parameter);

				if (parameterProto === resourceProto) {
					return $injector.invoke([ "camelia.ResourceDataModel", function(ResourceDataModel) {
						return new ResourceDataModel(parameter);
					} ]);
				}
				if (angular.isArray(parameter)) {
					return $injector.invoke([ "camelia.ArrayDataModel", function(ArrayDataModel) {
						return new ArrayDataModel(parameter);
					} ]);
				}

				return new DataModel();
			};

			cc.extendProto(DataModel, scopeProto, {

				_rowIndex: -1,

				installWatcher: function($scope, varName) {
					var self = this;
					this._watcherDeRegistration = $scope.$watch(varName, function(newValue) {
						self.$broadcast(DataModel.DATA_MODEL_CHANGED_EVENT, newValue);
					});
				},

				/**
				 * @return {Promise|boolean}
				 */
				isRowAvailable: function() {
					return false;
				},
				/**
				 * @param {boolean}
				 *          force returns promise if not known
				 * @return {Promise|number}
				 */
				getRowCount: function(force) {
					return -1;
				},
				/**
				 * @return {Object}
				 */
				getRowData: function() {
					return undefined;
				},
				/**
				 * @return {number}
				 */
				getRowIndex: function() {
					return this._rowIndex;
				},
				/**
				 * @param {number}
				 *          rowIndex
				 */
				setRowIndex: function(rowIndex) {
					var old = this._rowIndex;

					this._rowIndex = rowIndex;

					if (this.$parent == $rootScope) {
						if (old < 0 && rowIndex >= 0) {
							// Broadcast START
							this.$broadcast("cm:begin");
						}

						if (old >= 0 && rowIndex < 0) {
							this.$broadcast("cm:end");
						}
					}
				},
				getWrappedData: function() {
					return this._wrappedData;
				},
				setWrappedData: function(data) {
					this._wrappedData = data;
				},
				setFetchProperties: function(fetchProperties) {
					this._fetchProperties = fetchProperties;
				},
				setSorters: function(sorters) {
					if (this._sorters === sorters) {
						return false;
					}
					this._sorters = sorters;
					return true;
				},
				setFilters: function(filters) {
					if (this._filters === filters) {
						return false;
					}
					this._filters = filters;
					return true;
				},
				setGrouped: function(grouped) {
					this._grouped = !!grouped;
				},
				setDataScope: function(scope) {
					this._dataScope = scope;
				},
				isFilterSupport: function() {
					return this.filterSupport;
				},
				isSortSupport: function() {
					return this.sortSupport;
				},
				isGroupSupport: function() {
					return this.groupSupport;
				},
				/**
				 * @returns {Array|Promise}
				 */
				toArray: function() {
					var array = [];

					var index = 0;

					var self = this;
					function promiseIndex(available) {

						for (; available; index++) {
							self.setRowIndex(index);

							available = self.isRowAvailable();
							if (available === false) {
								break;
							}

							if (cc.isPromise(available)) {
								return available.then(promiseIndex);
							}

							var data = self.getRowData();

							array.push(data);
						}

						self.setRowIndex(-1);

						return $q.when(array);
					}

					var ret = array;
					try {
						ret = promiseIndex(true);

					} catch (x) {
						this.setRowIndex(-1);

						throw x;
					}

					return ret;
				},

				$destroyChildren: function() {
					for (; this.$$childHead;) {
						this.$$childHead.$destroy();
					}
				}
			});

			return DataModel;
		} ]);

	/*
	 * ------------------------ ArrayDataModel ------------------------------
	 */

	module.factory('camelia.ArrayDataModel', [ 'camelia.DataModel', 'camelia.core', function(DataModel, cc) {

		function ArrayDataModel(array) {
			DataModel.prototype.constructor.call(this);

			this.setWrappedData(array);
		}

		cc.extend(ArrayDataModel, DataModel, {
			installWatcher: function($scope, varName) {
				var self = this;
				this._watcherDeRegistration = $scope.$watchCollection(varName, function(newValue, oldValue) {
					if (oldValue === undefined) {
						return;
					}

					self.setWrappedData(newValue);
					self.$broadcast(DataModel.DATA_MODEL_UPDATED_EVENT, newValue);
				});
			},

			/**
			 * @return {Promise}
			 */
			isRowAvailable: function() {
				var index = this.getRowIndex();
				var rowCount = this.getRowCount();

				if (index >= 0 && (rowCount < 0 || index < rowCount)) {
					return true;
				}

				return false;
			},
			/**
			 * @return {Promise|number}
			 */
			getRowCount: function() {
				var array = this.getWrappedData();
				if (!array) {
					return 0;
				}
				return array.length;
			},
			/**
			 * @return {Object}
			 */
			getRowData: function() {
				if (!this.isRowAvailable()) {
					throw new Error("Invalid rowIndex (" + this.getRowIndex() + "/" + this.getRowCount() + ")");
				}

				var array = this.getWrappedData();

				var index = this.getRowIndex();
				return array[index];
			},
			toArray: function() {
				var array = this.getWrappedData();
				if (angular.isArray(array)) {
					return array;
				}

				return DataModel.prototype.toArray.call(this);
			}
		});

		return ArrayDataModel;
	} ]);

	/*
	 * ------------------------ WrappedArrayDataModel ------------------------
	 */

	module.factory('camelia.WrappedArrayDataModel', [ 'camelia.ArrayDataModel',
		"camelia.core",
		function(ArrayDataModel, cc) {

			var DELEGATE_TO_PARENT = "$$DELAGATE_PARENT$$";
			var NO_DATA = "$$NO-DATA$$";

			function WrappedArrayDataModel(dataModel) {
				ArrayDataModel.call(this, undefined);

				this.$parent = dataModel;

			}

			cc.extend(WrappedArrayDataModel, ArrayDataModel, {

				setSorters: function(sorters) {
					this.$parent.setSorters(sorters);
					WrappedArrayDataModel.prototype.$super.setSorters.call(this, sorters);
				},
				setFilters: function(filters) {
					this.$parent.setFilters(filters);
					WrappedArrayDataModel.prototype.$super.setFilters.call(this, filters);
				},
				setGrouped: function(grouped) {
					this.$parent.setGrouped(grouped);
					WrappedArrayDataModel.prototype.$super.setGrouped.call(this, grouped);
				},
				setDataScope: function(scope) {
					this.$parent.setDataScope(scope);
					WrappedArrayDataModel.prototype.$super.setDataScope.call(this, scope);
				},
				isFilterSupport: function() {
					return WrappedArrayDataModel.prototype.$super.isFilterSupport.call(this) || this.$parent.isFilterSupport();
				},
				isSortSupport: function() {
					return WrappedArrayDataModel.prototype.$super.isSortSupport.call(this) || this.$parent.isSortSupport();
				},
				isGroupSupport: function() {
					return WrappedArrayDataModel.prototype.$super.isGroupSupport.call(this) || this.$parent.isGroupSupport();
				},

				setFetchProperties: function(fetchProperties) {
					this.$parent.setFetchProperties(fetchProperties);
					WrappedArrayDataModel.prototype.$super.setFetchProperties.call(this, fetchProperties);
				},

				setRowIndex: function(index) {
					this.$parent.setRowIndex(index);
					WrappedArrayDataModel.prototype.$super.setRowIndex.call(this, index);
				},

				getRowCount: function() {
					// TODO Fix must call isRowAvailable before !!!!?
					var localArray = this.getWrappedData();
					if (localArray === undefined) {
						return -1;
					}

					if (localArray === DELEGATE_TO_PARENT) {
						return this.$parent.getRowCount();
					}

					return WrappedArrayDataModel.prototype.$super.getRowCount.call(this);
				},

				getRowData: function() {
					var localArray = this.getWrappedData();
					if (localArray === DELEGATE_TO_PARENT) {
						return this.$parent.getRowData();
					}

					return WrappedArrayDataModel.prototype.$super.getRowData.call(this);
				},

				isRowAvailable: function() {

					var localArray = this.getWrappedData();

					if (localArray === DELEGATE_TO_PARENT) {
						return this.$parent.isRowAvailable();
					}

					if (localArray === NO_DATA) {
						return false;
					}

					if (localArray) {
						return WrappedArrayDataModel.prototype.$super.isRowAvailable.call(this);
					}

					var self = this;

					function _arrayReady(parentArray) {

						localArray = self.processParentArray(parentArray);

						self.setWrappedData(localArray);

						return WrappedArrayDataModel.prototype.$super.isRowAvailable.call(self);
					}

					function _processArray() {
						var parentArray = self.$parent.toArray();

						if (cc.isPromise(parentArray)) {
							return parentArray.then(function(array) {
								return _arrayReady(array);
							});
						}

						if (!parentArray) {
							parentArray = [];
						}

						if (angular.isArray(parentArray)) {
							return _arrayReady(parentArray);
						}

						throw new Error("Invalid toArray return !");
					}

					var avail = this.$parent.isRowAvailable();
					if (avail === false) {
						this.setWrappedData(NO_DATA);
						return false;
					}

					if (!cc.isPromise(avail)) {
						if (this.delegateToParent()) {
							this.setWrappedData(DELEGATE_TO_PARENT);
							return true;
						}

						return _processArray();
					}

					return avail.then(function(av) {
						if (av === false) {
							self.setWrappedData(NO_DATA);
							return false;
						}

						if (self.delegateToParent()) {
							self.setWrappedData(DELEGATE_TO_PARENT);
							return true;
						}

						return _processArray();
					});
				},

				delegateToParent: function() {
					return false;
				},

				processParentArray: function(array) {
					return array;
				}
			});

			return WrappedArrayDataModel;
		} ]);

	/*
	 * ------------------------ SortedDataModel ----------------------------
	 */

	module.factory('camelia.SortedDataModel', [ 'camelia.WrappedArrayDataModel',
		'camelia.core',
		function(WrappedArrayDataModel, cc) {

			function SortedDataModel(dataModel) {
				WrappedArrayDataModel.call(this, dataModel);

				this.sortSupport = true;
			}

			cc.extend(SortedDataModel, WrappedArrayDataModel, {

				processParentArray: function(array) {

					if (!this._sorters) {
						return array;
					}

					var scope = this._dataScope.$new(true);
					try {
						angular.forEach(this._sorters, function(sorter) {

							scope.$array = array;

							var expression = sorter.expression;
							if (expression == "orderBy:" && sorter.column.$scope.fieldName) {
								expression += "'" + sorter.column.$scope.fieldName + "'";
							}

							var newArray = scope.$eval("$array | " + expression);

							if (!sorter.ascending) {
								newArray = newArray.reverse();
							}

							array = newArray;
						});

					} finally {
						scope.$destroy();
					}

					return array;
				},

				delegateToParent: function() {
					return this.$parent.isSortSupport() || !this._sorters;
				}

			});

			return SortedDataModel;
		} ]);

	/*
	 * ------------------------ FiltredDataModel ----------------------------
	 */

	module.factory('camelia.FiltredDataModel', [ 'camelia.WrappedArrayDataModel',
		'camelia.core',
		function(WrappedArrayDataModel, cc) {

			function FiltredDataModel(dataModel, rowVarName) {
				WrappedArrayDataModel.call(this, dataModel);

				this.filterSupport = true;
				this._rowVarName = rowVarName;
			}

			cc.extend(FiltredDataModel, WrappedArrayDataModel, {
				processParentArray: function(array) {

					var filters = this._filters;
					if (!filters || !filters.length) {
						return array;
					}

					var filtersLength = filters.length;
					var rowVarName = this._rowVarName;

					var newArray = [];
					var rowScope = this._dataScope.$new(true);
					var self = this;
					try {
						angular.forEach(array, function(rowData) {

							rowScope.$row = rowData;
							if (rowVarName) {
								rowScope[rowVarName] = rowData;
							}

							for (var i = 0; i < filtersLength; i++) {
								var filter = filters[i];

								if (filter(rowScope, self) === false) {
									return;
								}
							}

							newArray.push(rowData);
						});

					} finally {
						rowScope.$destroy();
					}

					return newArray;
				},

				delegateToParent: function() {
					return this.$parent.isFilterSupport() || !this._filters;
				}
			});

			return FiltredDataModel;
		} ]);

	/*
	 * ------------------------ GroupedDataModel ----------------------------
	 */

	module.factory('camelia.GroupedDataModel', [ 'camelia.WrappedArrayDataModel',
		"camelia.core",
		function(WrappedArrayDataModel, cc) {
			function GroupedDataModel(dataModel, groupProvider, rowVarName) {
				WrappedArrayDataModel.call(this, dataModel);

				this.groupSupport = true;

				this._groupProvider = groupProvider;
				this._rowVarName = rowVarName;
				this._groups = [];
				this._groupCount = [];
				this._groupValues = [];

				var self = this;
				this.$on("$destroy", function() {
					self._groupProvider = groupProvider;
					self._rowVarName = rowVarName;
					self._groups = [];
					self._groupCount = [];
					self._groupValues = [];
				});
			}

			cc.extend(GroupedDataModel, WrappedArrayDataModel, {

				getGroup: function(rowScope, rowData) {
					var expression = this._groupProvider.$scope.valueRawExpression;

					rowScope.$row = rowData;
					if (this._rowVarName) {
						rowScope[this._rowVarName] = rowData;
					}

					var value = rowScope.$eval(expression);

					return value;
				},
				getGroupCount: function(group) {
					var idx = this._groups.indexOf(group);
					if (idx < 0) {
						return -1;
					}

					return this._groupCount[idx];
				},
				getGroupValues: function(group) {
					var idx = this._groups.indexOf(group);
					if (idx < 0) {
						return -1;
					}

					return this._groupValues[idx];
				},

				processParentArray: function(array) {
					if (!this._grouped) {
						return array;
					}

					var rowScope = this._dataScope.$new(true);
					try {
						var self = this;

						var groups = this._groups;
						var groupCount = this._groupCount;
						var groupValues = this._groupValues;

						angular.forEach(array, function(rowData) {

							var group = self.getGroup(rowScope, rowData);
							var idx = groups.indexOf(group);
							if (idx < 0) {
								idx = groups.length;
								groupCount[idx] = 0;
							}

							groups[idx] = group;
							groupCount[idx]++;

							if (!groupValues[idx]) {
								groupValues[idx] = [];
							}

							groupValues[idx].push(rowData);
						});

						var sortedGroup = cc.CloneArray(groups);

						// Sort groups
						var expression = this._groupProvider.$scope.sorter;
						if (expression) {
							rowScope.$array = sortedGroup;

							sortedGroup = rowScope.$eval("$array | " + expression);
						}

						var ret = [];
						angular.forEach(sortedGroup, function(group) {
							var idx = groups.indexOf(group);

							ret = ret.concat(groupValues[idx]);
						});

						return ret;

					} finally {
						rowScope.$destroy();
					}
				},

				delegateToParent: function() {
					return this.$parent.isGroupSupport() || !this._grouped;
				}
			});

			return GroupedDataModel;
		} ]);
	/*
	 * ------------------------ ProgressDataModel ----------------------------
	 */
	module.factory('camelia.ResourceDataModel', [ '$q', 'camelia.DataModel', 'camelia.core', function($q, DataModel, cc) {

		var DEFAULT_VALUES = {
			pageSize: 20,
			offsetMod: 10,
			offsetParameter: "offset",
			countParameter: "count",
			sorterParameter: "sorter",
			filterParameter: "filter",
			actionName: "query",
			keepCache: false
		};

		var sessionId = 0;

		function ResourceDataModel($resource, configuration) {
			DataModel.call(this);

			angular.extend(this, angular.extend(DEFAULT_VALUES, configuration || {}));
			this.$resource = $resource;

			this._sessionId = 0;
			this._rowCount = -1;

			this._cache = [];

			var self = this;
			this.$on("begin", function() {
				self._sessionId = (sessionId++);
				// console.log("Start session " + self._sessionId);
			});

			this.$on("end", function() {
				// console.log("End session " + self._sessionId);
				self._sessionId = -1;

				var requestPromise = self._requestPromise;
				if (requestPromise) {
					self._requestPromise = undefined;
					requestPromise.cancel();
				}
			});

			this.$on("clearState", function() {
				// debugger;
				self._cache = [];
				self._rowCount = -1;
			});
		}

		cc.extend(ResourceDataModel, DataModel, {

			isRowAvailable: function() {
				this.needRowAvailable = false;
				var rowIndex = this.getRowIndex();

				var cache = this._cache;
				if (cache[rowIndex] !== undefined) {
					// console.log("Ask for #" + rowIndex + " => in cache !");
					return true;
				}

				if (this._rowCount >= 0 && rowIndex >= this._rowCount) {
					// console.log("Ask for #" + rowIndex + " => outside of rowCount");
					return false;
				}

				this.sortSupport = false;
				this.filterSupport = false;

				var deferred = $q.defer();

				var fetchProperties = this._fetchProperties;

				var offset = rowIndex;
				var fetchRows = (fetchProperties && fetchProperties.rows) || 0;
				var rows = Math.max(fetchRows, this.pageSize);

				if (this.offsetMod > 0) {
					offset -= (offset % this.offsetMod);

					var last = (rowIndex + rows - 1);
					last -= (last % this.offsetMod);

					rows = (Math.floor((last - offset) / this.pageSize) + 1) * this.pageSize;

					// console.log("rowIndex=" + rowIndex + " offset=" + offset + " last="
					// + last + " rows=" + rows + " pageSize="+ this.pageSize);
				}

				if (this._keepCache === false) {
					cache = [];
					this._cache = cache;

				} else {
					for (var i = offset + rows - 1; i > offset; i--) {
						if (cache[i] === undefined) {
							break;
						}
						rows--;
					}
				}

				var currentSessionId = this._sessionId;

				var actionName = this.actionName;

				var params = {};
				params[this.offsetParameter] = offset;
				params[this.countParameter] = rows;

				if (this._sorters && this.sorterParameter) {
					var ss = [];
					params[this.sorterParameter] = ss;

					angular.forEach(this._sorters, function(sorter) {
						var expression = sorter.expression || sorter.column.$scope.fieldName || sorter.column.$scope.id;

						if (!sorter.ascending) {
							expression += ":desc";
						}

						ss.push(expression);
					});

					this.sortSupport = true;
				}

				var filters = this._filters;
				if (filters && this.filterParameter) {
					var ps = [];
					params[this.filterParameter] = ps;

					angular.forEach(filters, function(filter) {
						if (!filter.toJson) {
							return;
						}

						var parameters = filter.toJson();
						if (parameters) {
							ps.push(parameters);
						}

					});

					this.filterSupport = true;
				}

				if (this._rowCount < 0 && this.requestRowCountParameter) {
					params[this.requestRowCountParameter] = true;
				}

				var requestPromise = this._requestPromise;
				if (requestPromise) {
					this._requestPromise = undefined;
					requestPromise.cancel();
				}

				var self = this;
				var ret = this.$resource[actionName].call(this.$resource, params, function(response, responseHeaders) {
					self._requestPromise = undefined;
					if (self._sessionId != currentSessionId) {
						return deferred.reject("Session canceled");
					}
					deferred.notify({
						type: DataModel.DATA_LOADED
					});

					for (var i = 0; i < response.length; i++) {
						cache[i + offset] = response[i];

						// console.log("Reg#" + (i + offset) + " => " + response[i]);
					}
					if (response.length < rows) {
						if (response.length || !offset) {
							self._rowCount = offset + response.length;
						}
					}

					// console.log("Ask for #" + rowIndex + " => Deferred " +
					// cache[rowIndex]);

					deferred.resolve(cache[rowIndex] !== undefined);

				}, function(error) {
					return deferred.reject("Query error: " + error);
				});

				this._requestPromise = ret.$promise;

				this._requestPromise.then(null, null, function() {
					if (self._sessionId != currentSessionId) {
						return;
					}

					console.log("progress ...");

					deferred.notify({
						type: DataModel.DATA_LOADING
					});
				});

				// console.log("Ask for #" + rowIndex + " => Returns promise");

				return deferred.promise;
			},

			setRowIndex: function(index) {
				// console.log("Set rowIndex=" + index);
				ResourceDataModel.prototype.$super.setRowIndex.call(this, index);
				this.needRowAvailable = true;
			},
			getRowData: function() {
				if (this.needRowAvailable) {
					debugger;
				}

				var rowIndex = this.getRowIndex();

				var ret = this._cache[rowIndex];

				// console.log("#" + rowIndex + " => " + ret + " " + typeof (rowIndex));

				if (ret === undefined) {
					debugger;
				}

				return ret;
			},
			getRowCount: function(force) {
				return this._rowCount;
			},
			setSorters: function(sorters) {
				ResourceDataModel.prototype.$super.setSorters.call(this, sorters);
				this._cache = [];
				this._rowCount = -1;
			},
			setFilters: function(filters) {
				ResourceDataModel.prototype.$super.setFilters.call(this, filters);
				this._cache = [];
				this._rowCount = -1;
			},
			setGrouped: function(grouped) {
				ResourceDataModel.prototype.$super.setGrouped.call(this, grouped);
				this._cache = [];
				this._rowCount = -1;
			}

		});

		return ResourceDataModel;
	} ]);

})(window, window.angular);
/**
 * @product CameliaJS (c) 2014 Vedana http://www.vedana.com
 * @license Creative Commons - The licensor permits others to copy, distribute, display, and perform the work. In return, licenses may not use the work for commercial purposes -- unless they get the licensor's permission.
 * @author olivier.oeuillot@vedana.com
 */

(function(window, angular, undefined) {
	'use strict';

	var module = angular.module('camelia.key', []);
	
	module.factory('camelia.Key', [ function() {

		return {

			/** @field public static final Number */
			VK_CANCEL: 0x03,

			/** @field public static final Number */
			VK_HELP: 0x06,

			/** @field public static final Number */
			VK_BACK_SPACE: 0x08,

			/** @field public static final Number */
			VK_TAB: 0x09,

			/** @field public static final Number */
			VK_CLEAR: 0x0C,

			/** @field public static final Number */
			VK_RETURN: 0x0D,

			/** @field public static final Number */
			VK_ENTER: 0x0E,

			/** @field public static final Number */
			VK_SHIFT: 0x10,

			/** @field public static final Number */
			VK_CONTROL: 0x11,
			/** @field public static final Number */
			VK_ALT: 0x12,
			/** @field public static final Number */
			VK_PAUSE: 0x13,
			/** @field public static final Number */
			VK_CAPS_LOCK: 0x14,
			/** @field public static final Number */
			VK_ESCAPE: 0x1B,
			/** @field public static final Number */
			VK_SPACE: 0x20,
			/** @field public static final Number */
			VK_PAGE_UP: 0x21,
			/** @field public static final Number */
			VK_PAGE_DOWN: 0x22,
			/** @field public static final Number */
			VK_END: 0x23,
			/** @field public static final Number */
			VK_HOME: 0x24,
			/** @field public static final Number */
			VK_LEFT: 0x25,
			/** @field public static final Number */
			VK_UP: 0x26,
			/** @field public static final Number */
			VK_RIGHT: 0x27,
			/** @field public static final Number */
			VK_DOWN: 0x28,
			/** @field public static final Number */
			VK_PRINTSCREEN: 0x2C,
			/** @field public static final Number */
			VK_INSERT: 0x2D,
			/** @field public static final Number */
			VK_DELETE: 0x2E,

			/** @field public static final Number */
			VK_SEMICOLON: 0x3B,
			/** @field public static final Number */
			VK_EQUALS: 0x3D,
			/** @field public static final Number */
			VK_CONTEXTMENU: 0x5D,
			/** @field public static final Number */
			VK_NUMPAD0: 0x60,
			/** @field public static final Number */
			VK_NUMPAD1: 0x61,
			/** @field public static final Number */
			VK_NUMPAD2: 0x62,
			/** @field public static final Number */
			VK_NUMPAD3: 0x63,
			/** @field public static final Number */
			VK_NUMPAD4: 0x64,
			/** @field public static final Number */
			VK_NUMPAD5: 0x65,
			/** @field public static final Number */
			VK_NUMPAD6: 0x66,
			/** @field public static final Number */
			VK_NUMPAD7: 0x67,
			/** @field public static final Number */
			VK_NUMPAD8: 0x68,
			/** @field public static final Number */
			VK_NUMPAD9: 0x69,
			/** @field public static final Number */
			VK_MULTIPLY: 0x6A,
			/** @field public static final Number */
			VK_ADD: 0x6B,
			/** @field public static final Number */
			VK_SEPARATOR: 0x6C,
			/** @field public static final Number */
			VK_SUBTRACT: 0x6D,
			/** @field public static final Number */
			VK_DECIMAL: 0x6E,
			/** @field public static final Number */
			VK_DIVIDE: 0x6F,
			/** @field public static final Number */
			VK_F1: 0x70,
			/** @field public static final Number */
			VK_F2: 0x71,
			/** @field public static final Number */
			VK_F3: 0x72,
			/** @field public static final Number */
			VK_F4: 0x73,
			/** @field public static final Number */
			VK_F5: 0x74,
			/** @field public static final Number */
			VK_F6: 0x75,
			/** @field public static final Number */
			VK_F7: 0x76,
			/** @field public static final Number */
			VK_F8: 0x77,
			/** @field public static final Number */
			VK_F9: 0x78,
			/** @field public static final Number */
			VK_F10: 0x79,
			/** @field public static final Number */
			VK_F11: 0x7A,
			/** @field public static final Number */
			VK_F12: 0x7B,

			/** @field public static final Number */
			VK_NUM_LOCK: 0x90,
			/** @field public static final Number */
			VK_SCROLL_LOCK: 0x91,

			/** @field public static final Number */
			VK_COMMA: 0xBC,
			/** @field public static final Number */
			VK_PERIOD: 0xBE,
			/** @field public static final Number */
			VK_SLASH: 0xBF,
			/** @field public static final Number */
			VK_BACK_QUOTE: 0xC0,
			/** @field public static final Number */
			VK_OPEN_BRACKET: 0xDB,
			/** @field public static final Number */
			VK_BACK_SLASH: 0xDC,
			/** @field public static final Number */
			VK_CLOSE_BRACKET: 0xDD,
			/** @field public static final Number */
			VK_QUOTE: 0xDE,

			/** @field public static final Number */
			KF_SHIFT: 0x01,

			/** @field public static final Number */
			KF_CONTROL: 0x02,

			/** @field public static final Number */
			KF_ALT: 0x04,

			/** @field public static final Number */
			KF_META: 0x08

		};

	} ]);

})(window, window.angular);
/**
 * @product CameliaJS (c) 2014 Vedana http://www.vedana.com
 * @license Creative Commons - The licensor permits others to copy, distribute,
 *          display, and perform the work. In return, licenses may not use the
 *          work for commercial purposes -- unless they get the licensor's
 *          permission.
 * @author olivier.oeuillot@vedana.com
 */

(function(window, angular, undefined) {
	'use strict';

	var module = angular.module("camelia.pagerRegistry", [ "camelia.core" ]);

	module.factory("camelia.PagerRegistry", [ "$log", "$q", "camelia.core", function($log, $q, cc) {

		var doc = angular.element(document);
		var controller = doc.controller("cmPagerRegistry");

		if (!controller) {
			controller = {
				promisesByTargetId: {}
			};

			doc.data('$cmPagerRegistryController', controller);
		}

		var promisesByTargetId = controller.promisesByTargetId;

		var PagerRegistry = {
			TARGET_DECLARED: "cm:targetDeclared",

			RegisterWaitingFor: function($pagerScope, targetId) {

				var pagerDeferredList = promisesByTargetId[targetId];
				if (pagerDeferredList === true) {
					return $q.when(target);
				}

				if (!pagerDeferredList) {
					pagerDeferredList = [];
					promisesByTargetId[targetId] = pagerDeferredList;
				}

				var deferred = $q.defer();
				pagerDeferredList.push(deferred);

				var off = $pagerScope.$on("$destroy", function() {
					var idx = pagerDeferredList.indexOf(deferred);
					if (idx < 0) {
						off();
						return;
					}

					pagerDeferredList.splice(idx, 1);

					deferred.reject("Pager destroyed");

					off();
				});

				return deferred.promise;
			},

			DeclareTarget: function(target) {
				if (target[0]) {
					target = target[0];
				}

				var targetId = target.id;

				var ts = promisesByTargetId[targetId];
				promisesByTargetId[targetId] = true;
				if (!ts) {
					return;
				}

				angular.forEach(ts, function(deferred) {
					deferred.resolve(target);
				});
			}
		};

		return PagerRegistry;
	} ]);

})(window, window.angular);
/**
 * @product CameliaJS (c) 2014 Vedana http://www.vedana.com
 * @license Creative Commons - The licensor permits others to copy, distribute,
 *          display, and perform the work. In return, licenses may not use the
 *          work for commercial purposes -- unless they get the licensor's
 *          permission.
 * @author olivier.oeuillot@vedana.com
 */

(function(window, angular, undefined) {
	'use strict';

	var module = angular.module('camelia.selectionProvider', [ "camelia.core" ]);

	module.factory('camelia.SelectionProvider', [ "$rootScope",
		"$injector",
		"camelia.core",
		function($rootScope, $injector, cc) {

			var scopeProto = cc.getProto($rootScope);

			/*
			 * ------------------------ SelectionProvider --------------------------
			 */

			function SelectionProvider($parentScope) {
				cc.inheritScope(this, $parentScope);
			}

			SelectionProvider.SELECTION_CHANGING_EVENT = "cm:selectionChanging";
			SelectionProvider.SELECTION_CHANGED_EVENT = "cm:selectionChanged";
			SelectionProvider.SELECTION_SET_EVENT = "cm:selectionSet";

			SelectionProvider.From = function(parameter, $parentScope) {
				var ArraySelectionProvider = $injector.invoke([ "camelia.ArraySelectionProvider",
					function(ArraySelectionProvider) {
						return ArraySelectionProvider;
					} ]);

				if (parameter === undefined) {
					return new ArraySelectionProvider($parentScope, []);
				}

				if (angular.isArray(parameter)) {
					return new ArraySelectionProvider($parentScope, parameter);
				}

				return new ArraySelectionProvider($parentScope, [ parameter ]);
			};

			cc.extendProto(SelectionProvider, scopeProto, {

				_lock: false,

				/**
				 * Returns the selected items
				 * 
				 * @returns {Array | Promise} Returns a list or a Promise
				 */
				get: function() {
					return null;
				},

				/**
				 * Returns the first element
				 * 
				 * @returns {Object} Returns the first Element
				 */
				getFirstElement: function() {
					return null;
				},
				/**
				 * Changes the selection to an item or an array of items.
				 */
				set: function(array) {
					if (array !== undefined && !angular.isArray(array)) {
						array = arguments;
					}
					if (!this._lock) {
						var self = this;
						return this.run(function() {
							return self._processSet(array);
						});
					}

					return this._processSet(array);
				},
				_processSet: function(array) {
					return -1;
				},
				/**
				 * Add an item or an array of items.
				 */
				add: function(array) {
					if (!angular.isArray(array)) {
						array = arguments;
					}
					if (!this._lock) {
						var self = this;
						return this.run(function() {
							return self._processAdd(array);
						});
					}
					return this._processAdd(array);
				},
				_processAdd: function(array) {
					return -1;
				},
				/**
				 * Removes an item or an array of items.
				 */
				remove: function(array) {
					if (!angular.isArray(array)) {
						array = arguments;
					}
					if (!this._lock) {
						var self = this;
						return this.run(function() {
							return self._processRemove(array);
						});
					}
					return this._processRemove(array);
				},
				_processRemove: function(array) {
					return -1;
				},
				/**
				 * Clear the selection
				 */
				clear: function() {
					if (!this._lock) {
						var self = this;
						return this.run(function() {
							return self._processClear();
						});
					}
					return this._processClear();
				},
				_processClear: function() {
					return -1;
				},
				run: function(func) {
					var lock = this._lock;

					if (!lock) {
						this._lock = true;
						this._startLock();
					}

					var ret;
					try {
						ret = func();

					} finally {
						if (!lock) {
							this._lock = lock;
							this._endLock();
						}
					}

					return ret;
				},

				_startLock: function() {
					this.$broadcast("cm:startLock");
				},

				_endLock: function() {
					this.$broadcast("cm:endLock");
				},
				contains: function(obj) {
					return false;
				},
				containsAll: function(obj) {
					return false;
				},
				count: function() {
					return -1;
				}

			});

			return SelectionProvider;
		} ]);

	/*
	 * ------------------------ ArraySelectionProvider --------------------
	 */

	module.factory('camelia.ArraySelectionProvider', [ "camelia.core",
		"camelia.SelectionProvider",
		function(cc, SelectionProvider) {

			/**
			 * SelectionProvider for an array of objects
			 */

			function ArraySelectionProvider($parentScope, array) {
				SelectionProvider.prototype.constructor.call(this, $parentScope);

				this._array = array;
			}

			function mergeList(addList1, addList2, removeList1, removeList2, list) {
				if (!list || !list.length) {
					return;
				}
				angular.forEach(list, function(item) {
					if (removeList2) {
						var pos2 = removeList2.indexOf(item);
						if (pos2 >= 0) {
							removeList2.splice(pos2, 1);
						}
					}
					if (removeList1) {
						var pos = removeList1.indexOf(item);
						if (pos >= 0) {
							removeList1.splice(pos, 1);
							return;
						}
					}
					if (addList1 && addList1.indexOf(item) < 0) {
						addList1.push(item);

						if (addList2 && addList2.indexOf(item) < 0) {
							addList2.push(item);
						}
					}
				});
			}

			ArraySelectionProvider.prototype = Object.create(SelectionProvider.prototype);
			angular.extend(ArraySelectionProvider.prototype, {
				constructor: ArraySelectionProvider,

				_array: [],

				get: function() {
					return this._array;
				},
				getFirstElement: function() {
					var array = this.get();
					if (!array || !array.length) {
						return undefined;
					}

					return array[0];
				},
				_processList: function(fct) {

					var current = this._array;
					if (!current) {
						current = [];
						this._array = current;
					}

					if (!this._targetArray) {
						this._targetArray = (this._array) ? cc.CloneArray(this._array) : [];
						this._added = [];
						this._removed = [];
					}

					var addedLength = this._added.length;
					var removedLength = this._removed.length;

					fct.call(this);

					return (this._added.length - addedLength) + (removedLength - this._removed.length);
				},
				_processSet: function(newArray) {
					if (newArray === this._array) {
						return 0;
					}

					return this._processList(function() {
						// Add old entries to REMOVED
						// Remove old entries to ADDED
						mergeList(this._removed, null, this._added, null, this._targetArray);

						if (!newArray || !newArray.length) {
							// Clear selection
							this._targetArray = [];
							return;
						}

						this._targetArray = cc.CloneArray(newArray);

						mergeList(this._added, null, this._removed, null, this._targetArray);
					});
				},
				_processAdd: function(addedList) {
					return this._processList(function() {
						mergeList(this._added, this._targetArray, this._removed, null, addedList);
					});
				},
				_processRemove: function(removedList) {
					return this._processList(function() {
						mergeList(this._removed, null, this._added, this._targetArray, removedList);
					});
				},
				_processClear: function() {
					return this._processList(function() {
						this._removed = cc.CloneArray(this._array);
						this._added = [];
						this._targetArray = [];
					});
				},
				contains: function(obj) {
					var array = this._array;
					if (!array) {
						return false;
					}
					return array.indexOf(obj) >= 0;
				},
				containsAll: function(obj) {
					if (!angular.isArray(obj)) {
						if (angular.isObject(obj)) {
							return this.contains(obj);
						}

						throw new Error("Invalid paramater for containsAll(<array>) method");
					}
					var array = this._array;
					if (!array) {
						return false;
					}

					for (var i = 0; i < obj.length; i++) {
						if (array.indexOf(obj[i]) < 0) {
							return false;
						}
					}

					return true;
				},
				count: function() {
					if (!this._array) {
						return 0;
					}
					return this._array.length;
				},
				_endLock: function() {
					SelectionProvider.prototype._endLock.call(this);

					var oldSelection = this._array || [];

					var newSelection = this._targetArray || [];
					this._targetArray = undefined;

					var added = this._added || [];
					this._added = undefined;

					var removed = this._removed || [];
					this._removed = undefined;

					var clearAll = !!this._clearAll;
					this._clearAll = undefined;

					if (!added.length && !removed.length && !clearAll) {
						return;
					}

					var arg = {
						oldSelection: oldSelection,
						newSelection: newSelection,
						added: added,
						removed: removed,
						clearAll: clearAll
					};

					var event = this.$emit(SelectionProvider.SELECTION_CHANGING_EVENT, arg);
					if (event.defaultPrevented) {
						return;
					}

					this._array = newSelection.slice();

					this.$emit(SelectionProvider.SELECTION_SET_EVENT, arg);

					this.$emit(SelectionProvider.SELECTION_CHANGED_EVENT, arg);
				}
			});

			return ArraySelectionProvider;
		} ]);

})(window, window.angular);
/**
 * @product CameliaJS (c) 2014 Vedana http://www.vedana.com
 * @license Creative Commons - The licensor permits others to copy, distribute,
 *          display, and perform the work. In return, licenses may not use the
 *          work for commercial purposes -- unless they get the licensor's
 *          permission.
 * @author olivier.oeuillot@vedana.com
 */

(function(window, angular, undefined) {
	'use strict';

	var module = angular.module('camelia.selectionStrategy', [ "camelia.core" ]);

	module.factory('camelia.SelectionStrategy', [ "$rootScope",
		"$injector",
		"camelia.core",
		function($rootScope, $injector, cc) {

			var scopeProto = cc.getProto($rootScope);

			function SelectionStrategy($parentScope, cardinality) {
				cc.inheritScope(this, $parentScope);

				this._cardinality = SelectionStrategy._GetCardinality(cardinality);
			}

			SelectionStrategy.BASE_CHANGED_EVENT = "cm:baseChanged";

			SelectionStrategy.OPTIONAL = "optional";
			SelectionStrategy.ZEROMANY = "zeroMany";
			SelectionStrategy.ONE = "one";
			SelectionStrategy.ONEMANY = "oneMany";

			SelectionStrategy._GetCardinality = function(type) {
				switch (type.toLowerCase()) {
				case "optional":
				case "?":
					return 0;

				case "zeromany":
				case "*":
					return 2;

				case "one":
				case "1":
					return 1;

				case "onemany":
				case "+":
					return 3;
				}

				throw new Error("Invalid '" + type + "' cardinality");
			};

			SelectionStrategy.CreateDefault = function($parentScope, cardinality) {
				return $injector.invoke([ "camelia.WinSelectionStrategy", function(WinSelectionStrategy) {
					return new WinSelectionStrategy($parentScope, cardinality);
				} ]);
			};

			cc.extendProto(SelectionStrategy, scopeProto, {
				getBase: function() {
					return null;
				},

				select: function(selectionProvider, rowValues, cursorValue, event, computeRangeFunc, byKeyPress, activate) {
					return null;
				}
			});

			return SelectionStrategy;
		} ]);

	/*
	 * ------------------------ WinSelectionStrategy --------------------------
	 */

	module.factory('camelia.WinSelectionStrategy', [ "camelia.SelectionStrategy",
		'camelia.core',
		function(SelectionStrategy, cc) {

			var WinSelectionStrategy = function($parentScope, cardinality) {
				SelectionStrategy.prototype.constructor.call(this, $parentScope, cardinality);
			};

			cc.extend(WinSelectionStrategy, SelectionStrategy, {

				getBase: function() {
					return this._base;
				},

				select: function(selectionProvider, rowValues, cursorValue, event, computeRangeFunc, activate) {

					var byKeyPress = (event && event.type && !event.type.indexOf("key"));

					if (byKeyPress && event.ctrlKey && !activate) {
						return;
					}

					if (this._cardinality == 0x01) {
						this._base = cursorValue;
						this.$emit(SelectionStrategy.BASE_CHANGED_EVENT, cursorValue);

						selectionProvider.set(rowValues);
						return;
					}

					if (event && event.shiftKey) {
						var range = computeRangeFunc(this.getBase());
						if (range) {
							if (event.ctrlKey) {
								selectionProvider.add(range);
								return;
							}

							selectionProvider.set(range);
							return;
						}
					}

					if (event && event.ctrlKey) {
						var count = selectionProvider.count();
						if (selectionProvider.containsAll(rowValues)) {
							if (this._cardinality == 0x03 && count < 2) {
								return;
							}
							selectionProvider.remove(rowValues);
							return;
						}

						if (this._cardinality) {
							selectionProvider.add(rowValues);

							//this._base = cursorValue;
							//this.$emit(SelectionStrategy.BASE_CHANGED_EVENT, cursorValue);
							return;
						}
					}

					this._base = cursorValue;
					this.$emit(SelectionStrategy.BASE_CHANGED_EVENT, cursorValue);

					selectionProvider.set(rowValues);
				}
			});

			return WinSelectionStrategy;
		} ]);

})(window, window.angular);
/**
 * @product CameliaJS (c) 2014 Vedana http://www.vedana.com
 * @license Creative Commons - The licensor permits others to copy, distribute, display, and perform the work. In return, licenses may not use the work for commercial purposes -- unless they get the licensor's permission.
 * @author olivier.oeuillot@vedana.com
 */

(function(window, angular, undefined) {
	'use strict';

	var module = angular.module("camelia.criteria", [ "camelia.i18n.criteria" ]);

	var anonymousId = 0;

	module.factory("camelia.criteria.Criteria", [ "$log", function($log) {

		var Criteria = function($scope, element, attrs) {
			var id = $scope.id;
			if (!id) {
				id = "cm_criteria_" + (anonymousId++);
			}
			this.id = id;

			this.name = attrs.name;
		};

		Criteria.prototype = {
			contributeFilters: function(dataModel) {
				return [];
			},
			filterData: function(enabledFilters, value, rowScope, dataModel, column) {
				return false;
			}
		};

		return Criteria;
	} ]);

})(window, window.angular);
/**
 * @product CameliaJS (c) 2014 Vedana http://www.vedana.com
 * @license Creative Commons - The licensor permits others to copy, distribute,
 *          display, and perform the work. In return, licenses may not use the
 *          work for commercial purposes -- unless they get the licensor's
 *          permission.
 * @author olivier.oeuillot@vedana.com
 */

(function(window, angular, undefined) {
	'use strict';

	var module = angular.module("camelia.criteria");

	module.factory("camelia.criteria.Alphabetic", [ "$log",
		"camelia.core",
		"camelia.criteria.Criteria",
		"camelia.i18n.Criteria",
		function($log, cc, Criteria, i18n) {

			var AlphabeticCriteria = function(scope, element, attrs) {
				Criteria.call(this, scope, element, attrs);

				this.type = "Alphabetic";
			};

			cc.extend(AlphabeticCriteria, Criteria, {
				contributeFilters: function(dataModel) {
					var c = [];

					var cnt = 0;
					angular.forEach([ "A-D", "E-K", "L-P", "Q-Z", "0-9" ], function(entry) {
						var regExp = new RegExp("^[" + entry + "]", "i");
						c.push({
							name: entry,
							regExp: regExp,
							id: "alphabetic_" + entry,
							toJson: function() {
								return {
									startsWith: entry
								};
							}
						});
					});

					var regExp = new RegExp("^[^A-Z0-9]", "i");
					c.push({
						name: cc.lang(i18n, 'alphabetic_others'),
						regExp: regExp,
						id: "alphabetic_OTHERS",
						toJson: function() {
							return {
								others: true
							};
						}
					});

					return c;
				},
				filterData: function(filterContexts, value, rowScope, dataModel, column) {
					var f = false;

					if (typeof (value) != "string") {
						return f;
					}

					for (var i = 0; i < filterContexts.length; i++) {
						var filterContext = filterContexts[i];
						if (!filterContext.enabled) {
							continue;
						}

						if (filterContext.regExp.test(value)) {
							return !f;
						}
					}

					return f;
				}
			});

			return AlphabeticCriteria;
		} ]);

})(window, window.angular);
/**
 * @product CameliaJS (c) 2014 Vedana http://www.vedana.com
 * @license Creative Commons - The licensor permits others to copy, distribute,
 *          display, and perform the work. In return, licenses may not use the
 *          work for commercial purposes -- unless they get the licensor's
 *          permission.
 * @author olivier.oeuillot@vedana.com
 */

(function(window, angular, undefined) {
	'use strict';

	var module = angular.module("camelia.criteria");

	module.factory("camelia.criteria.MinMax", [ "$log",
		"camelia.criteria.Criteria",
		"camelia.core",
		function($log, Criteria, cc) {

			var MinMax = function(scope, element, attrs) {
				Criteria.call(this, scope, element, attrs);

				this.type = "MinMax";

				if (!attrs.min && attrs.value) {
					attrs.min = attrs.value;
				}

				var self = this;
				function processNumber(name) {
					var v = attrs[name];
					if (!angular.isString(v)) {
						return;
					}

					if (v.charAt(0) == '=') {
						v = v.substring(1);
						self["_" + name + "Eq"] = true;
					}

					self["_" + name] = parseFloat(v);
				}

				processNumber("min");
				processNumber("max");

				this._false = (attrs.reverse == "true");
			};

			cc.extend(MinMax, Criteria, {
				contributeFilters: function(container) {
					var self = this;
					return [ {
						name: this.name,
						toJson: function() {
							return {
								min: self._min,
								minEq: self._minEq,
								max: self._max,
								maxEq: self._maxEq,
								reverse: self._false
							};
						}
					} ];
				},
				filterData: function(enabledFilters, value, rowScope, dataModel, column) {
					var f = this._false;

					if (!angular.isNumber(value)) {
						return f;
					}

					var min = this._min;
					if (min !== undefined && ((!this._minEq && value <= min) || (value < min))) {
						return f;
					}

					var max = this._max;
					if (max !== undefined && ((!this._maxEq && value >= max) || (value > max))) {
						return f;
					}

					return !f;
				}
			});

			return MinMax;
		} ]);

})(window, window.angular);
/**
 * @product CameliaJS (c) 2014 Vedana http://www.vedana.com
 * @license Creative Commons - The licensor permits others to copy, distribute,
 *          display, and perform the work. In return, licenses may not use the
 *          work for commercial purposes -- unless they get the licensor's
 *          permission.
 * @author olivier.oeuillot@vedana.com
 */

(function(window, angular, undefined) {
	'use strict';

	var module = angular.module("camelia.criteria");

	module.factory("camelia.criteria.Number", [ "$log",
		"camelia.criteria.Criteria",
		"camelia.core",
		function($log, Criteria, cc) {

			var NumberCriteria = function(scope, element, attrs) {
				Criteria.call(this, scope, element, attrs);

				this.type = "Number";

				var value = attrs.value;
				if (!value) {
					throw new Error("You must specify value attribute");
				}

				if (attrs.integer == "true") {
					this._integer = true;
					value = parseInt(value, 10);

				} else {
					value = parseFloat(value);
				}
				this._value = value;

				this._false = (attrs.reverse == "true");
			};

			cc.extend(NumberCriteria, Criteria, {

				contributeFilters: function(container) {
					var self = this;
					return [ {
						name: this.name,
						toJson: function() {
							return {
								value: self._value,
								reverse: self._false
							};
						}
					} ];
				},
				filterData: function(enabledFilters, value, rowScope, dataModel, column) {
					var f = this._false;

					if (!angular.isNumber(value)) {
						return f;
					}

					if (this._integer) {
						value = Math.floor(value);
					}

					if (this._value === value) {
						return !f;
					}

					return f;
				}
			});

			return NumberCriteria;
		} ]);

})(window, window.angular);
/**
 * @product CameliaJS (c) 2014 Vedana http://www.vedana.com
 * @license Creative Commons - The licensor permits others to copy, distribute,
 *          display, and perform the work. In return, licenses may not use the
 *          work for commercial purposes -- unless they get the licensor's
 *          permission.
 * @author olivier.oeuillot@vedana.com
 */

(function(window, angular, undefined) {
	'use strict';

	var module = angular.module("camelia.criteria");

	module.factory("camelia.criteria.RegExp", [ "$log",
		"camelia.criteria.Criteria",
		"camelia.core",
		function($log, Criteria, cc) {

			var RegExpCriteria = function(scope, element, attrs) {
				Criteria.call(this, scope, element, attrs);

				this.type = "RegExp";

				var value = attrs.value;
				if (!value) {
					throw new Error("You must specify value attribute");
				}

				var modifiers = attrs.modifiers || "";
				if (attrs.ignoreCase == "true") {
					modifiers += "i";
				}
				if (attrs.global == "true") {
					modifiers += "g";
				}

				this._false = (attrs.reverse == "true");

				this._regexp = new RegExp(value, modifiers);
			};

			cc.extend(RegExpCriteria, Criteria, {
				contributeFilters: function(container) {
					var self = this;
					return [ {
						name: this.name,
						toJson: function() {
							return {
								regExp: self._regExp,
								reverse: self._false
							};
						}
					} ];
				},
				filterData: function(enabledFilters, value, rowScope, dataModel, column) {
					var f = this._false;

					if (typeof (value) != "string") {
						return f;
					}

					var regexp = this._regexp;
					if (regexp.test(value)) {
						return !f;
					}

					return f;
				}
			});

			return RegExpCriteria;
		} ]);

})(window, window.angular);
/**
 * @product CameliaJS (c) 2014 Vedana http://www.vedana.com
 * @license Creative Commons - The licensor permits others to copy, distribute,
 *          display, and perform the work. In return, licenses may not use the
 *          work for commercial purposes -- unless they get the licensor's
 *          permission.
 * @author olivier.oeuillot@vedana.com
 */

(function(window, angular, undefined) {
	'use strict';

	var module = angular.module("camelia.criteria");

	module.factory("camelia.criteria.StartsWith", [ "$log",
		"camelia.criteria.Criteria",
		"camelia.core",
		function($log, Criteria, cc) {

			var StartsWith = function(scope, element, attrs) {
				Criteria.call(this, scope, element, attrs);

				this.type = "StartsWidth";

				var value = attrs.value;
				if (!value) {
					throw new Error("You must specify value attribute");
				}

				var modifiers = "";
				if (attrs.ignoreCase == "true") {
					modifiers += "i";
					this._ignoreCase = true;
				}

				this._value = value;
				this._regExp = new RegExp("^[" + value + "]", modifiers);

				this._false = (attrs.reverse == "true");
			};

			cc.extend(StartsWith, Criteria, {
				contributeFilters: function(container) {
					var self = this;
					return [ {
						name: this.name,
						toJson: function() {
							return {
								startsWidth: self._value,
								ignoreCase: !!self._ignoreCase,
								reverse: self._false
							};
						}
					} ];
				},
				filterData: function(enabledFilters, value, rowScope, dataModel, column) {
					var f = this._false;

					var regExp = this._regExp;
					if (rexExp.test(value)) {
						return !f;
					}

					return f;
				}
			});

			return StartsWith;
		} ]);

})(window, window.angular);
/**
 * @product CameliaJS (c) 2014 Vedana http://www.vedana.com
 * @license Creative Commons - The licensor permits others to copy, distribute,
 *          display, and perform the work. In return, licenses may not use the
 *          work for commercial purposes -- unless they get the licensor's
 *          permission.
 * @author olivier.oeuillot@vedana.com
 */

(function(window, angular, undefined) {
	'use strict';

	var module = angular.module("camelia.criteria");

	module.factory("camelia.criteria.Type", [ "$log",
		"camelia.criteria.Criteria",
		"camelia.core",
		function($log, Criteria, cc) {

			var Type = function(scope, element, attrs) {
				Criteria.call(this, scope, element, attrs);

				this.type = "Type";

				var value = attrs.value;
				if (!value) {
					throw new Error("You must specify value attribute");
				}

				this._value = value;

				this._false = (attrs.reverse == "true");
			};

			cc.extend(Type, Criteria, {
				contributeFilters: function(container) {
					var self = this;
					return [ {
						name: this.name,
						toJson: function() {
							return {
								type: self._value,
								reverse: self._false
							};
						}
					} ];
				},
				filterData: function(enabledFilters, value, rowScope, dataModel, column) {
					var f = this._false;

					if (typeof (value) == this._value) {
						return !f;
					}

					return f;
				}
			});

			return Type;
		} ]);

})(window, window.angular);
/**
 * @product CameliaJS (c) 2014 Vedana http://www.vedana.com
 * @license Creative Commons - The licensor permits others to copy, distribute,
 *          display, and perform the work. In return, licenses may not use the
 *          work for commercial purposes -- unless they get the licensor's
 *          permission.
 * @author olivier.oeuillot@vedana.com
 */

(function(window, angular, undefined) {
	'use strict';

	var module = angular.module("camelia.components.grid", [ "camelia.core",
		"camelia.dataModel",
		"camelia.cursorProvider",
		"camelia.selectionProvider",
		"camelia.selectionStrategy",
		"camelia.pagerRegistry" ]);

	module.value("cm_grid_rendererProviderName", "camelia.renderers.grid:camelia.renderers.GridProvider");
	module.value("cm_grid_dataModelProviderName", "");

	var anonymousId = 0;

	var digesterPhase = false;

	module.factory("camelia.components.DataGrid", [ "$log",
		"$injector",
		"$interpolate",
		"$q",
		"$timeout",
		"$rootScope",
		"camelia.core",
		"camelia.SelectionStrategy",
		"camelia.SelectionProvider",
		"camelia.CursorProvider",
		"cm_grid_dataModelProviderName",
		"cm_grid_rendererProviderName",
		"camelia.PagerRegistry",
		"camelia.DataModel",
		function($log, $injector, $interpolate, $q, $timeout, $rootScope, cc, SelectionStrategy, SelectionProvider,
				CursorProvider, cm_dataGrid_dataModelProviderName, cm_dataGrid_rendererProviderName, PagerRegistry, DataModel) {

			/*
			 * ------------------------ DataGrid --------------------------
			 */

			var DataGrid = function($scope, element, directiveInterpolate) {
				this.$scope = $scope;
				this.directiveInterpolate = directiveInterpolate || $interpolate;

				var id = $scope.id;
				if (!id) {
					id = "cm_grid_" + (anonymousId++);
				}
				this.id = id;
				this.readyState = "uninitialized";

				var rendererProvider = $scope.rendererProvider;
				if (!rendererProvider) {
					var rendererProviderName = $scope.rendererProviderName || cm_dataGrid_rendererProviderName;
					rendererProvider = cc.LoadProvider(rendererProviderName);
				}
				this.rendererProvider = rendererProvider;

				var dataModelProvider = $scope.dataModelProvider;
				if (!dataModelProvider) {
					var dataModelProviderName = $scope.dataModelProviderName || cm_dataGrid_dataModelProviderName;
					if (dataModelProviderName) {
						dataModelProvider = cc.LoadProvider(dataModelProviderName);
					}
				}
				this.dataModelProvider = dataModelProvider;
				this.$scope.$watchCollection("value", function(newValue) {
					$scope.$broadcast("cm:valueChanged", newValue);
				});

				this.cursorProvider = new CursorProvider($scope);

				var selectionProvider = $scope.selectionProvider;
				if (!selectionProvider) {
					var selectable = cc.toBoolean($scope.selectable) || $scope.selectionCardinality;

					if (selectable) {
						selectionProvider = SelectionProvider.From($scope.selection, $scope);

						$scope.$watch("selection", function(newSelection, oldSelection) {

							cc.log("WATCH selection newSelection=", newSelection, " oldSelection=", oldSelection);

							selectionProvider.set(newSelection);
						});
					}
				}
				this.selectionProvider = selectionProvider;

				$scope.$on(SelectionProvider.SELECTION_SET_EVENT, function(event, data) {
					cc.log("EVENT selection newSelection=", data.newSelection);

					$scope.selection = data.newSelection;
				});

				var selectionStrategy = $scope.selectionStrategy;
				if (!selectionStrategy && selectionProvider) {
					selectionStrategy = SelectionStrategy.CreateDefault($scope, $scope.selectionCardinality || "*");
				}
				this.selectionStrategy = selectionStrategy;

				var self = this;
				if (this.cursorProvider) {

					var oldValue = null;

					$scope.$watch(function getValue(scope) {

						if (oldValue && oldValue.cursor === scope.cursor && oldValue.columnCursorId === scope.columnCursorId) {
							return oldValue;
						}

						oldValue = {
							cursor: scope.cursor,
							columnCursorId: scope.columnCursorId
						};

						return oldValue;

					}, function listener(newValue) {
						var rowCursor = newValue.cursor;
						var columnCursorId = newValue.columnCursorId;

						// cc.log("WATCH cursor rowCursor=", rowCursor, " columnCursorId=",
						// columnCursorId);

						if (rowCursor) {
							var columnCursor;
							if (columnCursorId) {
								angular.forEach($scope.columns, function(column) {
									if (column.id == columnCursorId) {
										columnCursor = column;
									}
								});
							}

							self.cursorProvider.setCursor(rowCursor, columnCursor);
						}
					});

					$scope.$on(CursorProvider.CURSOR_CHANGED, function(event, data) {
						// cc.log("EVENT cursor newValue=", data.row, " column=",
						// ((data.column) ? data.column.id : null));

						$scope.cursor = data.row;
						$scope.columnCursorId = (data.column) ? data.column.id : null;
					});
				}

				$scope.getCurrentPositions = function() {
					return self.getCurrentPositions();
				};
			};

			DataGrid.prototype = {
				getCursorValue: function() {
					var selectionStrategy = this.selectionStrategy;
					if (!selectionStrategy) {
						return null;
					}

					return selectionStrategy.getCursor();
				},

				/**
				 * @returns {Promise}
				 */
				construct: [ function() {
					// this._renderContext = undefined;

					var $scope = this.$scope;
					this.constructing = true;
					this.element = null;

					this.readyState = "constructing";

					var doc = angular.element(document.createDocumentFragment());

					var renderContext = {
						$scope: $scope,
						$interpolate: this.directiveInterpolate,

						dataGrid: this,
						columns: $scope.columns,

						selectionProvider: this.selectionProvider,
						selectionStrategy: this.selectionStrategy,
						cursorProvider: this.cursorProvider,
						groupProviders: $scope.groupProviders
					};

					var self = this;

					var gridRenderer = new this.rendererProvider(renderContext);
					this.gridRenderer = gridRenderer;

					$scope.$watch("first", function(newValue, oldValue) {
						if (!angular.isNumber(newValue) || newValue == oldValue || (newValue < 0 && oldValue < 0)) {
							return;
						}

						if (self.readyState != "complete") {
							return;
						}

						$timeout(function() {
							gridRenderer.updateData();
						}, 10, false);
					});

					$scope.$watch("rows", function(newValue, oldValue) {
						if (!angular.isNumber(newValue) || newValue == oldValue || (newValue < 0 && oldValue < 0)) {
							return;
						}

						if (self.readyState != "complete") {
							return;
						}

						gridRenderer.updateData();
					});

					var containerPromise = gridRenderer.render(doc);
					if (!cc.isPromise(containerPromise)) {
						containerPromise = $q.when(containerPromise);
					}

					return containerPromise.then(function(element) {
						if (element[0]) {
							element = element[0];
						}
						self.readyState = "complete";
						self.element = element;

						angular.element(element).data('$scope', $scope);

						PagerRegistry.DeclareTarget(element);

						self._updateDataModel(gridRenderer.$scope.value);

						gridRenderer.$scope.$on("cm:valueChanged", function(event, value) {
							self._updateDataModel(value);
						});

						return doc;

					}, function(reason) {
						self.readyState = "error";

						return doc;
					});
				} ],

				_updateDataModel: function(value) {
					var gridRenderer = this.gridRenderer;

					var oldDataModel = gridRenderer.dataModel;
					if (oldDataModel) {
						gridRenderer.dataModel = undefined;
						oldDataModel.$destroy();
					}

					var dataModelPromise = this.normalizeDataModel(value);
					if (!cc.isPromise(dataModelPromise)) {
						dataModelPromise = $q.when(dataModelPromise);
					}

					var self = this;

					dataModelPromise.then(function(dataModel) {
						gridRenderer.dataErrored = false;
						gridRenderer.dataModel = dataModel;

						if (dataModel) {
							// dataModel.installWatcher(renderContext.$scope, "value");

							dataModel.$on(DataModel.DATA_MODEL_CHANGED_EVENT, function(event, value) {
								self._updateDataModel(value);
							});

							dataModel.$on(DataModel.DATA_MODEL_UPDATED_EVENT, function(event, value) {
								gridRenderer.updateData();
							});
						}

						// if (self.state == "complete") {
						gridRenderer.updateData();
						// }

					}, function(error) {
						gridRenderer.dataErrored = true;
						gridRenderer.dataModel = null;
						gridRenderer.updateData();
					});
				},

				/**
				 * @returns {Promise|DataModel}
				 */
				normalizeDataModel: function(value) {
					var DataModelProvider = this.dataModelProvider;
					if (DataModelProvider) {
						return new DataModelProvider(value);
					}

					return DataModel.From(value);
				},

				getCurrentPositions: function() {
					return {
						first: this.first || 0,
						rows: this.rows || 0,
						rowCount: this.rowCount || 0,
						maxRows: this.maxRows || 0
					};
				},
				setFirst: function(first) {
					var self = this;
					this.$scope.$apply(function() {
						self.$scope.first = first;
					});
				}
			};

			return DataGrid;
		} ]);

	/*
	 * ------------------------ DataColumn --------------------------
	 */

	module.factory("camelia.components.DataColumn", [ "$log", "camelia.core", function($log, cc) {

		function DataColumn($scope, index) {
			this.$scope = $scope;

			// $scope._component = this;

			var id = $scope.id;
			if (!id) {
				id = "cm_data_column_" + (index || anonymousId++);
			}
			this.id = id;

			this.visible = $scope.visible === undefined || (cc.toBoolean($scope.visible) !== false);

			this.editable = $scope.editable === undefined || (cc.toBoolean($scope.editable) !== false);

			var titleAlign = $scope.titleAlign;
			if (titleAlign && /^(center|left|right)$/i.test(titleAlign)) {
				this.titleAlign = titleAlign;
			}

			var cellAlign = $scope.cellAlign;
			if (cellAlign && /^(center|left|right)$/i.test(cellAlign) >= 0) {
				this.cellAlign = cellAlign;
			}

			var width = $scope.width;
			if (width) {
				width = width.trim();

				if (width.length) {
					var w = parseFloat(width);
					var idxPx = width.indexOf("px");
					var idxPc = width.indexOf("%");

					if (idxPx > 0) {
						this.specifiedWidthPx = w;

					} else if (idxPc > 0) {
						this.specifiedWidthPercent = w;
					}
				}
			}

			var minWidth = $scope.minWidth;
			if (minWidth && minWidth.indexOf("px") > 0) {
				this.minWidth = parseFloat(minWidth);
			}

			var maxWidth = $scope.maxWidth;
			if (maxWidth && maxWidth.indexOf("px") > 0) {
				this.maxWidth = parseFloat(maxWidth);
			}
		}

		DataColumn.prototype = {
			addCriteria: function(criteria) {
				if (!this._criterias) {
					this._criterias = [];
					this._criteriasContext = {};
				}

				this._criterias.push(criteria);
				// criteria.dataColumn = this;
			},

			removeCriteria: function(criteria) {
				var criterias = this._criterias;
				if (!criterias) {
					return false;
				}

				var idx = criterias.indexOf(criteria);
				if (idx < 0) {
					return false;
				}

				criterias.splice(idx, 1);

				// criteria.dataColumn = null;
				return true;
			}

		};

		return DataColumn;
	} ]);

	/*
	 * ------------------------ DataGroup --------------------------
	 */

	module.factory("camelia.components.DataGroup", [ "$log",
		"camelia.SelectionProvider",
		function($log, SelectionProvider) {

			function DataGroup($scope, index) {
				this.$scope = $scope;

				// $scope._component = this;

				var id = $scope.id;
				if (!id) {
					id = "cm_data_group_" + (index || anonymousId++);
				}
				this.id = id;

				var collapsedProvider = $scope.collapsedProvider;
				if (!collapsedProvider) {
					collapsedProvider = SelectionProvider.From($scope.collapsedGroups);

					$scope.$watch("collapsedGroups", function() {
						try {
							digesterPhase = true;

							collapsedProvider.set($scope.collapsedGroups);
						} finally {
							digesterPhase = false;
						}
					});
				}
				this.collapsedProvider = collapsedProvider;

				if (collapsedProvider) {
					collapsedProvider.$on(SelectionProvider.SELECTION_SET_EVENT, function(event, data) {
						$scope.collapsedGroups = data.newSelection;

						if (digesterPhase) {
							return;
						}

						$scope.$apply();
					});
				}
			}

			DataGroup.prototype = {
				getCollapsedProvider: function() {
					return this.collapsedProvider;
				}

			};

			return DataGroup;
		} ]);

	/*
	 * ------------------------ --------------------------
	 */

	module.factory("camelia.components.GridProvider", [ "camelia.components.DataGrid",
		"camelia.components.DataColumn",
		"camelia.components.DataGroup",
		function(dataGrid, dataColumn, dataGroup) {
			return {
				DataGrid: dataGrid,
				DataColumn: dataColumn,
				DataGroup: dataGroup
			};
		} ]);

})(window, window.angular);
/**
 * @product CameliaJS (c) 2014 Vedana http://www.vedana.com
 * @license Creative Commons - The licensor permits others to copy, distribute,
 *          display, and perform the work. In return, licenses may not use the
 *          work for commercial purposes -- unless they get the licensor's
 *          permission.
 * @author olivier.oeuillot@vedana.com
 */

(function(window, angular, undefined) {
	'use strict';

	var module = angular.module("camelia.components.pager", [ "camelia.core", "camelia.pagerRegistry" ]);

	module.value("cm_pager_rendererProviderName", "camelia.renderers.pager:camelia.renderers.Pager");
	module.value("cm_pager_format", "{bprev} {bpages} {bnext}");
	module
			.value(
					"xcm_pager_format",
					"'first=' {first} 'last=' {last} 'rowCount=' {rowCount} 'pageCount=' {pageCount} 'pagePos=' {pagePosition} {bprev} {bnext}");

	var anonymousId = 0;

	module.factory("camelia.components.PagerBase", [ "$log",
		"$q",
		"$timeout",
		"$exceptionHandler",
		"camelia.core",
		"camelia.PagerRegistry",
		function($log, $q, $timeout, $exceptionHandler, cc, PagerRegistry) {

			/*
			 * ------------------------ PagerBase --------------------------
			 */

			var PagerBase = function($scope, element, defaultRendererProviderName) {
				this.$scope = $scope;

				var rendererProvider = $scope.rendererProvider;
				if (!rendererProvider) {
					var rendererProviderName = $scope.rendererProviderName || defaultRendererProviderName;
					rendererProvider = cc.LoadProvider(rendererProviderName);
				}
				this.rendererProvider = rendererProvider;

				var targetComponent = $scope.target;
				if (!targetComponent) {
					var targetId = $scope.forElementId;
					if (!targetId) {
						throw new Error("No target or for attribute to attach the pager !");
					}
					var targetElement = document.getElementById(targetId);
					if (targetElement) {
						targetComponent = angular.element(targetElement).scope()._component;
					}
				}

				var targetPromise;
				if (targetComponent) {
					targetPromise = $q.when(targetComponent);

				} else if ($scope.forElementId) {
					targetPromise = PagerRegistry.RegisterWaitingFor($scope, $scope.forElementId);

				}

				this.targetPromise = targetPromise;
			};

			PagerBase.prototype = {

				/**
				 * @returns {Promise}
				 */
				construct: [ "$q",
					function($q) {
						this.constructing = true;
						this.constructed = false;
						this.element = null;

						var self = this;

						return this.targetPromise.then(function(targetElement) {
							cc.Assert(targetElement && angular.element(targetElement).scope(), "pager", "Invalid target component ",
									targetElement);

							var targetScope = angular.element(targetElement).scope();

							delete self.targetPromise;
							// self.targetComponent = targetComponent;

							var renderContext = {
								pager: self,
								targetScope: targetScope,
								$scope: self.$scope
							};

							return self.constructFromTarget(renderContext);

						}, function(reason) {
							self.constructing = false;
							self.constructed = false;

							return doc;
						});
					} ],

				constructFromTarget: function(renderContext) {
					var targetScope = renderContext.targetScope;

					var doc = angular.element(document.createDocumentFragment());

					var nextPositions;

					var self = this;
					var targetDestroyedOff = targetScope.$on("$destroy", function() {
						self.targetDestroyed(targetScope);

						renderContext.targetScope = undefined;
					});

					var positionsChangedOff = targetScope.$on("cm:positionsChanged", function(event, positions) {
						if (!self.element) {
							nextPositions = positions;
							return;
						}
						nextPositions = undefined;

						self.updatePositions(positions);
					});

					this.$scope.$on("$destroy", function() {
						targetDestroyedOff();
						positionsChangedOff();
					});

					var pagerRenderer = new this.rendererProvider(renderContext);
					this.pagerRenderer = pagerRenderer;

					var containerPromise = pagerRenderer.render(doc);
					if (!cc.isPromise(containerPromise)) {
						containerPromise = $q.when(containerPromise);
					}

					return containerPromise.then(function(element) {
						self.constructing = false;
						self.constructed = true;
						self.element = element;

						angular.element(element).data("$scope", self.$scope);

						var positions = nextPositions;
						nextPositions = undefined;

						if (!positions && targetScope.getCurrentPositions) {
							positions = targetScope.getCurrentPositions();
						}
						if (positions) {
							self.updatePositions(positions);
						}

						return doc;
					});
				},

				_targetDestroyed: function() {

				},

				updatePositions: function(positions) {
					this.pagerRenderer.pagerPositionsUpdate(positions);
				}
			};

			return PagerBase;
		} ]);

	/*
	 * ------------------------ Pager --------------------------
	 */

	module.factory("camelia.components.Pager", [ "$log",
		"cm_pager_rendererProviderName",
		"cm_pager_format",
		"camelia.components.PagerBase",
		function($log, cm_pager_rendererProviderName, cm_pager_format, PagerBase) {

			var Pager = function($scope, element) {
				var id = $scope.id;
				if (!id) {
					id = "cm_pager_" + (anonymousId++);
				}
				this.id = id;
				element.attr("id", id);

				PagerBase.call(this, $scope, element, cm_pager_rendererProviderName);
			};

			Pager.prototype = Object.create(PagerBase.prototype);
			angular.extend(Pager.prototype, {
				constructor: Pager,

				constructFromTarget: function(renderContext) {

					var format = this.$scope.format;
					if (!angular.isString(format)) {
						format = cm_pager_format;
					}
					renderContext.format = format;

					var self = this;
					this.$scope.$watch("format", function(format) {

						var targetScope = renderContext.targetScope;

						var positions = targetScope.getCurrentPositions();

						if (!angular.isString(format)) {
							format = cm_pager_format;
						}

						renderContext.format = format;

						self.updatePositions(positions);
					});

					return PagerBase.prototype.constructFromTarget.call(this, renderContext);
				}
			});

			return Pager;
		} ]);

})(window, window.angular);
/**
 * @product CameliaJS (c) 2014 Vedana http://www.vedana.com
 * @license Creative Commons - The licensor permits others to copy, distribute,
 *          display, and perform the work. In return, licenses may not use the
 *          work for commercial purposes -- unless they get the licensor's
 *          permission.
 * @author olivier.oeuillot@vedana.com
 */

(function(window, angular, undefined) {
	'use strict';

	var module = angular.module("camelia.components.popup", [ "camelia.core" ]);

	module.value("cm_popup_rendererProviderName", "camelia.renderers.popup:camelia.renderers.Popup");

	module.factory("camelia.components.popup", [ "$log",
		"$q",
		"$timeout",
		"$exceptionHandler",
		"camelia.core",
		"cm_popup_rendererProviderName",
		function($log, $q, $timeout, $exceptionHandler, cc, cm_popup_rendererProviderName) {

			var anonymousId = 0;

			/*
			 * ------------------------ Popup --------------------------
			 */

			var Popup = function($scope, element, defaultRendererProviderName) {
				this.$scope = $scope;
				element.data("cm_component", this);

				var rendererProvider = $scope.rendererProvider;
				if (!rendererProvider) {
					var rendererProviderName = $scope.rendererProviderName || defaultRendererProviderName;
					rendererProvider = cc.LoadProvider(rendererProviderName);
				}

				this.rendererProvider = rendererProvider;
			};

			Popup.prototype = {

				/**
				 * @returns {Promise}
				 */
				construct: [ "$q",
					function($q) {
						this.constructing = true;
						this.constructed = false;
						this.element = null;

						var self = this;

						return $q.when(function(targetComponent) {
							cc.Assert(targetComponent && targetComponent.$scope, "pager", "Invalid target component ",
									targetComponent);

							self.targetComponent = targetComponent;

							var renderContext = {
								pager: self,
								target: targetComponent,

								rendererProvider: self.rendererProvider,
								$scope: self.$scope
							};

							return self.constructFromTarget(renderContext);

						}, function(reason) {
							self.constructing = false;
							self.constructed = false;

							return doc;
						});
					} ],

				open: function() {
				},
			};

			return Popup;

		} ]);

})(window, window.angular);
/**
 * @product CameliaJS (c) 2014 Vedana http://www.vedana.com
 * @license Creative Commons - The licensor permits others to copy, distribute,
 *          display, and perform the work. In return, licenses may not use the
 *          work for commercial purposes -- unless they get the licensor's
 *          permission.
 * @author olivier.oeuillot@vedana.com
 */

(function(window, angular, undefined) {
	'use strict';

	var module = angular.module("camelia.components.template", [ "camelia.core" ]);

	module.factory("camelia.components.Template", [ "$log",
		"$timeout",
		"$exceptionHandler",
		"$compile",
		"camelia.core",
		function($log, $timeout, $exceptionHandler, $compile, cc) {

			var anonymousId = 0;

			/*
			 * ------------------------ Popup --------------------------
			 */

			var Template = function($scope, element, containerScope, transcludeFunc) {
				this.$scope = $scope;
				this._transcludeFunc = transcludeFunc;
				this.id = "template_" + (anonymousId++);
				// element.data("cm_component", this);

				if (!containerScope.templates) {
					containerScope.templates = [];
				}

				containerScope.templates.push(this);
			};

			Template.markContainer = function(element, $scope) {
				element.data('$cmTemplateContainerController', $scope);
			};

			Template.prototype = {

				/**
				 * @returns {Promise}
				 */
				transclude: function(parent, $scope) {

					var f = this._transcludeFunc;

					var clone = f($scope, function(clone, newScope) {

						// clone.scope=newScope;

						parent.append(clone);
					});

					return clone;
				}
			};

			return Template;

		} ]);

})(window, window.angular);
/**
 * @product CameliaJS (c) 2014 Vedana http://www.vedana.com
 * @license Creative Commons - The licensor permits others to copy, distribute,
 *          display, and perform the work. In return, licenses may not use the
 *          work for commercial purposes -- unless they get the licensor's
 *          permission.
 * @author olivier.oeuillot@vedana.com
 */

(function(window, angular, undefined) {
	"use strict";

	var module = angular.module("camelia.renderers.grid", [ "camelia.dataModel",
		"camelia.selectionProvider",
		"camelia.cursorProvider",
		"camelia.selectionStrategy",
		"camelia.key",
		"camelia.renderers.popup",
		"camelia.components.grid",
		"camelia.animations.grid",
		"camelia.i18n.grid" ]);

	module.value("cm_grid_rowIndentPx", 16);
	module.value("cm_grid_className", "cm_dataGrid");
	module.value("cm_grid_sizerPx", 6);

	module.factory("camelia.renderers.GridProvider", [ "$log",
		"camelia.renderers.grid.core",
		"camelia.renderers.grid.group",
		"camelia.renderers.grid.row",
		"camelia.renderers.grid.table",
		"camelia.renderers.grid.title",
		"camelia.renderers.grid.utils",
		function($log, CoreRenderers, GroupRenderers, RowRenderers, TableRenderers, TitleRenderers, GridUtils) {

			angular.forEach([ GroupRenderers, RowRenderers, TableRenderers, TitleRenderers, GridUtils ], function(renderer) {
				angular.extend(CoreRenderers.prototype, renderer);
			});

			return CoreRenderers;
		} ]);

})(window, window.angular);
/**
 * @product CameliaJS (c) 2014 Vedana http://www.vedana.com
 * @license Creative Commons - The licensor permits others to copy, distribute,
 *          display, and perform the work. In return, licenses may not use the
 *          work for commercial purposes -- unless they get the licensor's
 *          permission.
 * @author olivier.oeuillot@vedana.com
 */

(function(window, angular, undefined) {
	"use strict";

	var module = angular.module("camelia.renderers.grid");

	module.value("cm_grid_animation_pageChange", "camelia.animations.grid.PageChange");

	var ROW_OR_GROUP = {
		row: true,
		group: true
	};

	var CELL_OR_GROUPTITLE = {
		cell: true,
		groupTitle: true
	};

	var DOUBLE_CLICK_DELAY_MS = 300;

	module.factory("camelia.renderers.grid.core", [ "$log",
		"$q",
		"$window",
		"$timeout",
		"$exceptionHandler",
		"camelia.core",
		"camelia.cmTypes",
		"camelia.animations.Animation",
		"cm_grid_className",
		"cm_grid_rowIndentPx",
		"camelia.Key",
		"camelia.SelectionProvider",
		"camelia.CursorProvider",
		"camelia.renderers.FiltersPopup",
		"cm_grid_sizerPx",
		"cm_grid_animation_pageChange",
		function($log, $q, $window, $timeout, $exceptionHandler, cc, cm, Animation, cm_dataGrid_className,
				cm_dataGrid_rowIndentPx, Key, SelectionProvider, CursorProvider, FiltersPopupRenderer, cm_grid_sizerPx,
				cm_grid_animation_pageChange) {

			function searchElements(node) {
				var ret = cm.SearchElements({
					tcell: null,
					title: null,
					cell: null,
					row: null,
					table: null,
					grid: null,
					group: null,
					groupExpand: null
				}, "grid", node);

				return ret;
			}

			var GridRenderer = function(renderContext) {
				angular.extend(this, renderContext);
			};

			GridRenderer.prototype = {
				render: function(parent) {
					var $scope = this.$scope;

					$scope.$broadcast("cm:dataGrid_rendering");

					var container = cc.createElement(parent, "div", {
						id: this.dataGrid.id,
						$cm_type: "grid"
					});
					this.container = container[0];

					$scope.$watch("style", function(style) {
						style = style || "";
						container.attr("style", style);
					});

					var self = this;
					$scope.$watch("className", function() {
						self.gridStyleUpdate(container);
					});

					var tabIndex = $scope.tabIndex;
					if (!tabIndex || tabIndex < 0) {
						tabIndex = 0;
					}
					this.tabIndex = tabIndex;
					this.rowIndent = 0;

					this.setupGroupProviders();

					this.tableInstallWatchs();

					$scope.$on(CursorProvider.CURSOR_CHANGED, function(event, data) {

						var sourceEvent = self._selectionSourceEvent;

						console.log("SourceEvent=", sourceEvent);

						if (data.oldRow) {
							// BLUR event update the element
							var oldElement = self.getElementFromValue(data.oldRow, ROW_OR_GROUP);
							if (oldElement && oldElement._cursor) {
								oldElement._cursor = undefined;
								cc.BubbleEvent(oldElement, "cm_update");
							}
						}
						if (data.row) {
							var element = self.getElementFromValue(data.row, ROW_OR_GROUP);
							if (element && !element._cursor) {
								element._cursor = true;
								cc.BubbleEvent(element, "cm_update");
							}
						}

						var selectionProvider = self.selectionProvider;
						if (!selectionProvider) {
							return;
						}

						var cursorValue = data.row;
						var rowValue = cursorValue;

						if (self.groupProviders) {
							var groupElement = self.getElementFromValue(cursorValue, "group");
							if (groupElement) {
								rowValue = angular.element(groupElement).data("cm_rowValues");
							}
						}

						selectionProvider.run(function() {

							self.selectionStrategy.select(selectionProvider, rowValue, cursorValue, sourceEvent,
									function(cursorRowId) {
										return self._computeRowRangeFromCursor(cursorValue, cursorRowId);
									});
						});
					});

					container.on("mouseover", this._onMouseOver());

					container.on("mouseout", this._onMouseOut());

					container.on("mousedown", this._onMouseDown());

					container.on("dblclick", this._onDoubleClick());

					container.on("click", this._onSimpleClick());

					container.on("mouseup", this._onMouseUp());

					container.on("keydown", this._onKeyPress());
					// container.on("keypress", OnKeyPress(renderContext));

					this._offFocus = cc.on(container, "focus", this._onFocus(), true, $scope);
					this._offBlur = cc.on(container, "blur", this._onBlur(), true, $scope);

					$scope.$on("$destroy", function() {
						self._offFocus();
						self._offBlur();

						self.tableDestroy();
					});

					container.on("cm_update", this._onGridStyleUpdate());

					$scope.$broadcast("cm:dataGrid_title_rendering");

					var titlePromise = this.titleRenderer(container);
					if (!cc.isPromise(titlePromise)) {
						titlePromise = $q.when(titlePromise);
					}

					return titlePromise.then(function(title) {
						$scope.$broadcast("cm:dataGrid_title_rendered");

						self._title = title;

						$scope.$broadcast("cm:dataGrid_body_rendering");

						self._monitorPositions(function() {

							var fragment = angular.element(document.createDocumentFragment());

							var bodyContainer = cc.createElement(fragment, "div", {
								styleClass: "cm_dataGrid_bcontainer"
							});
							self.bodyContainer = bodyContainer[0];

							var tablePromise = self.tableRenderer(bodyContainer);
							if (!cc.isPromise(tablePromise)) {
								tablePromise = $q.when(tablePromise);
							}

							tablePromise.then(function(body) {
								// self._body = body;
								// self._hideBody(); // TODO Verify

								container.append(fragment);

								$scope.$broadcast("cm:dataGrid_body_rendered");

								var win = angular.element($window);

								var resizeHandler = self._onResize();
								win.on("resize", resizeHandler);

								$scope.$on("$destroy", function() {
									win.off("resize", resizeHandler);
								});

								var layoutPromise = self.gridLayout();
								if (!cc.isPromise(layoutPromise)) {
									layoutPromise = $q.when(layoutPromise);
								}

								layoutPromise.then(function() {
									$scope.$broadcast("cm:dataGrid_rendered");

									$scope.$on(SelectionProvider.SELECTION_CHANGED_EVENT, self._onSelectionChanged());

									self._gridReady(container);

									$scope.$broadcast("cm:dataGrid_ready");
								});
							});
						});

						return container;
					});
				},

				setupGroupProviders: function() {
					this.selectedGroupProvider = null;

					var groupProviders = this.groupProviders;
					if (groupProviders) {
						for (var i = 0; i < groupProviders.length; i++) {
							var groupProvider = groupProviders[i];
							if (cc.toBoolean(groupProvider.disabled)) {
								continue;
							}
							this.selectedGroupProvider = groupProvider;
							break;
						}
					}

					if (!this.selectedGroupProvider) {
						return;
					}

					this.rowIndent = 1;
					var self = this;
					this.selectedGroupProvider.collapsedProvider.$on(SelectionProvider.SELECTION_CHANGED_EVENT, self
							._onCollapsedChanged());

				},

				_gridReady: function(element, focusFirstCell) {

					var row;
					var cell;

					if (this.focusCellId) {
						cell = document.getElementById(this.focusCellId);
						if (cell) {
							row = cell.parentNode;
						}
					}

					if (!row && this.selectionProvider) {
						var rowValue = this.selectionProvider.getFirstElement();
						if (rowValue) {
							row = this.getElementFromValue(rowValue, "row");
						}
					}

					if (!row) {
						row = this.getFirstRow();
						if (!row) {
							return false;
						}
					}

					if (!cell) {
						cell = cm.GetNextType(row.firstChild, CELL_OR_GROUPTITLE);
						if (!cell) {
							return false;
						}
					}

					if (!focusFirstCell) {
						this._setCursor(cell);
						return true;
					}

					// Sometime, it is not yet drawn !
					if (cell.getBoundingClientRect().width) {
						cc.setFocus(cell);
						return true;
					}

					$timeout(function() {
						cc.setFocus(cell);
					}, 50, false);

					return true;
				},

				_setCursor: function(element, event) {

					cc.log("SetCursor ", element);

					var cid = this.focusCellId;
					if (cid && (!element || element.id != cid)) {
						this.focusCellId = null;

						var oldCursor = document.getElementById(cid);
						if (oldCursor) {
							oldCursor.tabIndex = -1;
						}
					}

					if (element) {
						this.focusCellId = element.id;

						element.tabIndex = this.tabIndex;

						if (this.cursorProvider) {
							var tr = element.parentNode;

							var cursorValue = angular.element(tr).data("cm_value");
							this.registerElement(tr, cursorValue);

							var logicalIndex = element.cm_lindex;
							var column = this.columns[logicalIndex];

							this.cursorProvider.requestCursor(cursorValue, column, event);
						}
					}
				},

				gridStyleUpdate: function(element) {
					var classes = cm_dataGrid_className.split(" ");

					var className = this.$scope.className;
					if (className) {
						classes.push(className);
					}

					return cm.MixElementClasses(element, classes);
				},

				gridLayout: function() {
					var container = this.container;
					this.layoutState = "uninitialized";

					$log.debug("GridLayout beginning (containerSize=" + this._containerSizeSetted + ")");

					if (!this._containerSizeSetted) {
						var containerStyle = this.container.style;
						if (containerStyle.width || containerStyle.height) {
							var dr = this.container.getBoundingClientRect();
							if (dr.height && dr.width) {
								this._containerSizeSetted = true;
								var hr = this.titleViewPort.getBoundingClientRect();

								var ts = this.tableViewPort.style;
								ts.width = dr.width + "px";
								// ts.height = (dr.height - hr.height) + "px";
							}
						} else {
							this._containerSizeSetted = true;
						}
					}

					var self = this;

					var cr = this.tableViewPort.getBoundingClientRect();
					if (!cr || (cr.width < 1 && cr.height < 1)) {
						$log.debug("No bounding client rect ", cr, "  => timeout 10ms");
						this._hideBody();

						return $timeout(function() {
							self.gridLayout();
						}, 10, false);
					}

					if (this.gridWidth == cr.width && this.gridHeight == cr.height) {
						$log.debug("Begin layout : Already done");

						self._alignColumns(true);

						self._showBody();

						this.layoutState = "complete";
						return true;
					}
					$log.debug("Begin layout to " + cr.width + "," + cr.height);

					this.gridWidth = cr.width;
					this.gridHeight = cr.height;

					this.$scope.$broadcast("cm:dataGrid_layout_begin");

					var $container = angular.element(container);

					var promise = this.titleLayout($container, cr.width);
					if (!cc.isPromise(promise)) {
						promise = $q.when(promise);
					}

					return promise.then(function() {
						self.layoutState = "titleDone";

						var promise2 = self.tableLayout($container, cr.width, cr.height);

						if (!cc.isPromise(promise2)) {
							promise2 = $q.when(promise2);
						}

						promise2.then(function() {
							self.layoutState = "bodyDone";

							self._alignColumns(true);

							self._showBody();

							var cursor = self._cursor;
							if (cursor) {
								var p = cursor.parentNode;
								for (; p && p.nodeType == 1; p = p.parentNode)
									;
								if (!p || p.nodeType != 9) {
									cursor = null;
									self._cursor = null;
								}
							}

							self.layoutState = "complete";

							self.$scope.$broadcast("cm:dataGrid_layout_end");
						});
					});
				},

				_hasData: function() {
					var tbody = this.getTableBody();

					return tbody && tbody.firstChild;
				},

				_alignColumns: function(columnConstraints) {
					var total = 0;

					var rowIndent = this.rowIndent;

					var self = this;
					angular.forEach(this.visibleColumns, function(column) {

						var width = column.width;
						var bodyWidth = width;
						if (!column.visibleIndex && rowIndent) {
							bodyWidth -= rowIndent * cm_dataGrid_rowIndentPx;
						}

						var titleStyle = column.titleElement.style;
						titleStyle.width = width + "px";
						// titleStyle.position = "static";

						column.bodyColElement.style.width = (columnConstraints) ? (bodyWidth + "px") : "auto";
						total += width;
					});

					// $log.debug("GridWidth=" + this.gridWidth + " total=" + total);

					var gridWidth = this.gridWidth;

					var sizer = 0;
					if (false && total < gridWidth) {

						sizer = gridWidth - total;
						total -= sizer;

					} else if (this.hasResizableColumnVisible) {
						sizer = cm_grid_sizerPx;
					}

					if (this.rightColElement) {
						this.rightColElement.style.width = (sizer) + "px";

						total += sizer;
					}

					this.tableElement.style.width = (columnConstraints) ? (total + "px") : "auto";
					// this.tableElement.style.tableLayout = "fixed";

					$log.debug("AlignColumns ... total=" + total + " sizer=" + sizer);
				},

				_computeRowRangeFromCursor: function(rowValue, cursorRowValue) {

					var mark1;
					var mark2;

					var ret = [];

					var tbody = this.getTableBody();
					if (!tbody) {
						return null;
					}

					var r = tbody.firstChild;
					for (; r; r = r.nextSibling) {
						if (r.nodeType != 1) {
							continue;
						}

						var ctype = cm.GetCMType(r);
						if (!ROW_OR_GROUP[ctype]) {
							continue;
						}

						var rValue = angular.element(r).data("cm_value");

						if (!mark1 && rValue === cursorRowValue) {
							mark1 = true;
						}
						if (!mark2 && rValue === rowValue) {
							mark2 = true;
						}

						if (mark1 || mark2) {
							ret.push(rValue);
						}

						if (mark1 && mark2) {
							return ret;
						}
					}

					return null;
				},

				_emitClick: function(elements, eventName, event) {

					var row = elements.row;
					if (!row) {
						return;
					}
					var rowValue = angular.element(row).data("cm_value");

					var params = {
						grid: this.grid,
						event: event,
						row: row,
						rowValue: rowValue
					};

					var cell = elements.cell;
					if (cell) {
						params.cell = cell;

						var logicalIndex = cell.cm_lindex;
						params.column = this.columns[logicalIndex];
					}

					this.$scope.$emit(eventName, params);
				},

				onKeyPress_Cell: function(cell, event, groupElement) {
					var row = cell.parentNode;
					var parentNode = row.parentNode;
					var columnLogicalIndex = cell.cm_lindex;
					var next = row;
					var cancel = false;
					var activate = false;
					var focusCell = false;
					var viewPort = this.tableViewPort;

					var group;
					var collapsedProvider;
					if (groupElement) {
						group = angular.element(groupElement).data("cm_value");
						collapsedProvider = this.selectedGroupProvider.getCollapsedProvider();
					}

					var dataGrid = this.dataGrid;
					function prevPage() {
						if ((!next || next.id == row.id) && dataGrid.rows > 0) {
							var nextFirst = dataGrid.first - dataGrid.rows;
							if (nextFirst < 0) {
								nextFirst = 0;
							}
							if (dataGrid.first > nextFirst) {
								dataGrid.setFirst(nextFirst);
							}

							next = null;
						}
					}

					function nextPage() {
						if ((!next || next.id == row.id) && dataGrid.rows > 0) {
							var nextFirst = dataGrid.first + dataGrid.rows;
							if (dataGrid.rowCount < 0 || nextFirst < dataGrid.rowCount) {
								dataGrid.setFirst(nextFirst);
							}

							next = null;
						}
					}

					switch (event.keyCode) {
					case Key.VK_DOWN:
						cancel = true;
						next = cm.GetNextType(row.nextSibling, ROW_OR_GROUP);
						nextPage();
						break;

					case Key.VK_PAGE_DOWN:
						cancel = true;
						next = cm.GetPreviousVisibleType(viewPort, parentNode.lastChild, ROW_OR_GROUP);
						if (next && next.id == row.id && (viewPort.scrollHeight > viewPort.offsetHeight)) {
							viewPort.scrollTop += viewPort.clientHeight - row.offsetHeight;

							next = cm.GetPreviousVisibleType(viewPort, parentNode.lastChild, ROW_OR_GROUP);
						}
						nextPage();
						break;

					case Key.VK_END:
						cancel = true;
						next = cm.GetPreviousType(parentNode.lastChild, ROW_OR_GROUP);
						nextPage();
						break;

					case Key.VK_UP:
						cancel = true;
						next = cm.GetPreviousType(row.previousSibling, ROW_OR_GROUP);
						prevPage();
						break;

					case Key.VK_PAGE_UP:
						cancel = true;
						next = cm.GetNextVisibleType(viewPort, parentNode.firstChild, ROW_OR_GROUP);
						if (next && next.id == row.id) {
							viewPort.scrollTop -= viewPort.clientHeight - row.offsetHeight;

							next = cm.GetNextVisibleType(viewPort, parentNode.firstChild, ROW_OR_GROUP);
						}
						prevPage();
						break;

					case Key.VK_HOME:
						cancel = true;
						next = cm.GetNextType(parentNode.firstChild, ROW_OR_GROUP);
						prevPage();
						break;

					case Key.VK_SPACE:
						cancel = true;
						activate = true;
						break;

					case Key.VK_RIGHT:
						cancel = true;
						if (groupElement) {
							if (collapsedProvider.contains(group)) {
								this._toggleGroupExpand(groupElement);
							}

						} else if (angular.isNumber(columnLogicalIndex)) {
							var column = this.columns[columnLogicalIndex];

							var nextColumn = this.visibleColumns[column.visibleIndex + 1];
							if (nextColumn) {
								columnLogicalIndex = nextColumn.logicalIndex;
								focusCell = true;
							}
						}

						break;

					case Key.VK_LEFT:
						cancel = true;
						if (groupElement) {
							if (!collapsedProvider.contains(group)) {
								this._toggleGroupExpand(groupElement);
							}

						} else if (angular.isNumber(columnLogicalIndex)) {
							var column = this.columns[columnLogicalIndex];

							if (column.visibleIndex > 0) {
								var nextColumn = this.visibleColumns[column.visibleIndex - 1];
								columnLogicalIndex = nextColumn.logicalIndex;

								focusCell = true;
							}
						}
						break;
					}

					var self = this;
					if (activate) {
						var selectionStrategy = this.selectionStrategy;
						if (selectionStrategy) {
							var rowValue = angular.element(next).data("cm_value");
							this.registerElement(next, rowValue);

							var cursorValue = rowValue;

							if (this.groupProviders) {
								var groupElement = this.getElementFromValue(cursorValue, "group");
								if (groupElement) {
									rowValue = angular.element(groupElement).data("cm_rowValues");
								}
							}

							selectionStrategy.select(this.selectionProvider, rowValue, cursorValue, event, function(cursorRowId) {
								return self._computeRowRangeFromCursor(cursorValue, cursorRowId);
							}, true);
						}
					}

					if (next && next.id != row.id) {
						this.registerElement(next);

						focusCell = true;
					}

					if (focusCell) {
						var cell = cm.GetNextType(next.firstChild, CELL_OR_GROUPTITLE, function(c, type) {
							if (c.cm_lindex === undefined || columnLogicalIndex === undefined) {
								return true;
							}
							return c.cm_lindex == columnLogicalIndex;
						});

						if (cell) {
							this._registerSelectionEvent(event);

							cc.setFocus(cell);
						}
					}

					if (cancel) {
						event.stopPropagation();
						event.preventDefault();
					}
				},

				_onCollapsedChanged: function() {
					var self = this;

					return function(event, params) {
						self._switchElementsFromEvent(params, "group", "_collapsed", function(groupElement, group) {
							// Add the group to the collapse list, remove all rows of group
							self.removeRowsOfGroup(group, groupElement);

						}, function(groupElement) {
							// Remove the group to the collapse list, show all rows of this
							// group

							var group = angular.element(groupElement).data("cm_value");

							self.addRowsOfGroup(group, groupElement);
						});
					};
				},

				_onSelectionChanged: function() {
					var self = this;
					return function(event, params) {
						self._switchElementsFromEvent(params, "row", "_selected");
					};
				},

				_switchElementsFromEvent: function(params, type, propertyName, funcAdd, funcRemove) {
					var size = params.removed.length + params.added.length;
					var cache = (size > 1) ? {} : null;

					var self = this;
					if (params.clearAll && !params.removed.length) {
						this.forEachBodyElement(type, function(element) {
							if (!element[propertyName]) {
								return;
							}
							element[propertyName] = undefined;
							cc.BubbleEvent(element, "cm_update");

							if (funcRemove) {
								funcRemove(element);
							}
						}, type);

					} else {
						angular.forEach(params.removed, function(rowValue) {
							var element = self.getElementFromValue(rowValue, type, cache);
							if (!element || !element[propertyName]) {
								return;
							}

							element[propertyName] = undefined;
							cc.BubbleEvent(element, "cm_update");

							if (funcRemove) {
								funcRemove(element);
							}
						});
					}

					angular.forEach(params.added, function(rowValue) {
						var element = self.getElementFromValue(rowValue, type, cache);
						if (!element || element[propertyName]) {
							return;
						}

						element[propertyName] = true;
						cc.BubbleEvent(element, "cm_update");

						if (funcAdd) {
							funcAdd(element, rowValue);
						}
					});
				},

				_onResizeColumnMoving: function(column, event) {
					var dx = event.clientX - this.columnMoveClientX;

					var newWidth = this.columnResizingWidth + dx;

					if (newWidth < column.computedMinWidth) {
						newWidth = column.computedMinWidth;
					}
					if (column.maxWidth && newWidth > column.maxWidth) {
						newWidth = column.maxWidth;
					}

					if (newWidth != column.width) {
						column.width = newWidth;
						column.specifiedWidthPx = newWidth + "px";
						this._alignColumns(true);
					}

					event.preventDefault();
					event.stopPropagation();
				},

				_onResizeColumnMouseUp: function(column, event) {
					console.log("On resize column mouse up");

					this._onResizeColumnRelease();
					this.$scope.$broadcast("cm:dataGrid_resized", column);

					event.preventDefault();
					event.stopPropagation();
				},

				_onResizeColumnRelease: function() {
					console.log("On resize column release");

					if (this.columnMouseMoveListener) {
						document.removeEventListener("mousemove", this.columnMouseMoveListener, true);
						this.columnMouseMoveListener = undefined;
					}

					if (this.columnMouseUpListener) {
						document.removeEventListener("mouseup", this.columnMouseUpListener, true);
						this.columnMouseUpListener = undefined;
					}

					this.columnResizing = undefined;
					this.columnResizingWidth = undefined;
				},

				_onResizeColumn: function(column, tsizer, event) {
					console.log("On resize column " + column);

					// All Column sizes become specified
					if (!this._allWidthSpecified) {
						this._allWidthSpecified = true;

						angular.forEach(this.visibleColumns, function(column) {
							column.specifiedWidthPx = column.width + "px";
						});
					}

					this.$scope.$broadcast("cm:dataGrid_resizing", column);

					if (this.columnResizing) {
						this._onResizeColumnRelease();
					}

					var self = this;
					this.columnMouseUpListener = function(event) {
						return self._onResizeColumnMouseUp(column, event);
					};

					this.columnMouseMoveListener = function(event) {
						return self._onResizeColumnMoving(column, event);
					};

					document.addEventListener("mousemove", this.columnMouseMoveListener, true);
					document.addEventListener("mouseup", this.columnMouseUpListener, true);

					this.columnResizing = true;
					this.columnResizingWidth = column.width;
					this.columnMoveClientX = event.clientX;

					event.preventDefault();
					event.stopPropagation();
				},

				_toggleColumnSort: function(column, event) {

					this.$scope.$broadcast("cm:dataGrid_sorting");

					var old = this.sorters;

					var updatedColumns = {};

					var ascending = true;
					if (old) {
						angular.forEach(old, function(sorter) {
							var scol = sorter.column;

							if (scol === column) {
								ascending = !sorter.ascending;
							}

							var element = scol.titleElement;
							if (element) {
								element._ascending = undefined;
								element._descending = undefined;
							}

							updatedColumns[scol.columnId] = scol;
						});
					}

					var sorters = [];
					this.sorters = sorters;

					sorters.push({
						column: column,
						ascending: ascending
					});

					angular.forEach(sorters, function(sorter) {
						var column = sorter.column;
						var element = column.titleElement;
						var ascending = !!sorter.ascending;

						element._ascending = ascending;
						element._descending = !ascending;

						updatedColumns[column.columnId] = column;
					});

					angular.forEach(updatedColumns, function(column) {
						var element = column.titleElement;

						if (element) {
							cc.BubbleEvent(element, "cm_update");
						}
					});

					var promise = this._refreshRows();

					var self = this;
					return promise.then(function() {
						self.$scope.$broadcast("cm:dataGrid_sorted");
					});
				},

				_monitorPositions: function(func) {

					var oldFirst = this.dataGrid.first;
					var oldRows = this.dataGrid.rows;
					var oldRowCount = this.dataGrid.rowCount;
					var oldMaxRows = this.dataGrid.maxRows;

					var promise = func.call(this);
					if (!cc.isPromise(promise)) {
						promise = $q.when(promise);
					}

					var self = this;
					return promise.then(function() {

						var dataGrid = self.dataGrid;
						var $scope = self.$scope;

						var first = dataGrid.first;
						var rows = dataGrid.rows;
						var rowCount = dataGrid.rowCount;
						var maxRows = dataGrid.maxRows;
						var event = {
							first: first,
							rows: rows,
							rowCount: rowCount,
							maxRows: maxRows
						};
						var sendEvent = false;

						if (oldFirst != dataGrid.first) {
							event.firstChanged = true;
							sendEvent = true;

							$scope.$broadcast("cm:firstChanged", dataGrid.first);
						}

						if (oldRows != dataGrid.rows) {
							event.rowsChanged = true;
							sendEvent = true;

							$scope.$broadcast("cm:rowsChanged", dataGrid.rows);
						}

						if (oldRowCount != dataGrid.rowCount) {
							event.rowCountChanged = true;
							sendEvent = true;
							$scope.rowCount = rowCount;

							$scope.$broadcast("cm:rowCountChanged", dataGrid.rowCount);
						}

						if (oldMaxRows != dataGrid.maxRows) {
							event.maxRowsChanged = true;
							sendEvent = true;
							$scope.maxRows = maxRows;

							$scope.$broadcast("cm:maxRowsChanged", dataGrid.maxRows);
						}

						if (sendEvent) {
							$scope.$broadcast("cm:positionsChanged", event);
						}
					});
				},

				updateData: function(updateColumnWidths) {

					if (updateColumnWidths === undefined) {
						updateColumnWidths = true;
					}

					var self = this;
					this._monitorPositions(function() {
						return self._refreshRows(updateColumnWidths);

					}).then(function() {
						// self.gridLayout();
					});
				},

				_hideBody: function() {
					var ts = this.tableViewPort.style;
					ts.width = "auto";
					// ts.height = "auto";
					ts.visibility = "hidden";
					// this.tableElement.style.tableLayout = "";

					$log.debug("Hide body");
				},
				_showBody: function() {
					var ts = this.tableViewPort.style;

					// this.tableElement.style.tableLayout = "fixed";
					ts.visibility = "";
					$log.debug("Show body");
				},

				_clearPageAnimation: function() {
					var animation = this._pageAnimation;
					if (!animation) {
						return;
					}
					this._pageAnimation = undefined;

					try {
						animation.cancel();

					} catch (x) {
						$exceptionHandler(x, "Page Animation cancel() error");

					} finally {

						try {
							animation.$destroy();

						} catch (x) {
						}
					}
				},
				/**
				 * @returns {Promise}
				 */
				_refreshRows: function(updateColumnWidths, focus) {
					$log.debug("Refresh rows");

					if (updateColumnWidths) {
						this._naturalWidths = undefined;
						this._containerSizeSetted = undefined;
						this.gridWidth = -1;

						// this._alignColumns(false); // TODO sans animation !
					}

					this._clearPageAnimation();

					var dataGrid = this.dataGrid;
					var first = this.$scope.first;
					if (!angular.isNumber(first) || first < 0) {
						first = 0;
					}
					dataGrid.first = first;

					var rows = this.$scope.rows;
					if (!angular.isNumber(rows)) {
						rows = -1;
					}
					dataGrid.rows = rows;

					var animation = Animation.newInstance(cm_grid_animation_pageChange, this.$scope, {
						first: first,
						oldFirst: this._renderedFirst,
						rows: rows,
						renderer: this
					});
					this._pageAnimation = animation;
					animation.start();

					var promise = this.tableRowsRenderer();

					var self = this;

					function processResult(eventName) {
						animation.end();

						self._gridReady(self.container, focus !== false);

						self.$scope.$broadcast(eventName || "cm:dataGrid_refreshed");
					}

					if (!cc.isPromise(promise)) {
						promise = $q.when(promise);
					}

					return promise.then(function() {

						var dataGrid = self.dataGrid;
						console.log("first=" + dataGrid.first + " visibleRows=" + dataGrid.visibleRows + " rows=" + dataGrid.rows +
								" maxRows=" + dataGrid.maxRows + " rowCount=" + dataGrid.rowCount);

						if (!dataGrid.visibleRows && dataGrid.first) {
							var newFirst = 0;
							if (dataGrid.maxRows > 0) {
								newFirst = Math.floor((dataGrid.maxRows - 1) / dataGrid.rows) * dataGrid.rows;
								if (newFirst < 0) {
									newFirst = 0;
								}
							}

							$timeout(function() {
								console.log("Change first to " + newFirst);
								self.$scope.first = newFirst;

								self.$scope.$digest();
							}, 10, false);
						}

						return processResult();

					}, function(msg) {
						// Failed
						console.error("Catch process failed message " + msg);

						return processResult("cm_dataGrid_errored");

					}, function(update) {
						// $log.debug("Update", update);
					});
				},

				_moveColumn: function(column, targetIndex, giveFocus) {

					var visibleColumns = this.visibleColumns;
					var beforeColumn = visibleColumns[targetIndex + ((targetIndex > column.visibleIndex) ? 1 : 0)];

					this._lastVisibleColumn = visibleColumns[visibleColumns.length - 1];

					visibleColumns.splice(column.visibleIndex, 1);
					visibleColumns.splice(targetIndex, 0, column);

					var idx = 0;
					angular.forEach(visibleColumns, function(column) {
						column.beforeMovingVisibleIndex = column.visibleIndex;
						column.visibleIndex = idx++;
					});

					var titlePromise = this.moveColumnTitle(column, beforeColumn);
					if (!cc.isPromise(titlePromise)) {
						titlePromise = $q.when(titlePromise);
					}

					var self = this;
					titlePromise.then(function() {

						var tablePromise = self.moveColumnTable(column, beforeColumn);
						if (!cc.isPromise(tablePromise)) {
							tablePromise = $q.when(tablePromise);
						}

						tablePromise.then(function() {
							self._lastVisibleColumn = undefined;

							if (!column.beforeMovingVisibleIndex || !column.visibleIndex) {
								self._alignColumns(true);
							}

							if (giveFocus !== false) {
								column.buttonElement.focus();
							}
						});
					});
				},

				_registerSelectionEvent: function(event) {

					console.log("Register event ", event);

					this._selectionSourceEvent = event;
					var self = this;
					$timeout(function() {
						console.log("Unregister event ", event);

						self._selectionSourceEvent = undefined;
					}, 10, false);
				},

				_toggleGroupExpand: function(element) {
					var groupElement = angular.element(element);
					var group = groupElement.data("cm_value");

					var collapsedProvider = this.selectedGroupProvider.getCollapsedProvider();

					var collapsed = !collapsedProvider.contains(group);

					if (collapsed) {
						collapsedProvider.add(group);

					} else {
						collapsedProvider.remove(group);
					}

				},

				_onTitleCellMouseDown: function(event, tcell) {
					var clientX = event.clientX;
					var column = angular.element(tcell).data("cm_column");

					this._onTitleCellClear();

					this.titleCellMoving = true;
					this.titleCellMovingClientX = clientX;
					this.titleCellMovingLayerX = event.layerX;
					// console.log("Target=" + event.target.tagName + "/" +
					// event.target.id + " " + event.layerX);

					var self = this;
					this.titleCellMouseUpListener = function(event) {
						return self._onTitleCellMouseUp(tcell, event, column);
					};

					this.titleCellMouseMoveListener = function(event) {
						return self._onTitleCellMouseMoving(tcell, event, column);
					};

					document.addEventListener("mousemove", this.titleCellMouseMoveListener, true);
					document.addEventListener("mouseup", this.titleCellMouseUpListener, true);
				},

				_onTitleCellMouseMoving: function(tcell, event, column) {
					var dx = event.clientX - this.titleCellMovingClientX;

					if (dx < -20 || dx > 20) {
						if (!this.titleCellColumnMoving) {
							this.titleCellColumnMoving = column;

							// Move cell title !
							this.beginMovingTitleCell(column, event, dx, this.titleCellMovingLayerX);
						}
					}
					if (this.titleCellColumnMoving) {
						this.movingTitleCell(column, event, dx, this.titleCellMovingLayerX);
					}
				},

				_onTitleCellMouseUp: function(tcell, event, column) {

					var elements = searchElements(event.target);

					if (!this.titleCellColumnMoving) {
						if (elements.tcell && elements.tcell.id == tcell.id) {
							if (elements.tparams) {
								this._showFilterPopup(column, elements.tparams, event, elements);

							} else if (tcell._sortable) {
								this._toggleColumnSort(column, event);
							}
						}

					} else {
						// Redraw the table body

						var dx = event.clientX - this.titleCellMovingClientX;

						var targetIndex = this.endMovingTitleCell(column, event, dx);
						if (angular.isNumber(targetIndex)) {
							this._moveColumn(column, targetIndex);
						}
					}

					this._onTitleCellClear();

					cm.ClearState(this, elements, "mouseDown");
					event.stopPropagation();
					return false;
				},

				_showFilterPopup: function(column, filterButton, event, elements) {
					var dataModel = this.dataModel;

					var self = this;
					var popup = new FiltersPopupRenderer(this.$scope, {}, column, dataModel, function() {

						var promise = self._monitorPositions(function() {
							return self._refreshRows(false, false);
						});

						return promise.then(function() {
							self.gridLayout();
							self.$scope.$broadcast("cm_dataGrid_filtred");
						});
					});

					popup.$scope.$on("cm:popup_opened", function() {
						cm.SwitchOnState(self, elements, "openedPopup");
					});

					popup.$scope.$on("cm:popup_closed", function() {
						cm.ClearState(self, elements, "openedPopup");
					});

					popup.open({
						reference: filterButton,
						valign: "bottom",
						deltaY: 2
					});
				},

				_onTitleCellClear: function() {

					if (this.titleCellColumnMoving) {
						// Move cell title !
						this.endMovingTitleCell(this.titleCellColumnMoving);

						this.titleCellColumnMoving = undefined;
					}

					if (this.titleCellMouseMoveListener) {
						document.removeEventListener("mousemove", this.titleCellMouseMoveListener, true);
						this.titleCellMouseMoveListener = undefined;
					}

					if (this.titleCellMouseUpListener) {
						document.removeEventListener("mouseup", this.titleCellMouseUpListener, true);
						this.titleCellMouseUpListener = undefined;
					}

					this.titleCellMoving = undefined;
					this.titleCellColumnMoving = undefined;
				},

				onKeyPress_Title: function(tcell, event, elements) {
					var next = tcell;
					var cancel = false;
					var column = angular.element(tcell).data("cm_column");

					switch (event.keyCode) {
					case Key.VK_LEFT:
						cancel = true;

						if (event.ctrlKey) {
							// Move column !
							if (column.visibleIndex) {
								this._moveColumn(column, column.visibleIndex - 1);
							}

						} else {
							next = cm.GetPreviousType(tcell.previousSibling, "tcell");
							if (!next) {
								next = cm.GetPreviousType(tcell.parentNode.lastChild, "tcell");
							}
						}
						break;

					case Key.VK_RIGHT:
						cancel = true;

						if (event.ctrlKey) {
							// Move column !
							if (column.visibleIndex < this.visibleColumns.length - 1) {
								this._moveColumn(column, column.visibleIndex + 1);
							}
						} else {
							next = cm.GetNextType(tcell.nextSibling, "tcell");
							if (!next) {
								next = cm.GetNextType(tcell.parentNode.firstChild, "tcell");
							}
						}
						break;

					case Key.VK_HOME:
						cancel = true;
						next = cm.GetNextType(tcell.parentNode.firstChild, "tcell");
						break;

					case Key.VK_END:
						cancel = true;
						next = cm.GetPreviousType(tcell.parentNode.lastChild, "tcell");
						break;

					case Key.VK_SPACE:
						cancel = true;

						this._toggleColumnSort(column, event);
						break;

					case Key.VK_DOWN:
						cancel = true;

						if (column.titleElement._filtreable) {
							elements.tparams = column.parametersElement;

							this._showFilterPopup(column, elements.tparams, event, elements);
						}
						break;
					}

					if (next && next.id != tcell.id) {
						var column = angular.element(next).data("cm_column");
						column.buttonElement.focus();
					}

					if (cancel) {
						event.stopPropagation();
						event.preventDefault();
					}
				},

				_onResize: function() {
					$log.debug("On resize ...");
					var self = this;
					return function resizeHandler(event) {
						try {
							self.gridLayout();

						} catch (x) {
							$exceptionHandler(x, "Exception while resizing");
						}
					};
				},

				_onMouseOver: function() {
					var self = this;
					return function(event) {
						var target = event.target;

						if (self.columnResizing || self.titleCellMoving) {
							return;
						}

						var elements = searchElements(target);
						cm.SwitchOnState(self, elements, "over");
					};
				},

				_onMouseOut: function() {
					var self = this;
					return function(event) {
						var target = event.relatedTarget;

						var elements = searchElements(target);
						cm.SwitchOffState(self, elements, "over");
					};
				},

				_onFocus: function() {
					var self = this;
					return function(event) {
						var target = event.target;

						var elements = searchElements(target);

						self._lastFocusEventData = Date.now();

						// cc.log("Grid.OnFocus ", target, elements);

						cm.SwitchOnState(self, elements, "focus", function(elements) {
							var cell = elements.cell || elements.groupTitle;
							if (cell) {
								self._setCursor(cell, event);
							}
						});
					};
				},

				_onBlur: function() {
					var self = this;
					return function(event) {
						var target = event.relatedTarget;

						// cc.log("BLUR ", target);

						var elements = searchElements(target);
						cm.SwitchOffState(self, elements, "focus");
					};
				},

				_onDoubleClick: function() {
					var self = this;

					return function(event) {
						var target = event.target;
						var elements = searchElements(target);

						// cc.log("Double click on ", target, " elements=", elements);

						if (elements.group) {
							var promise = self._groupSimpleClickPromise;
							if (promise) {
								self._groupSimpleClickPromise = undefined;

								$timeout.cancel(promise);
							}

							self._toggleGroupExpand(elements.group);
							return;
						}

						self._emitClick(elements, "RowDoubleClick", event);
					};
				},

				_onSimpleClick: function() {
					var self = this;
					return function(event) {
						var target = event.target;

						var elements = searchElements(target);

						// cc.log("Simple click on ", target, " elements=", elements);

						if (!self._lastFocusEventData && elements.row && elements.cell) {
							var row = angular.element(elements.row).data("cm_value");
							self.registerElement(elements.row, row);

							var logicalIndex = elements.cell.cm_lindex;
							var column = self.columns[logicalIndex];

							var cursorProvider = self.cursorProvider;
							var cursorRow = cursorProvider.getRow();
							var cursorColumn = cursorProvider.getColumn();

							if (column === cursorColumn && row === cursorRow) {
								var selectionProvider = self.selectionProvider;

								if (selectionProvider) {
									selectionProvider.run(function() {
										self.selectionStrategy.select(selectionProvider, row, row, event, function(cursorRowId) {
											return self._computeRowRangeFromCursor(row, cursorRowId);
										});
									});
								}
							}
						}

						self._lastFocusEventData = 0;

						self._emitClick(elements, "RowClick", event);
					};
				},

				_onMouseDown: function() {
					var self = this;

					return function(event) {
						var target = event.target;

						// cc.log("Mouse down on ", target);

						var elements = searchElements(target);
						cm.SwitchOnState(self, elements, "mouseDown", function(elements) {

							var tsizer = elements.tsizer;
							if (tsizer) {
								var targetColumn;

								if (elements.tcell) {
									var c = angular.element(elements.tcell).data("cm_column");
									var vi = c.visibleIndex;

									targetColumn = self.visibleColumns[vi - 1];

								} else {
									targetColumn = self.visibleColumns[self.visibleColumns.length - 1];
								}

								self._onResizeColumn(targetColumn, tsizer, event);

								// event.stopPropagation();
								return false;
							}

							var groupExpand = elements.groupExpand;
							if (groupExpand) {
								self._toggleGroupExpand(elements.group);

								return false;
							}

							var row = elements.row;
							if (row) {
								self.registerElement(row);

								self._registerSelectionEvent(event, false);
							}

							var tcell = elements.tcell;
							if (tcell) {
								self._onTitleCellMouseDown(event, tcell);
								event.stopPropagation();
								return false;
							}

							if (elements.group) {
								var promise = self._groupSimpleClickPromise;
								if (promise) {
									self._groupSimpleClickPromise = undefined;
									$timeout.cancel(promise);
								}

								self._groupSimpleClickPromise = $timeout(function() {
									self._groupSimpleClickPromise = undefined;

									self.registerElement(elements.group);

									self._registerSelectionEvent(event, false);

									if (elements.groupTitle) {
										elements.groupTitle.focus();
									}
								}, DOUBLE_CLICK_DELAY_MS, false);

								event.stopPropagation();
								event.preventDefault();
								return false;
							}

							event.stopPropagation();
							return false;
						});
					};
				},

				_onMouseUp: function() {
					var self = this;

					return function(event) {
						var elements = searchElements();
						cm.ClearState(self, elements, "mouseDown", function(elements) {
						});
					};
				},

				_onKeyPress: function() {
					var self = this;
					return function(event) {
						var target = event.target;
						var elements = searchElements(target);

						// cc.log("KeyPress ", target, " event=", event, " elements=",
						// elements);

						if (elements.tcell) {
							// Le titre
							return self.onKeyPress_Title(elements.tcell, event, elements);
						}

						if (elements.cell) {
							// Cellule
							return self.onKeyPress_Cell(elements.cell, event);
						}

						if (elements.groupTitle) {
							// Cellule
							return self.onKeyPress_Cell(elements.groupTitle, event, elements.group);
						}
					};
				},

				_onGridStyleUpdate: function() {
					var _styleUpdateMapper = {
						grid: "gridStyleUpdate",
						table: "tableStyleUpdate",
						row: "rowStyleUpdate",
						cell: "cellStyleUpdate",
						title: "titleStyleUpdate",
						tcell: "titleCellStyleUpdate",
						group: "groupStyleUpdate"
					};

					var self = this;
					return function(event) {
						var target = event.relatedTarget;

						var type = cm.GetCMType(target);
						if (!type) {
							return;
						}

						var elt = angular.element(target);

						// cc.log("Update relatedTarget=", target, " type=" + type + "
						// over="
						// + target._over + " mouseDown="+ target._mouseDown);

						var rp = self[_styleUpdateMapper[type]];
						if (rp) {
							rp.call(self, elt);
							event.stopPropagation();
							return;
						}
					};
				}

			};

			return GridRenderer;
		} ]);
})(window, window.angular);
/**
 * @product CameliaJS (c) 2014 Vedana http://www.vedana.com
 * @license Creative Commons - The licensor permits others to copy, distribute,
 *          display, and perform the work. In return, licenses may not use the
 *          work for commercial purposes -- unless they get the licensor's
 *          permission.
 * @author olivier.oeuillot@vedana.com
 */

(function(window, angular, undefined) {
	'use strict';

	var module = angular.module("camelia.renderers.grid");

	module.factory("camelia.renderers.grid.group", [ "$log", "camelia.core", "camelia.cmTypes", function($log, cc, cm) {

		var anonymousId = 0;

		return {
			groupRenderer: function(parentElement, groupProvider, groupScope, index, collapsed, destroyScopeRef) {
				var doc = parentElement.ownerDocument || document;

				var tr = cc.createElement(parentElement, "tr", {
					id: "cm_group_" + (anonymousId++),
					role: "row",
					// "aria-hidden": "true",
					tabIndex: -1,
					$cm_groupIndex: index
				});

				var groupElement = tr[0];
				groupElement._collapsed = collapsed;

				var groupClassMode = groupProvider.titleClassMode;
				if (groupClassMode === undefined) {
					groupClassMode = 0;

					var expression = groupProvider.$scope.titleClassRawExpression;
					if (expression && expression.length) {
						var $interpolate = this.$interpolate;
						var groupClassExpression = expression;
						groupClassMode = 3;

						if (expression.indexOf($interpolate.startSymbol()) >= 0) {
							groupClassMode = 1;
							groupClassExpression = this.$interpolate(expression);

						} else if (expression.charAt(0) == '{' && expression.charAt(expression.length - 1) == '}') {
							// ng-class expression !
							groupClassMode = 2;
						}

						groupProvider.titleClassExpression = groupClassExpression;
					}

					groupProvider.titleClassMode = groupClassMode;
				}

				if (groupClassMode) {
					var obj = groupProvider.titleClassExpression;
					if (groupClassMode != 3) {
						obj = groupScope.$eval(obj);
					}

					if (obj) {
						if (angular.isString(obj)) {
							groupElement.cm_groupClasses = obj.split(" ");

						} else if (angular.isObject(obj)) {
							var ar = [];

							angular.forEach(obj, function(value, key) {
								if (value) {
									ar.push(key);
								}
							});

							if (ar.length) {
								groupElement.cm_groupClasses = ar;
							}
						}
					}
				}

				this.groupStyleUpdate(tr);

				var td = cc.createElement(tr, "td", {
					id: "cm_groupTitle_" + (anonymousId++),
					tabIndex: -1,
					nowrap: "nowrap",
					role: "rowgroup",
					className: "cm_dataGrid_gcell",
					colspan: (this.visibleColumns.length + 1 + this.rowIndent)
				});

				var cellRenderer = this.groupTitleRenderer(td, groupProvider, groupScope, index, destroyScopeRef);

				return tr;
			},

			groupTitleRenderer: function(td, groupProvider, groupScope, index, destroyScopeRef) {
				var container = cc.createElement(td, "div", {
					className: "cm_dataGrid_gcontainer"
				});

				var expand = cc.createElement(container, "div", {
					className: "cm_dataGrid_gexpand",
					id: "cm_groupExpand_" + (anonymousId++)
				});

				var label = cc.createElement(container, "label", {
					className: "cm_dataGrid_glabel"
				});

				var value = null;
				var interpolatedExpression = groupProvider.interpolatedTitleExpression;
				if (!interpolatedExpression) {
					var expression = groupProvider.$scope.titleRawExpression;
					if (expression) {
						interpolatedExpression = this.$interpolate(expression);
						groupProvider.interpolatedTitleExpression = interpolatedExpression;
					}
				}

				if (interpolatedExpression) {
					var value = groupScope.$eval(interpolatedExpression);
					if (value) {
						label.text(value);
					}
				}

				var line = cc.createElement(container, "div", {
					className: "cm_dataGrid_gline"
				});

			},

			groupStyleUpdate: function(element) {
				var tr = element;
				if (tr[0]) {
					tr = tr[0];
				}

				var classes = [ "cm_dataGrid_group" ];

				if (tr.cm_groupClasses) {
					classes.push.apply(classes, tr.cm_groupClasses);
				}

				return cm.MixElementClasses(tr, classes);
			},
		};

	} ]);
})(window, window.angular);
/**
 * @product CameliaJS (c) 2014 Vedana http://www.vedana.com
 * @license Creative Commons - The licensor permits others to copy, distribute,
 *          display, and perform the work. In return, licenses may not use the
 *          work for commercial purposes -- unless they get the licensor's
 *          permission.
 * @author olivier.oeuillot@vedana.com
 */

(function(window, angular, undefined) {
	'use strict';

	var module = angular.module("camelia.renderers.grid");

	module.factory("camelia.renderers.grid.row", [ "$log",
		"$interpolate",
		"camelia.core",
		"camelia.cmTypes",
		function($log, $interpolate, cc, cm) {

			var anonymousId = 0;

			return {
				rowRenderer: function(parentElement, rowScope, index, rowIdent, destroyScopeRef) {
					if (!rowScope) {
						throw new Error("RowScope is invalid " + rowScope);
					}

					var doc = parentElement.ownerDocument || document;

					var tr = cc.createElement(parentElement, "tr", {
						id: "cm_row_" + (anonymousId++),
						role: "row",
						tabIndex: -1,
						$cm_rowIndex: index
					});

					var rowElement = tr[0];
					rowElement._rowIdent = rowIdent;

					var rowClassMode = this.rowClassMode;
					if (rowClassMode === undefined) {
						rowClassMode = 0;

						var expression = this.$scope.rowClassRawExpression;
						if (expression && expression.length) {
							var $interpolate = this.$interpolate;
							var rowClassExpression = expression;
							rowClassMode = 3;

							if (expression.indexOf($interpolate.startSymbol()) >= 0) {
								rowClassMode = 1;
								rowClassExpression = this.$interpolate(expression);

							} else if (expression.charAt(0) == '{' && expression.charAt(expression.length - 1) == '}') {
								// ng-class expression !
								rowClassMode = 2;
							}

							this.rowClassExpression = rowClassExpression;
						}

						this.rowClassMode = rowClassMode;
					}

					if (rowClassMode) {
						var obj = this.rowClassExpression;
						if (rowClassMode != 3) {
							obj = rowScope.$eval(obj);
						}

						if (obj) {
							if (angular.isString(obj)) {
								rowElement.cm_rowClasses = obj.split(" ");

							} else if (angular.isObject(obj)) {
								var ar = [];

								angular.forEach(obj, function(value, key) {
									if (value) {
										ar.push(key);
									}
								});

								if (ar.length) {
									rowElement.cm_rowClasses = ar;
								}
							}
						}
					}

					var selectionProvider = this.selectionProvider;
					if (selectionProvider && selectionProvider.contains(rowScope.$row)) {
						rowElement._selected = true;
					}

					this.rowStyleUpdate(tr);

					for (var i = 0; i < rowIdent; i++) {
						var td = cc.createElement(tr, "td", {
							id: "cm_cindent_" + (anonymousId++),
							"aria-hidden": "true"
						});
					}

					var self = this;
					var columnIndex = 0;
					angular.forEach(this.visibleColumns, function(column) {
						var tdTag = (column.scope) ? "th" : "td";

						var tdIdx = (anonymousId++);
						var td = cc.createElement(tr, tdTag, {
							id: "cm_cell_" + tdIdx,
							"aria-labelledBy": column.labelElement.id + " cm_cell_" + tdIdx,
							tabIndex: -1,
							nowrap: "nowrap",
							role: "gridcell",
							$cm_lindex: column.logicalIndex
						});

						if (column.scope) {
							td.attr("scope", "row");
						}

						self.cellStyleUpdate(td);

						self.cellRenderer(td, rowScope, index, column, columnIndex, destroyScopeRef);

						columnIndex++;
					});

					cc.createElement(tr, "td", {
						"aria-hidden": "true"
					});

					return tr;
				},

				rowStyleUpdate: function(element) {
					var tr = element;
					if (tr[0]) {
						tr = tr[0];
					}
					var index = tr.cm_rowIndex;

					var classes = [ "cm_dataGrid_row", "cm_dataGrid_row_" + ((index % 2) ? "odd" : "even") ];

					if (tr.cm_rowClasses) {
						classes.push.apply(classes, tr.cm_rowClasses);
					}

					var ariaState = 0;
					if (tr._selected) {
						ariaState |= 0x01;
					}
					if (tr.ariaState != ariaState) {
						tr.ariaState = ariaState;

						if (tr._selected) {
							tr.setAttribute("aria-selected", tr._selected);
						} else {
							tr.removeAttribute("aria-selected");
						}
					}

					return cm.MixElementClasses(tr, classes);
				},

				cellRenderer: function(td, rowScope, index, column, columnIndex, destroyScopeRef) {
					var value;

					var templates = column.templates;
					if (templates) {
						for (var i = 0; i < templates.length; i++) {
							var template = templates[i];

							var templateIE = column.templatesIE[template.id];
							if (templateIE) {
								if (rowScope.$eval(templateIE) === false) {
									continue;
								}
							}

							var comp = template.transclude(td, rowScope);

							destroyScopeRef.value = false;

							if (column.editable === false) {
								// td.attr("aria-readonly", true);
							}

							return comp;
						}
					}

					// td.attr("aria-readonly", true);

					var label = cc.createElement(td, "label", {
						className: "cm_dataGrid_clabel"
					});

					var valueExpression = column.valueExpression;
					if (!valueExpression) {
						return label;
					}

					if (column.$scope.watched) {
						destroyScopeRef.value = false;

						rowScope.$watch(column.interpolatedExpression, function(newText) {
							label.text((newText == undefined) ? '' : newText);
						});

					} else {
						if (valueExpression) {
							value = valueExpression(rowScope);
						}

						if (value) {
							label.text(value);
						}
					}

					return label;
				},

				cellStyleUpdate: function(element) {
					var cell = element;
					if (cell[0]) {
						cell = cell[0];
					}
					var index = cell.cm_lindex;

					var column = this.columns[index];
					var cts = [];

					var classes = [ "cm_dataGrid_cell" ];
					if (!column.visibleIndex) {
						classes.push("cm_dataGrid_cfirst");

					}
					if (column.visibleIndex == this.visibleColumns.length - 1) {
						classes.push("cm_dataGrid_clast");
					}

					if (column.cellAlign) {
						cts.push("cm_dataGrid_calign_" + column.cellAlign);
					}

					if (column.cellClasses) {
						classes.push.apply(classes, column.cellClasses);
					}

					if (cell.cm_cellClasses) {
						classes.push.apply(classes, tr.cm_cellClasses);
					}

					return cm.MixElementClasses(cell, classes, cts);
				},

				computeColumnsNaturalWidths: function() {
					var row = this.getFirstRow();
					if (!row) {
						return;
					}
					var rowBCR = row.getBoundingClientRect();
					if (rowBCR.width < 1) {
						return false;
					}

					var cells = row.cells;
					var rowIndent = this.rowIndent;
					angular.forEach(this.visibleColumns, function(column) {
						var cell = cells[column.visibleIndex + rowIndent];
						if (!cell) {
							return;
						}

						var cr = cell.getBoundingClientRect();
						column.naturalWidth = cr.width;
					});
				},

				moveColumnRow: function(row, column, beforeColumn) {
					var cells = row.cells;
					var rowIdent = row._rowIdent;
					var visibleColumns = this.visibleColumns;
					var visibleIndex = column.beforeMovingVisibleIndex;

					var cell = cells[visibleIndex + rowIdent];
					var beforeCell = beforeColumn && cells[beforeColumn.beforeMovingVisibleIndex + rowIdent];
					if (!beforeCell) {
						beforeCell = cells[this._lastVisibleColumn.beforeMovingVisibleIndex + rowIdent].nextSibling;
					}

					row.removeChild(cell);
					row.insertBefore(cell, beforeCell);

					if (!column.visibleIndex) {
						this.cellStyleUpdate(cell);

						var firstCell = cells[rowIdent];
						if (!beforeColumn || firstCell.id != beforeColumn.id) {
							this.cellStyleUpdate(firstCell);
						}

					} else if (column.visibleIndex == visibleColumns.length - 1) {
						this.cellStyleUpdate(cell);

						var lastCell = cells[rowIdent + visibleColumns.length - 1];
						if (!beforeColumn || lastCell.id != beforeColumn.id) {
							this.cellStyleUpdate(lastCell);
						}
					}
				}
			};
		} ]);
})(window, window.angular);
/**
 * @product CameliaJS (c) 2014 Vedana http://www.vedana.com
 * @license Creative Commons - The licensor permits others to copy, distribute,
 *          display, and perform the work. In return, licenses may not use the
 *          work for commercial purposes -- unless they get the licensor's
 *          permission.
 * @author olivier.oeuillot@vedana.com
 */

(function(window, angular, undefined) {
	'use strict';

	var module = angular.module('camelia.renderers.grid');

	module.value("cm_grid_group_animation", 0);

	var PROGRESS_DELAY_MS = 200;

	module.factory('camelia.renderers.grid.table', [ "$log",
		"$q",
		"$timeout",
		"$injector",
		"$interpolate",
		"$exceptionHandler",
		"camelia.core",
		"camelia.cmTypes",
		"cm_grid_rowIndentPx",
		"cm_grid_group_animation",
		function($log, $q, $timeout, $injector, $interpolate, $exceptionHandler, cc, cm, cm_dataGrid_rowIndentPx,
				cm_dataGrid_group_animation) {

			var anonymousId = 0;

			function _destroyScope($scope) {
				return function() {
					$scope.$destroy();
				};
			}

			return {
				tableInstallWatchs: function() {
					var self = this;

					this.$scope.$watch('caption', function(newText) {
						var table = self.tableElement;
						if (!table) {
							return;
						}

						var caption = table.getElementsByTagName("caption")[0];

						if (!caption) {
							if (!newText) {
								return;
							}

							caption = cc.createElement(table, "caption", {
								className: "cm_dataGrid_caption"
							});
						}

						caption.text(angular.isString(newText) ? newText : "");
					});

					var visibleColumns = this.visibleColumns;
					angular.forEach(visibleColumns, function(column) {
						column.$scope.$watch("title", function(newValue) {

							var th = column.bodyTitleElement;
							if (!th) {
								return;
							}

							angular.element(th).text(newValue ? newValue : "");
						});
					});
				},

				tableRenderer: function(parent) {

					var viewPort = cc.createElement(parent, "div", {
						id: "cm_table_" + (anonymousId++),
						className: "cm_dataGrid_table"
					});
					this.tableViewPort = viewPort[0];

					var self = this;
					viewPort.on("scroll", function(event) {
						self.titleViewPort.scrollLeft = self.tableViewPort.scrollLeft;
					});

					var table = cc.createElement(viewPort, "table", {
						role: "grid",
						className: "cm_dataGrid_ttable",
						cellPadding: 0,
						cellSpacing: 0
					});
					this.tableElement = table[0];

					var captionText = this.$scope.caption;
					if (captionText) {
						var caption = cc.createElement(table, "caption", {
							className: "cm_dataGrid_caption"
						});

						caption.text(angular.isString(captionText) ? captionText : "");
					}

					var rowIndent = this.rowIndent;
					if (rowIndent) {
						var colgroupIndent = cc.createElement(table, "colgroup", {
							className: "cm_dataGrid_colgroupIndent",
							"aria-hidden": "true"
						});

						for (var i = 0; i < rowIndent; i++) {
							var co = cc.createElement(colgroupIndent, "col", {
								className: "cm_dataGrid_colIndent"
							});
							co[0].style.width = cm_dataGrid_rowIndentPx + "px";
						}
					}

					var colgroup = cc.createElement(table, "colgroup", {
						className: "cm_dataGrid_colgroup"
					});

					var visibleColumns = this.visibleColumns;
					angular.forEach(visibleColumns, function(column) {
						var col = cc.createElement(colgroup, "col", {
							className: "cm_dataGrid_col"
						});
						// col.data("cm_column", column);
						column.bodyColElement = col[0];
					});

					if (this.hasResizableColumnVisible) {
						var col = cc.createElement(colgroup, "col", {
							"aria-hidden": true,
							className: "cm_dataGrid_colSizer"
						});

						this.rightColElement = col[0];
					}

					var thead = cc.createElement(table, "thead", {
						className: "cm_dataGrid_thead"
					});
					// this.tableTHead = thead[0];

					var titleRow = cc.createElement(thead, "tr");

					for (var i = 0; i < rowIndent; i++) {
						cc.createElement(titleRow, "th", {
							className: "cm_dataGrid_thIndent",
							"aria-hidden": "true"
						});
					}

					angular.forEach(visibleColumns, function(column) {
						var th = cc.createElement(titleRow, "th", {
							id: column.columnId,
							scope: "col"
						});
						column.bodyTitleElement = th[0];

						if (column.visibleIndex === 0 && rowIndent) {
							th.colspan = (1 + rowIndent);
						}

						var title = column.$scope.title;
						if (title) {
							th.text(title);
						}
					});

					this.tableStyleUpdate(viewPort);

					return viewPort;
				},
				tableDestroy: function() {
					this.lastDataModel = undefined;
					this.lastParametersKey = undefined;
				},

				newCriteriasExpression: function(column, enabledCriterias) {
					var fct = function(rowScope, dataModel) {
						var criteriaValue = column.$scope.criteriaValue;

						if (!criteriaValue) {
							criteriaValue = column.interpolatedExpression;
							if (!criteriaValue) {
								return false;
							}
						}

						var value = rowScope.$eval(criteriaValue);

						var criterias = column._criterias;
						for (var k = 0; k < criterias.length; k++) {
							var criteria = criterias[k];

							var filterContexts = enabledCriterias[criteria.id];
							if (!filterContexts) {
								continue;
							}

							if (criteria.filterData(filterContexts, value, rowScope, dataModel, column) !== false) {
								return true;
							}
						}

						return false;
					};

					fct.toJson = function() {
						var pfilters = [];
						var parameters = {
							id: column.$scope.criteriaValue || column.$scope.fieldName || column.$scope.id,
							filters: pfilters
						};

						var criterias = column._criterias;
						angular.forEach(enabledCriterias, function(filters) {

							angular.forEach(filters, function(filter) {

								if (!filter.enabled) {
									return;
								}

								var p = {
									type: filter.type || filters.type || filter.id
								};
								pfilters.push(p);

								var j = filter.toJson && filter.toJson();
								if (j) {
									p.parameters = j;
								}
							});
						});

						if (!pfilters.length) {
							return null;
						}

						return parameters;
					};

					return fct;
				},

				tableClearRows: function(tbody) {

					$timeout(function clearRows() {
						angular.element(tbody).empty(); // clear Data informations
					}, 50, false);
				},

				tablePrepareDataModel: function(dataModel) {
					var visibleColumns = this.visibleColumns;

					// Prepare filters
					var varName = this.$scope.varName;

					var key = {
						varName: varName
					};

					var filtersKey;

					var dataModelFilters = null;
					var self = this;
					angular.forEach(visibleColumns, function(column) {
						var criterias = column._criterias;
						if (!criterias || !criterias.length) {
							return;
						}

						var criteriasContext = column._criteriasContext;

						var enabledCriterias = {};
						var count = 0;
						angular.forEach(criterias, function(criteria) {

							var criteriaContext = criteriasContext[criteria.id];
							angular.forEach(criteriaContext, function(filterContext, filterId) {
								if (!filterContext.enabled) {
									return;
								}

								var c = enabledCriterias[criteria.id];
								if (!c) {
									c = [];
									c.type = criteria.type;
									enabledCriterias[criteria.id] = c;
								}

								c.push(filterContext);
								count++;
							});
						});

						var filtredState = !!count;
						var titleElement = column.titleElement;
						if (titleElement._filtred != filtredState) {
							titleElement._filtred = filtredState;

							cc.BubbleEvent(titleElement, "cm_update");
						}

						if (!count) {
							return;
						}

						if (!dataModelFilters) {
							dataModelFilters = [];
						}

						var ce = self.newCriteriasExpression(column, enabledCriterias);
						dataModelFilters.push(ce);

						var ceParameters = ce.toJson();
						if (ceParameters) {
							if (!filtersKey) {
								filtersKey = [];
								key.filters = filtersKey;
							}

							filtersKey.push(ceParameters);
						}
					});

					var sorters = this.sorters;
					var dataModelSorters;
					if (sorters && sorters.length) {
						dataModelSorters = [];

						var sortersKey = [];
						key.sorters = sortersKey;

						angular.forEach(sorters, function(sorter) {
							var column = sorter.column;

							var columnSorters = column.$scope.sorter;
							if (!columnSorters) {
								return;
							}

							dataModelSorters.push({
								expression: columnSorters,
								column: column,
								ascending: sorter.ascending
							});

							sortersKey.push({
								expression: columnSorters,
								column: column.$scope.id || column.$scope.fieldName || column.id,
								ascending: sorter.ascending
							});
						});
					}

					var groupProvider = this.selectedGroupProvider;
					if (groupProvider) {
						key.groupProvider = groupProvider.$scope.id || groupProvider.id;
					}

					var parametersKey = angular.toJson(key);
					if (this.lastDataModel === dataModel && this.lastParametersKey == parametersKey) {
						return this.lastDecoratedDataModel;
					}
					this.lastDataModel = dataModel;
					this.lastParametersKey = parametersKey;
					if (this.lastDecoratedDataModel) {
						this.lastDecoratedDataModel.$destroyChildren();
						this.lastDecoratedDataModel = null;
					}

					if (dataModelFilters) {
						if (!dataModel.isFilterSupport()) {

							dataModel = $injector.invoke([ "camelia.FiltredDataModel", function(FiltredDataModel) {
								return new FiltredDataModel(dataModel, varName);
							} ]);
						}
					}
					dataModel.setFilters(dataModelFilters);

					if (dataModelSorters) {
						if (!dataModel.isSortSupport()) {
							dataModel = $injector.invoke([ "camelia.SortedDataModel", function(SortedDataModel) {
								return new SortedDataModel(dataModel);
							} ]);
						}
					}
					dataModel.setSorters(dataModelSorters);

					var dataModelGrouped = false;
					if (groupProvider) {
						if (!dataModel.isGroupSupport()) {
							dataModel = $injector.invoke([ "camelia.GroupedDataModel", function(GroupedDataModel) {
								return new GroupedDataModel(dataModel, groupProvider, varName);
							} ]);
						}
						dataModel.setGrouped(dataModelGrouped);
					}

					dataModel.setDataScope(this.$scope.$parent);

					this.lastDecoratedDataModel = dataModel;

					var dataGrid = this.dataGrid;
					dataGrid.rowCount = -1;
					dataGrid.maxRows = -1;
					dataGrid.visibleRows = -1;

					return dataModel;
				},

				tablePrepareColumns: function() {

					var self = this;
					var visibleColumns = this.visibleColumns;
					angular.forEach(visibleColumns, function(column) {
						var valueExpression = column.valueExpression;
						if (valueExpression === undefined) {
							valueExpression = false;

							var expression = column.$scope.valueRawExpression;
							if (!expression) {
								var fieldName = column.$scope.fieldName || column.$scope.id;
								if (fieldName) {
									if (column.$scope.watched) {
										expression = $interpolate.startSymbol() + "$row." + fieldName + $interpolate.endSymbol();

									} else {
										valueExpression = function(rowScope) {
											if (!rowScope.$row) {
												debugger;
											}
											return rowScope.$row[fieldName];
										};
									}
								}
							}

							var exp = null;
							if (expression) {
								exp = self.$interpolate(expression);

								valueExpression = function(rowScope) {
									return rowScope.$eval(exp);
								};
							}

							column.interpolatedExpression = exp;
							column.valueExpression = valueExpression;
						}

						var templates = column.templates;
						if (templates === undefined) {
							templates = [];

							var ts = column.$scope.templates;
							if (ts) {
								var templatesIE = {};
								column.templatesIE = templatesIE;

								angular.forEach(ts, function(t) {
									if (t.$scope.name != "cell") {
										return;
									}

									var enabledE = t.$scope.enabledExpresion;
									if (enabledE) {
										if (enabledE === "false") {
											return;
										}

										templatesIE[t.id] = self.$interpolate(enabledE);
									}

									templates.push(t);
								});
							}

							column.templates = (templates.length) ? templates : false;
						}
					});
				},

				tableRowsRenderer: function() {
					var dataModel = this.dataModel;
					if (!dataModel) {
						return $q.when(false);
					}

					var self = this;

					var fragment = angular.element(document.createDocumentFragment());

					var oldTableViewPort = this.tableViewPort;

					var tablePromise = this.tableRenderer(fragment);
					if (!cc.isPromise(tablePromise)) {
						tablePromise = $q.when(tablePromise);
					}

					return tablePromise.then(function() {

						return self._tableRowsRenderer1(self.tableViewPort, oldTableViewPort, fragment);
					});
				},

				_tableRowsRenderer1: function(tableViewPort, oldTableViewPort, fragment) {
					var self = this;
					var table = this.tableElement;

					var dataGrid = this.dataGrid;

					var tbody = cc.createElement(table, "tbody", {
						className: "cm_dataGrid_tbody",
						id: "cm_tbody_" + (anonymousId++)
					});

					this._alignColumns(true);

					this.$scope.$broadcast("cm:pageCreated", {
						tableViewPort: tableViewPort,
						oldTableViewPort: oldTableViewPort,
						fragment: fragment
					});

					this.tablePrepareColumns();

					var dataModel = this.dataModel;
					dataModel = this.tablePrepareDataModel(dataModel);

					var groupDataModel = dataModel.getGroup && dataModel;

					var rowIndent = (groupDataModel) ? 1 : 0;
					var first = dataGrid.first;
					var rows = dataGrid.rows;
					var rowIndex = first;

					if (!angular.isNumber(dataGrid.maxRows)) {
						dataGrid.maxRows = -1;
					}

					if (rows > 0) {
						dataModel.setFetchProperties({
							rows: rows
						});
					}

					var rowCount = dataModel.getRowCount(false);
					if (rowCount < 0) {
						rowCount = -1;
					}
					dataGrid.rowCount = rowCount;
					// console.log("Return rowCount=" + rowCount + " from model");

					var visibleIndex = 0;
					var tbodyElement = tbody[0] || tbody;

					var rowScope = null;
					var groupScope = null;
					var currentGroup = null;
					var groupIndex = -1;

					var progressDefer = null;
					var progressDate = 0;

					function setupDataGrid(lastRowReached) {

						self._renderedFirst = first;

						if (!visibleIndex) {
							if (!first) {
								dataGrid.rowCount = 0;
								dataGrid.maxRows = 0;

								// console.log("Reset rowCount and maxRows");
							}

						} else {
							if (lastRowReached) {
								dataGrid.rowCount = first + visibleIndex;
							}
							dataGrid.maxRows = Math.max(dataGrid.maxRows, first + visibleIndex);
						}

						dataGrid.visibleRows = visibleIndex;
					}

					var varName = this.$scope.varName;

					function availablePromise(available) {
						if (!available) {
							dataModel.setRowIndex(-1);

							if (rowScope) {
								rowScope.$destroy();
							}
							if (groupScope) {
								groupScope.$destroy();
							}

							setupDataGrid(true);
							return false;
						}

						var groupCollapsed = false;

						for (; rows < 0 || visibleIndex < rows;) {
							var nextAvailable;

							if (progressDefer) {
								var now = Date.now();
								if (now > progressDate) {
									progressDate = now + PROGRESS_DELAY_MS;

									progressDefer.notify({
										count: visibleIndex,
										rows: rows
									});
								}
							}

							try {
								var rowData = dataModel.getRowData();
								if (groupDataModel) {
									if (!groupScope) {
										groupScope = self.$scope.$parent.$new();
									}

									groupScope.$group = null;
									groupScope.$count = null;
									groupScope.$row = rowData;
									if (varName) {
										groupScope[varName] = rowData;
									}

									var group = groupDataModel.getGroup(groupScope, rowData);
									if (group !== currentGroup) {
										currentGroup = group;
										groupIndex++;

										groupCollapsed = groupProvider.getCollapsedProvider().contains(group);

										groupScope.$group = group;
										groupScope.$count = groupDataModel.getGroupCount(group);

										var destroyGroupScopeRef = {
											value: true
										};
										var groupTR = self.groupRenderer(tbodyElement, groupProvider, groupScope, groupIndex,
												groupCollapsed, destroyGroupScopeRef);
										groupTR.data("cm_rowValues", groupDataModel.getGroupValues(group));
										groupTR.data("cm_value", group);

										if (!destroyGroupScopeRef.value) {
											groupTR.on('$destroy', _destroyScope(groupScope));
											groupTR.data('$isolateScope', groupScope);
											groupScope.$digest();
											groupScope = null;
										}

										var trElement = groupTR[0];
										trElement._visibleIndex = visibleIndex;
										trElement._rowIndex = rowIndex;
									}
								}

								if (!groupCollapsed) {
									if (!rowScope) {
										rowScope = self.$scope.$parent.$new();
									}

									rowScope.$index = visibleIndex;
									rowScope.$odd = !(visibleIndex & 1);
									rowScope.$even = !rowScope.$odd;
									rowScope.$first = (visibleIndex === 0);
									rowScope.$pageNumber = -1;
									rowScope.$pageCount = -1;
									rowScope.$rowIndex = rowIndex;
									rowScope.$row = rowData;
									if (varName) {
										rowScope[varName] = rowData;
									}

									var destroyRowScopeRef = {
										value: true
									};

									var tr = self.rowRenderer(tbodyElement, rowScope, rowIndex, rowIndent, destroyRowScopeRef);

									tr.data("cm_value", rowData);

									if (!destroyRowScopeRef.value) {
										tr.on('$destroy', _destroyScope(rowScope));
										tr.data('$isolateScope', rowScope);
										rowScope.$digest();
										rowScope = null;
									}
								}

								rowIndex++;
								visibleIndex++;

								if (rows > 0 && visibleIndex >= rows) {
									break;
								}

								dataModel.setRowIndex(rowIndex);

								nextAvailable = dataModel.isRowAvailable();

							} catch (x) {
								dataModel.setRowIndex(-1);

								if (rowScope) {
									rowScope.$destroy();
								}
								if (groupScope) {
									groupScope.$destroy();
								}

								throw x;
							}

							if (cc.isPromise(nextAvailable)) {
								return nextAvailable.then(availablePromise);
							}

							if (nextAvailable !== true) {
								break;
							}
						}

						dataModel.setRowIndex(-1);
						if (rowScope) {
							rowScope.$destroy();
						}
						if (groupScope) {
							groupScope.$destroy();
						}

						setupDataGrid(rows > 0 && visibleIndex < rows);

						return $q.when(false);
					}

					var nextAvailable;
					try {
						dataModel.setRowIndex(rowIndex);

						nextAvailable = dataModel.isRowAvailable();

					} catch (x) {
						dataModel.setRowIndex(-1);
						if (rowScope) {
							rowScope.$destroy();
						}

						dataGrid.rowCount = -1;
						dataGrid.maxRows = -1;
						dataGrid.visibleRows = visibleIndex;

						throw x;
					}

					if (!cc.isPromise(nextAvailable)) {
						return availablePromise(nextAvailable);
					}

					progressDefer = null;

					return nextAvailable.then(availablePromise);
				},

				tableStyleUpdate: function(body) {
					return cm.MixElementClasses(body, [ "cm_dataGrid_table" ], [ "cm_dataGrid_table_scroll" ]);
				},

				tableLayout: function(container) {

				},

				moveColumnTable: function(column, beforeColumn) {

					var self = this;
					function move(name) {
						var title = column[name];
						var beforeTitle = beforeColumn && beforeColumn[name];
						if (!beforeTitle) {
							beforeTitle = self._lastVisibleColumn[name].nextSibling;
						}

						var parent = title.parentNode;
						parent.removeChild(title);
						parent.insertBefore(title, beforeTitle);
					}

					move("bodyColElement");
					move("bodyTitleElement");

					this.forEachBodyElement("row", function(row) {
						self.moveColumnRow(row, column, beforeColumn);
					});
				},
				removeRowsOfGroup: function(group, groupElement) {
					var lst = [];
					for (var e = groupElement.nextSibling; e;) {
						var next = e.nextSibling;
						var type = cm.GetCMType(e);

						if (type == "group") {
							break;
						}

						if (!cm_dataGrid_group_animation) {
							angular.element(e).remove();
						} else {
							lst.push(e);
						}

						e = next;
					}

					if (!lst.length) {
						return;
					}

					function timer() {
						var e = lst.shift();

						angular.element(e).remove();

						if (lst.length) {
							return $timeout(timer, cm_dataGrid_group_animation, false);
						}
					}

					$timeout(timer, cm_dataGrid_group_animation, false);

				},
				addRowsOfGroup: function(group, groupElement) {

					var visibleIndex = groupElement._visibleIndex;
					var rowIndex = groupElement._rowIndex;
					var rowValues = cc.CloneArray(angular.element(groupElement).data("cm_rowValues"));

					if (!rowValues.length) {
						return;
					}

					var fragment = document.createDocumentFragment();
					var varName = this.$scope.varName;

					var rowIndent = this.rowIndent;

					var nextSibling = groupElement.nextSibling;

					var self = this;
					function timer() {

						var rowScope = self.$scope.$parent.$new();
						var destroyRowScopeRef = {
							value: true
						};
						try {
							var rowData = rowValues.shift();

							rowScope.$index = visibleIndex;
							rowScope.$odd = !(visibleIndex & 1);
							rowScope.$even = !rowScope.$odd;
							rowScope.$first = (visibleIndex === 0);
							rowScope.$pageNumber = -1;
							rowScope.$pageCount = -1;
							rowScope.$rowIndex = rowIndex;
							rowScope.$row = rowData;
							if (varName) {
								rowScope[varName] = rowData;
							}

							var tr = self.rowRenderer(fragment, rowScope, rowIndex, rowIndent, destroyRowScopeRef);

							tr.data("cm_value", rowData);

							if (!destroyRowScopeRef.value) {
								tr.on('$destroy', _destroyScope(rowScope));
								tr.data('$isolateScope', rowScope);
								rowScope.$digest();
								rowScope = null;
							}

							rowIndex++;
							visibleIndex++;

						} finally {
							if (rowScope) {
								rowScope.$destroy();
							}
						}

						if (cm_dataGrid_group_animation) {
							groupElement.parentNode.insertBefore(fragment, nextSibling);

							if (rowValues.length) {
								return $timeout(timer, cm_dataGrid_group_animation, false);
							}
						}
					}

					if (!cm_dataGrid_group_animation) {
						for (; rowValues.length;) {
							timer();
						}
						groupElement.parentNode.insertBefore(fragment, nextSibling);
						return;
					}

					$timeout(timer, cm_dataGrid_group_animation, false);
				}
			};

		} ]);
})(window, window.angular);
/**
 * @product CameliaJS (c) 2014 Vedana http://www.vedana.com
 * @license Creative Commons - The licensor permits others to copy, distribute,
 *          display, and perform the work. In return, licenses may not use the
 *          work for commercial purposes -- unless they get the licensor's
 *          permission.
 * @author olivier.oeuillot@vedana.com
 */

(function(window, angular, undefined) {
	'use strict';

	var MIN_COLUMN_WIDTH = 32;
	var MIN_SORT_PARAMETERS_COLUMN_WIDTH = 90;

	var module = angular.module("camelia.renderers.grid");

	module.factory("camelia.renderers.grid.title", [ "$log",
		"$timeout",
		"camelia.core",
		"camelia.cmTypes",
		"cm_grid_rowIndentPx",
		"cm_grid_sizerPx",
		"camelia.i18n.Grid",
		function($log, $timeout, cc, cm, cm_dataGrid_rowIndentPx, cm_grid_sizerPx, i18n) {

			var anonymousId = 0;

			return {

				titleRenderer: function(parent) {

					var viewPort = cc.createElement(parent, "div", {
						id: "cm_title_" + (anonymousId++),
						className: "cm_dataGrid_title"
					});
					this.titleViewPort = viewPort[0];

					var ul = cc.createElement(viewPort, "ul", {
						className: "cm_dataGrid_ttitle"
					});
					this.titleBarElement = ul[0];

					this.titleStyleUpdate(viewPort);

					var columns = this.columns;
					var index = 0;
					var visibleIndex = 0;
					var scopeColLogicalIndex = -1;
					var percentWidthCount = 0;

					var visibleColumns = [];
					this.visibleColumns = visibleColumns;
					this.hasResizableColumnVisible = false;

					var self = this;
					angular.forEach(columns, function(column) {

						column.logicalIndex = index;
						column.visibleIndex = -1;
						column.columnId = "cm_column_" + (anonymousId++);

						if (column.scope) {
							if (scopeColLogicalIndex >= 0) {
								column.scope = false;
							} else {
								scopeColLogicalIndex = index;
							}
						}

						if (column.visible) {
							var cellElement = cc.createElement(ul, "li", {
								id: "cm_tcell_" + (anonymousId++),
								$cm_columnIndex: index
							});
							column.titleElement = cellElement[0];
							column.visibleIndex = visibleColumns.length;
							cellElement.data("cm_column", column);

							self.titleCellRenderer(cellElement, column, index);

							self.titleCellStyleUpdate(cellElement);

							visibleColumns.push(column);

							if (column.$scope.resizeable) {
								self.hasResizableColumnVisible = true;
							}
						}

						index++;
					});

					if (scopeColLogicalIndex < 0 && columns[0]) {
						columns[0].scope = true;
					}

					var cellElement = cc.createElement(ul, "li", {
						className: [ "cm_dataGrid_tcell", "cm_dataGrid_tcell_right" ],
						"aria-hidden": true
					});
					cc.createElement(cellElement, "span");
					this.titleCellRenderer(cellElement);
					this.lastTitleCellElement = cellElement[0];

					return viewPort;
				},

				titleStyleUpdate: function(element) {
					return cm.MixElementClasses(element, [ "cm_dataGrid_title" ]);
				},

				titleCellRenderer: function(element, column) {
					if (element[0]) {
						element = element[0];
					}
					var titleCell = element;

					var prevColumn = null;
					var hasParams = false;

					if (column) {
						var idx = anonymousId++;
						var parent = titleCell;

						var button = cc.createElement(parent, "button", {
							// id: "cm_tbut_" + idx,
							className: "cm_dataGrid_tbutton",
							tabIndex: this.tabIndex,
							role: "columnheader"
						});
						column.buttonElement = button[0];
						parent = button;

						var sorter = column.$scope.sorter;
						if (sorter) {
							var cursor = cc.createElement(titleCell, "div", {
								className: "cm_dataGrid_tcursor"
							});

							titleCell._sortable = true;
						}

						var title = column.$scope.title;

						var label = cc.createElement(parent, "label", {
							id: "cm_tlab_" + idx,
							className: "cm_dataGrid_tlabel",
						// textNode: (title ? title : "")
						});

						column.labelElement = label[0];

						var self = this;
						column.$scope.$watch("title", function(newValue) {
							label.text(newValue ? newValue : "");

							self.titleAriaMessages(element, column, true);
						});

						if (column._criterias && column._criterias.length) {
							var parameters = cc.createElement(titleCell, "button", {
								className: "cm_dataGrid_tparams",
								tabIndex: -1,
								"aria-hidden": true,
								id: "cm_tparams_" + (anonymousId++)
							});
							column.parametersElement = parameters[0];

							button.attr("aria-expanded", false);

							cc.createElement(parameters, "div", {
								className: "cm_dataGrid_tpArrow"
							});

							cc.createElement(parameters, "div", {
								className: "cm_dataGrid_tpFiltred"
							});

							hasParams = true;

							titleCell._filtreable = true;
						}

						var prevIndex = column.visibleIndex - 1;
						if (prevIndex >= 0) {
							prevColumn = this.visibleColumns[prevIndex];
						}
					} else {
						// Find the last visible column
						prevColumn = this.visibleColumns[this.visibleColumns.length - 1];
					}

					var sizer = cc.createElement(titleCell, "div", {
						className: "cm_dataGrid_tsizer " + ((hasParams) ? "cm_dataGrid_tsizerHP" : ""),
						id: "cm_tsizer_" + (anonymousId++),
					});

					var sizerElement = sizer[0];
					if (column) {
						column.sizerElement = sizerElement;
					} else {
						this.lastSizerElement = sizerElement;
					}

					if (!prevColumn || !cc.toBoolean(prevColumn.$scope.resizeable)) {
						sizerElement.style.display = "none";
					}
				},

				titleCellStyleUpdate: function(element) {
					if (element[0]) {
						element = element[0];
					}
					var titleCell = element;
					var index = titleCell.cm_columnIndex;

					var column = this.columns[index];

					this.titleAriaMessages(element, column);

					var constantClasses = null;
					var align = angular.isString(column.titleAlign) ? column.titleAlign : column.cellAlign;
					if (align) {
						constantClasses = [ "cm_dataGrid_talign_" + align ];
					}

					return cm.MixElementClasses(element, [ "cm_dataGrid_tcell" ], constantClasses);
				},

				titleAriaMessages: function(element, column, reset) {

					var newAriaSorter = 0;
					var messageSorter = null;
					if (element._sortable) {
						newAriaSorter |= 0x01;
						messageSorter = "sortableColumn";

						if (element._ascending) {
							newAriaSorter |= 0x02;
							messageSorter = "sortAscending";

						} else if (element._descending) {
							newAriaSorter |= 0x04;
							messageSorter = "sortDescending";
						}
					}
					if (reset || column._ariaSorter != newAriaSorter) {
						column._ariaSorter = newAriaSorter;

						cc.setAudioDescription(column.buttonElement, messageSorter && cc.lang(i18n, messageSorter), "sorter");
					}

					var newAriaFiltred = 0;
					var messageFiltred = null;
					if (element._filtreable) {
						newAriaFiltred |= 0x01;
						messageFiltred = "filtreableColumn";

						if (element._filtred) {
							newAriaSorter |= 0x02;
							messageFiltred = "filtredColumn";
						}
					}
					if (reset || column._ariaFiltred != newAriaFiltred) {
						column._ariaFiltred = newAriaFiltred;

						cc.setAudioDescription(column.buttonElement, messageFiltred && cc.lang(i18n, messageFiltred), "filtred");
					}

				},

				titleLayout: function(container, width) {
					var self = this;

					if (this._hasData() && !this._naturalWidths) {
						var ret = this.computeColumnsNaturalWidths();
						if (ret === false) {
							return $timeout(function() {
								return self.titleLayout(container, width);
							}, 10, false);
						}
					}

					var leftWidth = width;
					var totalNatural = 0;
					var countPercent = 0;
					var percentColumns = [];
					var rowIndent = this.rowIndent;

					if (this.hasResizableColumnVisible) {
						leftWidth -= cm_grid_sizerPx;
					}

					angular.forEach(this.visibleColumns, function(column) {

						var rowIndentPx = !column.visibleIndex && (rowIndent * cm_dataGrid_rowIndentPx);

						var minWidth = column.minWidth || 0;
						if (!minWidth || minWidth < (MIN_COLUMN_WIDTH + rowIndentPx)) {
							minWidth = MIN_COLUMN_WIDTH + rowIndentPx;
						}
						column.computedMinWidth = minWidth;

						var specifiedWidthPx = column.specifiedWidthPx;
						if (specifiedWidthPx !== undefined && specifiedWidthPx > 0) {
							leftWidth -= specifiedWidthPx;
							column.width = specifiedWidthPx;
							column.widthType = "specified";
							return;
						}

						var specifiedWidthPercent = column.specifiedWidthPercent;
						if (specifiedWidthPercent !== undefined && specifiedWidthPercent > 0) {
							countPercent++;
							column.widthType = "percent";
							column.layoutFinished = undefined;

							column.width = minWidth;
							leftWidth -= minWidth;
							if (column.naturalWidth > minWidth) {
								totalNatural += column.naturalWidth - minWidth;
							}

							percentColumns.push(column);
							return;
						}

						var nw = column.naturalWidth || 0;

						if (nw < column.computedMinWidth) {
							nw = column.computedMinWidth;
						}

						if (column.maxWidth && nw > column.maxWidth) {
							nw = column.maxWidth;
						}

						column.width = nw;
						leftWidth -= nw;
						column.widthType = "natural";
					});

					if (countPercent) {
						var modified = true;

						if (false) {
							if (totalNatural > 0 && totalNatural <= leftWidth) {
								angular.forEach(percentColumns, function(column) {
									var d = column.naturalWidth - column.width;
									if (d > 0) {
										column.width += d;
										leftWidth -= d;
									}
								});
							}
						}

						// On répartit ce qu'il reste
						for (; modified && leftWidth >= 1;) {

							var totalPercent = 0;
							angular.forEach(percentColumns, function(column) {
								if (column.layoutFinished) {
									return;
								}

								totalPercent += column.specifiedWidthPercent;
							});

							var lw = leftWidth;

							angular.forEach(percentColumns, function(column) {
								if (column.layoutFinished) {
									return;
								}

								var colWidth = lw * (column.specifiedWidthPercent / totalPercent);

								if (colWidth > leftWidth) {
									colWidth = leftWidth;
								}

								var nw = column.width + colWidth;
								if (column.minWidth && nw < column.minWidth) {
									nw = column.minWidth;
								}
								if (column.maxWidth && nw > column.maxWidth) {
									nw = column.maxWidth;
								}

								if (nw == column.width) {
									column.layoutFinished = true;
									return;
								}

								leftWidth -= (nw - column.width);
								column.width = nw;
								modified = true;
							});
						}

					} else if (this.fillWidth) {
						// On repartit les naturals
					}
				},

				titleCellLayout: function(container) {
				},

				moveColumnTitle: function(column, beforeColumn) {

					var title = column.titleElement;
					var beforeTitle = beforeColumn && beforeColumn.titleElement;
					if (!beforeTitle) {
						beforeTitle = this._lastVisibleColumn.titleElement.nextSibling;
					}

					var parent = title.parentNode;
					parent.removeChild(title);
					parent.insertBefore(title, beforeTitle);

					var visibleColumns = this.visibleColumns;
					var i = 0;
					for (; i < visibleColumns.length; i++) {
						var sizerElement = visibleColumns[i].sizerElement;

						var resizeable = (i && cc.toBoolean(visibleColumns[i - 1].$scope.resizeable));
						sizerElement.style.display = (resizeable) ? "block" : "none";
					}

					if (this.lastSizerElement) {
						var resizeable = cc.toBoolean(visibleColumns[i - 1].$scope.resizeable);

						this.lastSizerElement.style.display = (resizeable) ? "block" : "none";
					}
				},

				beginMovingTitleCell: function(column, event, dx, layerX) {
					var titleBar = this.titleBarElement;
					var bcr = titleBar.getBoundingClientRect();
					var style = titleBar.style;
					style.height = bcr.height + "px";

					angular.forEach(this.visibleColumns, function(column) {
						var titleElement = column.titleElement;
						// bcr = titleElement.getBoundingClientRect();

						column._movingLeft = titleElement.offsetLeft;
					});
					var ltcLeft = this.lastTitleCellElement.offsetLeft;

					column.titleElement.style.zIndex = "1000";
					column.titleElement.style.backgroundColor = "transparent";

					angular.forEach(this.visibleColumns, function(column) {
						var titleElement = column.titleElement;

						var style = titleElement.style;
						style.left = column._movingLeft + "px";
						style.position = "absolute";
					});
					style = this.lastTitleCellElement.style;
					style.left = ltcLeft + "px";
					style.height = bcr.height + "px";
					style.position = "absolute";
				},
				movingTitleCell: function(column, event, dx, layerX) {
					var npos = column._movingLeft + dx;

					column.titleElement.style.left = npos + "px";

					var mx = npos + layerX;

					// console.log("mx=" + mx + " npos=" + npos + " layerX=" + layerX);

					this._movingOverColumnIndex = undefined;

					var self = this;
					angular.forEach(this.visibleColumns, function(col) {
						var titleElement = col.titleElement;
						if (titleElement.id == column.titleElement.id) {
							return;
						}

						var left = col._movingLeft;

						if (mx < col._movingLeft + col.width) {
							if (col._movingLeft < column._movingLeft) {
								left += column.width;
							}
						}
						if (mx >= col._movingLeft) {
							if (col._movingLeft > column._movingLeft) {
								left -= column.width;
							}

							if (mx < col._movingLeft + col.width) {
								self._movingOverColumnIndex = col.visibleIndex;
							}
						}
						titleElement.style.left = left + "px";
						titleElement.style.transition = "300ms ease-in-out";
					});
				},

				endMovingTitleCell: function(column, event) {

					var overColumnIndex = this._movingOverColumnIndex;
					this._movingOverColumn = undefined;

					column.titleElement.style.zIndex = "";
					column.titleElement.style.backgroundColor = "";

					angular.forEach(this.visibleColumns, function(column) {
						var titleElement = column.titleElement;

						var style = titleElement.style;
						style.left = "";
						style.position = "";
						style.transition = "";

						column._movingLeft = undefined;
					});

					var style = this.lastTitleCellElement.style;
					style.left = "";
					style.height = "";
					style.position = "";

					var titleBar = this.titleBarElement;
					style = titleBar.style;
					style.height = "";
					style.width = "";

					return overColumnIndex;
				}
			};

		} ]);
})(window, window.angular);
/**
 * @product CameliaJS (c) 2014 Vedana http://www.vedana.com
 * @license Creative Commons - The licensor permits others to copy, distribute,
 *          display, and perform the work. In return, licenses may not use the
 *          work for commercial purposes -- unless they get the licensor's
 *          permission.
 * @author olivier.oeuillot@vedana.com
 */

(function(window, angular, undefined) {
	'use strict';

	var module = angular.module('camelia.renderers.grid');

	module.factory('camelia.renderers.grid.utils', [ "$log",
		"$timeout",
		"camelia.core",
		"camelia.cmTypes",
		function($log, $timeout, cc, cm) {

			return {

				getTableBody: function() {
					var table = this.tableElement;
					if (!table) {
						return;
					}

					return table.tBodies[0];
				},

				getFirstRow: function() {
					var tbody = this.getTableBody();
					if (!tbody) {
						return null;
					}

					return cm.GetNextType(tbody.firstChild, "row");
				},

				forEachBodyElement: function(type, func) {

					var tbody = this.getTableBody();
					if (!tbody) {
						return;
					}

					var rows = tbody.rows;

					return cm.ForEachElement(rows, type, func);
				},

				registerElement: function(element, value) {
					if (!this._cacheValues) {
						this._cacheValues = [];
						this._cacheElements = [];
						this._cacheFilled = false;

						var self = this;
						$timeout(function() {
							delete self._cacheValues;
							delete self._cacheElements;
							delete self._cacheFilled;
						}, 50, false);
					}

					if (value === undefined) {
						value = angular.element(element).data("cm_value");

						if (value === undefined || this._cacheValues.indexOf(value) >= 0) {
							return;
						}
					}

					this._cacheElements.push(element);
					this._cacheValues.push(value);
				},

				getElementFromValue: function(rowValue, type, cache) {
					var cacheValues = this._cacheValues;
					if (cacheValues) {
						var idx = cacheValues.indexOf(rowValue);
						if (idx >= 0) {
							var elt = this._cacheElements[idx];
							if (type) {
								var etype = cm.GetCMType(elt);

								if (angular.isString(type)) {
									if (etype != type) {
										return null;
									}

								} else if (!type[etype]) {
									return null;
								}
							}

							return elt;
						}

						if (this._cacheFilled) {
							return null;
						}
					}

					var self = this;
					var ret = null;
					this.forEachBodyElement(type, function(tr) {

						var rowData = angular.element(tr).data("cm_value");
						self.registerElement(tr, rowData);

						if (rowData === rowValue) {
							ret = tr;

							if (!cache) {
								return false; // Stop forEach
							}
						}

					}, type);

					if (cache) {
						this._cacheFilled = true;
					}
					return ret;
				}
			};
		} ]);
})(window, window.angular);
/**
 * @product CameliaJS (c) 2014 Vedana http://www.vedana.com
 * @license Creative Commons - The licensor permits others to copy, distribute,
 *          display, and perform the work. In return, licenses may not use the
 *          work for commercial purposes -- unless they get the licensor's
 *          permission.
 * @author olivier.oeuillot@vedana.com
 */

(function(window, angular, undefined) {
	"use strict";

	var module = angular.module("camelia.renderers.grid");

	module.value("cm_filtersPopup_className", "cm_popup cm_filtersPopup");

	var anonymousId = 0;

	var ROW_TYPE = "rfilter";

	module.factory("camelia.renderers.FiltersPopup", [ "$log",
		"$q",
		"$exceptionHandler",
		"$timeout",
		"camelia.core",
		"camelia.cmTypes",
		"cm_filtersPopup_className",
		"camelia.Key",
		"camelia.renderers.Popup",
		function($log, $q, $exceptionHandler, $timeout, cc, cm, cm_filtersPopup_className, Key, PopupRenderer) {

			function searchElements(target) {
				return cm.SearchElements({
					lfilter: null,
					ifilter: null,
					rfilter: null,
					popup: null
				}, "popup", target);
			}

			var FiltersPopupRenderer = function($scope, configuration, column, dataModel, refreshFunc) {
				configuration = configuration || {};
				configuration.className = "cm_filtersPopup";

				PopupRenderer.call(this, $scope.$new(true), configuration);

				this._refreshFunc = refreshFunc;
				this._column = column;
				this._dataModel = dataModel;

				this._closeDestroy = true;
			};

			FiltersPopupRenderer.prototype = Object.create(PopupRenderer.prototype);
			angular.extend(FiltersPopupRenderer.prototype, {
				constructor: FiltersPopupRenderer,

				_fillBody: function(container) {

					var ul = cc.createElement(container, "ul", {
						className: "cm_filtersPopup_list"
					});

					var criterias = this._column._criterias;
					var criteriasContext = this._column._criteriasContext;

					var self = this;
					angular.forEach(criterias, function(criteria) {
						var filters = criteria.contributeFilters(self.dataModel);

						var oldContext = criteriasContext[criteria.id] || {};
						var newContext = {};
						criteriasContext[criteria.id] = newContext;

						var cnt = 0;
						angular.forEach(filters, function(filter) {

							var id = filter.id;
							if (!id) {
								id = criteria.id + "__" + (cnt++);
								filter.id = id;
							}

							var fContext = oldContext[id];
							if (!fContext) {
								fContext = filter;
							}
							newContext[id] = fContext;

							var idx = (anonymousId++);
							var li = cc.createElement(ul, "li", {
								id: "cm_" + ROW_TYPE + "_" + idx
							});

							li.data("context", fContext);

							var input = cc.createElement(li, "input", {
								id: "cm_ifilter_" + idx,
								type: "checkbox",
								className: "cm_filtersPopup_input",
								"aria-labelledby": "cm_llfilter_" + idx,
								name: id
							});
							if (fContext.enabled) {
								input[0].checked = true;
							}

							var right = cc.createElement(li, "div", {
								id: "cm_lfilter_" + idx,
								$inputTarget: input[0].id
							});

							var label = cc.createElement(right, "label", {
								id: "cm_llfilter_" + idx,
								className: "cm_filtersPopup_label",
								"for": input[0].id,
								textNode: filter.name || "### unknown ###"
							});

							if (filter.contributeDOM) {
								filter.contributeDOM(ul, fContext, criteria, column);
							}

							self._labelStyleUpdate(right);

							self._rowStyleUpdate(li);
						});
					});

					this._popupStyleUpdate(container);
				},

				_open: function(container) {

					container.on("keydown", this._onKeyPress());

					container.on("mouseover", this._onMouseOver());

					container.on("mouseout", this._onMouseOut());

					container.on("mouseleave", this._onMouseLeave());

					container.on("click", this._onClick());

					this._mouseDownListener = this._onMouseDown();
					document.body.addEventListener("mousedown", this._mouseDownListener, true);

					this._focusListener = this._onFocus();
					document.body.addEventListener("focus", this._focusListener, true);

					this._blurListener = this._onBlur();
					document.body.addEventListener("blur", this._blurListener, true);

					container.on("cm_update", this._onStyleUpdate());

					var scope = container.isolateScope();
					var self = this;

					scope.$on("$destroy", function() {
						self._close();
					});

					var input = container[0].querySelector(".cm_filtersPopup_input");
					if (input) {
						cc.setFocus(input);
					}
				},

				_close: function(container) {
					var listener = this._focusListener;
					if (listener) {
						this._focusListener = undefined;
						document.body.removeEventListener("focus", listener, true);
					}

					listener = this._blurListener;
					if (listener) {
						this._blurListener = undefined;
						document.body.removeEventListener("blur", listener, true);
					}

					listener = this._mouseDownListener;
					if (listener) {
						this._mouseDownListener = undefined;
						document.body.removeEventListener("mousedown", listener, true);
					}
				},

				_popupStyleUpdate: function(element) {
					return cm.MixElementClasses(element, [ "cm_popup", "cm_filtersPopup" ]);
				},

				_rowStyleUpdate: function(element) {
					return cm.MixElementClasses(element, [ "cm_filtersPopup_item" ]);
				},

				_labelStyleUpdate: function(element) {
					return cm.MixElementClasses(element, [ "cm_filtersPopup_right" ]);
				},

				_refreshDatas: function() {
					var column = this._column;

					this._refreshFunc();
				},

				_onMouseOver: function() {
					var self = this;
					return function(event) {
						var target = event.target;

						var elements = searchElements(target);

						cm.SwitchOnState(self, elements, "over");
					};
				},

				_onMouseOut: function() {
					var self = this;

					return function(event) {
						var target = event.relatedTarget;

						var elements = searchElements(target);
						cm.SwitchOffState(self, elements, "over");
					};
				},

				_onMouseLeave: function() {
					var self = this;

					return function(event) {
						var target = event.target;

						var elements = searchElements(target);
						cm.SwitchOffState(self, elements, "over");
					};
				},

				_onFocus: function() {
					var self = this;
					return function(event) {
						var target = event.target;

						var elements = searchElements(target);

						cc.log("FiltersPopup.OnFocus ", target, elements, event.relatedTarget);

						if (!elements.popup) {
							self.close();
							return;
						}

						cm.SwitchOnState(self, elements, "focus", function(elements) {
						});
					};
				},

				_onBlur: function() {
					var self = this;

					return function(event) {
						var target = event.relatedTarget;

						var elements = searchElements(target);

						cc.log("FiltersPopup.OnBlur relatedTarget=", target, "target=", event.target, elements);

						if (!target && !event.target) {
							self.close();
							return;
						}

						cm.SwitchOffState(self, elements, "focus");
					};
				},

				_onClick: function() {
					var self = this;
					return function(event) {
						var target = event.target;

						var elements = searchElements(target);
						if (elements.ifilter) {
							angular.element(elements.rfilter).data("context").enabled = !!elements.ifilter.checked;

							self._refreshDatas();
						}
					};
				},

				_onMouseDown: function() {
					var self = this;

					return function(event) {
						var target = event.target;

						var elements = searchElements(target);

						cc.log("FiltersPopup.OnMouseDown ", target, elements);

						if (!elements.popup) {
							self.close();

							event.stopPropagation();
							event.preventDefault();
							return;
						}

						if (elements.lfilter) {
							var input = document.getElementById(elements.lfilter.inputTarget);

							input.checked = !input.checked;
							angular.element(elements.rfilter).data("context").enabled = input.checked;

							self._refreshDatas();
							$timeout(function() {
								self.close();

							}, false);
						}

						cm.SwitchOnState(self, elements, "mouseDown", function(elements) {
						});

						event.stopPropagation();
						event.preventDefault();
					};
				},

				_onStyleUpdate: function(renderContext) {

					var _styleUpdateMapper = {
						popup: "_popupStyleUpdate",
						rfilter: "_rowStyleUpdate",
						lfilter: "_labelStyleUpdate",
					};

					var self = this;

					return function(event) {
						var target = event.relatedTarget;

						var type = cm.GetCMType(target);
						if (!type) {
							return;
						}

						var elt = angular.element(target);

						var rp = self[_styleUpdateMapper[type]];
						if (rp) {
							rp(elt);
							event.stopPropagation();
							return;
						}
					};
				},

				_onKeyPress: function() {
					var self = this;
					return function(event) {
						var target = event.target;
						var elements = searchElements(target);

						if (elements.ifilter) {
							return self.performKeyPress_input(elements.ifilter, event, elements);
						}
					};
				},

				performKeyPress_input: function(input, event, elements) {

					var row = elements.rfilter;
					var parentNode = row.parentNode;
					var next = null;
					var viewPort = this.container;
					var cancel;

					var self = this;
					switch (event.keyCode) {
					case Key.VK_DOWN:
						cancel = true;

						var next = cm.GetNextType(row.nextSibling, ROW_TYPE);
						if (!next) {
							next = cm.GetNextType(parentNode.firstChild, ROW_TYPE);
						}
						break;

					case Key.VK_PAGE_DOWN:
						cancel = true;
						next = cm.GetPreviousVisibleType(viewPort, parentNode.lastChild, ROW_TYPE);
						if (next && next.id == row.id && (viewPort.scrollHeight > viewPort.offsetHeight)) {
							viewPort.scrollTop += viewPort.clientHeight - row.offsetHeight;

							next = cm.GetPreviousVisibleType(viewPort, parentNode.lastChild, ROW_TYPE);
						}
						break;

					case Key.VK_END:
						cancel = true;
						next = cm.GetPreviousType(parentNode.lastChild, ROW_TYPE);
						break;

					case Key.VK_UP:
						cancel = true;

						var next = cm.GetPreviousType(row.previousSibling, ROW_TYPE);
						if (!next) {
							next = cm.GetPreviousType(parentNode.lastChild, ROW_TYPE);
						}
						break;

					case Key.VK_PAGE_UP:
						cancel = true;
						next = cm.GetNextVisibleType(viewPort, parentNode.firstChild, ROW_TYPE);
						if (next && next.id == row.id) {
							viewPort.scrollTop -= viewPort.clientHeight - row.offsetHeight;

							next = cm.GetNextVisibleType(viewPort, parentNode.firstChild, ROW_TYPE);
						}
						break;

					case Key.VK_HOME:
						cancel = true;
						next = cm.GetNextType(parentNode.firstChild, ROW_TYPE);
						break;

					case Key.VK_ESCAPE:
						cancel = true;

						$timeout(function() {
							self.close();
						}, 0, false);
						break;
					}

					if (next) {
						var input = next.querySelector(".cm_filtersPopup_input");
						if (input) {
							cc.setFocus(input);
						}
					}

					if (cancel) {
						event.stopPropagation();
						event.preventDefault();
					}
				}
			});

			return FiltersPopupRenderer;
		} ]);

})(window, window.angular);
/**
 * @product CameliaJS (c) 2014 Vedana http://www.vedana.com
 * @license Creative Commons - The licensor permits others to copy, distribute,
 *          display, and perform the work. In return, licenses may not use the
 *          work for commercial purposes -- unless they get the licensor's
 *          permission.
 * @author olivier.oeuillot@vedana.com
 */

(function(window, angular, undefined) {
	"use strict";

	var module = angular.module("camelia.renderers.pager", [ "camelia.components.pager",
		"camelia.key",
		"camelia.i18n.pager" ]);

	module.value("cm_pager_className", "cm_pager");

	module.factory("camelia.renderers.Pager", [ "$log",
		"$q",
		"$exceptionHandler",
		"camelia.core",
		"camelia.cmTypes",
		"cm_pager_className",
		"camelia.Key",
		"camelia.i18n.Pager",
		function($log, $q, $exceptionHandler, cc, cm, cm_pager_className, Key, i18n) {

			var anonymousId = 0;

			function searchElements(target) {
				return cm.SearchElements({
					lpager: null,
					vpager: null,
					bpager: null,
					pager: null
				}, "pager", target);
			}

			var PagerRenderer = function(renderContext) {
				angular.extend(this, renderContext);
			};

			PagerRenderer.prototype = {
				render: function(parent) {
					var $scope = this.$scope;

					var container = cc.createElement(parent, "div", {
						id: this.pager.id,
						$cm_type: "pager"
					});

					this.containerElement = container[0];

					container.on("mouseover", this._onMouseOver());

					container.on("mouseout", this._onMouseOut());

					container.on("mousedown", this._onMouseDown());

					// container.on("dblclick", OnDoubleClick(renderContext));

					container.on("click", this._onSimpleClick());

					container.on("mouseup", this._onMouseUp());

					container.on("keydown", this._onKeyPress());
					// container.on("keypress", OnKeyPress(renderContext));

					this._offFocus = cc.on(container, "focus", this._onFocus(), true, $scope);
					this._offBlur = cc.on(container, "blur", this._onBlur(), true, $scope);

					$scope.$on("$destroy", function() {
						self._offFocus();

						self._offBlur();
					});

					container.on("cm_update", this._onStyleUpdate());

					return container;
				},

				_onMouseOver: function() {
					var self = this;

					return function(event) {
						var target = event.target;

						var elements = searchElements(target);
						cm.SwitchOnState(self, elements, "over");
					};
				},

				_onMouseOut: function() {
					var self = this;

					return function(event) {
						var target = event.relatedTarget;

						var elements = searchElements(target);
						cm.SwitchOffState(self, elements, "over");
					};
				},

				_onFocus: function() {
					var self = this;

					return function(event) {
						var target = event.target;

						var elements = searchElements(target);
						cm.SwitchOnState(self, elements, "focus");
					};
				},

				_onBlur: function() {
					var self = this;

					return function(event) {
						var target = event.relatedTarget;

						var elements = searchElements(target);
						cm.SwitchOffState(self, elements, "focus");
					};
				},

				_onMouseDown: function() {
					var self = this;

					return function(event) {
						var target = event.target;

						var elements = searchElements(target);
						cm.SwitchOnState(self, elements, "mouseDown");
					};
				},

				_onMouseUp: function() {
					var self = this;

					return function(event) {
						var elements = searchElements();
						cm.ClearState(self, elements, "mouseDown");
					};
				},

				_onKeyPress: function() {
					var self = this;

					return function(event) {
						var target = event.target;
						var elements = searchElements(target);
					};
				},

				_onSimpleClick: function() {
					var self = this;

					return function(event) {
						var target = event.target;

						var elements = searchElements(target);

						// cc.log("Simple click on ", target, " elements=", elements);

						var button = elements.bpager;
						if (button && button.value) {
							self.targetScope.first = parseInt(button.value, 10);

							self.targetScope.$digest();
						}
					};
				},

				_onStyleUpdate: function() {

					var _styleUpdateMapper = {
						pager: "pagerStyleUpdate",
						vpager: "valueStyleUpdate",
						bpager: "buttonStyleUpdate",
						lpager: "labelStyleUpdate"
					};

					var self = this;

					return function(event) {
						var target = event.relatedTarget;

						var type = cm.GetCMType(target);
						if (!type) {
							return;
						}

						var elt = angular.element(target);

						// cc.log("Update relatedTarget=", target, " type=" + type + "
						// over="
						// + target._over + " mouseDown="+ target._mouseDown);

						var rp = self[_styleUpdateMapper[type]];
						if (rp) {
							rp.call(self, elt);
							event.stopPropagation();
							return;
						}
					};
				},

				pagerPositionsUpdate: function(positions) {

					var container = angular.element(this.containerElement);

					container.empty();

					var fragment = document.createDocumentFragment();

					this.renderExpression(fragment, this.format, positions);

					container.append(fragment);
				},

				renderExpression: function(fragment, message, positions) {
					var $scope = this.$scope;
					$scope.first = positions.first;
					$scope.rowCount = positions.rowCount;
					$scope.maxRows = positions.maxRows;
					$scope.rows = positions.rows;

					var span = null;
					for (var i = 0; i < message.length;) {
						var c = message.charAt(i++);
						if (c == "{") {
							var end = message.indexOf("}", i);
							var varName = message.substring(i, end).toLowerCase();
							i = end + 1;

							if (span && span.length) {
								this.renderSpan(fragment, span.join(""));
								span = null;
							}

							var parameters = undefined;
							var pvar = varName.indexOf(':');
							if (pvar >= 0) {
								var parameter = varName.substring(pvar + 1);
								varName = varName.substring(0, pvar);

								parameters = new Object();

								var ss = parameter.split(';');
								for (var j = 0; j < ss.length; j++) {
									var s = ss[j];
									var p = "";
									var ep = s.indexOf('=');
									if (ep >= 0) {
										p = s.substring(ep + 1);
										s = s.substring(0, ep);
									}

									parameters[s] = p;
								}
							}

							this.renderType(fragment, varName, parameters);

							continue;
						}

						if (c == "\'") {
							if (!span) {
								span = new Array;
							}
							for (var j = i;;) {
								var end = message.indexOf("'", j);
								if (end < 0) {
									span.push(message.substring(j));
									i = message.length;
									break;
								}

								if (message.charAt(end + 1) == "\'") {
									span.push(message.substring(j, end), "'");
									j = end + 2;
									continue;
								}

								span.push(message.substring(j, end));
								i = end + 1;
								break;
							}
							continue;
						}

						if (!span) {
							span = new Array;
						}
						span.push(c);
					}

					if (span && span.length) {
						this.renderSpan(fragment, span.join(""));
					}
				},

				renderSpan: function(parent, text) {
					var element = cc.createElement(parent, "span", {
						textNode: text,
						id: "cm_lpager_" + (anonymousId++)
					});

					this.labelStyleUpdate(element);

					return element;
				},

				renderButton: function(parent, value, type, langParams) {
					var text = cc.lang(i18n, type + "_label", langParams);
					var tooltip = cc.lang(i18n, type + "_tooltip", langParams);

					var element = cc.createElement(parent, "button", {
						textNode: text,
						id: "cm_bpager_" + (anonymousId++),
						$value: value,
						$pagerType: type
					});
					if (tooltip) {
						element.attr("title", tooltip);
					}
					if (value < 0) {
						element.attr("disabled", true);
					}

					this.buttonStyleUpdate(element);

					return element;
				},

				renderValue: function(parent, value, type) {
					var element = cc.createElement(parent, "span", {
						textNode: value,
						id: "cm_vpager_" + (anonymousId++),
						$pagerType: type
					});

					this.valueStyleUpdate(element);

					return element;
				},

				renderType: function(fragment, type, parameters) {
					var $scope = this.$scope;

					var first = $scope.first;
					var rowCount = $scope.rowCount;
					var maxRows = $scope.maxRows;
					var rows = $scope.rows;

					if (!rows) {
						return;
					}

					switch (type) {
					case "first":
					case "position":
						this.renderValue(fragment, first + 1, "first");
						break;

					case "last":
						var last = first + rows;
						if (rowCount >= 0 && last >= rowCount) {
							last = rowCount;
						} else if (maxRows > 0 && last >= maxRows) {
							last = maxRows;
						}

						this.renderValue(fragment, last, "last");
						break;

					case "rowcount":
						if (rowCount < 0) {
							return;
						}
						this.renderValue(fragment, rowCount, "rowCount");
						break;

					case "pagecount":
						if (rowCount < 0 || rows <= 0) {
							return;
						}

						var pageCount = Math.floor(((rowCount - 1) / rows) + 1);
						this.renderValue(fragment, pageCount, "pageCount");
						break;

					case "pageposition":
						if (rows <= 0) {
							return;
						}

						var pagePosition = Math.floor(first / rows) + 1;
						this.renderValue(fragment, pagePosition, "pagePosition");
						break;

					case "bprev":
						var idx = first - rows;
						if (idx < 0) {
							idx = 0;
						}

						this.renderButton(fragment, (first > 0) ? idx : -1, "bprev");
						break;

					case "bnext":
						var idx = first + rows;
						var nextIndex = -1;

						if (rowCount >= 0) {
							if (idx + rows > rowCount) {
								idx = (rowCount - ((rowCount + rows - 1) % rows)) - 1;
								if (idx < 0) {
									idx = 0;
								}
							}

							if (idx > first) {
								nextIndex = idx;
							}
						} else {
							nextIndex = idx;
						}

						this.renderButton(fragment, nextIndex, "bnext");
						break;

					case "bpages":
						this.appendBPages(fragment, parameters);
						break;
					}

				},

				appendBPages: function(parent, parameters) {
					var $scope = this.$scope;

					var first = $scope.first;
					var rowCount = $scope.rowCount;
					var maxRows = $scope.maxRows;
					var rows = $scope.rows;

					if (!maxRows) {
						this.renderValue(parent, cc.lang(i18n, "noPages"), "noPages");
						return;
					}

					var maxPage = 3 * 2 + 1;
					var sep = null;

					if (parameters) {
						if (parameters["separator"]) {
							sep = parameters["separator"];
						}
						if (parameters["pages"]) {
							maxPage = parseInt(parameters["pages"], 10);
						}
					}

					var selectedPage = Math.floor(first / rows);
					var nbPage;
					if (rowCount < 0) {
						nbPage = Math.floor((maxRows + rows - 1) / rows) + 1;
					} else {
						nbPage = Math.floor((rowCount + rows - 1) / rows);
					}

					var showPage = nbPage;
					if (showPage > maxPage) {
						showPage = maxPage;
					}

					var pageOffset = 0;
					if (showPage < nbPage) {
						pageOffset = selectedPage - Math.floor(showPage / 2);
						if (pageOffset + showPage > nbPage) {
							pageOffset = nbPage - showPage;
						}

						if (pageOffset < 0) {
							pageOffset = 0;
						}
					}

					if (sep === null) {
						sep = cc.lang(i18n, "separator");
					}

					for (var i = 0; i < showPage; i++) {
						if (i > 0) {
							this.renderSpan(parent, sep, "sep");
						}

						var pi = pageOffset + i;

						var type = "index";
						var label = (pi + 1);
						if (rowCount < 0 && pi + 1 == nbPage) {
							label = "...";
							type = "uindex";

						} else if (pi == selectedPage) {
							type = "cindex";
						}

						var langParams = {
							pageIndex: pi + 1
						};

						this.renderButton(parent, (pi == selectedPage) ? -1 : (pi * rows), type, langParams);
					}

				},

				pagerStyleUpdate: function(element) {
					var classes = cm_pager_className.split(" ");

					var className = this.$scope.className;
					if (className) {
						classes.push(className);
					}

					return cm.MixElementClasses(element, classes);
				},

				labelStyleUpdate: function(element) {
					if (element[0]) {
						element = element[0];
					}

					return cm.MixElementClasses(element, [ "cm_pager_label" ]);
				},

				valueStyleUpdate: function(element) {
					if (element[0]) {
						element = element[0];
					}
					return cm.MixElementClasses(element, [ "cm_pager_value", "cm_pager_value_" + element.pagerType ]);
				},

				buttonStyleUpdate: function(element) {
					if (element[0]) {
						element = element[0];
					}
					return cm.MixElementClasses(element, [ "cm_pager_button", "cm_pager_button_" + element.pagerType ]);
				}
			};

			return PagerRenderer;
		} ]);

})(window, window.angular);
/**
 * @product CameliaJS (c) 2014 Vedana http://www.vedana.com
 * @license Creative Commons - The licensor permits others to copy, distribute,
 *          display, and perform the work. In return, licenses may not use the
 *          work for commercial purposes -- unless they get the licensor's
 *          permission.
 * @author olivier.oeuillot@vedana.com
 */

(function(window, angular, undefined) {
	"use strict";

	var module = angular.module("camelia.renderers.popup", [ "camelia.components.popup", "camelia.key" ]);

	module.value("cm_popup_className", "cm_popup");

	module.factory("camelia.renderers.Popup", [ "$log",
		"$q",
		"$exceptionHandler",
		"$timeout",
		"$rootScope",
		"camelia.core",
		"camelia.cmTypes",
		"cm_popup_className",
		"camelia.Key",
		function($log, $q, $exceptionHandler, $timeout, $rootScope, cc, cm, cm_popup_className, Key) {

			var anonymousId = 0;

			function PopupRenderer($scope, configuration) {

				if (configuration) {
					this.configuration = configuration;
				}

				this._releaseScope = true;
				this.$scope = $scope || $rootScope.$new(true);
			}

			PopupRenderer.INITIALIZING = 0x01;
			PopupRenderer.INITIALIZED = 0x02;
			PopupRenderer.RENDERING = 0x04;
			PopupRenderer.RENDERED = 0x08;
			PopupRenderer.OPENED = 0x10;
			PopupRenderer.CLOSED = 0x20;
			PopupRenderer.DESTROYED = 0x40;

			PopupRenderer.prototype = {
				_setState: function(mask, state) {

					var newState = (this._state & (~mask)) | (state || 0);

					if (this._state == newState) {
						return;
					}

					this._state = newState;

					// Fire event
				},
				_addState: function(state) {
					if (this._state & state) {
						return;
					}
					this._state |= state;

					// Fire event
				},
				containsState: function(mask) {
					if (mask) {
						return this._state & mask;
					}

					return this._state;
				},

				/**
				 * @returns Promise|undefined
				 */
				initialize: function() {
					if (this.containsState(PopupRenderer.DESTROYED)) {
						throw new Error("Already destroyed");
					}

					if (this.containsState(PopupRenderer.INITIALIZING)) {
						return;
					}
					this._addState(PopupRenderer.INITIALIZING);

					var promise = this._initialize.apply(this, arguments);
					if (!cc.isPromise(promise)) {
						promise = $q.when(promise);
					}

					var self = this;
					return promise.then(function() {
						self._addState(PopupRenderer.INITIALIZED);

						var renderPromise = self.render();
						if (!cc.isPromise(renderPromise)) {
							renderPromise = $q.when(renderPromise);
						}

						return renderPromise;
					});
				},

				_initialize: function() {

				},

				render: function() {
					if (this.containsState(PopupRenderer.DESTROYED)) {
						throw new Error("Already destroyed");
					}

					if (this.containsState(PopupRenderer.RENDERING)) {
						return;
					}
					this._addState(PopupRenderer.RENDERING);

					this.$emit("cm:popup_rendering");

					var parent = angular.element(document.createDocumentFragment());

					var className = cm_popup_className;
					if (this.configuration.className) {
						className += " " + this.configuration.className;
					}

					var container = cc.createElement(parent, "div", {
						id: "cm_popup_" + (anonymousId++),
						className: className
					});
					this.container = container[0];

					container.data("$isolateScope", this.$scope);

					var promise = this._render(angular.element(this.container));
					if (!cc.isPromise(promise)) {
						promise = $q.when(promise);
					}

					var self = this;
					return promise.then(function() {
						document.body.appendChild(self.container);

						self._addState(PopupRenderer.RENDERED);

						self.$emit("cm:popup_rendered");
					});
				},

				_render: function(container) {
					return this._fillBody(container, container);
				},

				/**
				 * @returns Promise
				 */
				open: function(position) {
					var self = this;

					if (this.containsState(PopupRenderer.DESTROYED)) {
						throw new Error("Already destroyed");
					}

					if (!this.containsState(PopupRenderer.RENDERED)) {
						if (!this.containsState(PopupRenderer.INITIALIZING)) {
							var promise = this.initialize();
							if (!cc.isPromise(promise)) {
								promise = $q.when(promise);
							}

							return promise.then(function() {
								return self.open(position);
							});
						}

						return null;
					}

					if (this.containsState(PopupRenderer.OPENED)) {
						return null;
					}
					this._setState(PopupRenderer.CLOSED, 0);

					this._position = position;

					function waitLayout() {
						var container = self.container;
						if (!container.offsetWidth && !container.offsetHeight) {
							return $timeout(waitLayout, 10, false);
						}

						self.$emit("cm:popup_DOMReady");

						// If already closed, show it
						container.style.display = "";

						// Update position
						self._updatePosition(container, position);

						self.$emit("cm:popup_opened");

						self._addState(PopupRenderer.OPENED);

						self._open(angular.element(container));

						return container;
					}

					return $timeout(waitLayout, 10, false);
				},

				_open: function() {

				},

				_updatePosition: function(container, position) {
					position = position || {};

					var x;
					var y;

					if (angular.isNumber(position.X) && angular.isNumber(position.Y)) {
						x = position.X;
						y = position.Y;

					} else if (position.reference) {
						var cr = position.reference.getBoundingClientRect();

						x = cr.left;
						y = cr.top;

						switch (position.halign) {
						case "right":
							x += cr.width;

							if (position.deltaX) {
								x += position.deltaX;
							}

							break;
						}

						switch (position.valign) {
						case "bottom":
							y += cr.height;

							if (position.deltaY) {
								y += position.deltaY;
							}
							break;
						}
					}

					if (!angular.isNumber(x)) {
						return false;
					}

					var style = container.style;
					style.left = x + "px";
					style.top = y + "px";

					return true;
				},

				close: function() {
					if (this.containsState(PopupRenderer.DESTROYED)) {
						throw new Error("Already destroyed");
					}
					if (this.containsState(PopupRenderer.CLOSED) || !this.containsState(PopupRenderer.OPENED)) {
						return false;
					}
					this._setState(PopupRenderer.OPENED, PopupRenderer.CLOSED);

					var container = this.container;
					if (!container) {
						return false;
					}

					container.style.display = "none";

					this._close(angular.element(container));

					this.$emit("cm:popup_closed");

					if (this._closeDestroy) {
						this.destroy();
					}

					return true;
				},

				_close: function() {

				},

				destroy: function() {
					if (!this.containsState(PopupRenderer.CLOSED) || this.containsState(PopupRenderer.DESTROYED)) {
						return false;
					}
					this._setState(PopupRenderer.OPENED, PopupRenderer.DESTROYED);

					var container = this.container;
					if (!container) {
						return false;
					}
					this.container = undefined;

					angular.element(container).remove();

					this.$emit("cm:popup_destroyed");

					if (this.$scope && this._releaseScope) {
						this.$scope.$destroy();
						this.$scope = undefined;
					}

					return true;
				},

				_fillBody: function(container, configuration) {
					if (configuration.fillPopup) {
						return configuration.fillPopup(container);
					}
				},

				$emit: function() {
					if (!this.$scope) {
						return;
					}
					this.$scope.$emit.apply(this.$scope, arguments);
				}
			};

			return PopupRenderer;
		} ]);

})(window, window.angular);
/**
 * @product CameliaJS (c) 2014 Vedana http://www.vedana.com
 * @license Creative Commons - The licensor permits others to copy, distribute,
 *          display, and perform the work. In return, licenses may not use the
 *          work for commercial purposes -- unless they get the licensor's
 *          permission.
 * @author olivier.oeuillot@vedana.com
 */

(function(window, angular, undefined) {
	'use strict';

	var module = angular.module('camelia.directives.grid', [ 'camelia.core', 'camelia.components.template' ]);

	module.value("cm_grid_componentProviderName", "camelia.components.grid:camelia.components.GridProvider");

	module.directive("cmDatagrid", [ "$injector",
		"$interpolate",
		"$log",
		"$q",
		"camelia.core",
		"cm_grid_componentProviderName",
		"camelia.components.Template",
		function($injector, $interpolate, $log, $q, cc, cm_grid_componentProviderName, Template) {

			return {
				restrict: "E",
				scope: {
					dataModelProvider: '=?',
					dataModelProviderName: '@datamodelprovider',
					componentProvider: '=?',
					componentProviderName: '@componentprovider',
					rendererProvider: '=?',
					rendererProviderName: '@rendererprovider',
					selectionProvider: '=?',
					selectionProviderName: '@selectionprovider',
					value: '=',
					varName: '@var',
					style: '@',
					className: '@class',
					caption: '@',
					// rowClass: '@', // Raw attribute
					tabIndex: '@',
					id: '@',
					selection: '=?',
					cursor: '=?',
					columnCursor: '=?',
					first: '=?',
					rows: '=?',
					rowCount: '=?rowcount',
					selectable: '@',
					selectionCardinality: '@selectioncardinality'
				},
				replace: true,

				controller: [ "$scope", function($scope) {
					// var dataGridProvider='camelia.datagrid';

					var componentProvider = $scope.componentProvider;
					if (!componentProvider) {
						var componentProviderName = $scope.componentProviderName || cm_grid_componentProviderName;
						componentProvider = cc.LoadProvider(componentProviderName);
					}
					this.componentProvider = componentProvider;

					$scope.columns = [];
					this.appendColumn = function(column) {
						$scope.columns.push(column);
					};

					this.getColumnIndex = function() {
						return $scope.columns.length;
					};

					$scope.groupProviders = [];
					this.appendGroupProvider = function(groupProvider) {
						$scope.groupProviders.push(groupProvider);
					};

					this.getProviderIndex = function() {
						return $scope.groupProviders.length;
					};
				} ],
				compile: function() {
					return {
						pre: function($scope, element, attrs, controller) {

							$scope.rowClassRawExpression = element.attr("rowClass");

							var dataGrid = new controller.componentProvider.DataGrid($scope, element, $interpolate);
							controller.dataGrid = dataGrid;

							Template.markContainer(element, $scope);
						},
						post: function($scope, element, attrs, controller) {
							var dataGrid = controller.dataGrid;

							var promise = $injector.invoke(dataGrid.construct, dataGrid);

							if (!cc.isPromise(promise)) {
								promise = $q.when(promise);
							}

							promise.then(function(table) {
								$log.info("Table created ", table);

								element.replaceWith(table);

							}, function(reason) {
								$log.error("Failed to create table ", reason);
							});
						}
					};
				}
			};
		} ]);

	module.directive("cmDatacolumn", [ "camelia.core",
		"camelia.components.Template",

		function(cc, Template) {
			return {
				require: "^cmDatagrid",
				restrict: "E",
				replace: true,
				scope: {
					id: '@',
					visible: '@',
					titleAlign: '@titlealign',
					cellAlign: '@cellalign',
					width: '@',
					maxWidth: '@maxwidth',
					minWidth: '@minwidth',
					title: '@',
					cellClass: '@',
					columnClass: '@',
					sorter: '@',
					resizeable: '@',
					checkable: '@',
					fieldName: '@fieldname',
					checkList: '=?',
					columnImageURL: '@columnimageurl',
					cellImageURL: '@cellimageurl',
					criteriaValue: '@criteriavalue',
					watched: '@',
					editable: '@' // For aria-readOnly
				},
				controller: function() {
					this.criterias = [];
				},
				compile: function() {
					return {
						pre: function($scope, element, attrs) {
							$scope.valueRawExpression = element.attr("text") || element.attr("value");

							Template.markContainer(element, $scope);
						},
						post: function($scope, element, attrs, datagridController) {

							if ($scope.fieldName) {
								if (/[^\w]/.test($scope.fieldName)) {
									throw new Error("Invalid fieldName expression '" + $scope.fieldName + "' use value='{{" +
											$scope.fieldName + "}}' instead !");
								}
							}

							var controller = element.controller("cmDatacolumn");

							var column = new datagridController.componentProvider.DataColumn($scope, datagridController
									.getColumnIndex() + 1);

							angular.forEach(controller.criterias, function(criteria) {
								column.addCriteria(criteria);
							});

							datagridController.appendColumn(column);
						}
					};
				}
			};
		} ]);

	module.directive("cmDatagroup", [ "camelia.core",
		"camelia.components.Template",
		function(cc, Template) {
			return {
				require: "^cmDatagrid",
				restrict: "E",
				scope: {
					title: '@',
					value: '@',
					closeable: '@',
					disabled: '@',
					collapsedGroups: '=?collapsedgroups',
					className: '@class',
					sorter: '@'
				},
				compile: function() {
					return {
						pre: function($scope, element, attrs) {
							$scope.titleRawExpression = element.attr("title");
							$scope.titleClassRawExpression = element.attr("titleclass");
							$scope.valueRawExpression = element.attr("value");

							Template.markContainer(element, $scope);
						},
						post: function($scope, element, attrs, dataGridController) {
							var column = new dataGridController.componentProvider.DataGroup($scope, datagridController
									.getProviderIndex() + 1);

							dataGridController.appendGroupProvider(column);
						}
					};
				}
			};
		} ]);

	module.directive("cmCriteria", [ "camelia.core", "$log", "$injector", function(cc, $log, $injector) {
		return {
			require: "^cmDatacolumn",
			restrict: "E",
			scope: {
				type: '@'
			},
			compile: function() {
				return {
					pre: function($scope, element, attrs) {

						// console.log("PRE Criteria " + attrs.name);
					},
					post: function($scope, element, attrs, dataColumnController) {
						var type = $scope.type;
						if (!angular.isString(type) || !type.length) {
							throw new Error("Invalid criteria type (" + type + ")");
						}

						var criteriaName;
						var idx = type.indexOf('.');
						if (idx >= 0) {
							criteriaName = type;

						} else {
							criteriaName = "camelia.criteria." + type;
						}

						// console.log("POST Criteria " + attrs.name);

						var criterias = dataColumnController.criterias;
						try {
							$injector.invoke([ criteriaName, function(CriteriaClass) {
								var criteria = new CriteriaClass($scope, element, attrs);

								criterias.push(criteria);
							} ]);

						} catch (x) {
							$log.error("Can not instantiate criteria '" + criteriaName + "'", x);
						}
					}
				};
			}
		};
	} ]);

})(window, window.angular);
/**
 * @product CameliaJS (c) 2014 Vedana http://www.vedana.com
 * @license Creative Commons - The licensor permits others to copy, distribute,
 *          display, and perform the work. In return, licenses may not use the
 *          work for commercial purposes -- unless they get the licensor's
 *          permission.
 * @author olivier.oeuillot@vedana.com
 */

(function(window, angular, undefined) {
	'use strict';

	var module = angular.module('camelia.directives.pager', [ 'camelia.core', 'camelia.components.template' ]);

	module.value("cm_pager_componentProviderName", "camelia.components.pager:camelia.components.Pager");

	module.directive("cmPager", [ "$injector",
		"$interpolate",
		"$log",
		"$q",
		"camelia.core",
		"cm_pager_componentProviderName",
		"camelia.components.Template",
		function($injector, $interpolate, $log, $q, cc, cm_pager_componentProviderName, Template) {

			return {
				restrict: "E",
				scope: {
					forElementId: '@for',
					target: '=?',
					style: '@',
					className: '@class',
					caption: '@',
					tabIndex: '@',
					id: '@',
					format: '=?'
				},
				replace: true,

				controller: [ "$scope", function($scope) {
					var componentProvider = $scope.componentProvider;
					if (!componentProvider) {
						var componentProviderName = $scope.componentProviderName || cm_pager_componentProviderName;
						componentProvider = cc.LoadProvider(componentProviderName);
					}
					this.componentProvider = componentProvider;
				} ],
				compile: function() {
					return {
						pre: function($scope, element, attrs, controller) {
							Template.markContainer(element, $scope);
						},
						post: function($scope, element, attrs, controller, transludeFunc) {

							var pager = new controller.componentProvider($scope, element);

							var promise = $injector.invoke(pager.construct, pager);

							if (!cc.isPromise(promise)) {
								promise = $q.when(promise);
							}

							promise.then(function(pagerElement) {
								$log.info("Pager created ", pagerElement);

								element.replaceWith(pagerElement);

							}, function(reason) {
								$log.error("Failed to create pager ", reason);
							});
						}
					};
				}
			};
		} ]);
})(window, window.angular);
/**
 * @product CameliaJS (c) 2014 Vedana http://www.vedana.com
 * @license Creative Commons - The licensor permits others to copy, distribute,
 *          display, and perform the work. In return, licenses may not use the
 *          work for commercial purposes -- unless they get the licensor's
 *          permission.
 * @author olivier.oeuillot@vedana.com
 */

(function(window, angular, undefined) {
	'use strict';

	var module = angular.module('camelia.directives.template', [ 'camelia.components.template' ]);

	module.directive("cmTemplate", [ "$log", "camelia.components.Template", function($log, Template) {

		return {
			require: "^cmTemplateContainer",
			restrict: "E",
			scope: {
				name: '@'
				//enabled: '@'
			},
			transclude: true,

			compile: function() {
				return {
					pre: function($scope, element, attrs, controller) {

						$scope.enabledExpresion = element.attr("enabled");
					},
					post: function($scope, element, attrs, controller, transcludeFunc) {

						var template = new Template($scope, element, controller, transcludeFunc);

						element.remove();
					}
				};
			}
		};
	} ]);
})(window, window.angular);
/**
 * @product CameliaJS (c) 2014 Vedana http://www.vedana.com
 * @license Creative Commons - The licensor permits others to copy, distribute,
 *          display, and perform the work. In return, licenses may not use the
 *          work for commercial purposes -- unless they get the licensor's
 *          permission.
 * @author olivier.oeuillot@vedana.com
 */

(function(window, angular, undefined) {
	"use strict";

	var module = angular.module("camelia.animations.grid", [ "camelia.animations" ]);

})(window, window.angular);
/**
 * @product CameliaJS (c) 2014 Vedana http://www.vedana.com
 * @license Creative Commons - The licensor permits others to copy, distribute,
 *          display, and perform the work. In return, licenses may not use the
 *          work for commercial purposes -- unless they get the licensor's
 *          permission.
 * @author olivier.oeuillot@vedana.com
 */

(function(window, angular, undefined) {
	"use strict";

	var module = angular.module("camelia.animations", [ "camelia.core" ]);

	module.factory("camelia.animations.Animation", [ "$log",
		"$timeout",
		"$rootScope",
		"camelia.core",
		function($log, $timeout, $rootScope, cc) {

			var scopeProto = cc.getProto($rootScope);

			var Animation = function($scope, params) {

				cc.inheritScope(this, $scope);

				this._params = params;

				var self = this;
				this.$on("$destroy", function() {
					self._params = undefined;

					var showTimerPromise = self._showTimerPromise;
					if (showTimerPromise) {
						$timeout.cancel(showTimerPromise);
					}
				});
			};

			Animation.newInstance = function(animationName, $scope, params) {
				var AnimationProvider = cc.LoadProvider(animationName);
				if (!AnimationProvider) {
					throw new Error("Can not animation '" + animationName + "'");
				}

				return new AnimationProvider($scope, params);
			};

			cc.extendProto(Animation, scopeProto, {

				start: function() {

					if (this._timeout) {
						var self = this;

						this._showTimerPromise = $timeout(function() {
							self.end("timeout");

						}, this._timeout, false);
					}

					this._processStart();
				},

				_processStart: function() {
				},

				cancel: function() {

					if (this.canceled || this.ended) {
						return;
					}
					this.canceled = true;

					var showTimerPromise = this._showTimerPromise;
					if (showTimerPromise) {
						this._showTimerPromise = null;

						$timeout.cancel(showTimerPromise);
					}

					this._processCancel();
				},

				_processCancel: function() {
					this._destroy();
				},

				end: function(raison) {
					if (this.ended || this.canceled) {
						return;
					}
					this.ended = true;

					var showTimerPromise = this._showTimerPromise;
					if (showTimerPromise) {
						this._showTimerPromise = null;

						$timeout.cancel(showTimerPromise);
					}

					this._processEnd(raison);
				},

				_processEnd: function(raison) {
					this._destroy();
				},

				_destroy: function() {
					var self = this;
					$timeout(function() {
						self.$destroy();
					}, 0, false);
				}
			});

			return Animation;
		} ]);

})(window, window.angular);
/**
 * @product CameliaJS (c) 2014 Vedana http://www.vedana.com
 * @license Creative Commons - The licensor permits others to copy, distribute,
 *          display, and perform the work. In return, licenses may not use the
 *          work for commercial purposes -- unless they get the licensor's
 *          permission.
 * @author olivier.oeuillot@vedana.com
 */

(function(window, angular, undefined) {
	"use strict";

	var module = angular.module("camelia.animations.grid");

	module.factory("camelia.animations.grid.PageChange", [ "$log",
		"$timeout",
		"camelia.animations.Animation",
		'camelia.core',
		function($log, $timeout, Animation, cc) {

			var PageChange = function($scope, params) {
				Animation.call(this, $scope, params);

				this.renderer = params.renderer;

				this._timeout = this._params.timeout || 500;

				var self = this;
				var off = $scope.$on("cm:pageCreated", function(event, args) {
					self._args = args;

					off();
				});
			};

			cc.extend(PageChange, Animation, {

				_processStart: function() {
					this._hideBody();

					var renderer = this.renderer;
					var container = renderer.container;

					var cHeight = container.style.height;
					if (!cHeight || cHeight == "auto") {
						this._forceHeight = true;

						var containerBCR = container.getBoundingClientRect();
						container.style.height = containerBCR.height + "px";
					}

					var viewPort = renderer.tableViewPort;
					if (viewPort) {
						this._oldTableViewPort = viewPort;
					}

					var pageSeparator = cc.createElement(renderer.bodyContainer, "div", {
						className: "pageSeparator"
					});
					pageSeparator = pageSeparator[0];
					this._pageSeparator = pageSeparator;
					pageSeparator.style.visibility = "hidden";

					var self = this;
					this._targetY = 0;
					$timeout(function waitSize() {
						var pageSeparatorBCR = pageSeparator.getBoundingClientRect();
						if (!pageSeparatorBCR.height) {
							return $timeout(waitSize, 10, false);
						}

						var viewPortY = parseInt(viewPort.style.top || '0', 10);

						var viewPortBCR = viewPort.getBoundingClientRect();
						pageSeparator.style.width = viewPortBCR.width + "px";

						var pageSeparatorY = 0;

						if (self._params.oldFirst > self._params.first) {
							pageSeparatorY = viewPortY - pageSeparatorBCR.height;
							self._targetY -= pageSeparatorBCR.height;

						} else {
							pageSeparatorY = viewPortY + viewPortBCR.height;
							self._targetY += pageSeparatorBCR.height;
						}

						pageSeparator.style.top = pageSeparatorY + "px";
						pageSeparator.style.visibility = "visible";
						debugger;

					}, 10, false);

					this._animation = $timeout(function anim() {
						console.log("Animation=" + self._targetY);

						function addDy(comp) {
							if (!comp) {
								return;
							}
							var style = comp.style;
							style.top = (parseInt(style.top || '0', 10) + dy) + "px";
						}

						var dy = 0;
						if (self._targetY < 0) {
							dy = Math.max(self._targetY, -48);

						} else if (self._targetY > 0) {
							dy = Math.min(self._targetY, 48);
						}

						self._targetY -= dy;

						if (dy) {
							addDy(viewPort);
							addDy(self._args.tableViewPort);
							addDy(pageSeparator);

						} else if (self._stopAnim) {

							angular.element(pageSeparator).remove();
							angular.element(viewPort).remove();
							return;
						}

						return $timeout(anim, 50, false);

					}, 50, false);
				},

				_processEnd: function() {
					var tableViewPort = this._args.tableViewPort;
					var oldTableViewPort = this._oldTableViewPort;
					var fragment = this._args.fragment || tableViewPort;
					var pageSeparator = this._pageSeparator;

					var renderer = this.renderer;

					angular.element(renderer.bodyContainer).append(fragment);
					renderer.tableElement.style.tableLayout = "fixed";
					tableViewPort.style.visibility = "hidden";

					var self = this;
					$timeout(function waitSize() {
						var tableViewPortBCR = tableViewPort.getBoundingClientRect();
						if (!tableViewPortBCR.height) {
							return $timeout(waitSize, 10, false);
						}

						var pageSeparatorBCR = pageSeparator.getBoundingClientRect();

						var titleViewPortBCR = renderer.titleViewPort.getBoundingClientRect();

						var h = titleViewPortBCR.height + tableViewPortBCR.height;
						renderer.container.style.height = h + "px";
						renderer.bodyContainer.style.height = tableViewPortBCR.height + "px";

						var newY = 0;
						var bodyHeight = tableViewPortBCR.height + pageSeparatorBCR.height;

						var pagerY = parseInt(pageSeparator.style.top, 10);
						if (self._params.oldFirst > self._params.first) {
							newY = pagerY - tableViewPortBCR.height;
							self._targetY -= tableViewPortBCR.height;

						} else if (self._params.oldFirst === undefined) {
							newY = pagerY + pageSeparatorBCR.height;

						} else {
							newY = pagerY + pageSeparatorBCR.height;
							self._targetY += tableViewPortBCR.height;
						}
						self._stopAnim = true;

						tableViewPort.style.top = newY + "px";

						tableViewPort.style.visibility = "visible";

					}, 10, false);

					this._showBody();
				},

				_hideBody: function() {
					var renderer = this.renderer;

					var ts = renderer.tableViewPort.style;
					// ts.width = "auto";
					// ts.height = "auto";
					// ts.visibility = "hidden";
					// renderer.tableElement.style.tableLayout = "";

					$log.debug("Hide body");
				},
				_showBody: function() {
					var renderer = this.renderer;

					var ts = renderer.tableViewPort.style;
					// renderer.tableElement.style.tableLayout = "fixed";
					// ts.visibility = "";
					$log.debug("Show body");
				},

			});

			return PageChange;
		} ]);

})(window, window.angular);
/**
 * @product CameliaJS (c) 2014 Vedana http://www.vedana.com
 * @license Creative Commons - The licensor permits others to copy, distribute,
 *          display, and perform the work. In return, licenses may not use the
 *          work for commercial purposes -- unless they get the licensor's
 *          permission.
 * @author olivier.oeuillot@vedana.com
 */

(function(window, angular, undefined) {
	"use strict";

	var module = angular.module("camelia.animations.grid");

	module.factory("camelia.animations.grid.Waiting", [ "$log",
		"camelia.animations.grid.GridPageChange",
		'camelia.core',
		function($log, GridPageChange, cc) {

			var Waiting = function($scope, params) {
				GridPageChange.call(this, $scope, params);

				this.renderer = params.renderer;

				this._timeout = 0;

				var self = this;
				var off = $scope.$on("cm:pageCreated", function(event, args) {
					var tbody = args.tbody;
					if (tbody[0]) {
						tbody = tbody[0];
					}

					self._tbody = tbody;

					off();
				});
			};

			cc.extend(Waiting, GridPageChange, {

				_processStart: function() {
					this._hideBody();

					var renderer = this.renderer;
					var container = renderer.container;

					if (!container.style.height || container.style.height.indexOf("px") < 0) {
						this.forceHeight = true;

						var cr = container.getBoundingClientRect();
						container.style.height = cr.height + "px";
					}

					var tbody = renderer.tableTBody;
					if (tbody) {
						tbody.parentNode.removeChild(tbody);

						renderer.tableClearRows(tbody);
					}
				},

				_processEnd: function() {
					var tbody = this._tbody;

					var renderer = this.renderer;

					renderer.tableTBody = (tbody.nodeType == 11) ? tbody.firstChild : tbody;
					renderer.tableElement.appendChild(tbody);

					if (this.forceHeight) {
						renderer.container.style.height = "auto";
						renderer.tableViewPort.style.height = "auto";
					}

					this._showBody();
				},

				_hideBody: function() {
					var renderer = this.renderer;

					var ts = renderer.tableViewPort.style;
					ts.width = "auto";
					// ts.height = "auto";
					ts.visibility = "hidden";
					renderer.tableElement.style.tableLayout = "";

					$log.debug("Hide body");
				},
				_showBody: function() {
					var renderer = this.renderer;

					var ts = renderer.tableViewPort.style;
					renderer.tableElement.style.tableLayout = "fixed";
					ts.visibility = "";
					$log.debug("Show body");
				},

			});

			return PageChange;
		} ]);

})(window, window.angular);
/**
 * @product CameliaJS (c) 2014 Vedana http://www.vedana.com
 * @license Creative Commons - The licensor permits others to copy, distribute,
 *          display, and perform the work. In return, licenses may not use the
 *          work for commercial purposes -- unless they get the licensor's
 *          permission.
 * @author olivier.oeuillot@vedana.com
 */

(function(window, angular, undefined) {
	"use strict";

	var module = angular.module("camelia.i18n.criteria", []);

	module.factory("camelia.i18n.Criteria", [ function() {

		return {
			'en': {
				alphabetic_others: "Others"
			}
		};

	} ]);

})(window, window.angular);
/**
 * @product CameliaJS (c) 2014 Vedana http://www.vedana.com
 * @license Creative Commons - The licensor permits others to copy, distribute,
 *          display, and perform the work. In return, licenses may not use the
 *          work for commercial purposes -- unless they get the licensor's
 *          permission.
 * @author olivier.oeuillot@vedana.com
 */

(function(window, angular, undefined) {
	"use strict";

	var module = angular.module("camelia.i18n.criteria");

	module.config([ '$provide', function($provide) {

		$provide.decorator("camelia.i18n.Criteria", [ '$delegate', function($delegate) {

			return angular.extend($delegate, {
				'fr': {
					alphabetic_others: "Autres"
				}
			});
		} ]);
	} ]);

})(window, window.angular);
/**
 * @product CameliaJS (c) 2014 Vedana http://www.vedana.com
 * @license Creative Commons - The licensor permits others to copy, distribute,
 *          display, and perform the work. In return, licenses may not use the
 *          work for commercial purposes -- unless they get the licensor's
 *          permission.
 * @author olivier.oeuillot@vedana.com
 */

(function(window, angular, undefined) {
	"use strict";

	var module = angular.module("camelia.i18n.grid", []);

	module.factory("camelia.i18n.Grid", [ function() {

		return {
			'en': {
				sortableColumn: "(Sortable)",
				ascending: "(Sorted order ascending)",
				descending: "(Sorted order descending)",
				filtreableColumn: "",
				filtredColumn: "(Filtred)"
			}
		};

	} ]);

})(window, window.angular);
/**
 * @product CameliaJS (c) 2014 Vedana http://www.vedana.com
 * @license Creative Commons - The licensor permits others to copy, distribute,
 *          display, and perform the work. In return, licenses may not use the
 *          work for commercial purposes -- unless they get the licensor's
 *          permission.
 * @author olivier.oeuillot@vedana.com
 */

(function(window, angular, undefined) {
	"use strict";

	var module = angular.module("camelia.i18n.grid");

	module.config([ '$provide', function($provide) {

		$provide.decorator("camelia.i18n.Grid", [ '$delegate', function($delegate) {

			return angular.extend($delegate, {
				'fr': {
					sortableColumn: "(Triable)",
					ascending: "(Trié ordre croissant)",
					descending: "(Trié ordre decroissant)",
					filtreableColumn: "",
					filtredColumn: "(Filtrée)"
				}
			});
		} ]);
	} ]);

})(window, window.angular);
/**
 * @product CameliaJS (c) 2014 Vedana http://www.vedana.com
 * @license Creative Commons - The licensor permits others to copy, distribute,
 *          display, and perform the work. In return, licenses may not use the
 *          work for commercial purposes -- unless they get the licensor's
 *          permission.
 * @author olivier.oeuillot@vedana.com
 */

(function(window, angular, undefined) {
	"use strict";

	var module = angular.module("camelia.i18n.pager", []);

	module.factory("camelia.i18n.Pager", [ function() {

		return {
			'en': {
				bfirst_label: "First",
				blast_label: "Last",
				bprev_label: "<",
				bprev_tooltip: "Show previous page",
				bnext_label: ">",
				bnext_tooltip: "Show next page",
				index_label: "{pageIndex}",
				index_tooltip: "Show page #{pageIndex}",
				cindex_label: "{pageIndex}",
				cindex_tooltip: "Current page #{pageIndex}",
				uindex_label: "...",
				uindex_tooltip: "Show next page",
				separator: " ",
				noPages: "No pages"
			}
		};

	} ]);

})(window, window.angular);
/**
 * @product CameliaJS (c) 2014 Vedana http://www.vedana.com
 * @license Creative Commons - The licensor permits others to copy, distribute,
 *          display, and perform the work. In return, licenses may not use the
 *          work for commercial purposes -- unless they get the licensor's
 *          permission.
 * @author olivier.oeuillot@vedana.com
 */

(function(window, angular, undefined) {
	"use strict";

	var module = angular.module("camelia.i18n.pager");

	module.config([ '$provide', function($provide) {

		$provide.decorator("camelia.i18n.Pager", [ '$delegate', function($delegate) {

			return angular.extend($delegate, {
				'fr': {
					bfirst_label: "Premier",
					blast_label: "Dernier",
					bprev_label: "Précédent",
					bprev_tooltip: "Voir la page précédente",
					bnext_label: "Suivant",
					bnext_tooltip: "Voir la page suivante",
					index_label: "{pageIndex}",
					index_tooltip: "Voir page #{pageIndex}",
					cindex_label: "{pageIndex}",
					cindex_tooltip: "Page courrante #{pageIndex}",
					uindex_label: "...",
					uindex_tooltip: "Voir la page suivante",
					separator: " ",
					noPages: "Aucune page"
				}
			});
		} ]);
	} ]);

})(window, window.angular);