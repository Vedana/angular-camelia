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

	var module = angular.module("camelia.criteria", [ "camelia.i18n.criteria", "camelia.core" ]);

	var anonymousId = 0;

	module.factory("camelia.criteria.Criteria", [ "$log", function($log) {

		var Criteria = function($scope, element, attrs) {
			var id = $scope.id;
			if (!id) {
				id = "cm_criteria_" + (anonymousId++);
			}
			this.id = id;

			this.name = attrs.name;
		};

		Criteria.prototype = {
			contributeFilters: function(dataModel) {
				return [];
			},
			filterData: function(enabledFilters, value, rowScope, dataModel, column) {
				return false;
			}
		};

		return Criteria;
	} ]);

})(window, window.angular);