/**
 * @product CameliaJS (c) 2014 Vedana http://www.vedana.com
 * @license Creative Commons - The licensor permits others to copy, distribute, display, and perform the work. In return, licenses may not use the work for commercial purposes -- unless they get the licensor's permission.
 * @author olivier.oeuillot@vedana.com
 */

(function(window, angular, undefined) {
	'use strict';

	var module = angular.module('camelia.directives.pager', [ 'camelia.core' ]);

	module.value("cm_pager_componentProviderName", "camelia.components.pager:camelia.components.Pager");

	module.directive("cmPager", [ "$injector",
		"$interpolate",
		"$log",
		"$q",
		"camelia.core",
		"cm_pager_componentProviderName",
		function($injector, $interpolate, $log, $q, cc, cm_pager_componentProviderName) {

			return {
				restrict: "E",
				scope: {
					forElementId: '@for',
					target: '=?',
					style: '@',
					className: '@class',
					caption: '@',
					tabIndex: '@',
					id: '@',
					format: '=?'
				},
				replace: true,

				controller: function($scope) {
					var componentProvider = $scope.componentProvider;
					if (!componentProvider) {
						var componentProviderName = $scope.componentProviderName || cm_pager_componentProviderName;
						componentProvider = cc.LoadProvider(componentProviderName);
					}
					this.componentProvider = componentProvider;
				},
				compile: function() {
					return {
						pre: function($scope, element, attrs, controller) {
						},
						post: function($scope, element, attrs, controller, transludeFunc) {

							var pager = new controller.componentProvider($scope, element);

							var promise = $injector.invoke(pager.construct, pager);

							if (!cc.isPromise(promise)) {
								promise = $q.when(promise);
							}

							promise.then(function(pagerElement) {
								$log.info("Pager created ", pagerElement);

								element.replaceWith(pagerElement);

							}, function(reason) {
								$log.error("Failed to create pager ", reason);
							});
						}
					};
				}
			};
		} ]);
})(window, window.angular);