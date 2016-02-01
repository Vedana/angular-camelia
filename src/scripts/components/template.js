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

	var module = angular.module("camelia.components.template", [ "camelia.core" ]);

	var anonymousId = 0;

	/*
	 * ------------------------ Template --------------------------
	 */

	module.factory("camelia.components.Template", [ "$log", "camelia.core", function($log, cc) {

		var Template = function($scope, element, containerScope, transcludeFunc) {
			this.$scope = $scope;
			this._transcludeFunc = transcludeFunc;
			this.id = $scope.id || ("template_" + (anonymousId++));
			// element.data("cm_component", this);

			if (!containerScope.templates) {
				containerScope.templates = [];
			}

			containerScope.templates.push(this);
		};

		Template.prototype = {

			/**
			 * @returns {Element}
			 */
			transclude: function(parent, $scope) {

				var f = this._transcludeFunc;

				var clone = f($scope, function(clone, newScope) {

					// clone.scope=newScope;

					parent.append(clone);
				});

				return clone;
			}
		};

		return Template;

	} ]);

})(window, window.angular);