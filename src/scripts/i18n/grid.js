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

	var module = angular.module("camelia.i18n.grid", []);

	module.factory("camelia.i18n.Grid", [ function() {

		return {
			'en': {
				sortableColumn: "(Sortable)",
				ascending: "(Sorted order ascending)",
				descending: "(Sorted order descending)",
				filtreableColumn: "",
				filtredColumn: "(Filtred)",
				loadingData: "Loading data ...",
				receivingData: "{count} rows received ...",
				loadingError: "Loading error"
			}
		};

	} ]);

})(window, window.angular);