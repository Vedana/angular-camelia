/**
 * @product CameliaJS (c) 2016 Vedana http://www.vedana.com
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
				"$timeout",
				function($q, $rootScope, $log, $exceptionHandler, $injector, $timeout) {

					var cmTypeMatchRegexp = /cm_([a-z]*)_.*/i;

					var ESCAPE_REGEXP = /([\\\/\.\*\+\?\|\(\)\[\]\{\}\-\^])/g;

					function int(str) {
						return parseInt(str, 10);
					}

					var msie;

					return {
						EMPTY_IMAGE_SRC: 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==',

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
							if (parent.nodeType === Node.DOCUMENT_NODE) {
								doc = parent;
								parent = doc.body.parentNode;

							} else {
								doc = parent.ownerDocument;
							}

							var element;

							for (var i = 1; i < arguments.length;) {
								tagName = arguments[i++];
								properties = arguments[i++];

								this.Assert(typeof (tagName) === "string", "createElement", "Invalid 'tagName' parameter (" + tagName +
										")");
								this.Assert(properties === undefined || typeof (properties) === "object", "createElement",
										"Invalid properties parameter (" + properties + ")");

								if (this.IsMSIE() <= 6 && tagName.toLowerCase() === "input" && properties && properties.type &&
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
											if (value === undefined) {
												break;
											}
											if (!name.indexOf("css")) { /* ==0 !!! */
												element.style[name.substring(3, 4).toLowerCase() + name.substring(4)] = value;
												break;
											}

											switch (typeof (value)) {
											case "function":
											case "object":
												if (name.charAt(0) === "$") {
													name = name.substring(1);
												}
												element[name] = value;
												break;

											default:
												if (name.charAt(0) !== "$") {
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
								if (extensions) {
									mat(classes, base, 0);
								}
							}

							if (element[0]) {
								element = element[0];
							}

							if (constantClasses) {
								classes = classes.concat(constantClasses);
							}

							var className = classes.join(" ");
							if (element.className === className) {
								return false;
							}

							element.className = className;
							return true;
						},

						BubbleEvent: function(element, eventName, eventData) {
							/*
							 * if (element[0]) { element = element[0]; } var jqLite =
							 * angular.element;
							 * 
							 * var cache = jqLite.cache; var expando = jqLite.expando;
							 * 
							 * eventData = eventData || [];
							 * 
							 * var event = { type: eventName, currentTarget: element,
							 * relatedTarget: element, preventDefault: angular.noop,
							 * stopPropagation: function() { this.stop = true; } };
							 * 
							 * angular.extend(event, eventData);
							 * 
							 * var params = [ event ];
							 * 
							 * for (; element && element.nodeType === Node.ELEMENT_NODE &&
							 * !event.stop; element = element.parentNode) {
							 * 
							 * var expandoId = element[expando]; if (!expandoId) { continue; }
							 * var expandoStore = cache[expandoId]; if (!expandoStore) {
							 * continue; } var events = expandoStore.events; if (!events) {
							 * continue; } var eventFns = events[eventName]; if (!eventFns) {
							 * continue; }
							 * 
							 * angular.forEach(eventFns, function(fn) { if (event.stop) {
							 * return; }
							 * 
							 * try { if (fn.call) { fn.call(element, event); return; } if
							 * (fn.handler) { fn.handler.call(element, event); } } catch (e) {
							 * $exceptionHandler(e); } }); }
							 */
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
									if (self.isWindow(arg)) {
										sp.push("<<WINDOW>>");
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
							var moduleName = "";
							var idx = providerName.indexOf(":");
							if (idx > 0) {
								moduleName = providerName.substring(0, idx);
								providerName = providerName.substring(idx + 1);

								if (!myInjector.has(providerName)) {
									myInjector = angular.injector([ "ng", "camelia.core", moduleName ]);
									
									throw new Error("Provider '"+moduleName+"' is not in the context !");
								}
							}

							var provider = myInjector.get(providerName);
							if (provider) {
								return provider;
							}

							var err = new Error("Can not find provider='" + providerName + "' moduleName='" + moduleName + "'");
							$log.error(err);
							throw err;
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
						isWindow: function(obj) {
							return obj && obj.document && obj.location && obj.alert && obj.setInterval;
						},
						isScope: function(obj) {
							return obj && obj.$evalAsync && obj.$watch;
						},

						ensurePromise: function(object) {
							return this.isPromise(object) ? object : $q.when(object);
						},
						toBoolean: function(value, defaultValue) {
							if (value === true) {
								return value;
							}

							if (value && value.length) {
								var v = value.toLowerCase();
								return !(v === "f" || v === "0" || v === "false" || v === "no" || v === "n" || v === "[]");
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
							if (element[0]) {
								element = element[0];
							}

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

								if (ad.type !== type) {
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
						on: function(target, type, listener, useCapture, scope, async) {
							if (target[0]) {
								target = target[0];
							}

							var listenerApply = function(event) {
								var self = this;

								try {
									if (async !== false) {
										return $timeout(function() {

											listener.call(self, event);

											(scope || $rootScope).$apply();

										}, 0, false);
									}

									var ret;
									(scope || $rootScope).$apply(function() {
										ret = listener.call(self, event);
									});

									return ret;
								} catch (x) {
									$log.error(x);
								}
							};

							target.addEventListener(type, listenerApply, useCapture);

							var off = function() {
								target.removeEventListener(type, listenerApply, useCapture);
							};

							if (scope) {
								scope.$on("$destroy", off);
							}

							return off;
						},

						/**
						 * @method private static
						 * 
						 * There are a few reserved chars in regular expressions. Handle
						 * string encoding with a powerfull regular expression. Reserved
						 * chars are the following set: \/.*+?|()[]{}-^
						 */
						escapeRegexp: function(str) {
							if (!str) {
								return "";
							}
							return str.replace(ESCAPE_REGEXP, "\\$1");
						},
						callPromise: function(f, thiz, params) {
							return function() {
								var ret = f.call(thiz, params);

								return ret;
							};
						},

					};
				} ]);

})(window, window.angular);