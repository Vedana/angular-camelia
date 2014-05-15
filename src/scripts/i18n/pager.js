/**
 * @license CameliaJS (c) 2014 Vedana http://www.vedana.com
 * @author olivier@oeuillot.net
 */

(function(window, angular, undefined) {
	"use strict";

	var module = angular.module("camelia.i18n.pager", []);

	module.factory("camelia.i18n.pager", [ function() {

		return {
			bprev_label: "Prev",
			bprev_tooltip: "Show previous page",
			bnext_label: "Next",
			bnext_tooltip: "Show next page",
		};

	} ]);

})(window, window.angular);