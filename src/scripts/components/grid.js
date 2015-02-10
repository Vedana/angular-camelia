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

	var module = angular.module("camelia.components.grid", [ 'camelia.core',
		'camelia.dataModel',
		'camelia.cursorProvider',
		'camelia.selectionProvider',
		'camelia.selectionStrategy',
		'camelia.pagerRegistry',
		'camelia.renderers.grid' ]);

	module.value("cm_grid_rendererProviderName", "camelia.renderers.grid:camelia.renderers.GridProvider");
	module.value("cm_grid_dataModelProviderName", "");

	var anonymousId = 0;

	var digesterPhase = false;

	module.factory("camelia.components.DataGrid", [ "$log",
		"$injector",
		"$interpolate",
		"$q",
		"$timeout",
		"$rootScope",
		"camelia.core",
		"camelia.SelectionStrategy",
		"camelia.SelectionProvider",
		"camelia.CursorProvider",
		"cm_grid_dataModelProviderName",
		"cm_grid_rendererProviderName",
		"camelia.PagerRegistry",
		"camelia.DataModel",
		function($log, $injector, $interpolate, $q, $timeout, $rootScope, cc, SelectionStrategy, SelectionProvider,
				CursorProvider, cm_dataGrid_dataModelProviderName, cm_dataGrid_rendererProviderName, PagerRegistry, DataModel) {

			/*
			 * ------------------------ DataGrid --------------------------
			 */

			var DataGrid = function($scope, element, directiveInterpolate, defaultRendererProviderName) {
				this.$scope = $scope;
				this.directiveInterpolate = directiveInterpolate || $interpolate;

				var id = $scope.id;
				if (!id) {
					id = "cm_grid_" + (anonymousId++);
				}
				this.id = id;
				this.readyState = "uninitialized";

				var rendererProvider = $scope.rendererProvider;
				if (!rendererProvider) {
					var rendererProviderName = $scope.rendererProviderName || defaultRendererProviderName ||
							cm_dataGrid_rendererProviderName;

					if ($scope.lookId) {
						rendererProviderName += "-" + $scope.lookId;
					}

					rendererProvider = cc.LoadProvider(rendererProviderName);
				}
				this.rendererProvider = rendererProvider;

				var dataModelProvider = $scope.dataModelProvider;
				if (!dataModelProvider) {
					var dataModelProviderName = $scope.dataModelProviderName || cm_dataGrid_dataModelProviderName;
					if (dataModelProviderName) {
						dataModelProvider = cc.LoadProvider(dataModelProviderName);
					}
				}
				this.dataModelProvider = dataModelProvider;
				this.$scope.$watchCollection("value", function onValueChanged(newValue) {
					$scope.$broadcast("cm:valueChanged", newValue);
				});

				this.cursorProvider = new CursorProvider($scope);

				var selectionProvider = $scope.selectionProvider;
				if (!selectionProvider) {
					var selectable = cc.toBoolean($scope.selectable) || $scope.selectionCardinality;

					if (selectable) {
						selectionProvider = SelectionProvider.From($scope.selection, $scope);

						$scope.$watch("selection", function onSelectionChanged(newSelection, oldSelection) {

							cc.log("WATCH selection newSelection=", newSelection, " oldSelection=", oldSelection);

							selectionProvider.set(newSelection);
						});
					}
				}
				this.selectionProvider = selectionProvider;

				$scope.$on(SelectionProvider.SELECTION_SET_EVENT, function onSelectionChanged(event, data) {
					cc.log("EVENT selection newSelection=", data.newSelection);

					$scope.selection = data.newSelection;
				});

				var selectionStrategy = $scope.selectionStrategy;
				if (!selectionStrategy && selectionProvider) {
					selectionStrategy = SelectionStrategy.CreateDefault($scope, $scope.selectionCardinality || "*");
				}
				this.selectionStrategy = selectionStrategy;

				var self = this;
				if (this.cursorProvider) {

					var oldValue = null;

					$scope.$watch(function getValue(scope) {

						if (oldValue && oldValue.cursor === scope.cursor && oldValue.columnCursorId === scope.columnCursorId) {
							return oldValue;
						}

						oldValue = {
							cursor: scope.cursor,
							columnCursorId: scope.columnCursorId
						};

						return oldValue;

					}, function listener(newValue) {
						var rowCursor = newValue.cursor;
						var columnCursorId = newValue.columnCursorId;

						// cc.log("WATCH cursor rowCursor=", rowCursor, " columnCursorId=",
						// columnCursorId);

						if (rowCursor) {
							var columnCursor;
							if (columnCursorId) {
								angular.forEach($scope.columns, function(column) {
									if (column.id === columnCursorId) {
										columnCursor = column;
									}
								});
							}

							self.cursorProvider.setCursor(rowCursor, columnCursor);
						}
					});

					$scope.$on(CursorProvider.CURSOR_CHANGED, function onCursorChanged(event, data) {
						// cc.log("EVENT cursor newValue=", data.row, " column=",
						// ((data.column) ? data.column.id : null));

						$scope.cursor = data.row;
						$scope.columnCursorId = (data.column) ? data.column.id : null;
					});
				}

				$scope.getCurrentPositions = function() {
					return self.getCurrentPositions();
				};
			};

			DataGrid.prototype = {
				getCursorValue: function() {
					var selectionStrategy = this.selectionStrategy;
					if (!selectionStrategy) {
						return null;
					}

					return selectionStrategy.getCursor();
				},

				/**
				 * @returns {Promise}
				 */
				construct: [ function() {
					// this._renderContext = undefined;

					var $scope = this.$scope;
					this.constructing = true;
					this.element = null;

					this.readyState = "constructing";

					var doc = angular.element(document.createDocumentFragment());

					var renderContext = {
						$scope: $scope,
						$interpolate: this.directiveInterpolate,

						dataGrid: this,
						columns: $scope.columns,

						selectionProvider: this.selectionProvider,
						selectionStrategy: this.selectionStrategy,
						cursorProvider: this.cursorProvider,
						groupProviders: $scope.groupProviders
					};

					var self = this;

					var gridRenderer = new this.rendererProvider(renderContext);
					this.gridRenderer = gridRenderer;

					$scope.$watch("first", function onFirstChanged(newValue, oldValue) {
						if (!angular.isNumber(newValue) || newValue === oldValue || (newValue < 0 && oldValue < 0)) {
							return;
						}

						if (self.readyState !== "complete") {
							return;
						}

						$timeout(function() {
							gridRenderer.updateData();
						}, 10, false);
					});

					$scope.$watch("rows", function onRowsChanged(newValue, oldValue) {
						if (!angular.isNumber(newValue) || newValue === oldValue || (newValue < 0 && oldValue < 0)) {
							return;
						}

						if (self.readyState !== "complete") {
							return;
						}

						gridRenderer.updateData();
					});

					var containerPromise = gridRenderer.render(doc);
					if (!cc.isPromise(containerPromise)) {
						containerPromise = $q.when(containerPromise);
					}

					return containerPromise.then(function onSuccess(element) {
						if (element[0]) {
							element = element[0];
						}
						self.readyState = "complete";
						self.element = element;

						angular.element(element).data('$scope', $scope);

						PagerRegistry.DeclareTarget(element);

						self._updateDataModel(gridRenderer.$scope.value);

						gridRenderer.$scope.$on("cm:valueChanged", function onValueChanged(event, value) {
							self._updateDataModel(value);
						});

						return doc;

					}, function onError(reason) {
						self.readyState = "error";

						return doc;
					});
				} ],

				_updateDataModel: function(value) {
					var gridRenderer = this.gridRenderer;

					var oldDataModel = gridRenderer.dataModel;
					if (oldDataModel) {
						gridRenderer.dataModel = undefined;
						oldDataModel.$destroy();
					}

					var dataModelPromise = this.normalizeDataModel(value);
					if (!cc.isPromise(dataModelPromise)) {
						dataModelPromise = $q.when(dataModelPromise);
					}

					var self = this;

					return dataModelPromise.then(function onSuccess(dataModel) {
						gridRenderer.dataErrored = false;
						gridRenderer.dataModel = dataModel;

						if (dataModel) {
							// dataModel.installWatcher(renderContext.$scope, "value");

							dataModel.$on(DataModel.DATA_MODEL_CHANGED_EVENT, function onDataModelChanged(event, value) {
								self._updateDataModel(value);
							});

							dataModel.$on(DataModel.DATA_MODEL_UPDATED_EVENT, function onDataModelUpdated(event, value) {
								gridRenderer.updateData();
							});
						}

						// if (self.state == "complete") {
						gridRenderer.updateData();
						// }

						return dataModel;

					}, function onError(reason) {
						gridRenderer.dataErrored = true;
						gridRenderer.dataModel = null;
						gridRenderer.updateData();

						return $q.reject(reason);
					});
				},

				/**
				 * @returns {Promise|DataModel}
				 */
				normalizeDataModel: function(value) {
					var DataModelProvider = this.dataModelProvider;
					if (DataModelProvider) {
						return new DataModelProvider(value);
					}

					return DataModel.From(value);
				},

				getCurrentPositions: function() {
					return {
						first: this.first || 0,
						rows: this.rows || 0,
						rowCount: this.rowCount || 0,
						maxRows: this.maxRows || 0
					};
				},
				setFirst: function(first) {
					var self = this;
					this.$scope.$apply(function() {
						self.$scope.first = first;
					});
				}
			};

			return DataGrid;
		} ]);

	/*
	 * ------------------------ DataColumn --------------------------
	 */

	module.factory("camelia.components.DataColumn", [ "$log", "camelia.core", function($log, cc) {

		function DataColumn($scope, index) {
			this.$scope = $scope;

			// $scope._component = this;

			var id = $scope.id;
			if (!id) {
				id = "cm_data_column_" + (index || anonymousId++);
			}
			this.id = id;

			this.visible = $scope.visible === undefined || (cc.toBoolean($scope.visible) !== false);

			this.editable = $scope.editable === undefined || (cc.toBoolean($scope.editable) !== false);

			var titleAlign = $scope.titleAlign;
			if (titleAlign && /^(center|left|right)$/i.test(titleAlign)) {
				this.titleAlign = titleAlign;
			}

			var cellAlign = $scope.cellAlign;
			if (cellAlign && /^(center|left|right)$/i.test(cellAlign) >= 0) {
				this.cellAlign = cellAlign;
			}

			var width = $scope.width;
			if (width) {
				width = width.trim();

				if (width.length) {
					var w = parseFloat(width);
					var idxPx = width.indexOf("px");
					var idxPc = width.indexOf("%");

					if (idxPx > 0) {
						this.specifiedWidthPx = w;

					} else if (idxPc > 0) {
						this.specifiedWidthPercent = w;
					}
				}
			}

			var minWidth = $scope.minWidth;
			if (minWidth && minWidth.indexOf("px") > 0) {
				this.minWidth = parseFloat(minWidth);
			}

			var maxWidth = $scope.maxWidth;
			if (maxWidth && maxWidth.indexOf("px") > 0) {
				this.maxWidth = parseFloat(maxWidth);
			}
		}

		DataColumn.prototype = {
			addCriteria: function(criteria) {
				if (!this._criterias) {
					this._criterias = [];
					this._criteriasContext = {};
				}

				this._criterias.push(criteria);
				// criteria.dataColumn = this;
			},

			removeCriteria: function(criteria) {
				var criterias = this._criterias;
				if (!criterias) {
					return false;
				}

				var idx = criterias.indexOf(criteria);
				if (idx < 0) {
					return false;
				}

				criterias.splice(idx, 1);

				// criteria.dataColumn = null;
				return true;
			}

		};

		return DataColumn;
	} ]);

	/*
	 * ------------------------ DataGroup --------------------------
	 */

	module.factory("camelia.components.DataGroup", [ "$log",
		"camelia.SelectionProvider",
		function($log, SelectionProvider) {

			function DataGroup($scope, index) {
				this.$scope = $scope;

				// $scope._component = this;

				var id = $scope.id;
				if (!id) {
					id = "cm_data_group_" + (index || anonymousId++);
				}
				this.id = id;

				var collapsedProvider = $scope.collapsedProvider;
				if (!collapsedProvider) {
					collapsedProvider = SelectionProvider.From($scope.collapsedGroups, $scope);

					$scope.$watch("collapsedGroups", function onCollapsedGroupsChanged() {
						try {
							digesterPhase = true;

							collapsedProvider.set($scope.collapsedGroups);
						} finally {
							digesterPhase = false;
						}
					});
				}
				this.collapsedProvider = collapsedProvider;

				if (collapsedProvider) {
					collapsedProvider.$on(SelectionProvider.SELECTION_SET_EVENT, function onSelectionEvent(event, data) {
						$scope.collapsedGroups = data.newSelection;

						if (digesterPhase) {
							return;
						}

						$scope.$apply();
					});
				}
			}

			DataGroup.prototype = {
				getCollapsedProvider: function() {
					return this.collapsedProvider;
				}

			};

			return DataGroup;
		} ]);

	/*
	 * ------------------------ --------------------------
	 */

	module.factory("camelia.components.GridProvider", [ "camelia.components.DataGrid",
		"camelia.components.DataColumn",
		"camelia.components.DataGroup",
		function(dataGrid, dataColumn, dataGroup) {
			return {
				DataGrid: dataGrid,
				DataColumn: dataColumn,
				DataGroup: dataGroup
			};
		} ]);

})(window, window.angular);