/**
 * @license CameliaJS (c) 2014 Vedana http://www.vedana.com
 * @author olivier@oeuillot.net
 */

(function(window, angular, undefined) {
	"use strict";

	var module = angular.module("camelia.i18n.criteria", []);

	module.factory("camelia.i18n.criteria", [ function() {

		return {
			alphabetic_others: "Others"
		};

	} ]);

})(window, window.angular);