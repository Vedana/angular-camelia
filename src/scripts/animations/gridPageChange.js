/**
 * @product CameliaJS (c) 2014 Vedana http://www.vedana.com
 * @license Creative Commons - The licensor permits others to copy, distribute,
 *          display, and perform the work. In return, licenses may not use the
 *          work for commercial purposes -- unless they get the licensor's
 *          permission.
 * @author olivier.oeuillot@vedana.com
 */

(function(window, angular, undefined) {
	"use strict";

	var module = angular.module("camelia.animations.grid");

	module.factory("camelia.animations.grid.PageChange", [ "$log", "$timeout", 'camelia.animations.Animation',
		'camelia.core',
		function($log, $timeout, Animation, cc) {

			var PageChange = function($scope, params) {
				Animation.call(this, $scope, params);

				this.renderer = params.renderer;
				var self = this;
				var off = $scope.$on("cm:pageCreated", function(event, args) {
					self._args = args;

					off();
				});
			};

			cc.extend(PageChange, Animation, {

				_processStart: function() {
					this._hideBody();

					var renderer = this.renderer;
					var container = renderer.container;

					var cHeight = container.style.height;
					if (!cHeight || cHeight == "auto") {
						this._forceHeight = true;

						var containerBCR = container.getBoundingClientRect();
						container.style.height = containerBCR.height + "px";
					}

					var viewPort = renderer.tableViewPort;
					if (viewPort) {
						this._oldTableViewPort = viewPort;
						
						viewPort.style.visible="hidden";
					}
				},

				_processEnd: function() {
					var tableViewPort = this._args.tableViewPort;
					var oldTableViewPort = this._oldTableViewPort;
					var fragment = this._args.fragment || tableViewPort;

					var renderer = this.renderer;

					angular.element(renderer.bodyContainer).append(fragment);
					renderer.tableElement.style.tableLayout = "fixed";
					tableViewPort.style.visibility = "hidden";

					var self = this;
					$timeout(function waitSize() {
						var tableViewPortBCR = tableViewPort.getBoundingClientRect();
						if (!tableViewPortBCR.height) {
							return $timeout(waitSize, 10, false);
						}

						var titleViewPortBCR = renderer.titleViewPort.getBoundingClientRect();

						var h = titleViewPortBCR.height + tableViewPortBCR.height;
						renderer.container.style.height = h + "px";
						renderer.bodyContainer.style.height = tableViewPortBCR.height + "px";

						tableViewPort.style.visibility = "visible";
						if (oldTableViewPort) {
							angular.element(oldTableViewPort).remove();
						}

					}, 10, false);

					this._showBody();
				},

				_hideBody: function() {
					var renderer = this.renderer;

					var ts = renderer.tableViewPort.style;
					// ts.width = "auto";
					// ts.height = "auto";
					// ts.visibility = "hidden";
					// renderer.tableElement.style.tableLayout = "";

					$log.debug("GridPageChange.Hide body");
				},
				_showBody: function() {
					var renderer = this.renderer;

					var ts = renderer.tableViewPort.style;
					// renderer.tableElement.style.tableLayout = "fixed";
					// ts.visibility = "";
					$log.debug("GridPageChange.Show body");
				},

			});

			return PageChange;
		} ]);

})(window, window.angular);