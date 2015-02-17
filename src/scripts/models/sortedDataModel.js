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

	var module = angular.module('camelia.dataModel');

	module.factory('camelia.SortedDataModel', [ '$log',
		'camelia.WrappedArrayDataModel',
		'camelia.core',
		function($log, WrappedArrayDataModel, cc) {

			function SortedDataModel(dataModel) {
				WrappedArrayDataModel.call(this, dataModel);

				this.sortSupport = true;
			}

			cc.extend(SortedDataModel, WrappedArrayDataModel, {

				processParentArray: function(array) {

					if (!this._sorters) {
						return array;
					}

					var scope = this._dataScope.$new(true);
					try {
						angular.forEach(this._sorters, function(sorter) {

							scope.$array = array;

							var expression = sorter.expression;
							if (expression === "orderBy:" && sorter.column.$scope.fieldName) {
								expression += "'" + sorter.column.$scope.fieldName + "'";
							}

							var newArray = scope.$eval("$array | " + expression);

							if (!sorter.ascending) {
								newArray = newArray.reverse();
							}

							array = newArray;
						});

					} finally {
						scope.$destroy();
					}

					return array;
				},

				delegateToParent: function() {
					return this.$parent.isSortSupport() || !this._sorters;
				},
				getRowCount: function() {
					return this.$parent.getRowCount();
				}
			});

			return SortedDataModel;
		} ]);

})(window, window.angular);