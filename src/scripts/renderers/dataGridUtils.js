(function(window, angular, undefined) {
	'use strict';

	var module = angular.module('camelia.renderers.grid');

	module.factory('camelia.renderers.grid.utils', [ "$log",
		"$timeout",
		"camelia.core",
		"camelia.cmTypes",
		function($log, $timeout, cc, cm) {

			return {

				GetFirstRow: function(renderContext) {
					var tbody = renderContext.tableTBody;
					if (!tbody) {
						return null;
					}

					return cm.GetNextType(tbody.firstChild, "row");
				},

				ForEachBodyElement: function(renderContext, type, func) {

					var tbody = renderContext.tableTBody;
					if (!tbody) {
						return;
					}

					var rows = tbody.rows;

					return cm.ForEachElement(rows, type, func);
				},

				RegisterElement: function(renderContext, element, value) {
					if (!renderContext._cacheValues) {
						renderContext._cacheValues = [];
						renderContext._cacheElements = [];
						renderContext._cacheFilled = false;

						$timeout(function() {
							renderContext._cacheValues = undefined;
							renderContext._cacheElements = undefined;
							renderContext._cacheFilled = undefined;
						}, 50, false);
					}

					if (value === undefined) {
						value = angular.element(element).data("cm_value");

						if (value === undefined || renderContext._cacheValues.indexOf(value) >= 0) {
							return;
						}
					}

					renderContext._cacheElements.push(element);
					renderContext._cacheValues.push(value);
				},

				GetElementFromValue: function(renderContext, rowValue, type, cache) {
					var cacheValues = renderContext._cacheValues;
					if (cacheValues) {
						var idx = cacheValues.indexOf(rowValue);
						if (idx >= 0) {
							var elt = renderContext._cacheElements[idx];
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

						if (renderContext._cacheFilled) {
							return null;
						}
					}

					var self = this;
					var ret = null;
					this.ForEachBodyElement(renderContext, type, function(tr) {

						var rowData = angular.element(tr).data("cm_value");
						self.RegisterElement(renderContext, tr, rowData);

						if (rowData === rowValue) {
							ret = tr;

							if (!cache) {
								return false; // Stop forEach
							}
						}

					}, type);

					if (cache) {
						renderContext._cacheFilled = true;
					}
					return ret;
				},
			};
		} ]);
})(window, window.angular);