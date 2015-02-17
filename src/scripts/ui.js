/**
 * @product CameliaJS (c) 2015 Vedana http://www.vedana.com
 * @license Creative Commons - The licensor permits others to copy, distribute,
 *          display, and perform the work. In return, licenses may not use the
 *          work for commercial purposes -- unless they get the licensor's
 *          permission.
 * @author olivier.oeuillot@vedana.com
 */

(function(window, angular, undefined) {
	'use strict';

	var module = angular.module('camelia.core');

	module.factory('camelia.UI', [ '$log', 'camelia.core', function($log, cc) {

		return {
			IsFocusable: function(element) {
				if (element.disabled) {
					return false;
				}

				if (element.cm_focusable) {
					return true;
				}

				if (element.tabIndex >= 0) {
					return true;
				}

				if (element.tabIndex < 0) {
					// After cm_focusable
					return false;
				}

				var tagName = element.tagName.toLowerCase();
				if (tagName === "button" || tagName === "input" || tagName === "a") {
					return true;
				}

				return false;
			},
			GetNextFocusable: function(container, element) {
				if (container[0]) {
					container = container[0];
				}
				var e = null;

				if (!element) {
					e = container.firstChild;
					if (!e) {
						return null;
					}
				}

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
						if (!e) {
							// WARNING: Detached dom section
							return null;
						}

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
				if (container[0]) {
					container = container[0];
				}

				if (!element) {
					e = container.lastChild;
					if (!e) {
						return null;
					}
				}

				var e = null;
				for (;;) {

					if (e === element) {
						return null; // Loop
					}

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
					if (!e) {
						// WARNING: Detached dom section
						return null;
					}

					if (e === container) {
						e = e.lastChild;
						for (; e.lastChild && !e.lastChild.disabled;) {
							e = e.lastChild;
						}
					}
				}
			},

			EnsureVisible: function(parent, element) {
				if (parent[0]) {
					parent = parent[0];
				}

				if (element.offsetTop - parent.scrollTop < 0) {
					parent.scrollTop = element.offsetTop;
					return;
				}

				if (element.offsetTop + element.offsetHeight - parent.scrollTop > parent.clientHeight) {
					parent.scrollTop = element.offsetTop + element.offsetHeight - parent.clientHeight;
					return;
				}

			}
		};
	} ]);
})(window, window.angular);