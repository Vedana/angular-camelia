(function(window, angular, undefined) {
	'use strict';

	var module = angular.module("camelia.criteria");

	module.factory("camelia.criteria.Alphabetic", [ "$log", "camelia.criteria.Criteria", function($log, Criteria) {

		var AlphabeticCriteria = function(scope, element, attrs) {
			Criteria.call(this, scope, element, attrs);
		};

		AlphabeticCriteria.prototype = Object.create(Criteria.prototype);

		angular.extend(AlphabeticCriteria.prototype, {
			contributeFilters: function(dataModel) {
				var c = [];

				var cnt = 0;
				angular.forEach([ "A-D", "E-K", "L-P", "Q-Z", "0-9" ], function(entry) {
					c.push({
						name: entry,
						regExp: new RegExp("^[" + entry + "]", "i"),
						id: "alphabetic_" + entry
					});
				});
				c.push({
					name: "Autres",
					regExp: new RegExp("^[^A-Z0-9]", "i"),
					id: "alphabetic_OTHERS"
				});

				return c;
			},
			filterData: function(filterContexts, value, rowScope, dataModel, column) {
				for (var i = 0; i < filterContexts.length; i++) {
					var filterContext = filterContexts[i];
					if (!filterContext.enabled) {
						continue;
					}

					if (filterContext.regExp.test(value)) {
						return true;
					}
				}

				return false;
			}
		});

		return AlphabeticCriteria;
	} ]);

})(window, window.angular);