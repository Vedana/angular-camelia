/**
 * @product CameliaJS (c) 2015 Vedana http://www.vedana.com
 * @license Creative Commons - The licensor permits others to copy, distribute,
 *          display, and perform the work. In return, licenses may not use the
 *          work for commercial purposes -- unless they get the licensor's
 *          permission.
 * @author olivier.oeuillot@vedana.com
 */

(function(window, angular, undefined) {
	'use strict';

	var module = angular.module("camelia.components.item", [ "camelia.core" ]);

	/*
	 * ------------------------ Item --------------------------
	 */

	module.factory("camelia.components.Item", [ "$log", "camelia.core", function($log, cc) {

		var anonymousId = 0;

		var Item = function($scope, element, containerScope) {
			this.$scope = $scope;
			this.id = $scope.id || ("item_" + (anonymousId++));
			// element.data("cm_component", this);

			if (!containerScope.items) {
				containerScope.items = [];
			}

			containerScope.items.push(this);
		};

		Item.prototype = {};

		return Item;

	} ]);

	/*
	 * ------------------------ Items --------------------------
	 */

	module.factory("camelia.components.Items", [ "$log", "camelia.core", function($log, cc) {

		var anonymousId = 0;

		var Items = function($scope, element, containerScope) {
			this.$scope = $scope;
			this.id = $scope.id || ("items_" + (anonymousId++));
			// element.data("cm_component", this);

			if (!containerScope.items) {
				containerScope.items = [];
			}

			containerScope.items.push(this);
		};

		Items.prototype = {};

		return Items;

	} ]);

})(window, window.angular);