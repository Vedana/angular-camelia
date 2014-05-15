/**
 * @license CameliaJS (c) 2014 Vedana http://www.vedana.com
 * @author olivier@oeuillot.net
 */

(function(window, angular, undefined) {
	'use strict';

	var module = angular.module("camelia.components.pager", [ "camelia.core", "camelia.pagerRegistry" ]);

	module.value("cm_pager_rendererProviderName", "camelia.renderers.pager:camelia.renderers.PagerProvider");
	module.value("xcm_pager_format", "{bprev} {first} {bnext}");
	module
			.value(
					"cm_pager_format",
					"'first=' {first} 'last=' {last} 'rowCount=' {rowCount} 'pageCount=' {pageCount} 'pagePos=' {pagePosition} {bprev} {bnext}");

	var anonymousId = 0;

	module.factory("camelia.components.PagerBase", [ "$log",
		"$q",
		"$timeout",
		"$exceptionHandler",
		"camelia.core",
		"camelia.pagerRegistry",
		function($log, $q, $timeout, $exceptionHandler, cc, pagerRegistry) {

			/*
			 * ------------------------ PagerBase --------------------------
			 */

			var PagerBase = function($scope, element, defaultRendererProviderName) {
				this.$scope = $scope;
				element.data("cm_component", this);

				var rendererProvider = $scope.rendererProvider;
				if (!rendererProvider) {
					var rendererProviderName = $scope.rendererProviderName || defaultRendererProviderName;
					rendererProvider = cc.LoadProvider(rendererProviderName);
				}
				this.rendererProvider = rendererProvider;

				var targetComponent = $scope.target;
				if (!targetComponent) {
					var targetId = $scope.forElementId;
					if (!targetId) {
						throw new Error("No target or for attribute to attach the pager !");
					}
					var targetElement = document.getElementById(targetId);
					if (targetElement) {
						targetComponent = angular.element(targetElement).scope()._component;
					}
				}

				var targetPromise;
				if (targetComponent) {
					targetPromise = $q.when(targetComponent);

				} else if ($scope.forElementId) {
					targetPromise = pagerRegistry.waitTarget(this.id, $scope.forElementId);
				}

				this.targetPromise = targetPromise;

			}

			PagerBase.prototype = {

				/**
				 * @returns {Promise}
				 */
				construct: [ "$q",
					function($q) {
						this.constructing = true;
						this.constructed = false;
						this.element = null;

						var self = this;

						return this.targetPromise.then(function(targetComponent) {
							cc.Assert(targetComponent && targetComponent.$scope, "pager", "Invalid target component ",
									targetComponent);

							delete self.targetPromise;
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
					var targetComponent = renderContext.target;
					var targetScope = targetComponent.$scope;

					var doc = angular.element(document.createDocumentFragment());

					var self = this;
					var targetDestroyedCallback = targetScope.$on("destroy", function() {
						self.targetDestroyed(targetComponent);

						self.targetComponent = undefined;
					});

					var positionsChangedCallback = targetScope.$on("positionsChanged", function(event, positions) {
						if (!self.element) {
							renderContext.positions = positions;
							return;
						}
						renderContext.positions = undefined;

						self.setPositions(targetComponent, renderContext, positions);
					});

					this.$scope.$on("destroy", function() {
						positionsChangedCallback();
						targetDestroyedCallback();
					});

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

			return PagerBase;
		} ]);

	/*
	 * ------------------------ Pager --------------------------
	 */

	module.factory("camelia.components.Pager", [ "$log",
		"cm_pager_rendererProviderName",
		"cm_pager_format",
		"camelia.components.PagerBase",
		function($log, cm_pager_rendererProviderName, cm_pager_format, PagerBase) {

			var Pager = function($scope, element) {
				var id = $scope.id;
				if (!id) {
					id = "cm_pager_" + (anonymousId++);
				}
				this.id = id;
				element.attr("id", id);

				PagerBase.call(this, $scope, element, cm_pager_rendererProviderName);
			};

			Pager.prototype = Object.create(PagerBase.prototype);
			angular.extend(Pager.prototype, {
				constructor: Pager,

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

			return Pager;
		} ]);

})(window, window.angular);