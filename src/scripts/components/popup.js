(function(window, angular, undefined) {
	'use strict';

	var module = angular.module("camelia.components.popup", [ "camelia.core" ]);
	
	module.value("cm_popup_rendererProviderName", "camelia.renderers.popup:camelia.renderers.popup");

	module.factory("camelia.components.popup", [ "$log",
		"$q",
		"$timeout",
		"$exceptionHandler",
		"camelia.core",
		"cm_popup_rendererProviderName",
		function($log, $q, $timeout, $exceptionHandler, cc, cm_popup_rendererProviderName) {

			var anonymousId = 0;

			/*
			 * ------------------------ PopupBase --------------------------
			 */

			var PopupBase = function($scope, element, defaultRendererProviderName) {
				this.$scope = $scope;
				element.data("cm_component", this);

				var rendererProvider = $scope.rendererProvider;
				if (!rendererProvider) {
					var rendererProviderName = $scope.rendererProviderName || defaultRendererProviderName;
					rendererProvider = cc.LoadProvider(rendererProviderName);
				}
				this.rendererProvider = rendererProvider;

			}

			PopupBase.prototype = {

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

				constructFromTarget: function(renderContext) {
					var doc = angular.element(document.createDocumentFragment());

					var containerPromise = renderContext.rendererProvider.PagerRenderer(doc, renderContext);
					if (!cc.isPromise(containerPromise)) {
						containerPromise = $q.when(containerPromise);
					}

					return containerPromise.then(function(element) {
						self.constructing = false;
						self.constructed = true;
						self.element = element;

						var positions = renderContext.positions;
						if (!positions && targetComponent.getCurrentPositions) {
							positions = targetComponent.getCurrentPositions();
						}
						if (positions) {
							renderContext.positions = undefined;

							self.setPositions(targetComponent, renderContext, positions);
						}

						return doc;
					});
				},

				_targetDestroyed: function() {

				},

				setPositions: function(component, renderContext, positions) {
					renderContext.rendererProvider.PagerPositionsUpdate(positions, renderContext);
				}
			};

			/*
			 * ------------------------ Popup --------------------------
			 */

			var Popup = function($scope, element) {
				var id = $scope.id;
				if (!id) {
					id = "cm_popup_" + (anonymousId++);
				}
				this.id = id;
				element.attr("id", id);

				PopupBase.call(this, $scope, element, cm_popup_rendererProviderName);
			};

			Popup.prototype = Object.create(PopupBase.prototype);
			angular.extend(Popup.prototype, {
				constructor: Popup,

				constructFromTarget: function(renderContext) {

					var format = this.$scope.format;
					if (!angular.isString(format)) {
						format = cm_pager_format;
					}
					renderContext.format = format;

					var self = this;
					this.$scope.$watch("format", function(format) {
						var targetComponent = renderContext.target;
						if (!targetComponent) {
							return;
						}

						var positions = targetComponent.getCurrentPositions();

						if (!angular.isString(format)) {
							format = cm_pager_format;
						}

						renderContext.format = format;

						self.setPositions(targetComponent, renderContext, positions);
					});

					return PagerBase.prototype.constructFromTarget.call(this, renderContext);
				}
			});

			return {
				Popup: Popup,
				PopupBase: PopupBase
			};
		} ]);

})(window, window.angular);