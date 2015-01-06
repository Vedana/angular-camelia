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

	module.factory("camelia.animations.grid.PageChange", [ "$log",
		"$timeout",
		"camelia.animations.Animation",
		'camelia.core',
		function($log, $timeout, Animation, cc) {

			var PageChange = function($scope, params) {
				Animation.call(this, $scope, params);

				this.renderer = params.renderer;

				this._timeout = this._params.timeout || 500;

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
					}

					var pageSeparator = cc.createElement(renderer.bodyContainer, "div", {
						className: "pageSeparator"
					});
					pageSeparator = pageSeparator[0];
					this._pageSeparator = pageSeparator;
					pageSeparator.style.visibility = "hidden";

					var self = this;
					this._targetY = 0;
					$timeout(function waitSize() {
						var pageSeparatorBCR = pageSeparator.getBoundingClientRect();
						if (!pageSeparatorBCR.height) {
							return $timeout(waitSize, 10, false);
						}

						var viewPortY = parseInt(viewPort.style.top || '0', 10);

						var viewPortBCR = viewPort.getBoundingClientRect();
						pageSeparator.style.width = viewPortBCR.width + "px";

						var pageSeparatorY = 0;

						if (self._params.oldFirst > self._params.first) {
							pageSeparatorY = viewPortY - pageSeparatorBCR.height;
							self._targetY -= pageSeparatorBCR.height;

						} else {
							pageSeparatorY = viewPortY + viewPortBCR.height;
							self._targetY += pageSeparatorBCR.height;
						}

						pageSeparator.style.top = pageSeparatorY + "px";
						pageSeparator.style.visibility = "visible";
						debugger;

					}, 10, false);

					this._animation = $timeout(function anim() {
						console.log("Animation=" + self._targetY);

						function addDy(comp) {
							if (!comp) {
								return;
							}
							var style = comp.style;
							style.top = (parseInt(style.top || '0', 10) + dy) + "px";
						}

						var dy = 0;
						if (self._targetY < 0) {
							dy = Math.max(self._targetY, -48);

						} else if (self._targetY > 0) {
							dy = Math.min(self._targetY, 48);
						}

						self._targetY -= dy;

						if (dy) {
							addDy(viewPort);
							addDy(self._args.tableViewPort);
							addDy(pageSeparator);

						} else if (self._stopAnim) {

							angular.element(pageSeparator).remove();
							angular.element(viewPort).remove();
							return;
						}

						return $timeout(anim, 50, false);

					}, 50, false);
				},

				_processEnd: function() {
					var tableViewPort = this._args.tableViewPort;
					var oldTableViewPort = this._oldTableViewPort;
					var fragment = this._args.fragment || tableViewPort;
					var pageSeparator = this._pageSeparator;

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

						var pageSeparatorBCR = pageSeparator.getBoundingClientRect();

						var titleViewPortBCR = renderer.titleViewPort.getBoundingClientRect();

						var h = titleViewPortBCR.height + tableViewPortBCR.height;
						renderer.container.style.height = h + "px";
						renderer.bodyContainer.style.height = tableViewPortBCR.height + "px";

						var newY = 0;
						var bodyHeight = tableViewPortBCR.height + pageSeparatorBCR.height;

						var pagerY = parseInt(pageSeparator.style.top, 10);
						if (self._params.oldFirst > self._params.first) {
							newY = pagerY - tableViewPortBCR.height;
							self._targetY -= tableViewPortBCR.height;

						} else if (self._params.oldFirst === undefined) {
							newY = pagerY + pageSeparatorBCR.height;

						} else {
							newY = pagerY + pageSeparatorBCR.height;
							self._targetY += tableViewPortBCR.height;
						}
						self._stopAnim = true;

						tableViewPort.style.top = newY + "px";

						tableViewPort.style.visibility = "visible";

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

					$log.debug("Hide body");
				},
				_showBody: function() {
					var renderer = this.renderer;

					var ts = renderer.tableViewPort.style;
					// renderer.tableElement.style.tableLayout = "fixed";
					// ts.visibility = "";
					$log.debug("Show body");
				},

			});

			return PageChange;
		} ]);

})(window, window.angular);