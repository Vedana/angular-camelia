/**
 * @product CameliaJS (c) 2014 Vedana http://www.vedana.com
 * @license Creative Commons - The licensor permits others to copy, distribute, display, and perform the work. In return, licenses may not use the work for commercial purposes -- unless they get the licensor's permission.
 * @author olivier.oeuillot@vedana.com
 */

(function(window, angular, undefined) {
	'use strict';

	var module = angular.module("camelia.criteria");

	module.factory("camelia.criteria.Alphabetic", [ "$log",
		"camelia.criteria.Criteria",
		"camelia.i18n.criteria",
		function($log, Criteria, i18n) {

			var AlphabeticCriteria = function(scope, element, attrs) {
				Criteria.call(this, scope, element, attrs);
			};

			AlphabeticCriteria.prototype = Object.create(Criteria.prototype);

			angular.extend(AlphabeticCriteria.prototype, {
				contributeFilters: function(dataModel) {
					var c = [];

					var cnt = 0;
					angular.forEach([ "A-D", "E-K", "L-P", "Q-Z", "0-9" ], function(entry) {
						var regExp = new RegExp("^[" + entry + "]", "i");
						c.push({
							name: entry,
							regExp: regExp,
							id: "alphabetic_" + entry,
							parameter: regExp
						});
					});

					var regExp = new RegExp("^[^A-Z0-9]", "i");
					c.push({
						name: i18n.alphabetic_others,
						regExp: regExp,
						id: "alphabetic_OTHERS",
						parameter: regExp
					});

					return c;
				},
				filterData: function(filterContexts, value, rowScope, dataModel, column) {
					var f = false;

					if (typeof (value) != "string") {
						return f;
					}

					for (var i = 0; i < filterContexts.length; i++) {
						var filterContext = filterContexts[i];
						if (!filterContext.enabled) {
							continue;
						}

						if (filterContext.regExp.test(value)) {
							return !f;
						}
					}

					return f;
				}
			});

			return AlphabeticCriteria;
		} ]);

})(window, window.angular);