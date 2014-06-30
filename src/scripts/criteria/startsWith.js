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

	module.factory("camelia.criteria.StartsWith", [ "$log",
		"camelia.criteria.Criteria",
		"camelia.core",
		function($log, Criteria, cc) {

			var StartsWith = function(scope, element, attrs) {
				Criteria.call(this, scope, element, attrs);

				this.type = "StartsWidth";

				var value = attrs.value;
				if (!value) {
					throw new Error("You must specify value attribute");
				}

				var modifiers = "";
				if (attrs.ignoreCase == "true") {
					modifiers += "i";
					this._ignoreCase = true;
				}

				this._value = value;
				this._regExp = new RegExp("^[" + value + "]", modifiers);

				this._false = (attrs.reverse == "true");
			};

			cc.extend(StartsWith, Criteria, {
				contributeFilters: function(container) {
					var self = this;
					return [ {
						name: this.name,
						toJson: function() {
							return {
								startsWidth: self._value,
								ignoreCase: !!self._ignoreCase,
								reverse: self._false
							};
						}
					} ];
				},
				filterData: function(enabledFilters, value, rowScope, dataModel, column) {
					var f = this._false;

					var regExp = this._regExp;
					if (rexExp.test(value)) {
						return !f;
					}

					return f;
				}
			});

			return StartsWith;
		} ]);

})(window, window.angular);