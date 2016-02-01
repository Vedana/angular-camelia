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

	var module = angular.module("camelia.components.popup", [ "camelia.core" ]);

	module.value("cm_popup_rendererProviderName", "camelia.renderers.popup:camelia.renderers.Popup");

	module.factory("camelia.components.popup", [ "$log",
		"$q",
		"$exceptionHandler",
		"camelia.core",
		"cm_popup_rendererProviderName",
		function($log, $q, $exceptionHandler, cc, cm_popup_rendererProviderName) {

			var anonymousId = 0;

			/*
			 * ------------------------ Popup --------------------------
			 */

			var Popup = function($scope, element, defaultRendererProviderName) {
				this.$scope = $scope;
				element.data("cm_component", this);

				var rendererProvider = $scope.rendererProvider;
				if (!rendererProvider) {
					var rendererProviderName = $scope.rendererProviderName || defaultRendererProviderName;
					rendererProvider = cc.LoadProvider(rendererProviderName);
				}

				this.rendererProvider = rendererProvider;
			};

			Popup.prototype = {

				/**
				 * @returns {Promise}
				 */
				construct: [ function() {
					this.constructing = true;
					this.constructed = false;
					this.element = null;

					var self = this;

					return $q.when(false);
				} ],

				open: function() {
				},
			};

			return Popup;

		} ]);

})(window, window.angular);