/**
 * @product CameliaJS (c) 2016 Vedana http://www.vedana.com
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
		"camelia.CharsetUtils",
		function($log, Criteria, cc, chu) {

			var StartsWith = function(scope, element, attrs) {
				Criteria.call(this, scope, element, attrs);

				this.type = "StartsWidth";

				var value = attrs.value;
				if (!value) {
					throw new Error("You must specify value attribute");
				}

				this._value = value;

				var modifiers = "";
				if (attrs.ignoreCase === "true") {
					modifiers += "i";
					this._ignoreCase = true;
				}
				if (attrs.ignoreAccents === "true") {
					this._ignoreAccents = true;
					value = chu.removeAccents(value);
				}

				this._regExp = new RegExp("^[" + value + "]", modifiers);

				this._false = (attrs.reverse === "true");
			};

			cc.extend(StartsWith, Criteria, {
				contributeFilters: function(container) {
					var self = this;
					return [ {
						name: this.name,
						toJson: function() {
							return {
								startsWidthRegExp: self._value,
								ignoreCase: !!self._ignoreCase,
								reverse: self._false
							};
						}
					} ];
				},
				filterData: function(enabledFilters, value, rowScope, dataModel, column) {
					var f = this._false;

					if (this._ignoreAccents) {
						value = chu.removeAccents(value);
					}

					var regExp = this._regExp;
					if (regExp.test(value)) {
						return !f;
					}

					return f;
				}
			});

			return StartsWith;
		} ]);

})(window, window.angular);