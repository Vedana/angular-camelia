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

	var module = angular.module('camelia.dataModel', [ 'camelia.core', 'ngResource' ]);

	module.factory('camelia.DataModel', [ "$q",
		"$rootScope",
		"camelia.core",
		"$injector",
		"$resource",
		function($q, $rootScope, cc, $injector, $resource) {

			var scopeProto = $rootScope.__proto__ || Object.getPrototypeOf($rootScope);

			var resource = $resource();
			var resourceProto = resource.__proto__ || Object.getPrototypeOf(resource);

			function DataModel() {
				scopeProto.constructor.call(this);
				this.$parent = $rootScope;
			}

			DataModel.DATA_MODEL_CHANGED_EVENT = "dataModelChanged";

			DataModel.DATA_MODEL_UPDATED_EVENT = "dataModelUpdated";

			DataModel.From = function(parameter) {

				if (parameter instanceof DataModel) {
					return parameter;
				}

				var parameterProto = parameter && (parameter.__proto__ || Object.getPrototypeOf(parameter));

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
			}

			DataModel.prototype = Object.create(scopeProto);
			angular.extend(DataModel.prototype, {
				constructor: DataModel,
				$super: scopeProto,

				_rowIndex: -1,

				installWatcher: function($scope, varName) {
					var self = this;
					this._watcherDeRegistration = $scope.$watch(varName, function(newValue) {
						self.$emit(DataModel.DATA_MODEL_CHANGED_EVENT, newValue);
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
					return 0;
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

					if (old < 0 && rowIndex >= 0) {
						// Broadcast START
						this.$emit("begin");
					}

					if (old >= 0 && rowIndex < 0) {
						this.$emit("end");
					}
				},
				$destroy: function() {
					scopeProto.$destroy.call(this);

					var deRegistration = this._watcherDeRegistration;
					if (deRegistration) {
						this._watcherDeRegistration = undefined;

						deRegistration();
					}

					this._wrappedData = undefined;
					this._sorters = undefined;
					this._filters = undefined;
					this.$scope = undefined;
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
				getFetchProperties: function() {
					return this._fetchProperties;
				},
				setSorters: function(sorters) {
					this._sorters = sorters;
				},
				setFilters: function(filters) {
					this._filters = filters;
				},
				setGrouped: function(grouped) {
					this._grouped = !!grouped;
				},
				setScope: function(scope) {
					this.$scope = scope;
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

							var available = self.isRowAvailable();
							if (available === false) {
								break;
							}

							if (cc.isPromise(available)) {
								return available.then(promiseIndex)
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
				}
			});

			return DataModel;
		} ]);

	/*
	 * ------------------------ ArrayDataModel ------------------------------
	 */

	module.factory('camelia.ArrayDataModel', [ 'camelia.DataModel', function(DataModel) {

		function ArrayDataModel(array) {
			DataModel.prototype.constructor.call(this);

			this.setWrappedData(array);
		}
		ArrayDataModel.prototype = Object.create(DataModel.prototype);

		angular.extend(ArrayDataModel.prototype, {
			constructor: ArrayDataModel,
			$super: DataModel.prototype,

			installWatcher: function($scope, varName) {
				var self = this;
				this._watcherDeRegistration = $scope.$watchCollection(varName, function(newValue, oldValue) {
					if (oldValue === undefined) {
						return;
					}

					self.setWrappedData(newValue);
					self.$emit(DataModel.DATA_MODEL_UPDATED_EVENT, newValue);
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

			function WrappedArrayDataModel(dataModel) {
				this._dataModel = dataModel;

				ArrayDataModel.call(this, undefined);
			}
			WrappedArrayDataModel.prototype = Object.create(ArrayDataModel.prototype);

			angular
					.extend(WrappedArrayDataModel.prototype,
							{
								constructor: WrappedArrayDataModel,
								$super: ArrayDataModel.prototype,

								$destroy: function() {
									WrappedArrayDataModel.prototype.$super.$destroy.call(this);

									this._dataModel.$destroy();

									this._dataModel = undefined;
								},

								setSorters: function(sorters) {
									var dataModel = this._dataModel;
									dataModel.setSorters(sorters);
									WrappedArrayDataModel.prototype.$super.setSorters.call(this, sorters);
								},
								setFilters: function(filters) {
									var dataModel = this._dataModel;
									dataModel.setFilters(filters);
									WrappedArrayDataModel.prototype.$super.setFilters.call(this, filters);
								},
								setGrouped: function(grouped) {
									var dataModel = this._dataModel;
									dataModel.setGrouped(grouped);
									WrappedArrayDataModel.prototype.$super.setGrouped.call(this, grouped);
								},
								setScope: function(scope) {
									WrappedArrayDataModel.prototype.$super.setScope.call(this, scope);
									this._dataModel.setScope(scope);
								},
								isFilterSupport: function() {
									return WrappedArrayDataModel.prototype.$super.isFilterSupport.call(this)
											|| this._dataModel.isFilterSupport();
								},
								isSortSupport: function() {
									return WrappedArrayDataModel.prototype.$super.isSortSupport.call(this)
											|| this._dataModel.isSortSupport();
								},
								isGroupSupport: function() {
									return WrappedArrayDataModel.prototype.$super.isGroupSupport.call(this)
											|| this._dataModel.isGroupSupport();
								},

								setFetchProperties: function(fetchProperties) {
									this._dataModel.setFetchProperties(fetchProperties);
								},

								getFetchProperties: function() {
									return this._dataModel.getFetchProperties();
								},

								setRowIndex: function(index) {
									this._dataModel.setRowIndex(index);
									WrappedArrayDataModel.prototype.$super.setRowIndex.call(this, index);
								},

								getRowCount: function() {
									// TODO Fix must call isRowAvailable before !!!!
									var localArray = this.getWrappedData();
									if (localArray === null) {
										return this._dataModel.getRowCount();
									}

									return WrappedArrayDataModel.prototype.$super.getRowCount.call(this);
								},

								getRowData: function() {
									var localArray = this.getWrappedData();
									if (localArray === null) {
										return this._dataModel.getRowData();
									}

									return WrappedArrayDataModel.prototype.$super.getRowData.call(this);
								},

								isRowAvailable: function() {
									var localArray = this.getWrappedData();
									if (localArray) {
										return WrappedArrayDataModel.prototype.$super.isRowAvailable.call(this);
									}

									if (localArray === null) {
										return this._dataModel.isRowAvailable();
									}

									if (localArray === false) {
										return false;
									}

									var self = this;

									function _arrayReady(parentArray) {

										localArray = self.processParentArray(parentArray);

										self.setWrappedData(localArray);

										return WrappedArrayDataModel.prototype.$super.isRowAvailable.call(self);
									}

									function _processArray() {
										var parentArray = self._dataModel.toArray();

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

									var avail = this._dataModel.isRowAvailable();
									if (avail === false) {
										return false;
									}

									if (!cc.isPromise(avail)) {
										if (!this.wrappingEnabled()) {
											this.setWrappedData(null);
											return true;
										}

										return _processArray();
									}

									return avail.then(function(av) {
										if (av === false) {
											return false;
										}

										if (!self.wrappingEnabled()) {
											self.setWrappedData(null);
											return true;
										}

										return _processArray();
									});
								},

								wrappingEnabled: function() {
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

	module.factory('camelia.SortedDataModel', [ 'camelia.WrappedArrayDataModel', function(WrappedArrayDataModel) {

		function SortedDataModel(dataModel) {
			WrappedArrayDataModel.call(this, dataModel);

			this.sortSupport = true;
		}
		SortedDataModel.prototype = Object.create(WrappedArrayDataModel.prototype);

		angular.extend(SortedDataModel.prototype, {
			constructor: SortedDataModel,
			$super: WrappedArrayDataModel.prototype,

			processParentArray: function(array) {

				if (!this._sorters) {
					return array;
				}

				var scope = this.$scope.$new();
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

			wrappingEnabled: function() {
				return !this._dataModel.isSortSupport() && this._sorters;
			}

		});

		return SortedDataModel;
	} ]);

	/*
	 * ------------------------ FiltredDataModel ----------------------------
	 */

	module.factory('camelia.FiltredDataModel', [ 'camelia.WrappedArrayDataModel', function(WrappedArrayDataModel) {

		function FiltredDataModel(dataModel, rowVarName) {
			WrappedArrayDataModel.call(this, dataModel);

			this.filterSupport = true;
			this._rowVarName = rowVarName;
		}
		FiltredDataModel.prototype = Object.create(WrappedArrayDataModel.prototype);

		angular.extend(FiltredDataModel.prototype, {
			constructor: FiltredDataModel,
			$super: WrappedArrayDataModel.prototype,

			processParentArray: function(array) {

				var filters = this._filters;
				if (!filters || !filters.length) {
					return array;
				}

				var filtersLength = filters.length;
				var rowVarName = this._rowVarName;

				var newArray = [];
				var rowScope = this.$scope.$new();
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

			wrappingEnabled: function() {
				return !this._dataModel.isFilterSupport() && this._filters;
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

				this._groupProvider = groupProvider;
				this._groups = [];
				this._groupCount = [];
				this._rowVarName = rowVarName;
				this._groupValues = [];
			}
			GroupedDataModel.prototype = Object.create(WrappedArrayDataModel.prototype);

			angular.extend(GroupedDataModel.prototype, {
				constructor: GroupedDataModel,
				$super: WrappedArrayDataModel.prototype,

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

				processParentArray: function(array) {
					if (!this._grouped) {
						return array;
					}

					var rowScope = this.$scope.$new();
					try {
						var self = this;

						var groups = this._groups;
						var groupCount = this._groupCount;
						var groupValues = this._groupValues;

						angular.forEach(array, function(rowData) {

							var group = self.getGroup(rowScope, rowData)
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
						})

						return ret;

					} finally {
						rowScope.$destroy();
					}
				},

				$destroy: function() {
					GroupedDataModel.prototype.$super.$destroy.call(this);

					this._groupProvider = undefined;
					this._groups = undefined;
					this._groupCount = undefined;
					this._rowVarName = undefined;
					this._groupValues = undefined;
				},

				wrappingEnabled: function() {
					return !this._dataModel.isGroupSupport() && this._grouped;
				}
			});

			return GroupedDataModel;
		} ]);
	/*
	 * ------------------------ ProgressDataModel ----------------------------
	 */
	module.factory('camelia.ResourceDataModel', [ '$q', 'camelia.DataModel', function($q, DataModel) {

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

			this._cache = {};

			var self = this;
			this.$on("begin", function() {
				self._sessionId = (sessionId++);
			});

			this.$on("end", function() {
				self._sessionId = -1;
			});
		}
		ResourceDataModel.prototype = Object.create(DataModel.prototype);

		angular.extend(ResourceDataModel.prototype, {
			constructor: ResourceDataModel,
			$super: DataModel.prototype,

			isRowAvailable: function() {

				var rowIndex = this.getRowIndex();

				var cache = this._cache;
				if (cache[rowIndex] !== undefined) {
					return true;
				}

				if (this._rowCount >= 0 && rowIndex >= this._rowCount) {
					return false;
				}

				var deferred = $q.defer();

				var fetchProperties = this.getFetchProperties();

				var offset = rowIndex;
				var rows = this.pageSize;

				var useFetchRows = false;
				var fetchRows = (fetchProperties && fetchProperties.rows);
				if (fetchRows > 0) {
					if ((offset % fetchRows) == 0) {
						rows = fetchRows;
						useFetchRows = true;
					}
				}

				if (!useFetchRows && this.offsetMod) {
					offset %= this.offsetMod;
				}

				if (!this._keepCache) {
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
					var sorter = this._sorters[0];

					var expression = sorter.expression || sorter.column.$scope.fieldName;

					if (!sorter.ascending) {
						expression += ":desc";
					}

					params[this.sorterParameter] = expression;

					this.sortSupport = true;
				}

				var filters = this._filters;
				if (filters && this.filterParameter) {

					var ps = [];
					params[this.filterParameter] = ps;

					angular.forEach(filters, function(filter) {
						if (!filter.toJSON) {
							return;
						}

						var parameters = filter.toJSON();
						if (parameters) {
							ps.push(parameters);
						}

					});

					this.filterSupport = true;
				}

				var self = this;
				this.$resource[actionName].call(this.$resource, params, function(response, responseHeaders) {
					if (self._sessionId != currentSessionId) {
						return deferred.reject("Session canceled");
					}

					for (var i = 0; i < response.length; i++) {
						cache[i + offset] = response[i];
					}
					if (response.length < rows) {
						self._rowCount = offset + response.length;
					}

					deferred.resolve(typeof (cache[rowIndex]) !== undefined);

				}, function(error) {
					return deferred.reject("Query error: " + error);
				});

				return deferred.promise;
			},
			getRowData: function() {
				var rowIndex = this.getRowIndex();

				return this._cache[rowIndex];
			},
			getRowCount: function(force) {
				return this._rowCount;
			},
			setSorters: function(sorters) {
				this._cache = [];
				ResourceDataModel.prototype.$super.setSorters.call(this, sorters);
			},
			setFilters: function(filters) {
				this._cache = [];
				ResourceDataModel.prototype.$super.setFilters.call(this, filters);
			},

		});

		return ResourceDataModel;
	} ]);

})(window, window.angular);