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

	module.factory('camelia.ArrayDataModel', [ '$log',
		'camelia.DataModel',
		'camelia.core',
		function($log, DataModel, cc) {

			function ArrayDataModel(array) {
				DataModel.prototype.constructor.call(this);

				this.setWrappedData(array);
			}

			cc.extend(ArrayDataModel, DataModel, {
				installWatcher: function($scope, varName) {
					var self = this;
					this._watcherDeRegistration = $scope.$watchCollection(varName, function(newValue, oldValue) {
						if (oldValue === undefined) {
							return;
						}

						self.setWrappedData(newValue);
						self.$broadcast(DataModel.DATA_MODEL_UPDATED_EVENT, newValue);
					});
				},

				/**
				 * @return {Promise}
				 */
				isRowAvailable: function() {
					var index = this.getRowIndex();
					var rowCount = this.getRowCount();

					function f(rowCount) {
						if (index >= 0 && (rowCount < 0 || index < rowCount)) {
							return true;
						}

						return false;
					}

					if (!cc.isPromise(rowCount)) {
						return f(rowCount);
					}

					return rowCount.then(function onSuccess(rowCount) {
						return f(rowCount);
					});
				},
				/**
				 * @return {Promise|number}
				 */
				getRowCount: function() {
					var array = this.getWrappedData();
					if (!array) {
						return 0;
					}
					return array.length;
				},
				/**
				 * @return {Object}
				 */
				getRowData: function() {
					if (!this.isRowAvailable()) {
						throw new Error("Invalid rowIndex (" + this.getRowIndex() + "/" + this.getRowCount() + ")");
					}

					var array = this.getWrappedData();

					var index = this.getRowIndex();
					return array[index];
				},
				toArray: function() {
					var array = this.getWrappedData();
					if (angular.isArray(array)) {
						return array;
					}

					return DataModel.prototype.toArray.call(this);
				}
			});

			return ArrayDataModel;
		} ]);

})(window, window.angular);