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

	module.factory("camelia.animations.grid.Waiting", [ "$log",
		"camelia.animations.grid.GridPageChange",
		'camelia.core',
		function($log, GridPageChange, cc) {

			var Waiting = function($scope, params) {
				GridPageChange.call(this, $scope, params);

				this.renderer = params.renderer;

				this._timeout = 0;

				var self = this;
				var off = $scope.$on("cm:pageCreated", function(event, args) {
					var tbody = args.tbody;
					if (tbody[0]) {
						tbody = tbody[0];
					}

					self._tbody = tbody;

					off();
				});
			};

			cc.extend(Waiting, GridPageChange, {

				_processStart: function() {
					this._hideBody();

					var renderer = this.renderer;
					var container = renderer.container;

					if (!container.style.height || container.style.height.indexOf("px") < 0) {
						this.forceHeight = true;

						var cr = container.getBoundingClientRect();
						container.style.height = cr.height + "px";
					}

					var tbody = renderer.tableTBody;
					if (tbody) {
						tbody.parentNode.removeChild(tbody);

						renderer.tableClearRows(tbody);
					}
				},

				_processEnd: function() {
					var tbody = this._tbody;

					var renderer = this.renderer;

					renderer.tableTBody = (tbody.nodeType == 11) ? tbody.firstChild : tbody;
					renderer.tableElement.appendChild(tbody);

					if (this.forceHeight) {
						renderer.container.style.height = "auto";
						renderer.tableViewPort.style.height = "auto";
					}

					this._showBody();
				},

				_hideBody: function() {
					var renderer = this.renderer;

					var ts = renderer.tableViewPort.style;
					ts.width = "auto";
					// ts.height = "auto";
					ts.visibility = "hidden";
					renderer.tableElement.style.tableLayout = "";

					$log.debug("Hide body");
				},
				_showBody: function() {
					var renderer = this.renderer;

					var ts = renderer.tableViewPort.style;
					renderer.tableElement.style.tableLayout = "fixed";
					ts.visibility = "";
					$log.debug("Show body");
				},

			});

			return PageChange;
		} ]);

})(window, window.angular);