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

	var LINK_SCOPE = true;

	var module = angular.module('camelia.core');

	module.factory('camelia.ScopeWrapper', [ "$rootScope", "camelia.core", function($rootScope, cc) {
		function ScopeWrapper($scope) {
			this.$scope = $scope;

			if (LINK_SCOPE) {
				$scope.$cmLink = this;
			}
		}

		[ '$destroy', '$emit', '$broadcast', '$on', '$eval', '$evalSync', '$digest' ].forEach(function(name) {
			ScopeWrapper.prototype[name] = function() {
				var scope = this.$scope;
				return scope[name].apply(scope, arguments);
			};
		});

		ScopeWrapper.prototype.toString = function() {
			return "[Scoped object $id=" + this.$scope.$id + "]";
		};

		return ScopeWrapper;

	} ]);
})(window, window.angular);