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
		'camelia.animations.Animation',
		'camelia.core',
		function($log, $timeout, Animation, cc) {

			var anonymousId = 0;

			var PageChange = function($scope, params) {
				Animation.call(this, $scope, params);

				var self = this;
				var off = this.$on("cm:tableViewPortCreated", function(event, args) {
					self._args = args;

					off();
				});

				var off2 = this.$on("cm:pageError", function(event, args) {
					self._showPageError();

					off2();
				});
			};

			cc.extend(PageChange, Animation, {

				_processStart: function() {
					var renderer = this._params.renderer;
					var container = renderer.container;

					var cHeight = container.style.height;
					if (!cHeight || cHeight === "auto") {
						this._forceHeight = true;

						var containerBCR = container.getBoundingClientRect();
						container.style.height = containerBCR.height + "px";
					}

					var viewPort = renderer.tableViewPort;
					if (viewPort) {
						this._oldTableViewPort = viewPort;

						viewPort.style.visibility = "hidden";
					}

					var self = this;
					this._showLoadingPagePromise = $timeout(function onTimer() {
						if (!self._args) {
							return $timeout(onTimer, 1000, false);
						}

						self._showWaitingPage();

					}, 1000, false);
				},

				_showWaitingPage: function() {

					var fragment = angular.element(document.createDocumentFragment());

					this._renderWaitingPage(fragment);

					this._waitingPage = fragment[0].firstChild;

					var renderer = this._params.renderer;
					angular.element(renderer.bodyContainer).append(fragment);
				},

				_renderWaitingPage: function(container) {
					$log.debug("Show waiting page !!!!");

					var waitingDiv = cc.createElement(container, "div", {
						id: "cm_table_waitingPage_" + (anonymousId++),
						className: "cm_dataGrid_waitingPage"
					});

					var label = cc.createElement(waitingDiv, "label", {
						textnode: "Page en cours de chargement"
					});

					this.$on("cm:dataLoaded", function(event, data) {
						angular.element(label).text(data.count + " lignes chargées");
					});
				},

				_processEnd: function() {
					var showLoadingPagePromise = this._showLoadingPagePromise;
					if (showLoadingPagePromise) {
						this._showLoadingPagePromise = undefined;

						$timeout.cancel(showLoadingPagePromise);
					}

					var tableViewPort = this._args.tableViewPort;
					var oldTableViewPort = this._oldTableViewPort;
					var fragment = this._args.fragment || tableViewPort;

					var renderer = this._params.renderer;

					var waitingPage = this._waitingPage;
					if (waitingPage) {
						this._waitingPage = undefined;
						angular.element(waitingPage).remove();
					}

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

					return Animation.prototype._processEnd.call(this);
				}
			});

			return PageChange;
		} ]);

})(window, window.angular);