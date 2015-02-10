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

	var module = angular.module("camelia.components.pager", [ "camelia.core",
		"camelia.pagerRegistry",
		"camelia.renderers.pager" ]);

	module.value("cm_pager_rendererProviderName", "camelia.renderers.pager:camelia.renderers.Pager");
	module.value("cm_pager_format", "{bprev} {bpages} {bnext}");
	module
			.value(
					"xcm_pager_format",
					"'first=' {first} 'last=' {last} 'rowCount=' {rowCount} 'pageCount=' {pageCount} 'pagePos=' {pagePosition} {bprev} {bnext}");

	var anonymousId = 0;

	module.factory("camelia.components.PagerBase", [ "$log",
		"$q",
		"$timeout",
		"$exceptionHandler",
		"camelia.core",
		"camelia.PagerRegistry",
		"cm_pager_rendererProviderName",
		function($log, $q, $timeout, $exceptionHandler, cc, PagerRegistry, cm_pager_rendererProviderName) {

			/*
			 * ------------------------ PagerBase --------------------------
			 */

			var PagerBase = function($scope, element, defaultRendererProviderName) {
				this.$scope = $scope;

				var rendererProvider = $scope.rendererProvider;
				if (!rendererProvider) {
					var rendererProviderName = $scope.rendererProviderName || cm_pager_rendererProviderName ||
							cm_dataGrid_rendererProviderName;

					if ($scope.lookId) {
						rendererProviderName += "-" + $scope.lookId;
					}

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
					targetPromise = PagerRegistry.RegisterWaitingFor($scope, $scope.forElementId);

				}

				this.targetPromise = targetPromise;
			};

			PagerBase.prototype = {

				/**
				 * @returns {Promise}
				 */
				construct: [ function() {
					this.constructing = true;
					this.constructed = false;
					this.element = null;

					var self = this;

					return this.targetPromise.then(function onSuccess(targetElement) {
						cc.Assert(targetElement && angular.element(targetElement).scope(), "pager", "Invalid target component ",
								targetElement);

						var targetScope = angular.element(targetElement).scope();

						delete self.targetPromise;
						// self.targetComponent = targetComponent;

						var renderContext = {
							pager: self,
							targetScope: targetScope,
							$scope: self.$scope
						};

						return self.constructFromTarget(renderContext).then(function onSuccess(result) {

							self.constructing = false;
							self.constructed = true;

							return result;
						});

					}, function onError(reason) {
						self.constructing = false;
						self.constructed = false;

						return $q.reject(reason);
					});
				} ],

				constructFromTarget: function(renderContext) {
					var targetScope = renderContext.targetScope;

					var doc = angular.element(document.createDocumentFragment());

					var nextPositions;

					var self = this;
					var targetDestroyedOff = targetScope.$on("$destroy", function onDestroy() {

						self._targetDestroyed(targetScope);

						renderContext.targetScope = undefined;
					});

					var positionsChangedOff = targetScope.$on("cm:positionsChanged",
							function onPositionsChanged(event, positions) {
								if (!self.element) {
									nextPositions = positions;
									return;
								}
								nextPositions = undefined;

								self.updatePositions(positions);
							});

					this.$scope.$on("$destroy", function onDestroy() {
						if (targetDestroyedOff) {
							targetDestroyedOff();
							targetDestroyedOff = null;
						}

						if (positionsChangedOff) {
							positionsChangedOff();
							positionsChangedOff = null;
						}
					});

					var pagerRenderer = new this.rendererProvider(renderContext);
					this.pagerRenderer = pagerRenderer;

					var containerPromise = pagerRenderer.render(doc);
					if (!cc.isPromise(containerPromise)) {
						containerPromise = $q.when(containerPromise);
					}

					return containerPromise.then(function onSuccess(element) {
						self.element = element;

						// angular.element(element).data("$scope", self.$scope);

						var positions = nextPositions;
						nextPositions = undefined;

						if (!positions && targetScope.getCurrentPositions) {
							positions = targetScope.getCurrentPositions();
						}
						if (positions) {
							self.updatePositions(positions);
						}

						return doc;
					});
				},

				_targetDestroyed: function() {

				},

				updatePositions: function(positions) {
					this.pagerRenderer.pagerPositionsUpdate(positions);
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

						var targetScope = renderContext.targetScope;

						var positions = targetScope.getCurrentPositions();

						if (!angular.isString(format)) {
							format = cm_pager_format;
						}

						renderContext.format = format;

						self.updatePositions(positions);
					});

					return PagerBase.prototype.constructFromTarget.call(this, renderContext);
				}
			});

			return Pager;
		} ]);

})(window, window.angular);