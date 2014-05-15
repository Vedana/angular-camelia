(function(window, angular, undefined) {
	'use strict';

	var module = angular.module("camelia.components.grid", [ "camelia.core",
		"camelia.dataModel",
		"camelia.cursorProvider",
		"camelia.selectionProvider",
		"camelia.selectionStrategy",
		"camelia.pagerRegistry" ]);

	module.value("cm_grid_rendererProviderName", "camelia.renderers.grid:camelia.renderers.GridProvider");
	module.value("cm_grid_dataModelProviderName", "");

	var anonymousId = 0;

	var digesterPhase = false;

	module.factory("camelia.components.DataGrid", [ "$log",
		"$injector",
		"$interpolate",
		"$q",
		"camelia.core",
		"camelia.SelectionStrategy",
		"camelia.SelectionProvider",
		"camelia.CursorProvider",
		"cm_grid_dataModelProviderName",
		"cm_grid_rendererProviderName",
		"camelia.pagerRegistry",
		"camelia.DataModel",
		function($log, $injector, $interpolate, $q, cc, SelectionStrategy, SelectionProvider, CursorProvider,
				cm_dataGrid_dataModelProviderName, cm_dataGrid_rendererProviderName, pagerRegistry, DataModel) {

			/*
			 * ------------------------ DataGrid --------------------------
			 */

			var DataGrid = function($scope, element, directiveInterpolate) {
				this.$scope = $scope;
				this.directiveInterpolate = directiveInterpolate || $interpolate;

				element.data("cm_component", this);

				var id = $scope.id;
				if (!id) {
					id = "cm_grid_" + (anonymousId++);
				}
				this.id = id;
				this.readyState = "uninitialized";

				var rendererProvider = $scope.rendererProvider;
				if (!rendererProvider) {
					var rendererProviderName = $scope.rendererProviderName || cm_dataGrid_rendererProviderName;
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
				this.$scope.$watchCollection("value", function(newValue) {
					$scope.$emit("valueChanged", newValue);
				});

				this.cursorProvider = new CursorProvider();

				var selectionProvider = $scope.selectionProvider;
				if (!selectionProvider) {
					var selectable = cc.toBoolean($scope.selectable) || $scope.selectionCardinality;

					if (selectable) {
						selectionProvider = SelectionProvider.From($scope.selection);

						$scope.$watch("selection", function() {
							try {
								digesterPhase = true;
								selectionProvider.set($scope.selection);

							} finally {
								digesterPhase = false;
							}
						});
					}
				}
				this.selectionProvider = selectionProvider;

				if (selectionProvider) {
					selectionProvider.$on("selectionSet", function(event, data) {
						$scope.selection = data.newSelection;

						if (digesterPhase) {
							return;
						}

						$scope.$apply();
					});
					selectionProvider.$on(SelectionProvider.SELECTION_CHANGED_EVENT, function(event, data) {
						if (event.targetScope !== $scope) {
							$scope.$broadcast(SelectionProvider.SELECTION_CHANGED_EVENT, {
								target: self,
								selection: data.newSelection,
								sourceEvent: data
							});
						}
					});

				}

				var selectionStrategy = $scope.selectionStrategy;
				if (!selectionStrategy && selectionProvider) {
					selectionStrategy = SelectionStrategy.CreateDefault($scope.selectionCardinality || "*");
				}
				this.selectionStrategy = selectionStrategy;

				if (this.cursorProvider) {
					$scope.$watch("cursor", function() {

						if (cursor === undefined || cursor === null) {
							return;
						}

						try {
							digesterPhase = true;
							var cursor = $scope.cursor;

							self.cursorProvider.setCursor(cursor);

						} finally {
							digesterPhase = false;
						}
					});

					this.cursorProvider.$on(CursorProvider.CURSOR_CHANGED, function(event, data) {
						$scope.cursor = data.row;

						if (digesterPhase) {
							return;
						}

						$scope.$apply();
					});
				}
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

					gridRenderer.$scope.$watch("first", function(newValue, oldValue) {
						if (!angular.isNumber(newValue) || newValue == oldValue || (newValue < 0 && oldValue < 0)) {
							return;
						}

						if (self.readyState == "complete") {
							gridRenderer.updateData(false);
						}
					});

					gridRenderer.$scope.$watch("rows", function(newValue, oldValue) {
						if (!angular.isNumber(newValue) || newValue == oldValue || (newValue < 0 && oldValue < 0)) {
							return;
						}

						if (self.readyState == "complete") {
							gridRenderer.updateData(false);
						}
					});

					var containerPromise = gridRenderer.render(doc);
					if (!cc.isPromise(containerPromise)) {
						containerPromise = $q.when(containerPromise);
					}

					return containerPromise.then(function(element) {
						if (element[0]) {
							element = element[0];
						}
						self.readyState = "complete";
						self.element = element;

						pagerRegistry.declareTarget(element);

						self._updateDataModel(gridRenderer.$scope.value);
						gridRenderer.$scope.$on("valueChanged", function(event, value) {
							self._updateDataModel(value);
						});

						return doc;

					}, function(reason) {
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

					dataModelPromise.then(function(dataModel) {
						gridRenderer.dataErrored = false;
						gridRenderer.dataModel = dataModel;

						if (dataModel) {
							// dataModel.installWatcher(renderContext.$scope, "value");

							dataModel.$on(DataModel.DATA_MODEL_CHANGED_EVENT, function(event, value) {
								self._updateDataModel(value);
							});

							dataModel.$on(DataModel.DATA_MODEL_UPDATED_EVENT, function(event, value) {
								gridRenderer.updateData();
							});
						}

						// if (self.state == "complete") {
						gridRenderer.updateData();
						// }

					}, function(error) {
						gridRenderer.dataErrored = true;
						gridRenderer.dataModel = null;
						gridRenderer.updateData();
					});
				},

				/**
				 * @returns {Promise|DataModel}
				 */
				normalizeDataModel: function(value) {
					var dataModelProvider = this.dataModelProvider;
					if (dataModelProvider) {
						return new dataModelProvider(value);
					}

					if (value instanceof DataModel) {
						return value;
					}

					return new DataModel.From(value);
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

	module.factory("camelia.components.DataColumn", [ "$log", function($log) {

		function DataColumn($scope) {
			this.$scope = $scope;

			$scope._component = this;

			var id = $scope.id;
			if (!id) {
				id = "cm_data_column_" + (anonymousId++);
			}
			this.id = id;

			this.visible = ($scope.visible !== false);

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

			function DataGroup($scope) {
				this.$scope = $scope;

				$scope._component = this;

				var id = $scope.id;
				if (!id) {
					id = "cm_data_group_" + (anonymousId++);
				}
				this.id = id;

				var collapsedProvider = $scope.collapsedProvider;
				if (!collapsedProvider) {
					collapsedProvider = SelectionProvider.From($scope.collapsedGroups);

					$scope.$watch("collapsedGroups", function() {
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
					collapsedProvider.$on("selectionSet", function(event, data) {
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
	 * ------------------------ DataCriteria --------------------------
	 */

	module.factory("camelia.components.DataCriteria", [ "$log", function($log) {

		function DataCriteria($scope, element) {
			this.$scope = $scope;

			$scope._component = this;

			var id = $scope.id;
			if (!id) {
				id = "cm_data_criteria_" + (anonymousId++);
			}
			this.id = id;
		}

		DataCriteria.prototype = {
			contributeCheckboxes: function(checkboxContainer) {
				return null;
			},

			acceptValue: function(data, dataColumn, dataModel) {
				return false;
			}
		};

		return DataCriteria;
	} ]);

	module.factory("camelia.components.GridProvider", [ "camelia.components.DataGrid",
		"camelia.components.DataColumn",
		"camelia.components.DataGroup",
		"camelia.components.DataCriteria",
		function(dataGrid, dataColumn, dataGroup, dataCriteria) {
			return {
				DataGrid: dataGrid,
				DataColumn: dataColumn,
				DataGroup: dataGroup,
				DataCriteria: dataCriteria
			};
		} ]);

})(window, window.angular);