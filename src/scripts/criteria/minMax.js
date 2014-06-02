/**
 * @product CameliaJS (c) 2014 Vedana http://www.vedana.com
 * @license Creative Commons - The licensor permits others to copy, distribute, display, and perform the work. In return, licenses may not use the work for commercial purposes -- unless they get the licensor's permission.
 * @author olivier.oeuillot@vedana.com
 */

(function(window, angular, undefined) {
	'use strict';

	var module = angular.module("camelia.criteria");

	module.factory("camelia.criteria.MinMax", [ "$log", "camelia.criteria.Criteria", function($log, Criteria) {

		var MinMax = function(scope, element, attrs) {
			Criteria.call(this, scope, element, attrs);

			if (!attrs.min && attrs.value) {
				attrs.min = attrs.value;
			}

			var self = this;
			function processNumber(name) {
				var v = attrs[name];
				if (!angular.isString(v)) {
					return;
				}

				if (v.charAt(0) == '=') {
					v = v.substring(1);
					self["_" + name + "Eq"] = true;
				}

				self["_" + name] = parseFloat(v);
			}

			processNumber("min");
			processNumber("max");

			this._false = (attrs.reverse == "true");
		};

		MinMax.prototype = Object.create(Criteria.prototype);

		angular.extend(MinMax.prototype, {
			contributeFilters: function(container) {
				return [ {
					name: this.name,
					reverse: this._false
				} ];
			},
			filterData: function(enabledFilters, value, rowScope, dataModel, column) {
				var f = this._false;

				if (angular.isNumber(value) == false) {
					return f;
				}

				var min = this._min;
				if (min !== undefined && ((!this._minEq && value <= min) || (value < min))) {
					return f;
				}

				var max = this._max;
				if (max !== undefined && ((!this._maxEq && value >= max) || (value > max))) {
					return f;
				}

				return !f;
			}
		});

		return MinMax;
	} ]);

})(window, window.angular);