/**
 * @license CameliaJS (c) 2014 Vedana http://www.vedana.com
 * @author olivier@oeuillot.net
 */

(function(window, angular, undefined) {
	'use strict';

	var module = angular.module("camelia.criteria");

	module.factory("camelia.criteria.RegExp", [ "$log", "camelia.criteria.Criteria", function($log, Criteria) {

		var RegExpCriteria = function(scope, element, attrs) {
			Criteria.call(this, scope, element, attrs);

			var value = attrs.value;
			if (!value) {
				throw new Error("You must specify value attribute");
			}

			var modifiers = attrs.modifiers || "";
			if (attrs.ignoreCase == "true") {
				modifiers += "i";
			}

			this._regexp = new RegExp(value, modifiers);
		};

		RegExpCriteria.prototype = Object.create(Criteria.prototype);

		angular.extend(RegExpCriteria.prototype, {
			contributeFilters: function(container) {
				var regExp = this._regExp;
				return [ {
					name: this.name,
					parameter: regExp
				} ];
			},
			filterData: function(enabledFilters, value, rowScope, dataModel, column) {
				var regexp = this._regexp;
				if (!regexp.test(value)) {
					return false;
				}

				return true;
			}
		});

		return RegExpCriteria;
	} ]);

})(window, window.angular);