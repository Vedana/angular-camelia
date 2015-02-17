/**
 * @product CameliaJS (c) 2015 Vedana http://www.vedana.com
 * @license Creative Commons - The licensor permits others to copy, distribute,
 *          display, and perform the work. In return, licenses may not use the
 *          work for commercial purposes -- unless they get the licensor's
 *          permission.
 * @author olivier.oeuillot@vedana.com
 */

/* jshint sub: true, shadow: true */
/* jshint -W080 */

(function(window, angular, undefined) {
	"use strict";

	var module = angular.module("camelia.renderers.pager", [ "camelia.components.pager",
		"camelia.i18n.pager" ]);

	module.value("cm_pager_className", "cm_pager");

	// Caution, it is not a singleton if $injector is used !
	var anonymousId = 0;

	module.factory("camelia.renderers.Pager",
			[ "$log",
				"$q",
				"$exceptionHandler",
				"camelia.core",
				"camelia.cmTypes",
				"camelia.UI",
				"cm_pager_className",
				"camelia.Key",
				"camelia.i18n.Pager",
				function($log, $q, $exceptionHandler, cc, cm, cui, cm_pager_className, Key, i18n) {

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

							var self = this;
							$scope.$watch("style", function onStyleChanged(style) {
								style = style || "";
								container.attr("style", style);
							});

							$scope.$watch("className", function onClassNameChanged() {
								self.pagerStyleUpdate(container);
							});

							container.on("mouseover", this._onMouseOver());

							container.on("mouseout", this._onMouseOut());

							container.on("mousedown", this._onMouseDown());

							// container.on("dblclick", OnDoubleClick(renderContext));

							container.on("click", this._onSimpleClick());

							container.on("mouseup", this._onMouseUp());

							container.on("keydown", this._onKeyPress());
							// container.on("keypress", OnKeyPress(renderContext));

							cc.on(container, "focus", this._onFocus(), true, $scope);
							cc.on(container, "blur", this._onBlur(), true, $scope);

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
								var cancel = false;

								var next;
								switch (event.keyCode) {
								case Key.VK_RIGHT:
									cancel = true;
									next = cui.GetNextFocusable(self.containerElement, target);
									break;

								case Key.VK_LEFT:
									cancel = true;
									next = cui.GetPreviousFocusable(self.containerElement, target);
									break;
								}

								if (cancel) {
									event.stopPropagation();
									event.preventDefault();
								}
								if (next) {
									next.focus();
								}
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

							var butFocusId = this["bpager_focus"];
							var prevButtonInfo = null;
							if (butFocusId) {
								var but = document.getElementById(butFocusId);
								if (but) {
									prevButtonInfo = {
										type: but.pagerType,
										value: but.getAttribute("value")
									};
								}
							}

							container.empty();

							var fragment = document.createDocumentFragment();

							var components = {};
							this.renderExpression(fragment, this.format, positions, components);

							container.append(fragment);

							if (prevButtonInfo) {
								var s;

								switch (prevButtonInfo.type) {
								case "bprev":
									s = [ "bprev", "bnext", "index:i0", "index:i1" ];
									break;

								case "bnext":
									s = [ "bnext", "bprev", "index:i0", "index:i1" ];
									break;

								case "uindex":
									s = [ "uindex", "bprev", "index:i0" ];
									break;

								case "index":
									var v = parseInt(prevButtonInfo.value, 10);
									s = [ "index:p" + (v + this.$scope.rows),
										"uindex",
										"index:p" + (v - this.$scope.rows),
										"bnext",
										"bprev" ];

									break;
								}

								if (s) {
									for (var i = 0; i < s.length; i++) {
										var sib = components[s[i]];
										if (sib && !sib.attr("disabled")) {
											cc.setFocus(sib);
											break;
										}
									}
								}
							}
						},

						renderExpression: function(fragment, message, positions, components) {
							var $scope = this.$scope;
							$scope.first = positions.first;
							$scope.rowCount = positions.rowCount;
							$scope.maxRows = positions.maxRows;
							$scope.rows = positions.rows;

							var templateScope = $scope.$new(false);
							try {
								var span = null;
								for (var i = 0; i < message.length;) {
									var c = message.charAt(i++);
									if (c === "{") {
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

											parameters = {};

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

										this.renderType(fragment, varName, parameters, components, templateScope);

										continue;
									}

									if (c === "\'") {
										if (!span) {
											span = [];
										}
										for (var j = i;;) {
											var end = message.indexOf("'", j);
											if (end < 0) {
												span.push(message.substring(j));
												i = message.length;
												break;
											}

											if (message.charAt(end + 1) === "\'") {
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
										span = [];
									}
									span.push(c);
								}

								if (span && span.length) {
									this.renderSpan(fragment, span.join(""));
								}

							} finally {
								templateScope.$destroy();
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

						renderButton: function(parent, value, type, langParams, templateScope) {

							var text = cc.lang(i18n, type + "_label", langParams);
							var tooltip = cc.lang(i18n, type + "_tooltip", langParams);
							var className = cc.lang(i18n, type + "_className", langParams);

							templateScope.$value = value;
							templateScope.$text = text;
							templateScope.$tooltip = tooltip;
							templateScope.$disabled = (value < 0);

							try {
								if (this._templates) {
									var template = this._templates[type];
									if (template) {
										var comp = template.transclude(parent, templateScope);

										return comp;
									}
								}

								var element = cc.createElement(parent, "button", {
									id: "cm_bpager_" + (anonymousId++),
									$value: value,
									$pagerType: type
								});
								var span = cc.createElement(element, "span", {
									className: "cm_bpager_span " + ((className) ? className : ""),
									textNode: (text) ? text : null
								});

								if (templateScope.$tooltip) {
									element.attr("title", templateScope.$tooltip);
									element.attr("aria-label", templateScope.$tooltip);
									// If tooltip ignore the TEXT
									span.attr("aria-hidden", true);
								}
								if (templateScope.$disabled) {
									element.attr("disabled", true);
								}

								this.buttonStyleUpdate(element);

								return element;

							} finally {
								delete templateScope.$value;
								delete templateScope.$text;
								delete templateScope.$tooltip;
								delete templateScope.$disabled;
							}
						},

						renderValue: function(parent, value, type, templateScope) {

							if (this._templates) {
								var template = this._templates[type];
								if (template) {
									var comp = template.transclude(parent, templateScope);

									return comp;
								}
							}

							var element = cc.createElement(parent, "span", {
								textNode: value,
								id: "cm_vpager_" + (anonymousId++),
								$pagerType: type
							});

							this.valueStyleUpdate(element);

							return element;
						},

						renderType: function(fragment, type, parameters, components, templateScope) {
							var $scope = this.$scope;

							var first = $scope.first;
							var rowCount = $scope.rowCount;
							var maxRows = $scope.maxRows;
							var rows = $scope.rows;

							if (!rows) {
								return;
							}

							templateScope.$parameters = parameters;
							templateScope.$type = type;

							try {
								switch (type) {
								case "first":
								case "position":
									this.renderValue(fragment, first + 1, "first", templateScope);
									break;

								case "last":
									var last = first + rows;
									if (rowCount >= 0 && last >= rowCount) {
										last = rowCount;
									} else if (maxRows > 0 && last >= maxRows) {
										last = maxRows;
									}

									this.renderValue(fragment, last, "last", templateScope);
									break;

								case "rowcount":
									if (rowCount < 0) {
										return;
									}
									this.renderValue(fragment, rowCount, "rowCount", templateScope);
									break;

								case "pagecount":
									if (rowCount < 0 || rows <= 0) {
										return;
									}

									var pageCount = Math.floor(((rowCount - 1) / rows) + 1);
									this.renderValue(fragment, pageCount, "pageCount", templateScope);
									break;

								case "pageposition":
									if (rows <= 0) {
										return;
									}

									var pagePosition = Math.floor(first / rows) + 1;
									this.renderValue(fragment, pagePosition, "pagePosition", templateScope);
									break;

								case "bprev":
									var idx = first - rows;
									if (idx < 0) {
										idx = 0;
									}

									var prevBut = this.renderButton(fragment, (first > 0) ? idx : -1, "bprev", null, templateScope);
									components.bprev = prevBut;
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

									var nextBut = this.renderButton(fragment, nextIndex, "bnext", null, templateScope);
									components.bnext = nextBut;
									break;

								case "bpages":
									this.appendBPages(fragment, parameters, components, templateScope);
									break;
								}

							} finally {
								delete templateScope.$value;
								delete templateScope.$parameters;
								delete templateScope.$type;
							}

						},

						appendBPages: function(parent, parameters, components, templateScope) {
							var $scope = this.$scope;

							var first = $scope.first;
							var rowCount = $scope.rowCount;
							var maxRows = $scope.maxRows;
							var rows = $scope.rows;

							if (!maxRows) {
								this.renderValue(parent, cc.lang(i18n, "noPages"), "noPages", templateScope);
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
								if (rowCount < 0 && pi + 1 === nbPage) {
									label = "...";
									type = "uindex";

								} else if (pi === selectedPage) {
									type = "cindex";
								}

								var langParams = {
									pageIndex: pi + 1
								};

								templateScope.$index = i;
								templateScope.$pageIndex = pi;
								templateScope.$rowIndex = pi * rows;
								templateScope.$currentPage = (pi === selectedPage);

								try {
									var but = this.renderButton(parent, (pi === selectedPage) ? -1 : (pi * rows), type, langParams,
											templateScope);

									if (type === "index") {
										components["index:p" + (pi * rows)] = but;
										components["index:i" + i] = but;

									} else {
										components[type] = but;
									}

								} finally {
									delete templateScope.$index;
									delete templateScope.$pageIndex;
									delete templateScope.$rowIndex;
									delete templateScope.$currentPage;
								}
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