/**
 * @product CameliaJS (c) 2014 Vedana http://www.vedana.com
 * @license Creative Commons - The licensor permits others to copy, distribute, display, and perform the work. In return, licenses may not use the work for commercial purposes -- unless they get the licensor's permission.
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
		"camelia.i18n.pager",
		function($log, $q, $exceptionHandler, cc, cm, cm_pager_className, Key, i18n) {

			var anonymousId = 0;

			function SearchElements(target) {
				return cm.SearchElements({
					lpager: null,
					vpager: null,
					bpager: null,
					pager: null
				}, "pager", target);
			}

			var PagerRenderer = function(renderContext) {
				angular.extend(this, renderContext);
			}

			PagerRenderer.prototype = {
				render: function(parent) {
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

					this._focusListener = this._onFocus();
					container[0].addEventListener("focus", this._focusListener, true);

					this._blurListener = this._onBlur();
					container[0].addEventListener("blur", this._blurListener, true);

					this.$scope.$on("$destroy", function() {
						var listener = this._focusListener;
						if (listener) {
							this._focusListener = undefined;
							container[0].removeEventListener("focus", listener, true);
						}

						listener = this._blurListener;
						if (listener) {
							this._blurListener = undefined;
							container[0].removeEventListener("blur", listener, true);
						}
					});

					container.on("cm_update", this._onStyleUpdate());

					return container;
				},

				_onMouseOver: function() {
					var self = this;

					return function(event) {
						var target = event.target;

						var elements = SearchElements(target);
						cm.SwitchOnState(self, elements, "over");
					};
				},

				_onMouseOut: function() {
					var self = this;

					return function(event) {
						var target = event.relatedTarget;

						var elements = SearchElements(target);
						cm.SwitchOffState(self, elements, "over");
					};
				},

				_onFocus: function() {
					var self = this;

					return function(event) {
						var target = event.target;

						var elements = SearchElements(target);
						cm.SwitchOnState(self, elements, "focus");
					};
				},

				_onBlur: function() {
					var self = this;

					return function(event) {
						var target = event.relatedTarget;

						var elements = SearchElements(target);
						cm.SwitchOffState(self, elements, "focus");
					};
				},

				_onMouseDown: function() {
					var self = this;

					return function(event) {
						var target = event.target;

						var elements = SearchElements(target);
						cm.SwitchOnState(self, elements, "mouseDown");
					};
				},

				_onMouseUp: function() {
					var self = this;

					return function(event) {
						var elements = SearchElements();
						cm.ClearState(self, elements, "mouseDown");
					};
				},

				_onKeyPress: function() {
					var self = this;

					return function(event) {
						var target = event.target;
						var elements = SearchElements(target);
					};
				},

				_onSimpleClick: function() {
					var self = this;

					return function(event) {
						var target = event.target;

						var elements = SearchElements(target);

						// cc.log("Simple click on ", target, " elements=", elements);

						var button = elements.bpager;
						if (button && button.value) {
							self.target.setFirst(parseInt(button.value, 10));
						}
					}
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

							this.renderType(fragment, varName, parameters, positions);

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

				renderButton: function(parent, value, type) {
					var element = cc.createElement(parent, "button", {
						textNode: i18n[type + "_label"],
						id: "cm_bpager_" + (anonymousId++),
						$value: value,
						$pagerType: type
					});
					var toolTip = i18n[type + "_tooltip"];
					if (toolTip) {
						element.title = toolTip;
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

				renderType: function(fragment, type, parameters, positions) {
					var first = positions.first;
					var rowCount = positions.rowCount;
					var maxRows = positions.maxRows;
					var rows = positions.rows;

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