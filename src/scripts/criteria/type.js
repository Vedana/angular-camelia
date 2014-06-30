/**
 * @product CameliaJS (c) 2014 Vedana http://www.vedana.com
 * @license Creative Commons - The licensor permits others to copy, distribute,
 *          display, and perform the work. In return, licenses may not use the
 *          work for commercial purposes -- unless they get the licensor's
 *          permission.
 * @author olivier.oeuillot@vedana.com
 */

(function(window, angular, undefined) {
	'use strict';

	var module = angular.module("camelia.criteria");

	module.factory("camelia.criteria.Type", [ "$log",
		"camelia.criteria.Criteria",
		"camelia.core",
		function($log, Criteria, cc) {

			var Type = function(scope, element, attrs) {
				Criteria.call(this, scope, element, attrs);

				this.type = "Type";

				var value = attrs.value;
				if (!value) {
					throw new Error("You must specify value attribute");
				}

				this._value = value;

				this._false = (attrs.reverse == "true");
			};

			cc.extend(Type, Criteria, {
				contributeFilters: function(container) {
					var self = this;
					return [ {
						name: this.name,
						toJson: function() {
							return {
								type: self._value,
								reverse: self._false
							};
						}
					} ];
				},
				filterData: function(enabledFilters, value, rowScope, dataModel, column) {
					var f = this._false;

					if (typeof (value) == this._value) {
						return !f;
					}

					return f;
				}
			});

			return Type;
		} ]);

})(window, window.angular);