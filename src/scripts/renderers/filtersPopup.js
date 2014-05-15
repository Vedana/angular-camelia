/**
 * @license CameliaJS (c) 2014 Vedana http://www.vedana.com
 * @author olivier@oeuillot.net
 */

(function(window, angular, undefined) {
	"use strict";

	var module = angular.module("camelia.renderers.grid");

	module.value("cm_filtersPopup_className", "cm_popup cm_filtersPopup");

	var anonymousId = 0;

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

			function SearchElements(target) {
				return cm.SearchElements({
					lfilter: null,
					ifilter: null,
					rfilter: null,
					popup: null
				}, "popup", target);
			}

			function OnMouseOver(renderContext) {
				return function(event) {
					var target = event.target;

					var elements = SearchElements(target);

					console.log("OverElements=", elements);
					cm.SwitchOnState(renderContext, elements, "over");
				};
			}

			function OnMouseOut(renderContext) {
				return function(event) {
					var target = event.relatedTarget;

					var elements = SearchElements(target);
					console.log("OutElements=", target, " elements=", elements);
					cm.SwitchOffState(renderContext, elements, "over");
				};
			}

			function OnMouseLeave(renderContext) {
				return function(event) {
					var target = event.target;

					var elements = SearchElements(target);
					console.log("LeaveElements=", target, " elements=", elements);
					cm.SwitchOffState(renderContext, elements, "over");
				};
			}

			function OnFocus(renderContext) {
				return function(event) {
					var target = event.target;

					var elements = SearchElements(target);
					if (!elements.popup) {
						renderContext.close();
						return;
					}

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

			function OnClick(renderContext) {
				return function(event) {
					var target = event.target;

					var elements = SearchElements(target);
					if (elements.ifilter) {
						angular.element(elements.rfilter).data("context").enabled = !!elements.ifilter.checked;

						renderContext._refreshDatas();
					}
				};
			}

			function OnMouseDown(renderContext) {
				return function(event) {
					var target = event.target;

					var elements = SearchElements(target);
					if (!elements.popup) {
						renderContext.close();

						event.stopPropagation();
						event.preventDefault();
						return;
					}

					if (elements.lfilter) {
						var input = document.getElementById(elements.lfilter.inputTarget);

						input.checked = !input.checked;
						angular.element(elements.rfilter).data("context").enabled = input.checked;

						renderContext._refreshDatas();
						$timeout(function() {
							renderContext.close();
						});
					}

					cm.SwitchOnState(renderContext, elements, "mouseDown", function(elements) {
					});

					event.stopPropagation();
					event.preventDefault();
				};
			}

			function OnStyleUpdate(renderContext) {

				var _styleUpdateMapper = {
					popup: "_popupStyleUpdate",
					rfilter: "_rowStyleUpdate",
					lfilter: "_labelStyleUpdate",
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

					var rp = renderContext[_styleUpdateMapper[type]];
					if (rp) {
						rp(elt);
						event.stopPropagation();
						return;
					}
				};
			}

			var FiltersPopupRenderer = function(column, dataModel, refreshFunc) {
				PopupRenderer.call(this, {
					className: "cm_filtersPopup"
				});

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

							var li = cc.createElement(ul, "li", {
								id: "cm_rfilter_" + (anonymousId++)
							});

							li.data("context", fContext);

							var input = cc.createElement(li, "input", {
								id: "cm_ifilter_" + (anonymousId++),
								type: "checkbox",
								className: "cm_filtersPopup_input",
								name: id,
							});
							if (fContext.enabled) {
								input[0].checked = true;
							}

							var right = cc.createElement(li, "div", {
								id: "cm_lfilter_" + (anonymousId++),
								$inputTarget: input[0].id
							});

							var label = cc.createElement(right, "label", {
								className: "cm_filtersPopup_label",
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

					container.on("mouseover", OnMouseOver(this));

					container.on("mouseout", OnMouseOut(this));

					container.on("mouseleave", OnMouseLeave(this));

					container.on("click", OnClick(this));

					this._mouseDownListener = OnMouseDown(this);
					document.body.addEventListener("mousedown", this._mouseDownListener, true);

					this._focusListener = OnFocus(this);
					document.body.addEventListener("focus", this._focusListener, true);

					this._blurListener = OnBlur(this);
					document.body.addEventListener("blur", this._blurListener, true);

					container.on("cm_update", OnStyleUpdate(this));

					var scope = container.isolateScope();
					var self = this;

					scope.$on("$destroy", function() {
						self._close();
					});
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
				}
			});

			return FiltersPopupRenderer;
		} ]);

})(window, window.angular);