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

	var module = angular.module("camelia.i18n.pager", []);

	module.factory("camelia.i18n.Pager", [ function() {

		return {
			'en': {
				bfirst_label: "First",
				blast_label: "Last",
				bprev_label: "",
				bprev_className: "fa fa-angle-left",
				bprev_tooltip: "Show previous page",
				bnext_label: "",
				bnext_className: "fa fa-angle-right",
				bnext_tooltip: "Show next page",
				index_label: "{pageIndex}",
				index_tooltip: "Show page #{pageIndex}",
				cindex_label: "{pageIndex}",
				cindex_tooltip: "Current page #{pageIndex}",
				uindex_label: "...",
				uindex_tooltip: "Show next page",
				separator: " ",
				noPages: "No pages"
			}
		};

	} ]);

})(window, window.angular);