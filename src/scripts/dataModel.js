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

	var module = angular.module('camelia.dataModel', [ 'camelia.core', 'camelia.scopedObject', 'ngResource' ]);

	var SLOW_LOADING_SIMULATION = true;

	module.factory('camelia.DataModel', [ "$q",
		"$rootScope",
		"$injector",
		"$resource",
		"camelia.core",
		"camelia.ScopedObject",
		function($q, $rootScope, $injector, $resource, cc, ScopedObject) {

			var resourceProto = cc.getProto($resource());

			function DataModel() {
				ScopedObject.call(this);

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

			cc.extend(DataModel, ScopedObject, {

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

					if (this.$parent == $rootScope) {
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

	/*
	 * ------------------------ ArrayDataModel ------------------------------
	 */

	module.factory('camelia.ArrayDataModel', [ 'camelia.DataModel', 'camelia.core', function(DataModel, cc) {

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

				if (index >= 0 && (rowCount < 0 || index < rowCount)) {
					return true;
				}

				return false;
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

	/*
	 * ------------------------ WrappedArrayDataModel ------------------------
	 */

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

	/*
	 * ------------------------ SortedDataModel ----------------------------
	 */

	module.factory('camelia.SortedDataModel', [ 'camelia.WrappedArrayDataModel',
		'camelia.core',
		function(WrappedArrayDataModel, cc) {

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
							if (expression == "orderBy:" && sorter.column.$scope.fieldName) {
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

	/*
	 * ------------------------ FiltredDataModel ----------------------------
	 */

	module.factory('camelia.FiltredDataModel', [ 'camelia.WrappedArrayDataModel',
		'camelia.core',
		function(WrappedArrayDataModel, cc) {

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

	/*
	 * ------------------------ GroupedDataModel ----------------------------
	 */

	module.factory('camelia.GroupedDataModel', [ 'camelia.WrappedArrayDataModel',
		"camelia.core",
		function(WrappedArrayDataModel, cc) {
			function GroupedDataModel(dataModel, groupProvider, rowVarName) {
				WrappedArrayDataModel.call(this, dataModel);

				this.groupSupport = true;

				this._groupInitialized = false;
				this._groupProvider = groupProvider;
				this._rowVarName = rowVarName;
				this._groups = [];
				this._groupCount = [];
				this._groupValues = [];

				var self = this;
				this.$on("$destroy", function() {
					self._groupProvider = groupProvider;
					self._rowVarName = rowVarName;
					self._groups = [];
					self._groupCount = [];
					self._groupValues = [];
				});
			}

			cc.extend(GroupedDataModel, WrappedArrayDataModel, {

				getGroup: function(rowScope, rowData) {
					var expression = this._groupProvider.$scope.valueRawExpression;

					rowScope.$row = rowData;
					if (this._rowVarName) {
						rowScope[this._rowVarName] = rowData;
					}

					var value = rowScope.$eval(expression);

					return value;
				},
				getGroupCount: function(group) {
					var idx = this._groups.indexOf(group);
					if (idx < 0) {
						return -1;
					}

					return this._groupCount[idx];
				},
				getGroupValues: function(group) {
					var idx = this._groups.indexOf(group);
					if (idx < 0) {
						return -1;
					}

					return this._groupValues[idx];
				},

				xxxisRowAvailable: function() {
					var ret = WrappedArrayDataModel.prototype.isRowAvailable.call(this);
					if (!ret || cc.isPromise(ret)) {
						return ret;
					}

					var array = this.toArray();
					if (cc.isPromise(array)) {
						var self = this;
						return array.then(function(array) {
							self.processParentArray(array);

							return ret;
						});
					}

					this.processParentArray(array);
					return ret;
				},

				processParentArray: function(array) {
					if (this._groupInitialized) {
						return array;
					}

					this._groupInitialized = true;
					if (!this._grouped) {
						return array;
					}

					var rowScope = this._dataScope.$new(true);
					try {
						var self = this;

						var groups = this._groups;
						var groupCount = this._groupCount;
						var groupValues = this._groupValues;

						angular.forEach(array, function(rowData) {

							var group = self.getGroup(rowScope, rowData);
							var idx = groups.indexOf(group);
							if (idx < 0) {
								idx = groups.length;
								groupCount[idx] = 0;
							}

							groups[idx] = group;
							groupCount[idx]++;

							if (!groupValues[idx]) {
								groupValues[idx] = [];
							}

							groupValues[idx].push(rowData);
						});

						var sortedGroup = cc.CloneArray(groups);

						// Sort groups
						var expression = this._groupProvider.$scope.sorter;
						if (expression) {
							rowScope.$array = sortedGroup;

							sortedGroup = rowScope.$eval("$array | " + expression);
						}

						var ret = [];
						angular.forEach(sortedGroup, function(group) {
							var idx = groups.indexOf(group);

							ret = ret.concat(groupValues[idx]);
						});

						return ret;

					} finally {
						rowScope.$destroy();
					}
				},

				delegateToParent: function() {
					return this.$parent.isGroupSupport() || !this._grouped;
				},
				getRowCount: function() {
					return this.$parent.getRowCount();
				}
			});

			return GroupedDataModel;
		} ]);
	/*
	 * ------------------------ ProgressDataModel ----------------------------
	 */
	module.factory('camelia.ResourceDataModel', [ '$q',
		'$timeout',
		'camelia.DataModel',
		'camelia.core',
		function($q, $timeout, DataModel, cc) {

			var DEFAULT_VALUES = {
				pageSize: 20,
				offsetMod: 10,
				offsetParameter: "offset",
				countParameter: "count",
				sorterParameter: "sorter",
				filterParameter: "filter",
				actionName: "query",
				keepCache: false
			};

			var sessionId = 0;

			function ResourceDataModel($resource, configuration) {
				DataModel.call(this);

				angular.extend(this, angular.extend(DEFAULT_VALUES, configuration || {}));
				this.$resource = $resource;

				this._sessionId = 0;
				this._rowCount = -1;

				this._cache = [];

				var self = this;
				this.$on("begin", function() {
					self._sessionId = (sessionId++);
					// console.log("Start session " + self._sessionId);
				});

				this.$on("end", function() {
					// console.log("End session " + self._sessionId);
					self._sessionId = -1;

					var requestPromise = self._requestPromise;
					if (requestPromise) {
						self._requestPromise = undefined;
						requestPromise.cancel();
					}
				});

				this.$on("clearState", function() {
					// debugger;
					self._cache = [];
					self._rowCount = -1;
				});
			}

			cc.extend(ResourceDataModel, DataModel, {

				isRowAvailable: function() {
					this.needRowAvailable = false;
					var rowIndex = this.getRowIndex();

					var cache = this._cache;
					if (cache[rowIndex] !== undefined) {
						// console.log("Ask for #" + rowIndex + " => in cache !");
						return true;
					}

					if (this._rowCount >= 0 && rowIndex >= this._rowCount) {
						// console.log("Ask for #" + rowIndex + " => outside of rowCount");
						return false;
					}

					this.sortSupport = false;
					this.filterSupport = false;

					var deferred = $q.defer();

					var fetchProperties = this._fetchProperties;

					var offset = rowIndex;
					var fetchRows = (fetchProperties && fetchProperties.rows) || 0;
					var rows = Math.max(fetchRows, this.pageSize);

					if (this.offsetMod > 0) {
						offset -= (offset % this.offsetMod);

						var last = (rowIndex + rows - 1);
						last -= (last % this.offsetMod);

						rows = (Math.floor((last - offset) / this.pageSize) + 1) * this.pageSize;

						// console.log("rowIndex=" + rowIndex + " offset=" + offset + "
						// last="
						// + last + " rows=" + rows + " pageSize="+ this.pageSize);
					}

					if (this._keepCache === false) {
						cache = [];
						this._cache = cache;

					} else {
						for (var i = offset + rows - 1; i > offset; i--) {
							if (cache[i] === undefined) {
								break;
							}
							rows--;
						}
					}

					var currentSessionId = this._sessionId;

					var actionName = this.actionName;

					var params = {};
					params[this.offsetParameter] = offset;
					params[this.countParameter] = rows;

					if (this._sorters && this.sorterParameter) {
						var ss = [];
						params[this.sorterParameter] = ss;

						angular.forEach(this._sorters, function(sorter) {
							var expression = sorter.expression || sorter.column.$scope.fieldName || sorter.column.$scope.id;

							if (!sorter.ascending) {
								expression += ":desc";
							}

							ss.push(expression);
						});

						this.sortSupport = true;
					}

					var filters = this._filters;
					if (filters && this.filterParameter) {
						var ps = [];
						params[this.filterParameter] = ps;

						angular.forEach(filters, function(filter) {
							if (!filter.toJson) {
								return;
							}

							var parameters = filter.toJson();
							if (parameters) {
								ps.push(parameters);
							}

						});

						this.filterSupport = true;
					}

					if (this._rowCount < 0 && this.requestRowCountParameter) {
						params[this.requestRowCountParameter] = true;
					}

					var requestPromise = this._requestPromise;
					if (requestPromise) {
						this._requestPromise = undefined;
						requestPromise.cancel();
					}

					var self = this;
					var ret = this.$resource[actionName].call(this.$resource, params, function(response, responseHeaders) {
						self._requestPromise = undefined;
						if (self._sessionId != currentSessionId) {
							return deferred.reject("Session canceled");
						}
						deferred.notify({
							type: DataModel.DATA_LOADED,
							count: response.length
						});

						for (var i = 0; i < response.length; i++) {
							cache[i + offset] = response[i];
							// console.log("Reg#" + (i + offset) + " => " + response[i]);
						}
						if (response.length < rows) {
							if (response.length || !offset) {
								self._rowCount = offset + response.length;
							}
						}

						// console.log("Ask for #" + rowIndex + " => Deferred " +
						// cache[rowIndex]);

						if (SLOW_LOADING_SIMULATION) {
							$timeout(function() {
								deferred.resolve(cache[rowIndex] !== undefined);
							}, 1000 * 10);
						} else {
							deferred.resolve(cache[rowIndex] !== undefined);
						}

					}, function(error) {
						return deferred.reject({
							type: "RESOURCE_ERROR",
							error: error
						});
					});

					this._requestPromise = ret.$promise;

					this._requestPromise.then(null, null, function() {
						if (self._sessionId != currentSessionId) {
							return;
						}

						console.log("progress ...");

						deferred.notify({
							type: DataModel.DATA_LOADING
						});
					});

					$timeout(function() {
						deferred.notify({
							type: DataModel.DATA_REQUESTING
						});
					}, 0);

					if (SLOW_LOADING_SIMULATION) {
						$timeout(function() {
							deferred.notify({
								type: DataModel.DATA_LOADING
							});
						}, 3000);
					}

					// console.log("Ask for #" + rowIndex + " => Returns promise");

					return deferred.promise;
				},

				setRowIndex: function(index) {
					// console.log("Set rowIndex=" + index);
					ResourceDataModel.prototype.$super.setRowIndex.call(this, index);
					this.needRowAvailable = true;
				},
				getRowData: function() {
					if (this.needRowAvailable) {
						debugger;
					}

					var rowIndex = this.getRowIndex();

					var ret = this._cache[rowIndex];

					// console.log("#" + rowIndex + " => " + ret + " " + typeof
					// (rowIndex));

					if (ret === undefined) {
						debugger;
					}

					return ret;
				},
				getRowCount: function(force) {
					return this._rowCount;
				},
				setSorters: function(sorters) {
					ResourceDataModel.prototype.$super.setSorters.call(this, sorters);
					this._cache = [];
					this._rowCount = -1;
				},
				setFilters: function(filters) {
					ResourceDataModel.prototype.$super.setFilters.call(this, filters);
					this._cache = [];
					this._rowCount = -1;
				},
				setGrouped: function(grouped) {
					ResourceDataModel.prototype.$super.setGrouped.call(this, grouped);
					this._cache = [];
					this._rowCount = -1;
				}

			});

			return ResourceDataModel;
		} ]);

})(window, window.angular);