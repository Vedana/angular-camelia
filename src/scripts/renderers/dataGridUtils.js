/**
 * @product CameliaJS (c) 2014 Vedana http://www.vedana.com
 * @license Creative Commons - The licensor permits others to copy, distribute,
 *          display, and perform the work. In return, licenses may not use the
 *          work for commercial purposes -- unless they get the licensor's
 *          permission.
 * @author olivier.oeuillot@vedana.com
 */

(function(window, angular, undefined) {
	'use strict';

	var module = angular.module('camelia.renderers.grid');

	module.factory('camelia.renderers.grid.utils', [ "$log",
		"$timeout",
		"camelia.core",
		"camelia.cmTypes",
		function($log, $timeout, cc, cm) {

			return {

				getTableBody: function() {
					var table = this.tableElement;
					if (!table) {
						return;
					}

					return table.tBodies[0];
				},

				getFirstRow: function() {
					var tbody = this.getTableBody();
					if (!tbody) {
						return null;
					}

					return cm.GetNextType(tbody.firstChild, "row");
				},

				forEachBodyElement: function(type, func) {

					var tbody = this.getTableBody();
					if (!tbody) {
						return;
					}

					var rows = tbody.rows;

					return cm.ForEachElement(rows, type, func);
				},

				registerElement: function(element, value) {
					if (!this._cacheValues) {
						this._cacheValues = [];
						this._cacheElements = [];
						this._cacheFilled = false;

						var self = this;
						$timeout(function() {
							delete self._cacheValues;
							delete self._cacheElements;
							delete self._cacheFilled;
						}, 50, false);
					}

					if (value === undefined) {
						value = angular.element(element).data("cm_value");

						if (value === undefined || this._cacheValues.indexOf(value) >= 0) {
							return;
						}
					}

					this._cacheElements.push(element);
					this._cacheValues.push(value);
				},

				getElementFromValue: function(rowValue, type, cache) {
					var cacheValues = this._cacheValues;
					if (cacheValues) {
						var idx = cacheValues.indexOf(rowValue);
						if (idx >= 0) {
							var elt = this._cacheElements[idx];
							if (type) {
								var etype = cm.GetCMType(elt);

								if (angular.isString(type)) {
									if (etype != type) {
										return null;
									}

								} else if (!type[etype]) {
									return null;
								}
							}

							return elt;
						}

						if (this._cacheFilled) {
							return null;
						}
					}

					var self = this;
					var ret = null;
					this.forEachBodyElement(type, function(tr) {

						var rowData = angular.element(tr).data("cm_value");
						self.registerElement(tr, rowData);

						if (rowData === rowValue) {
							ret = tr;

							if (!cache) {
								return false; // Stop forEach
							}
						}

					}, type);

					if (cache) {
						this._cacheFilled = true;
					}
					return ret;
				}
			};
		} ]);
})(window, window.angular);