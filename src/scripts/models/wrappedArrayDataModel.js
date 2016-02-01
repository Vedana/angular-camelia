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

	module.factory('camelia.WrappedArrayDataModel', [ 'camelia.ArrayDataModel',
		"camelia.core",
		function(ArrayDataModel, cc) {

			var DELEGATE_TO_PARENT = "$$DELAGATE_PARENT$$";
			var NO_DATA = "$$NO-DATA$$";

			function WrappedArrayDataModel(dataModel) {
				ArrayDataModel.call(this, undefined);

				this.$parent = dataModel;

			}

			cc.extend(WrappedArrayDataModel, ArrayDataModel, {

				setSorters: function(sorters) {
					this.$parent.setSorters(sorters);
					WrappedArrayDataModel.prototype.$super.setSorters.call(this, sorters);
				},
				setFilters: function(filters) {
					this.$parent.setFilters(filters);
					WrappedArrayDataModel.prototype.$super.setFilters.call(this, filters);
				},
				setGrouped: function(grouped) {
					this.$parent.setGrouped(grouped);
					WrappedArrayDataModel.prototype.$super.setGrouped.call(this, grouped);
				},
				setDataScope: function(scope) {
					this.$parent.setDataScope(scope);
					WrappedArrayDataModel.prototype.$super.setDataScope.call(this, scope);
				},
				isFilterSupport: function() {
					return WrappedArrayDataModel.prototype.$super.isFilterSupport.call(this) || this.$parent.isFilterSupport();
				},
				isSortSupport: function() {
					return WrappedArrayDataModel.prototype.$super.isSortSupport.call(this) || this.$parent.isSortSupport();
				},
				isGroupSupport: function() {
					return WrappedArrayDataModel.prototype.$super.isGroupSupport.call(this) || this.$parent.isGroupSupport();
				},

				setFetchProperties: function(fetchProperties) {
					this.$parent.setFetchProperties(fetchProperties);
					WrappedArrayDataModel.prototype.$super.setFetchProperties.call(this, fetchProperties);
				},

				setRowIndex: function(index) {
					this.$parent.setRowIndex(index);
					WrappedArrayDataModel.prototype.$super.setRowIndex.call(this, index);
				},

				getRowCount: function() {
					// TODO Fix must call isRowAvailable before !!!!?
					var localArray = this.getWrappedData();
					if (localArray === undefined) {
						return -1;
					}

					if (localArray === DELEGATE_TO_PARENT) {
						return this.$parent.getRowCount();
					}

					return WrappedArrayDataModel.prototype.$super.getRowCount.call(this);
				},

				getRowData: function() {
					var localArray = this.getWrappedData();
					if (localArray === DELEGATE_TO_PARENT) {
						return this.$parent.getRowData();
					}

					return WrappedArrayDataModel.prototype.$super.getRowData.call(this);
				},

				isRowAvailable: function() {

					var localArray = this.getWrappedData();

					if (localArray === DELEGATE_TO_PARENT) {
						return this.$parent.isRowAvailable();
					}

					if (localArray === NO_DATA) {
						return false;
					}

					if (localArray) {
						return WrappedArrayDataModel.prototype.$super.isRowAvailable.call(this);
					}

					var self = this;

					function _arrayReady(parentArray) {

						localArray = self.processParentArray(parentArray);

						self.setWrappedData(localArray);

						return WrappedArrayDataModel.prototype.$super.isRowAvailable.call(self);
					}

					function _processArray() {
						var parentArray = self.$parent.toArray();

						if (cc.isPromise(parentArray)) {
							return parentArray.then(function(array) {
								return _arrayReady(array);
							});
						}

						if (!parentArray) {
							parentArray = [];
						}

						if (angular.isArray(parentArray)) {
							return _arrayReady(parentArray);
						}

						throw new Error("Invalid toArray return !");
					}

					var avail = this.$parent.isRowAvailable();
					if (avail === false) {
						this.setWrappedData(NO_DATA);
						return false;
					}

					if (!cc.isPromise(avail)) {
						if (this.delegateToParent()) {
							this.setWrappedData(DELEGATE_TO_PARENT);
							return true;
						}

						return _processArray();
					}

					return avail.then(function(av) {
						if (av === false) {
							self.setWrappedData(NO_DATA);
							return false;
						}

						if (self.delegateToParent()) {
							self.setWrappedData(DELEGATE_TO_PARENT);
							return true;
						}

						return _processArray();
					});
				},

				delegateToParent: function() {
					return false;
				},

				processParentArray: function(array) {
					return array;
				}
			});

			return WrappedArrayDataModel;
		} ]);

})(window, window.angular);