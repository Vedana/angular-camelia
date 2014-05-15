/**
 * @license CameliaJS (c) 2014 Vedana http://www.vedana.com
 * @author olivier@oeuillot.net
 */

(function(window, angular, undefined) {
	'use strict';

	var module = angular.module("camelia.criteria");

	module.factory("camelia.criteria.StartsWith", [ "$log", "camelia.criteria.Criteria", function($log, Criteria) {

		var StartsWithCriteria = function(scope, element, attrs) {
			Criteria.call(this, scope, element, attrs);

			var value = attrs.value;
			if (!value) {
				throw new Error("You must specify value attribute");
			}

			var modifiers = "";
			if (attrs.ignoreCase == "true") {
				modifiers += "i";
			}

			this._regExp = new RegExp("^[" + value + "]", modifiers);
		};

		StartsWithCriteria.prototype = Object.create(Criteria.prototype);

		angular.extend(StartsWithCriteria.prototype, {
			contributeFilters: function(container) {
				var regExp = this._regExp;
				return [ {
					name: this.name,
					parameter: regExp
				} ];
			},
			filterData: function(enabledFilters, value, rowScope, dataModel, column) {
				var regExp = this._regExp;
				if (!rexExp.test(value)) {
					return false;
				}

				return true;
			}
		});

		return StartsWithCriteria;
	} ]);

})(window, window.angular);