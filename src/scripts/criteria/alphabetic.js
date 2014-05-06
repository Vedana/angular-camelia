(function(window, angular, undefined) {
	'use strict';

	var module = angular.module("camelia.criteria.basic", [ "camelia.core", "camelia.criteriaRegistry" ]);

	module.factory("camelia.criteria.basic", [ "$log", "camelia.criteriaRegistry", function($log, criteriaRegistry) {

		criteriaRegistry.add("regexp", function contributeCheckboxes(container) {

		}, function filterData(data, dataColumn, dataModel) {

		});

		criteriaRegistry.add("alphabetic", function contributeCheckboxes(container) {

		}, function filterData(data, dataColumn, dataModel) {

		});

	} ]);

})(window, window.angular);