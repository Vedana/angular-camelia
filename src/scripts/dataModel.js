/**
 * @license CameliaJS (c) 2014 Vedana http://www.vedana.com
 * @author olivier@oeuillot.net
 */

(function(window, angular, undefined) {
	'use strict';

	var module = angular.module('camelia.dataModel', [ 'camelia.core' ]);

	module.factory('camelia.DataModel', [ "$q",
		"$rootScope",
		"camelia.core",
		"$injector",
		function($q, $rootScope, cc, $injector) {

			var scopeProto = $rootScope.__proto__ || Object.getPrototypeOf($rootScope);

			function DataModel() {
				scopeProto.constructor.call(this);
				this.$parent = $rootScope;
			}

			DataModel.DATA_MODEL_CHANGED_EVENT = "dataModelChanged";

			DataModel.DATA_MODEL_UPDATED_EVENT = "dataModelUpdated";

			DataModel.From = function(parameter) {
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

				ArrayDataModel.call(this, null);
			}
			WrappedArrayDataModel.prototype = Object.create(ArrayDataModel.prototype);

			angular.extend(WrappedArrayDataModel.prototype, {
				constructor: WrappedArrayDataModel,

				$destroy: function() {
					ArrayDataModel.prototype.$destroy.call(this);

					this._dataModel.$destroy();

					this._dataModel = undefined;
				},

				setSorters: function(sorters) {
					if (ArrayDataModel.prototype.isSortSupport.call(this)) {
						ArrayDataModel.prototype.setSorters.call(this, sorters);
						return;
					}
					this._dataModel.setSorters(sorters);
				},
				setFilters: function(filters) {
					if (ArrayDataModel.prototype.isFilterSupport.call(this)) {
						ArrayDataModel.prototype.setFilters.call(this, filters);
					}
					this._dataModel.setFilters(filters);
				},
				setGrouped: function(grouped) {
					if (ArrayDataModel.prototype.isGroupSupport.call(this)) {
						ArrayDataModel.prototype.setGrouped.call(this, grouped);
					}
					this._dataModel.setGrouped(grouped);
				},
				setScope: function(scope) {
					ArrayDataModel.prototype.setScope.call(this, scope);
					this._dataModel.setScope(scope);
				},
				/*
				 * getRowCount: function(force) { return
				 * this._dataModel.getRowCount(force); },
				 */
				isFilterSupport: function() {
					return ArrayDataModel.prototype.isFilterSupport.call(this) || this._dataModel.isFilterSupport();
				},
				isSortSupport: function() {
					return ArrayDataModel.prototype.isSortSupport.call(this) || this._dataModel.isSortSupport();
				},
				isGroupSupport: function() {
					return ArrayDataModel.prototype.isGroupSupport.call(this) || this._dataModel.isGroupSupport();
				},

				isRowAvailable: function() {
					var localArray = this.getWrappedData();
					if (localArray) {
						return ArrayDataModel.prototype.isRowAvailable.call(this);
					}

					if (localArray === false) {
						return false;
					}

					var self = this;
					function _arrayReady(parentArray) {

						localArray = self.processParentArray(parentArray);

						self.setWrappedData(localArray);

						return ArrayDataModel.prototype.isRowAvailable.call(self);
					}

					var parentArray = this._dataModel.toArray();

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
					WrappedArrayDataModel.prototype.$destroy.call(this);

					this._groupProvider = undefined;
					this._groups = undefined;
					this._groupCount = undefined;
					this._rowVarName = undefined;
					this._groupValues = undefined;
				},
			});

			return GroupedDataModel;
		} ]);
	/*
	 * ------------------------ ProgressDataModel ----------------------------
	 */
	module.factory('camelia.UserDataModel', [ 'camelia.ArrayDataModel', function(ArrayDataModel) {

		function UserDataModel(startFunc) {
			this._startFunc = startFunc;

			ArrayDataModel.call(this, null); // ?

			var self = this;
			this.$on("begin", function() {
				self._datas = null;
				self._deferred = null;
				self._filled = false;
				self._rowCount = -1;
			});

			this.$on("end", function() {
				var deferred = self._deferred;
				if (deferred) {
					self._deferred = undefined;
					deferred.reject("DataModel iteration is closed !");
				}

				var deferredCount = this._deferredCount;
				if (deferredCount) {
					this._deferredCount = undefined;
					deferredCount.reject("DataModel iteration is closed !");
				}

				self._datas = undefined;
				self._deferred = undefined;
				self._filled = undefined;
				self._rowCount = -1;
			});
		}
		UserDataModel.prototype = Object.create(ArrayDataModel.prototype);

		angular.extend(UserDataModel.prototype, {
			constructor: UserDataModel,

			isRowAvailable: function() {
				var deferred = this._deferred;
				if (deferred) {
					throw new Error("Already deferred !");
				}

				var rowIndex = this.getRowIndex();

				if (this._datas === null) {
					this._datas = [];

					var fetchSize = -1;
					this._firstRowIndex = rowIndex;
					this._startFunc(rowIndex, fetchSize, {
						setCount: function(count) {
							self.setRowCount(count);
						},
						add: function(data) {
							self._appendRowData(data)
						},
						end: function() {
							self._endData()
						}
					});
				}

				var datas = this._datas;
				if (rowIndex < datas.length) {
					return true;
				}
				if (this._filled) {
					return false;
				}

				deferred = $q.defer();

				return deferred.promise;
			},
			getRowData: function() {
				var datas = this._datas;
				if (!datas.length) {
					return null;
				}

				return datas[this.getRowIndex() - this._firstRowIndex];
			},
			_appendRowData: function(data) {
				this._datas.push(data);

				var deferred = this._deferred;
				if (!deferred) {
					return;
				}
				this._deferred = undefined;

				deferred.resolve(true);
			},
			_endData: function() {
				this._filled = true;
				// No ! this._rowCount = this._datas.length + this._firstRowIndex;

				var deferredCount = this._deferredCount;
				if (deferredCount) {
					this._deferredCount = undefined;

					deferredCount.resolve(this._datas.length);
				}

				var deferred = this._deferred;
				if (deferred) {
					this._deferred = undefined;

					deferred.resolve(false);
				}
			},
			getRowCount: function(force) {
				if (this._rowCount >= 0 || !force) {
					return this._rowCount;
				}

				if (this._deferredCount) {
					throw new Error("Already deferred !");
				}
				var deferredCount = $q.defer();
				this._deferredCount = deferredCount;

				return deferredCount.promise;
			}
		});

		return UserDataModel;
	} ]);

})(window, window.angular);