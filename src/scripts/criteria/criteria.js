(function(window, angular, undefined) {
	'use strict';

	var module = angular.module("camelia.criteria", []);

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