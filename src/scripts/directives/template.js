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

	var module = angular.module('camelia.directives.template', [ 'camelia.components.template' ]);

	module.directive("cmTemplate", [ "$log", "camelia.components.Template", function($log, Template) {

		return {
			require: "^cmTemplateContainer",
			restrict: "E",
			scope: {
				name: '@',
				id: '@',
				refId: '@'
			// enabled: '@'
			},
			transclude: true,

			compile: function() {
				return {
					pre: function($scope, element, attrs, controller) {

						$scope.enabledExpresion = element.attr("enabled");
					},
					post: function($scope, element, attrs, controller, transcludeFunc) {

						var template = new Template($scope, element, controller, transcludeFunc);

						element.remove();
					}
				};
			}
		};
	} ]);
})(window, window.angular);