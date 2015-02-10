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

	// Caution, it is not a singleton if $injector is used !
	var anonymousId = 0;

	var camelia = angular.module("camelia.core");
	camelia.factory("camelia.cmTypes", [ "camelia.core", function(cc) {

		var cmTypeMatchRegexp = /cm_([a-z]*)_.*/i;

		return {
			GetCMType: function(node) {
				if (!node || node.nodeType !== Node.ELEMENT_NODE) {
					return null;
				}

				/* jshint camelcase: false */
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

					if (type === stopType) {
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

				if (element._errored) {
					extensions.push("_error");
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
						if (ctype !== type) {
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
				if (viewPort.offsetHeight === viewPort.scrollHeight) {
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
					if (child.nodeType !== Node.ELEMENT_NODE) {
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
						if (ctype !== type) {
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
				if (viewPort.offsetHeight === viewPort.scrollHeight) {
					return this.GetNextType(child, type, func);
				}

				var scrollTop = viewPort.scrollTop;
				// var clientHeight = viewPort.clientHeight;

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
					if (child.nodeType !== Node.ELEMENT_NODE) {
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
						if (ctype !== type) {
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
					if (oldElementId && (!element || oldElementId !== element.id)) {
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
						var id = element.id;
						if (!id) {
							id = "__cm_types_" + (anonymousId++);
							element.id = id;
						}

						renderContext[propertyName] = id;

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
					if (oldElementId && (!element || oldElementId !== element.id)) {
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
			},
			IsFocusable: function(element) {
				if (element.disabled) {
					return false;
				}

				if (element.cm_focusable) {
					return true;
				}

				var tagName = element.tagName.toLowerCase();
				if (tagName === "button" || tagName === "input" || tagName === "a") {
					if (element.tabIndex === undefined || element.tabIndex >= 0) {
						return true;
					}
				}

				return false;
			},
			GetNextFocusable: function(container, element) {
				var e = null;
				for (;;) {
					if (e === element) {
						return null; // Loop
					}
					if (e && e.nodeType === Node.ELEMENT_NODE) {
						if (this.IsFocusable(e)) {
							return e;
						}

						if (!e.disabled && e.firstChild) {
							e = e.firstChild;
							continue;
						}
					}
					if (!e) {
						e = element; // Boot phase
					}

					if (e.nextSibling) {
						e = e.nextSibling;
						continue;
					}

					for (;;) {
						e = e.parentNode;

						if (e === container) {
							e = e.firstChild;
							break;
						}

						if (!e.nextSibling) {
							continue;
						}

						e = e.nextSibling;
						break;
					}
				}
			},
			GetPreviousFocusable: function(container, element) {
				var e = null;
				for (;;) {

					if (e && e.nodeType === Node.ELEMENT_NODE) {
						if (this.IsFocusable(e)) {
							return e;
						}
					}

					if (!e) {
						e = element; // Boot phase
					}

					if (e.previousSibling) {
						e = e.previousSibling;

						for (; e.lastChild && !e.lastChild.disabled;) {
							e = e.lastChild;
						}

						continue;
					}

					e = e.parentNode;

					if (e === container) {
						e = e.lastChild;
					}

					if (e === element) {
						return null; // Loop
					}
				}
			}
		};
	} ]);
})(window, window.angular);