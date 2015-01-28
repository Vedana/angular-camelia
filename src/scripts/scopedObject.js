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

	var module = angular.module('camelia.scopedObject', [ "camelia.core" ]);

	module.factory('camelia.ScopedObject', [ "$rootScope", "camelia.core", function($rootScope, cc) {
		function ScopedObject(parentScope, isolate) {
			this.$scope = (parentScope || $rootScope).$new(isolate !== false);
		}

		[ '$destroy', '$emit', '$broadcast', '$on', '$eval', '$evalSync', '$digest' ].forEach(function(name) {
			ScopedObject.prototype[name] = function() {
				var scope = this.$scope;
				return scope[name].apply(scope, arguments);
			};
		});

		ScopedObject.prototype.toString = function() {
			return "[Scoped object $id=" + this.$scope.$id + "]";
		};

		return ScopedObject;

	} ]);
})(window, window.angular);