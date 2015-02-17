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

})(window, window.angular);