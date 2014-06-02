/**
 * @product CameliaJS (c) 2014 Vedana http://www.vedana.com
 * @license Creative Commons - The licensor permits others to copy, distribute, display, and perform the work. In return, licenses may not use the work for commercial purposes -- unless they get the licensor's permission.
 * @author olivier.oeuillot@vedana.com
 */

(function(window, angular, undefined) {
	'use strict';

	var module = angular.module("camelia.criteria");

	module.factory("camelia.criteria.Type", [ "$log", "camelia.criteria.Criteria", function($log, Criteria) {

		var Type = function(scope, element, attrs) {
			Criteria.call(this, scope, element, attrs);

			var value = attrs.value;
			if (!value) {
				throw new Error("You must specify value attribute");
			}

			this._value = value;

			this._false = (attrs.reverse == "true");
		};

		Type.prototype = Object.create(Criteria.prototype);

		angular.extend(Type.prototype, {
			contributeFilters: function(container) {
				return [ {
					name: this.name
				} ];
			},
			filterData: function(enabledFilters, value, rowScope, dataModel, column) {
				var f=this._false;
				
				if (typeof (value) == this._value) {
					return !f;
				}

				return f;
			}
		});

		return Type;
	} ]);

})(window, window.angular);