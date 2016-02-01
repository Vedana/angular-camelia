/**
 * @product CameliaJS (c) 2016 Vedana http://www.vedana.com
 * @license Creative Commons - The licensor permits others to copy, distribute,
 *          display, and perform the work. In return, licenses may not use the
 *          work for commercial purposes -- unless they get the licensor's
 *          permission.
 * @author olivier.oeuillot@vedana.com
 */

(function(window, angular, undefined) {
	'use strict';

	var module = angular.module('camelia.dataModel');

	module.factory('camelia.FiltredDataModel', [ '$log',
		'camelia.WrappedArrayDataModel',
		'camelia.core',
		function($log, WrappedArrayDataModel, cc) {

			function FiltredDataModel(dataModel, rowVarName) {
				WrappedArrayDataModel.call(this, dataModel);

				this.filterSupport = true;
				this._rowVarName = rowVarName;
			}

			cc.extend(FiltredDataModel, WrappedArrayDataModel, {
				processParentArray: function(array) {

					var filters = this._filters;
					if (!filters || !filters.length) {
						return array;
					}

					var filtersLength = filters.length;
					var rowVarName = this._rowVarName;

					var newArray = [];
					var rowScope = this._dataScope.$new(true);
					var self = this;
					try {
						angular.forEach(array, function(rowData) {

							rowScope.$row = rowData;
							if (rowVarName) {
								rowScope[rowVarName] = rowData;
							}

							for (var i = 0; i < filtersLength; i++) {
								var filter = filters[i];

								if (filter(rowScope, self) === false) {
									return;
								}
							}

							newArray.push(rowData);
						});

					} finally {
						rowScope.$destroy();
					}

					return newArray;
				},

				delegateToParent: function() {
					return this.$parent.isFilterSupport() || !this._filters;
				}
			});

			return FiltredDataModel;
		} ]);

})(window, window.angular);