/**
 * @product CameliaJS (c) 2014 Vedana http://www.vedana.com
 * @license Creative Commons - The licensor permits others to copy, distribute, display, and perform the work. In return, licenses may not use the work for commercial purposes -- unless they get the licensor's permission.
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

					var msie = undefined;

					return {
						Assert: function(arg, name, message) {
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

							var element = undefined;

							for (var i = 1; i < arguments.length;) {
								var tagName = arguments[i++];
								var properties = arguments[i++];

								this.Assert(typeof (tagName) == "string", "createElement", "Invalid 'tagName' parameter (" + tagName
										+ ")");
								this.Assert(properties === undefined || typeof (properties) == "object", "createElement",
										"Invalid properties parameter (" + properties + ")");

								if (this.IsMSIE() <= 6 && tagName.toLowerCase() == "input" && properties && properties.type
										&& properties.name) {
									element = doc.createElement("<input name=\"" + properties.name + "\" type=\"" + properties.type
											+ "\">");
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
											fn.handler.call(element, event)
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
							}

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

							this.log("SetFocus ", element)

							try {
								element.focus();

							} catch (x) {
								$log.error(x);
							}
						},
						
						lang: function(bundle, labelName) {
							return bundle.en[labelName];
						},
					};
				} ]);

})(window, window.angular);