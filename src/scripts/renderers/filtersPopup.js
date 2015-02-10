/**
 * @product CameliaJS (c) 2015 Vedana http://www.vedana.com
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

	// Caution, it is not a singleton if $injector is used !
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

							/*
							 * var span = cc.createElement(right, "span", { className:
							 * "cm_filtersPopup_licon fa fa-files-o" });
							 */

							var label = cc.createElement(right, "label", {
								id: "cm_llfilter_" + idx,
								className: "cm_filtersPopup_label",
								"for": input[0].id,
								textNode: filter.name || "### unknown ###"
							});

							if (filter.contributeDOM) {
								filter.contributeDOM(ul, fContext, criteria, self._column);
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

						next = cm.GetNextType(row.nextSibling, ROW_TYPE);
						if (!next) {
							next = cm.GetNextType(parentNode.firstChild, ROW_TYPE);
						}
						break;

					case Key.VK_PAGE_DOWN:
						cancel = true;
						next = cm.GetPreviousVisibleType(viewPort, parentNode.lastChild, ROW_TYPE);
						if (next && next.id === row.id && (viewPort.scrollHeight > viewPort.offsetHeight)) {
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

						next = cm.GetPreviousType(row.previousSibling, ROW_TYPE);
						if (!next) {
							next = cm.GetPreviousType(parentNode.lastChild, ROW_TYPE);
						}
						break;

					case Key.VK_PAGE_UP:
						cancel = true;
						next = cm.GetNextVisibleType(viewPort, parentNode.firstChild, ROW_TYPE);
						if (next && next.id === row.id) {
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
						var filterInput = next.querySelector(".cm_filtersPopup_input");
						if (filterInput) {
							cc.setFocus(filterInput);
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