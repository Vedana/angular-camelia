(function(window, angular, undefined) {
	'use strict';

	var module = angular.module("camelia.criteriaRegistry", []);

	module.factory("camelia.criteriaRegistry", [ "$log", function($log) {

		var registry = {};

		var map = {};

		registry.declare = function(type, initializeFunc, contributeCheckboxesFunc, filterDataFunc, releaseFunc) {
			map[type] = {
				type: type,
				initialize: initializeFunc,
				contributeCheckboxes: contributeCheckboxesFunc,
				filterData: filterData,
				release: releaseFunc
			};
		}

		registry.get = function(type) {
			return map[type];
		};

		return registry;
	} ]);
})(window, window.angular);