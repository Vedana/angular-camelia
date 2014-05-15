/**
 * @license CameliaJS (c) 2014 Vedana http://www.vedana.com
 * @author olivier@oeuillot.net
 */

(function(window, angular, undefined) {
	"use strict";

	var module = angular.module("camelia.renderers.pager", [ "camelia.components.pager",
		"camelia.key",
		"camelia.i18n.pager" ]);

	module.value("cm_pager_className", "cm_pager");

	module.factory("camelia.renderers.PagerProvider", [ "$log",
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

			function OnMouseOver(renderContext) {
				return function(event) {
					var target = event.target;

					var elements = SearchElements(target);
					cm.SwitchOnState(renderContext, elements, "over");
				};
			}

			function OnMouseOut(renderContext) {
				return function(event) {
					var target = event.relatedTarget;

					var elements = SearchElements(target);
					cm.SwitchOffState(renderContext, elements, "over");
				};
			}

			function OnFocus(renderContext) {
				return function(event) {
					var target = event.target;

					var elements = SearchElements(target);
					cm.SwitchOnState(renderContext, elements, "focus", function(elements) {
					});
				};
			}

			function OnBlur(renderContext) {
				return function(event) {
					var target = event.relatedTarget;

					var elements = SearchElements(target);
					cm.SwitchOffState(renderContext, elements, "focus");
				};
			}

			function OnMouseDown(renderContext) {
				return function(event) {
					var target = event.target;

					var elements = SearchElements(target);
					cm.SwitchOnState(renderContext, elements, "mouseDown", function(elements) {
					});
				};
			}

			function OnMouseUp(renderContext) {
				return function(event) {
					var elements = SearchElements();
					cm.ClearState(renderContext, "mouseDown", elements, function(elements) {
					});
				};
			}

			function OnKeyPress(renderContext) {
				return function(event) {
					var target = event.target;
					var elements = SearchElements(target);
				};
			}

			function OnSimpleClick(renderContext) {
				return function(event) {
					var target = event.target;

					var elements = SearchElements(target);

					cc.log("Simple click on ", target, " elements=", elements);

					var button = elements.bpager;
					if (button && button.value) {
						renderContext.target.setFirst(parseInt(button.value, 10));
					}
				}
			}

			function OnStyleUpdate(renderContext) {

				var _styleUpdateMapper = {
					pager: "PagerStyleUpdate",
					vpager: "ValueStyleUpdate",
					bpager: "ButtonStyleUpdate",
					lpager: "LabelStyleUpdate"
				};

				return function(event) {
					var target = event.relatedTarget;

					var type = cm.GetCMType(target);
					if (!type) {
						return;
					}

					var elt = angular.element(target);

					// cc.log("Update relatedTarget=", target, " type=" + type + " over="
					// + target._over + " mouseDown="+ target._mouseDown);

					var rp = renderContext.rendererProvider[_styleUpdateMapper[type]];
					if (rp) {
						rp(elt, renderContext);
						event.stopPropagation();
						return;
					}
				};
			}

			function PagerRenderer(parent, renderContext) {
				var container = cc.createElement(parent, "div", {
					id: renderContext.pager.id,
					$cm_type: "pager"
				});

				renderContext.containerElement = container[0];

				container.on("mouseover", OnMouseOver(renderContext));

				container.on("mouseout", OnMouseOut(renderContext));

				container.on("mousedown", OnMouseDown(renderContext));

				// container.on("dblclick", OnDoubleClick(renderContext));

				container.on("click", OnSimpleClick(renderContext));

				container.on("mouseup", OnMouseUp(renderContext));

				container.on("keydown", OnKeyPress(renderContext));
				// container.on("keypress", OnKeyPress(renderContext));

				renderContext._focusListener = OnFocus(renderContext);
				container[0].addEventListener("focus", renderContext._focusListener, true);

				renderContext._blurListener = OnBlur(renderContext);
				container[0].addEventListener("blur", renderContext._blurListener, true);

				renderContext.$scope.$on("$destroy", function() {
					var listener = renderContext._focusListener;
					if (listener) {
						renderContext._focusListener = undefined;
						container[0].removeEventListener("focus", listener, true);
					}

					listener = renderContext._blurListener;
					if (listener) {
						renderContext._blurListener = undefined;
						container[0].removeEventListener("blur", listener, true);
					}
				});

				container.on("cm_update", OnStyleUpdate(renderContext));

				return container;
			}

			function PagerPositionsUpdate(positions, renderContext) {

				var container = angular.element(renderContext.containerElement);

				container.empty();

				var fragment = document.createDocumentFragment();

				renderContext.rendererProvider.RenderExpression(fragment, renderContext, renderContext.format, positions);

				container.append(fragment);
			}

			function RenderExpression(fragment, renderContext, message, positions) {

				var renderType = renderContext.rendererProvider.RenderType;

				var span = null;
				for (var i = 0; i < message.length;) {
					var c = message.charAt(i++);
					if (c == "{") {
						var end = message.indexOf("}", i);
						var varName = message.substring(i, end).toLowerCase();
						i = end + 1;

						if (span && span.length) {
							RenderSpan(fragment, renderContext, span.join(""));
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

						renderType(fragment, renderContext, varName, parameters, positions);

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
					RenderSpan(fragment, renderContext, span.join(""));
				}
			}

			function RenderSpan(parent, renderContext, text) {
				var element = cc.createElement(parent, "span", {
					textNode: text,
					id: "cm_lpager_" + (anonymousId++)
				});

				renderContext.rendererProvider.LabelStyleUpdate(element, renderContext);

				return element;
			}

			function RenderButton(parent, renderContext, value, type) {
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

				renderContext.rendererProvider.ButtonStyleUpdate(element, renderContext);

				return element;
			}

			function RenderValue(parent, renderContext, value, type) {
				var element = cc.createElement(parent, "span", {
					textNode: value,
					id: "cm_vpager_" + (anonymousId++),
					$pagerType: type
				});

				renderContext.rendererProvider.ValueStyleUpdate(element, renderContext);

				return element;
			}

			function RenderType(fragment, renderContext, type, parameters, positions) {
				var first = positions.first;
				var rowCount = positions.rowCount;
				var maxRows = positions.maxRows;
				var rows = positions.rows;

				var renderValue = renderContext.rendererProvider.RenderValue;
				var renderButton = renderContext.rendererProvider.RenderButton;

				switch (type) {
				case "first":
				case "position":
					renderValue(fragment, renderContext, first + 1, "first");
					break;

				case "last":
					var last = first + rows;
					if (rowCount >= 0 && last >= rowCount) {
						last = rowCount;
					} else if (maxRows > 0 && last >= maxRows) {
						last = maxRows;
					}

					renderValue(fragment, renderContext, last, "last");
					break;

				case "rowcount":
					if (rowCount < 0) {
						return;
					}
					renderValue(fragment, renderContext, rowCount, "rowCount");
					break;

				case "pagecount":
					if (rowCount < 0 || rows <= 0) {
						return;
					}

					var pageCount = Math.floor(((rowCount - 1) / rows) + 1);
					renderValue(fragment, renderContext, pageCount, "pageCount");
					break;

				case "pageposition":
					if (rows <= 0) {
						return;
					}

					var pagePosition = Math.floor(first / rows) + 1;
					renderValue(fragment, renderContext, pagePosition, "pagePosition");
					break;

				case "bprev":
					var idx = first - rows;
					if (idx < 0) {
						idx = 0;
					}

					renderButton(fragment, renderContext, (first > 0) ? idx : -1, "bprev");
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

					renderButton(fragment, renderContext, nextIndex, "bnext");
					break;
				}

			}

			function PagerStyleUpdate(element, renderContext) {
				var classes = cm_pager_className.split(" ");

				var className = renderContext.$scope.className;
				if (className) {
					classes.push(className);
				}

				return cm.MixElementClasses(element, classes);
			}

			function LabelStyleUpdate(element, renderContext) {
				return cm.MixElementClasses(element, [ "cm_pager_label" ]);
			}

			function ValueStyleUpdate(element, renderContext) {
				if (element[0]) {
					element = element[0];
				}
				return cm.MixElementClasses(element, [ "cm_pager_value", "cm_pager_value_" + element.pagerType ]);
			}

			function ButtonStyleUpdate(element, renderContext) {
				if (element[0]) {
					element = element[0];
				}
				return cm.MixElementClasses(element, [ "cm_pager_button", "cm_pager_button_" + element.pagerType ]);
			}

			return {
				PagerRenderer: PagerRenderer,
				PagerPositionsUpdate: PagerPositionsUpdate,

				RenderType: RenderType,
				RenderValue: RenderValue,
				RenderButton: RenderButton,
				RenderExpression: RenderExpression,

				PagerStyleUpdate: PagerStyleUpdate,
				ValueStyleUpdate: ValueStyleUpdate,
				ButtonStyleUpdate: ButtonStyleUpdate,
				LabelStyleUpdate: LabelStyleUpdate
			};

		} ]);

})(window, window.angular);