/**
 * @product CameliaJS (c) 2015 Vedana http://www.vedana.com
 * @license Creative Commons - The licensor permits others to copy, distribute,
 *          display, and perform the work. In return, licenses may not use the
 *          work for commercial purposes -- unless they get the licensor's
 *          permission.
 * @author olivier.oeuillot@vedana.com
 */

(function(window, angular, undefined) {
	"use strict";

	var module = angular.module("camelia.animations.grid");

	var DEFAULT_GRID_PAGECHANGE_TIMEOUT = 500;

	module.value("cm_grid_pageChange_timeout", DEFAULT_GRID_PAGECHANGE_TIMEOUT);

	module.factory("camelia.animations.grid.PageChange", [ "$log",
		"$timeout",
		"$q",
		'camelia.animations.Animation',
		'camelia.core',
		"camelia.i18n.Grid",
		"cm_grid_pageChange_timeout",
		function($log, $timeout, $q, Animation, cc, i18n, cm_grid_pageChange_timeout) {

			var anonymousId = 0;

			function PageChange($scope, params) {
				Animation.call(this, $scope, params);

				cc.Assert(params, "PageChange must define params !");

				var self = this;
				var off = this.$on("cm:tableViewPortCreated", function(event, args) {
					off();

					self._newTableViewPort = args.newTableViewPort;

					var oldTableViewPort = self._params.oldTableViewPort;
					if (oldTableViewPort) {
						oldTableViewPort.style.visibility = "hidden";
					}
				});

				this.$on("cm:dataLoaded", function(event, data) {
					self._dataLoaded = data;
				});

				var off2 = this.$on("cm:pageError", function(event, reason) {
					off2();

					// self._showErrorPage(reason);
				});
			}

			cc.extend(PageChange, Animation, {

				showErrorPage: function(reason) {

					this._clearPage();

					var self = this;
					return this._showErrorPage(reason).then(function onSuccess(errorPage) {

						return Animation.prototype._processEnd.call(self).then(function onSuccess() {

							return errorPage;
						});
					});
				},

				_processStart: function() {
					var renderer = this._params.renderer;
					var container = renderer.container;

					var cHeight = container.style.height;
					if (!cHeight || cHeight === "auto") {
						this._forceHeight = true;

						var containerBCR = container.getBoundingClientRect();
						container.style.height = containerBCR.height + "px";
					}

					var self = this;
					this._showLoadingPagePromise = $timeout(function onTimer() {
						if (!self._newTableViewPort) {
							self._showLoadingPagePromise = $timeout(onTimer, 1000, false);

							return self._showLoadingPagePromise;
						}

						self._showWaitingPage().then(function onSuccess(waitingPage) {
							self._waitingPage = waitingPage;
						});

					}, cm_grid_pageChange_timeout || DEFAULT_GRID_PAGECHANGE_TIMEOUT, false);
				},

				/**
				 * @returns {Promise}
				 */
				_showWaitingPage: function() {
					$log.debug("Show waiting page !!!!");

					var fragment = angular.element(document.createDocumentFragment());

					var self = this;
					return this._renderWaitingPage(fragment).then(function onSuccess(waitingPage) {
						if (waitingPage[0]) {
							waitingPage = waitingPage[0];
						}

						waitingPage.cm_type = "gridWaitingPage";

						self._setPageSize(waitingPage);

						var renderer = self._params.renderer;
						angular.element(renderer.bodyContainer).append(fragment);

						$timeout(function() {
							waitingPage.className += " cm_grid_waitingPage_shown";
						}, 100, false);

						return waitingPage;
					});
				},

				/**
				 * @returns {Promise}
				 */
				_renderWaitingPage: function(container) {
					var waitingDiv = cc.createElement(container, "div", {
						id: "cm_grid_waitingPage_" + (anonymousId++),
						className: "cm_grid_waitingPage"
					});

					var image = cc.createElement(waitingDiv, "span", {
						className: "cm_grid_waitingCircle fa fa-circle-o-notch fa-spin fa-2x "
					});

					var label = cc.createElement(waitingDiv, "label", {
						textnode: cc.lang(i18n, "loadingData")
					});

					if (this._dataLoaded) {
						angular.element(label).text(cc.lang(i18n, "receivingData", {
							count: this._dataLoaded.count
						}));
					}

					this.$on("cm:dataLoaded", function(event, data) {
						angular.element(label).text(cc.lang(i18n, "receivingData", {
							count: data.count
						}));
					});

					return $q.when(waitingDiv);
				},

				/**
				 * @returns {Promise}
				 */
				_showErrorPage: function(errorReason) {
					$log.debug("Show error page !!!!");

					var fragment = angular.element(document.createDocumentFragment());

					var self = this;
					return this._renderErrorPage(fragment, errorReason).then(function onSuccess(errorPage) {
						if (errorPage[0]) {
							errorPage = errorPage[0];
						}

						errorPage.cm_type = "gridErrorPage";

						self._setPageSize(errorPage);

						var renderer = self._params.renderer;
						angular.element(renderer.bodyContainer).append(fragment);

						return errorPage;
					});
				},

				_setPageSize: function(page) {
					var renderer = this._params.renderer;

					var titleViewPortBCR = renderer.titleViewPort.getBoundingClientRect();

					var tableBCR = renderer.container.getBoundingClientRect();

					var style = page.style;

					style.height = (tableBCR.height - titleViewPortBCR.height - 2) + "px";
				},

				/**
				 * @returns {Promise}
				 */
				_renderErrorPage: function(container, errorReason) {
					$log.debug("Show error page !!!!");

					var errorDiv = cc.createElement(container, "div", {
						id: "cm_grid_errorPage_" + (anonymousId++),
						className: "cm_grid_errorPage"
					});

					var image = cc.createElement(errorDiv, "span", {
						className: "cm_grid_errorIcon fa fa-exclamation-triangle fa-2x "
					});

					var label = cc.createElement(errorDiv, "label", {
						textnode: cc.lang(i18n, "loadingError")
					});

					return $q.when(errorDiv);
				},

				_clearPage: function() {

					var oldTableViewPort = this._params.oldTableViewPort;
					if (oldTableViewPort) {
						angular.element(oldTableViewPort).remove();
					}

					var oldErrorPage = this._params.oldErrorPage;
					if (oldErrorPage) {
						angular.element(oldErrorPage).remove();
					}

					var showLoadingPagePromise = this._showLoadingPagePromise;
					if (showLoadingPagePromise) {
						this._showLoadingPagePromise = undefined;

						$timeout.cancel(showLoadingPagePromise);
					}

					var waitingPage = this._waitingPage;
					if (waitingPage) {
						this._waitingPage = undefined;
						angular.element(waitingPage).remove();
					}

				},

				_processEnd: function() {
					var self = this;

					this._clearPage();

					var newTableViewPort = this._newTableViewPort;
					var fragment = newTableViewPort;
					if (fragment.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
						newTableViewPort = fragment.firstChild;
					}

					var renderer = this._params.renderer;

					angular.element(renderer.bodyContainer).append(fragment);
					renderer.tableElement.style.tableLayout = "fixed";
					newTableViewPort.style.visibility = "hidden";

					var cnt = 20;
					return $timeout(function waitSize() {
						var tableViewPortBCR = newTableViewPort.getBoundingClientRect();
						if (!tableViewPortBCR.width) {
							if (--cnt > 0) {
								return $timeout(waitSize, 50, false);
							}
							$log.error("Timeout when getting size of newTableViewPort");
						}

						if (self._forceHeight) {
							renderer.container.style.height = "auto";
							renderer.bodyContainer.style.height = "auto";

						} else {
							var titleViewPortBCR = renderer.titleViewPort.getBoundingClientRect();
							var containerBCR = renderer.container.getBoundingClientRect();

							var h2 = Math.floor(containerBCR.height - titleViewPortBCR.height)-1; // Why -1 ????

							newTableViewPort.style.height = h2 + "px";
							renderer.bodyContainer.style.height = h2 + "px";
						}

						newTableViewPort.style.visibility = "visible";

						return Animation.prototype._processEnd.call(self).then(function onSuccess() {
							return newTableViewPort;
						});

					}, 10, false);
				}
			});

			return PageChange;
		} ]);

})(window, window.angular);