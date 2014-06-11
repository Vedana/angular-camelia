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

	module.factory("camelia.i18n.pager", [ function() {

		return {
			'en': {
				bfirst_label: "First",
				blast_label: "Last",
				bprev_label: "Previous",
				bprev_tooltip: "Show previous page",
				bnext_label: "Next",
				bnext_tooltip: "Show next page"
			}
		};

	} ]);

})(window, window.angular);