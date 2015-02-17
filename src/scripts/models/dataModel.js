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

	var module = angular.module('camelia.dataModel', [ 'camelia.core', 'ngResource' ]);

	module.factory('camelia.DataModel', [ '$q',
		'$rootScope',
		'$injector',
		'$resource',
		'camelia.core',
		'camelia.ScopeWrapper',
		function($q, $rootScope, $injector, $resource, cc, ScopeWrapper) {

			var resourceProto = cc.getProto($resource());

			function DataModel() {
				ScopeWrapper.call(this, $rootScope.$new(true));

				var self = this;
				this.$on("$destroy", function() {

					var deRegistration = self._watcherDeRegistration;
					if (deRegistration) {
						self._watcherDeRegistration = undefined;

						deRegistration();
					}

					self._wrappedData = undefined;
					self._sorters = undefined;
					self._filters = undefined;
					self._dataScope = undefined;
					self._fetchProperties = undefined;
				});
			}

			DataModel.DATA_REQUESTING = "cm:dataRequesting";

			DataModel.DATA_LOADING = "cm:dataLoading";

			DataModel.DATA_LOADED = "cm:dataLoaded";

			DataModel.DATA_MODEL_CHANGED_EVENT = "cm:dataModelChanged";

			DataModel.DATA_MODEL_UPDATED_EVENT = "cm:dataModelUpdated";

			DataModel.From = function(parameter) {

				if (parameter instanceof DataModel) {
					return parameter;
				}

				var parameterProto = parameter && cc.getProto(parameter);

				if (parameterProto === resourceProto) {
					return $injector.invoke([ "camelia.ResourceDataModel", function(ResourceDataModel) {
						return new ResourceDataModel(parameter);
					} ]);
				}
				if (angular.isArray(parameter)) {
					return $injector.invoke([ "camelia.ArrayDataModel", function(ArrayDataModel) {
						return new ArrayDataModel(parameter);
					} ]);
				}

				return new DataModel();
			};

			cc.extend(DataModel, ScopeWrapper, {

				_rowIndex: -1,

				installWatcher: function($scope, varName) {
					var self = this;
					this._watcherDeRegistration = $scope.$watch(varName, function(newValue) {
						self.$broadcast(DataModel.DATA_MODEL_CHANGED_EVENT, newValue);
					});
				},

				/**
				 * @return {Promise|boolean}
				 */
				isRowAvailable: function() {
					return false;
				},
				/**
				 * @param {boolean}
				 *          force returns promise if not known
				 * @return {Promise|number}
				 */
				getRowCount: function(force) {
					return -1;
				},
				/**
				 * @return {Object}
				 */
				getRowData: function() {
					return undefined;
				},
				/**
				 * @return {number}
				 */
				getRowIndex: function() {
					return this._rowIndex;
				},
				/**
				 * @param {number}
				 *          rowIndex
				 */
				setRowIndex: function(rowIndex) {
					var old = this._rowIndex;

					this._rowIndex = rowIndex;

					if (this.$parent === $rootScope) {
						if (old < 0 && rowIndex >= 0) {
							// Broadcast START
							this.$broadcast("cm:begin");
						}

						if (old >= 0 && rowIndex < 0) {
							this.$broadcast("cm:end");
						}
					}
				},
				getWrappedData: function() {
					return this._wrappedData;
				},
				setWrappedData: function(data) {
					this._wrappedData = data;
				},
				setFetchProperties: function(fetchProperties) {
					this._fetchProperties = fetchProperties;
				},
				setSorters: function(sorters) {
					if (this._sorters === sorters) {
						return false;
					}
					this._sorters = sorters;
					return true;
				},
				setFilters: function(filters) {
					if (this._filters === filters) {
						return false;
					}
					this._filters = filters;
					return true;
				},
				setGrouped: function(grouped) {
					this._grouped = !!grouped;
				},
				isGrouped: function() {
					return this._grouped;
				},
				setDataScope: function(scope) {
					this._dataScope = scope;
				},
				isFilterSupport: function() {
					return this.filterSupport;
				},
				isSortSupport: function() {
					return this.sortSupport;
				},
				isGroupSupport: function() {
					return this.groupSupport;
				},
				/**
				 * @returns {Array|Promise}
				 */
				toArray: function() {
					var array = [];

					var index = 0;

					var self = this;
					function promiseIndex(available) {

						for (; available; index++) {
							self.setRowIndex(index);

							available = self.isRowAvailable();
							if (available === false) {
								break;
							}

							if (cc.isPromise(available)) {
								return available.then(promiseIndex);
							}

							var data = self.getRowData();

							array.push(data);
						}

						self.setRowIndex(-1);

						return $q.when(array);
					}

					var ret = array;
					try {
						ret = promiseIndex(true);

					} catch (x) {
						this.setRowIndex(-1);

						throw x;
					}

					return ret;
				},

				$destroyChildren: function() {
					for (; this.$$childHead;) {
						this.$$childHead.$destroy();
					}
				}
			});

			return DataModel;
		} ]);

})(window, window.angular);