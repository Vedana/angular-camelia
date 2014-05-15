(function(window, angular, undefined) {
	'use strict';

	var module = angular.module("camelia.components.popup", [ "camelia.core" ]);

	module.value("cm_popup_rendererProviderName", "camelia.renderers.popup:camelia.renderers.Popup");

	module.factory("camelia.components.popup", [ "$log",
		"$q",
		"$timeout",
		"$exceptionHandler",
		"camelia.core",
		"cm_popup_rendererProviderName",
		function($log, $q, $timeout, $exceptionHandler, cc, cm_popup_rendererProviderName) {

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
			}

			Popup.prototype = {

				/**
				 * @returns {Promise}
				 */
				construct: [ "$q",
					function($q) {
						this.constructing = true;
						this.constructed = false;
						this.element = null;

						var self = this;

						return $q.when(function(targetComponent) {
							cc.Assert(targetComponent && targetComponent.$scope, "pager", "Invalid target component ",
									targetComponent);

							self.targetComponent = targetComponent;

							var renderContext = {
								pager: self,
								target: targetComponent,

								rendererProvider: self.rendererProvider,
								$scope: self.$scope
							};

							return self.constructFromTarget(renderContext);

						}, function(reason) {
							self.constructing = false;
							self.constructed = false;

							return doc;
						});
					} ],

				open: function() {
				},
			};

			return Popup;

		} ]);

})(window, window.angular);