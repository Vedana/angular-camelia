/**
 * @product CameliaJS (c) 2014 Vedana http://www.vedana.com
 * @license Creative Commons - The licensor permits others to copy, distribute, display, and perform the work. In return, licenses may not use the work for commercial purposes -- unless they get the licensor's permission.
 * @author olivier.oeuillot@vedana.com
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
			if (attrs.global == "true") {
				modifiers += "g";
			}

			this._false = (attrs.reverse == "true");

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
				var f = this._false;

				if (typeof (value) != "string") {
					return f;
				}

				var regexp = this._regexp;
				if (regexp.test(value)) {
					return !f;
				}

				return f;
			}
		});

		return RegExpCriteria;
	} ]);

})(window, window.angular);