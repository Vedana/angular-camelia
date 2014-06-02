/**
 * @product CameliaJS (c) 2014 Vedana http://www.vedana.com
 * @license Creative Commons - The licensor permits others to copy, distribute, display, and perform the work. In return, licenses may not use the work for commercial purposes -- unless they get the licensor's permission.
 * @author olivier.oeuillot@vedana.com
 */

(function(window, angular, undefined) {
	'use strict';

	var module = angular.module("camelia.criteria");

	module.factory("camelia.criteria.Number", [ "$log", "camelia.criteria.Criteria", function($log, Criteria) {

		var NumberCriteria = function(scope, element, attrs) {
			Criteria.call(this, scope, element, attrs);

			var value = attrs.value;
			if (!value) {
				throw new Error("You must specify value attribute");
			}

			if (attrs.integer == "true") {
				this._integer = true;
				value = parseInt(value, 10);

			} else {
				value = parseFloat(value);
			}
			this._value = value;

			this._false = (attrs.reverse == "true");
		};

		NumberCriteria.prototype = Object.create(Criteria.prototype);

		angular.extend(NumberCriteria.prototype, {
			contributeFilters: function(container) {
				return [ {
					name: this.name,
					value: this._value,
					reverse: this._false
				} ];
			},
			filterData: function(enabledFilters, value, rowScope, dataModel, column) {
				var f=this._false;
				
				if (angular.isNumber(value) == false) {
					return f;
				}

				if (this._integer) {
					value = Math.floor(value);
				}

				if (this._value === value) {
					return !f;
				}

				return f;
			}
		});

		return NumberCriteria;
	} ]);

})(window, window.angular);