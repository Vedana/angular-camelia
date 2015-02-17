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

	var module = angular.module('camelia.directives.items', [ 'camelia.components.items' ]);

	module.factory("camelia.directives.ItemsContainer", [ function() {

		return {
			MarkItemsContainer: function($scope, element) {
				element.data('$cmItemsContainerController', $scope);
			}
		};
	} ]);

	module.directive("cmItem", [ "$log", "camelia.components.Item", function($log, Item) {

		return {
			restrict: "E",
			require: "^cmItemsContainer",
			scope: {
				label: '@',
				id: '@',
				className: '@class',
				value: '@',
				disabled: '@',
				tooltip: '@',
				searchWords: '@'
			},
			transclude: true,

			compile: function() {
				return {
					pre: function($scope, element, attrs, controller) {

					},
					post: function($scope, element, attrs, controller, transcludeFunc) {

						var item = new Item($scope, element, controller, transcludeFunc);

						element.remove();
					}
				};
			}
		};
	} ]);

	module.directive("cmItems", [ "$log", "camelia.components.Items", function($log, Items) {

		return {
			restrict: "E",
			require: "^cmItemsContainer",
			scope: {
				id: '@',
				value: '=',
				varName: '@var',
				itemColumn: '@itemcolumn'
			// itemLabel: '@',
			// itemClass: '@class',
			// itemDisabled: '@',
			// itemTooltip: '@',
			// itemSearchWords: '@'
			},
			transclude: true,

			compile: function() {
				return {
					pre: function($scope, element, attrs, controller) {

						[ "itemLabel", "itemClass", "itemDisabed", "itemTooltip", "itemSearchWords" ].forEach(function(name) {
							$scope[name + "RawExpression"] = element.attr(name);
						});
					},
					post: function($scope, element, attrs, controller, transcludeFunc) {

						var item = new Items($scope, element, controller, transcludeFunc);

						element.remove();
					}
				};
			}
		};
	} ]);
})(window, window.angular);