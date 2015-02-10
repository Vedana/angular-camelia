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

	var module = angular.module("camelia.components.combo", [ "camelia.core", "camelia.renderers.combo" ]);

	module.value("cm_combo_rendererProviderName", "camelia.renderers.combo:camelia.renderers.Combo");

	var anonymousId = 0;

	module.factory("camelia.components.Combo", [ "$log",
		"$q",
		"$timeout",
		"$exceptionHandler",
		"$interpolate",
		"camelia.core",
		"cm_combo_rendererProviderName",
		function($log, $q, $timeout, $exceptionHandler, $interpolate, cc, cm_combo_rendererProviderName) {

			/*
			 * ------------------------ Combo --------------------------
			 */

			var Combo = function($scope, element, directiveInterpolate, defaultRendererProviderName) {
				this.$scope = $scope;
				this.directiveInterpolate = directiveInterpolate || $interpolate;

				var id = $scope.id;
				if (!id) {
					id = "cm_combo_" + (anonymousId++);
				}
				this.id = id;

				var rendererProvider = $scope.rendererProvider;
				if (!rendererProvider) {
					var rendererProviderName = $scope.rendererProviderName || defaultRendererProviderName ||
							cm_combo_rendererProviderName;

					if ($scope.lookId) {
						rendererProviderName += "-" + $scope.lookId;
					}

					rendererProvider = cc.LoadProvider(rendererProviderName);
				}
				this.rendererProvider = rendererProvider;

			};

			Combo.prototype = {

				/**
				 * @returns {Promise}
				 */
				construct: [ function() {
					this.constructing = true;
					this.constructed = false;
					this.element = null;

					var renderContext = {
						combo: this,
						items: this.$scope.items,
						$scope: this.$scope,
						$interpolate: this.directiveInterpolate,
					};

					var self = this;

					return self._construct(renderContext).then(function onSuccess(result) {
						self.constructing = false;
						self.constructed = true;

						return result;

					}, function onError(reason) {
						self.constructing = false;
						self.constructed = false;

						$q.reject(reason);
					});
				} ],

				_construct: function(renderContext) {

					var doc = angular.element(document.createDocumentFragment());

					var comboRenderer = new this.rendererProvider(renderContext);
					this.comboRenderer = comboRenderer;

					var containerPromise = comboRenderer.render(doc);
					if (!cc.isPromise(containerPromise)) {
						containerPromise = $q.when(containerPromise);
					}

					var self = this;
					return containerPromise.then(function onSuccess(element) {
						self.constructing = false;
						self.constructed = true;

						// angular.element(element).data("$scope", self.$scope);

						return doc;

					}, function onError(reason) {
						self.constructing = false;
						self.constructed = false;

						return $q.reject(reason);
					});
				}

			};

			return Combo;
		} ]);

})(window, window.angular);