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

	var module = angular.module('camelia.renderers.grid');

	module.value("cm_grid_group_animation", 0);

	var PROGRESS_DELAY_MS = 200;

	module.factory('camelia.renderers.grid.table', [ "$log",
		"$q",
		"$timeout",
		"$injector",
		"$interpolate",
		"$exceptionHandler",
		"camelia.core",
		"camelia.cmTypes",
		"cm_grid_rowIndentPx",
		"cm_grid_group_animation",
		function($log, $q, $timeout, $injector, $interpolate, $exceptionHandler, cc, cm, cm_dataGrid_rowIndentPx,
				cm_dataGrid_group_animation) {

			var anonymousId = 0;

			function _destroyScope($scope) {
				return function() {
					$scope.$destroy();
				};
			}

			return {
				tableInstallWatchs: function() {
					var self = this;

					this.$scope.$watch('caption', function(newText) {
						var table = self.tableElement;
						if (!table) {
							return;
						}

						var caption = table.getElementsByTagName("caption")[0];

						if (!caption) {
							if (!newText) {
								return;
							}

							caption = cc.createElement(table, "caption", {
								className: "cm_dataGrid_caption"
							});
						}

						caption.text(angular.isString(newText) ? newText : "");
					});

					var visibleColumns = this.visibleColumns;
					angular.forEach(visibleColumns, function(column) {
						column.$scope.$watch("title", function(newValue) {

							var th = column.bodyTitleElement;
							if (!th) {
								return;
							}

							angular.element(th).text(newValue ? newValue : "");
						});
					});
				},

				tableRenderer: function(parent) {

					var viewPort = cc.createElement(parent, "div", {
						id: "cm_table_" + (anonymousId++),
						className: "cm_dataGrid_table"
					});
					this.tableViewPort = viewPort[0];

					var self = this;
					viewPort.on("scroll", function(event) {
						self.titleViewPort.scrollLeft = self.tableViewPort.scrollLeft;
					});

					var table = cc.createElement(viewPort, "table", {
						role: "grid",
						className: "cm_dataGrid_ttable",
						cellPadding: 0,
						cellSpacing: 0
					});
					this.tableElement = table[0];

					var captionText = this.$scope.caption;
					if (captionText) {
						var caption = cc.createElement(table, "caption", {
							className: "cm_dataGrid_caption"
						});

						caption.text(angular.isString(captionText) ? captionText : "");
					}

					var rowIndent = this.rowIndent;
					if (rowIndent) {
						var colgroupIndent = cc.createElement(table, "colgroup", {
							className: "cm_dataGrid_colgroupIndent",
							"aria-hidden": "true"
						});

						for (var i = 0; i < rowIndent; i++) {
							var co = cc.createElement(colgroupIndent, "col", {
								className: "cm_dataGrid_colIndent"
							});
							co[0].style.width = cm_dataGrid_rowIndentPx + "px";
						}
					}

					var colgroup = cc.createElement(table, "colgroup", {
						className: "cm_dataGrid_colgroup"
					});

					var visibleColumns = this.visibleColumns;
					angular.forEach(visibleColumns, function(column) {
						var col = cc.createElement(colgroup, "col", {
							className: "cm_dataGrid_col"
						});
						// col.data("cm_column", column);
						column.bodyColElement = col[0];
					});

					if (this.hasResizableColumnVisible) {
						var col = cc.createElement(colgroup, "col", {
							"aria-hidden": true,
							className: "cm_dataGrid_colSizer"
						});

						this.rightColElement = col[0];
					}

					var thead = cc.createElement(table, "thead", {
						className: "cm_dataGrid_thead"
					});
					// this.tableTHead = thead[0];

					var titleRow = cc.createElement(thead, "tr");

					for (var i = 0; i < rowIndent; i++) {
						cc.createElement(titleRow, "th", {
							className: "cm_dataGrid_thIndent",
							"aria-hidden": "true"
						});
					}

					angular.forEach(visibleColumns, function(column) {
						var th = cc.createElement(titleRow, "th", {
							id: column.columnId,
							scope: "col"
						});
						column.bodyTitleElement = th[0];

						if (column.visibleIndex === 0 && rowIndent) {
							th.colspan = (1 + rowIndent);
						}

						var title = column.$scope.title;
						if (title) {
							th.text(title);
						}
					});

					this.tableStyleUpdate(viewPort);

					return viewPort;
				},
				tableDestroy: function() {
					this.lastDataModel = undefined;
					this.lastParametersKey = undefined;
				},

				newCriteriasExpression: function(column, enabledCriterias) {
					var fct = function(rowScope, dataModel) {
						var criteriaValue = column.$scope.criteriaValue;

						if (!criteriaValue) {
							criteriaValue = column.interpolatedExpression;
							if (!criteriaValue) {
								return false;
							}
						}

						var value = rowScope.$eval(criteriaValue);

						var criterias = column._criterias;
						for (var k = 0; k < criterias.length; k++) {
							var criteria = criterias[k];

							var filterContexts = enabledCriterias[criteria.id];
							if (!filterContexts) {
								continue;
							}

							if (criteria.filterData(filterContexts, value, rowScope, dataModel, column) !== false) {
								return true;
							}
						}

						return false;
					};

					fct.toJson = function() {
						var pfilters = [];
						var parameters = {
							id: column.$scope.criteriaValue || column.$scope.fieldName || column.$scope.id,
							filters: pfilters
						};

						var criterias = column._criterias;
						angular.forEach(enabledCriterias, function(filters) {

							angular.forEach(filters, function(filter) {

								if (!filter.enabled) {
									return;
								}

								var p = {
									type: filter.type || filters.type || filter.id
								};
								pfilters.push(p);

								var j = filter.toJson && filter.toJson();
								if (j) {
									p.parameters = j;
								}
							});
						});

						if (!pfilters.length) {
							return null;
						}

						return parameters;
					};

					return fct;
				},

				tableClearRows: function(tbody) {

					$timeout(function clearRows() {
						angular.element(tbody).empty(); // clear Data informations
					}, 50, false);
				},

				tablePrepareDataModel: function(dataModel) {
					var visibleColumns = this.visibleColumns;

					// Prepare filters
					var varName = this.$scope.varName;

					var key = {
						varName: varName
					};

					var filtersKey;

					var dataModelFilters = null;
					var self = this;
					angular.forEach(visibleColumns, function(column) {
						var criterias = column._criterias;
						if (!criterias || !criterias.length) {
							return;
						}

						var criteriasContext = column._criteriasContext;

						var enabledCriterias = {};
						var count = 0;
						angular.forEach(criterias, function(criteria) {

							var criteriaContext = criteriasContext[criteria.id];
							angular.forEach(criteriaContext, function(filterContext, filterId) {
								if (!filterContext.enabled) {
									return;
								}

								var c = enabledCriterias[criteria.id];
								if (!c) {
									c = [];
									c.type = criteria.type;
									enabledCriterias[criteria.id] = c;
								}

								c.push(filterContext);
								count++;
							});
						});

						var filtredState = !!count;
						var titleElement = column.titleElement;
						if (titleElement._filtred != filtredState) {
							titleElement._filtred = filtredState;

							cc.BubbleEvent(titleElement, "cm_update");
						}

						if (!count) {
							return;
						}

						if (!dataModelFilters) {
							dataModelFilters = [];
						}

						var ce = self.newCriteriasExpression(column, enabledCriterias);
						dataModelFilters.push(ce);

						var ceParameters = ce.toJson();
						if (ceParameters) {
							if (!filtersKey) {
								filtersKey = [];
								key.filters = filtersKey;
							}

							filtersKey.push(ceParameters);
						}
					});

					var sorters = this.sorters;
					var dataModelSorters;
					if (sorters && sorters.length) {
						dataModelSorters = [];

						var sortersKey = [];
						key.sorters = sortersKey;

						angular.forEach(sorters, function(sorter) {
							var column = sorter.column;

							var columnSorters = column.$scope.sorter;
							if (!columnSorters) {
								return;
							}

							dataModelSorters.push({
								expression: columnSorters,
								column: column,
								ascending: sorter.ascending
							});

							sortersKey.push({
								expression: columnSorters,
								column: column.$scope.id || column.$scope.fieldName || column.id,
								ascending: sorter.ascending
							});
						});
					}

					var groupProvider = this.selectedGroupProvider;
					if (groupProvider) {
						key.groupProvider = groupProvider.$scope.id || groupProvider.id;
					}

					var parametersKey = angular.toJson(key);
					if (this.lastDataModel === dataModel && this.lastParametersKey == parametersKey) {
						return this.lastDecoratedDataModel;
					}
					this.lastDataModel = dataModel;
					this.lastParametersKey = parametersKey;
					if (this.lastDecoratedDataModel) {
						this.lastDecoratedDataModel.$destroyChildren();
						this.lastDecoratedDataModel = null;
					}

					if (dataModelFilters) {
						if (!dataModel.isFilterSupport()) {

							dataModel = $injector.invoke([ "camelia.FiltredDataModel", function(FiltredDataModel) {
								return new FiltredDataModel(dataModel, varName);
							} ]);
						}
					}
					dataModel.setFilters(dataModelFilters);

					if (dataModelSorters) {
						if (!dataModel.isSortSupport()) {
							dataModel = $injector.invoke([ "camelia.SortedDataModel", function(SortedDataModel) {
								return new SortedDataModel(dataModel);
							} ]);
						}
					}
					dataModel.setSorters(dataModelSorters);

					var dataModelGrouped = false;
					if (groupProvider) {
						if (!dataModel.isGroupSupport()) {
							dataModel = $injector.invoke([ "camelia.GroupedDataModel", function(GroupedDataModel) {
								return new GroupedDataModel(dataModel, groupProvider, varName);
							} ]);
						}
						dataModel.setGrouped(dataModelGrouped);
					}

					dataModel.setDataScope(this.$scope.$parent);

					this.lastDecoratedDataModel = dataModel;

					var dataGrid = this.dataGrid;
					dataGrid.rowCount = -1;
					dataGrid.maxRows = -1;
					dataGrid.visibleRows = -1;

					return dataModel;
				},

				tablePrepareColumns: function() {

					var self = this;
					var visibleColumns = this.visibleColumns;
					angular.forEach(visibleColumns, function(column) {
						var valueExpression = column.valueExpression;
						if (valueExpression === undefined) {
							valueExpression = false;

							var expression = column.$scope.valueRawExpression;
							if (!expression) {
								var fieldName = column.$scope.fieldName || column.$scope.id;
								if (fieldName) {
									if (column.$scope.watched) {
										expression = $interpolate.startSymbol() + "$row." + fieldName + $interpolate.endSymbol();

									} else {
										valueExpression = function(rowScope) {
											if (!rowScope.$row) {
												debugger;
											}
											return rowScope.$row[fieldName];
										};
									}
								}
							}

							var exp = null;
							if (expression) {
								exp = self.$interpolate(expression);

								valueExpression = function(rowScope) {
									return rowScope.$eval(exp);
								};
							}

							column.interpolatedExpression = exp;
							column.valueExpression = valueExpression;
						}

						var templates = column.templates;
						if (templates === undefined) {
							templates = [];

							var ts = column.$scope.templates;
							if (ts) {
								var templatesIE = {};
								column.templatesIE = templatesIE;

								angular.forEach(ts, function(t) {
									if (t.$scope.name != "cell") {
										return;
									}

									var enabledE = t.$scope.enabledExpresion;
									if (enabledE) {
										if (enabledE === "false") {
											return;
										}

										templatesIE[t.id] = self.$interpolate(enabledE);
									}

									templates.push(t);
								});
							}

							column.templates = (templates.length) ? templates : false;
						}
					});
				},

				tableRowsRenderer: function() {
					var dataModel = this.dataModel;
					if (!dataModel) {
						return $q.when(false);
					}

					var self = this;

					var fragment = angular.element(document.createDocumentFragment());

					var oldTableViewPort = this.tableViewPort;

					var tablePromise = this.tableRenderer(fragment);
					if (!cc.isPromise(tablePromise)) {
						tablePromise = $q.when(tablePromise);
					}

					return tablePromise.then(function() {

						return self._tableRowsRenderer1(self.tableViewPort, oldTableViewPort, fragment);
					});
				},

				_tableRowsRenderer1: function(tableViewPort, oldTableViewPort, fragment) {
					var self = this;
					var table = this.tableElement;

					var dataGrid = this.dataGrid;

					var tbody = cc.createElement(table, "tbody", {
						className: "cm_dataGrid_tbody",
						id: "cm_tbody_" + (anonymousId++)
					});

					this._alignColumns(true);

					this.$scope.$broadcast("cm:pageCreated", {
						tableViewPort: tableViewPort,
						oldTableViewPort: oldTableViewPort,
						fragment: fragment
					});

					this.tablePrepareColumns();

					var dataModel = this.dataModel;
					dataModel = this.tablePrepareDataModel(dataModel);

					var groupDataModel = dataModel.getGroup && dataModel;

					var rowIndent = (groupDataModel) ? 1 : 0;
					var first = dataGrid.first;
					var rows = dataGrid.rows;
					var rowIndex = first;

					if (!angular.isNumber(dataGrid.maxRows)) {
						dataGrid.maxRows = -1;
					}

					if (rows > 0) {
						dataModel.setFetchProperties({
							rows: rows
						});
					}

					var rowCount = dataModel.getRowCount(false);
					if (rowCount < 0) {
						rowCount = -1;
					}
					dataGrid.rowCount = rowCount;
					// console.log("Return rowCount=" + rowCount + " from model");

					var visibleIndex = 0;
					var tbodyElement = tbody[0] || tbody;

					var rowScope = null;
					var groupScope = null;
					var currentGroup = null;
					var groupIndex = -1;

					var progressDefer = null;
					var progressDate = 0;

					function setupDataGrid(lastRowReached) {

						self._renderedFirst = first;

						if (!visibleIndex) {
							if (!first) {
								dataGrid.rowCount = 0;
								dataGrid.maxRows = 0;

								// console.log("Reset rowCount and maxRows");
							}

						} else {
							if (lastRowReached) {
								dataGrid.rowCount = first + visibleIndex;
							}
							dataGrid.maxRows = Math.max(dataGrid.maxRows, first + visibleIndex);
						}

						dataGrid.visibleRows = visibleIndex;
					}

					var varName = this.$scope.varName;

					function availablePromise(available) {
						if (!available) {
							dataModel.setRowIndex(-1);

							if (rowScope) {
								rowScope.$destroy();
							}
							if (groupScope) {
								groupScope.$destroy();
							}

							setupDataGrid(true);
							return false;
						}

						var groupCollapsed = false;

						for (; rows < 0 || visibleIndex < rows;) {
							var nextAvailable;

							if (progressDefer) {
								var now = Date.now();
								if (now > progressDate) {
									progressDate = now + PROGRESS_DELAY_MS;

									progressDefer.notify({
										count: visibleIndex,
										rows: rows
									});
								}
							}

							try {
								var rowData = dataModel.getRowData();
								if (groupDataModel) {
									if (!groupScope) {
										groupScope = self.$scope.$parent.$new();
									}

									groupScope.$group = null;
									groupScope.$count = null;
									groupScope.$row = rowData;
									if (varName) {
										groupScope[varName] = rowData;
									}

									var group = groupDataModel.getGroup(groupScope, rowData);
									if (group !== currentGroup) {
										currentGroup = group;
										groupIndex++;

										groupCollapsed = groupProvider.getCollapsedProvider().contains(group);

										groupScope.$group = group;
										groupScope.$count = groupDataModel.getGroupCount(group);

										var destroyGroupScopeRef = {
											value: true
										};
										var groupTR = self.groupRenderer(tbodyElement, groupProvider, groupScope, groupIndex,
												groupCollapsed, destroyGroupScopeRef);
										groupTR.data("cm_rowValues", groupDataModel.getGroupValues(group));
										groupTR.data("cm_value", group);

										if (!destroyGroupScopeRef.value) {
											groupTR.on('$destroy', _destroyScope(groupScope));
											groupTR.data('$isolateScope', groupScope);
											groupScope.$digest();
											groupScope = null;
										}

										var trElement = groupTR[0];
										trElement._visibleIndex = visibleIndex;
										trElement._rowIndex = rowIndex;
									}
								}

								if (!groupCollapsed) {
									if (!rowScope) {
										rowScope = self.$scope.$parent.$new();
									}

									rowScope.$index = visibleIndex;
									rowScope.$odd = !(visibleIndex & 1);
									rowScope.$even = !rowScope.$odd;
									rowScope.$first = (visibleIndex === 0);
									rowScope.$pageNumber = -1;
									rowScope.$pageCount = -1;
									rowScope.$rowIndex = rowIndex;
									rowScope.$row = rowData;
									if (varName) {
										rowScope[varName] = rowData;
									}

									var destroyRowScopeRef = {
										value: true
									};

									var tr = self.rowRenderer(tbodyElement, rowScope, rowIndex, rowIndent, destroyRowScopeRef);

									tr.data("cm_value", rowData);

									if (!destroyRowScopeRef.value) {
										tr.on('$destroy', _destroyScope(rowScope));
										tr.data('$isolateScope', rowScope);
										rowScope.$digest();
										rowScope = null;
									}
								}

								rowIndex++;
								visibleIndex++;

								if (rows > 0 && visibleIndex >= rows) {
									break;
								}

								dataModel.setRowIndex(rowIndex);

								nextAvailable = dataModel.isRowAvailable();

							} catch (x) {
								dataModel.setRowIndex(-1);

								if (rowScope) {
									rowScope.$destroy();
								}
								if (groupScope) {
									groupScope.$destroy();
								}

								throw x;
							}

							if (cc.isPromise(nextAvailable)) {
								return nextAvailable.then(availablePromise);
							}

							if (nextAvailable !== true) {
								break;
							}
						}

						dataModel.setRowIndex(-1);
						if (rowScope) {
							rowScope.$destroy();
						}
						if (groupScope) {
							groupScope.$destroy();
						}

						setupDataGrid(rows > 0 && visibleIndex < rows);

						return $q.when(false);
					}

					var nextAvailable;
					try {
						dataModel.setRowIndex(rowIndex);

						nextAvailable = dataModel.isRowAvailable();

					} catch (x) {
						dataModel.setRowIndex(-1);
						if (rowScope) {
							rowScope.$destroy();
						}

						dataGrid.rowCount = -1;
						dataGrid.maxRows = -1;
						dataGrid.visibleRows = visibleIndex;

						throw x;
					}

					if (!cc.isPromise(nextAvailable)) {
						return availablePromise(nextAvailable);
					}

					progressDefer = null;

					return nextAvailable.then(availablePromise);
				},

				tableStyleUpdate: function(body) {
					return cm.MixElementClasses(body, [ "cm_dataGrid_table" ], [ "cm_dataGrid_table_scroll" ]);
				},

				tableLayout: function(container) {

				},

				moveColumnTable: function(column, beforeColumn) {

					var self = this;
					function move(name) {
						var title = column[name];
						var beforeTitle = beforeColumn && beforeColumn[name];
						if (!beforeTitle) {
							beforeTitle = self._lastVisibleColumn[name].nextSibling;
						}

						var parent = title.parentNode;
						parent.removeChild(title);
						parent.insertBefore(title, beforeTitle);
					}

					move("bodyColElement");
					move("bodyTitleElement");

					this.forEachBodyElement("row", function(row) {
						self.moveColumnRow(row, column, beforeColumn);
					});
				},
				removeRowsOfGroup: function(group, groupElement) {
					var lst = [];
					for (var e = groupElement.nextSibling; e;) {
						var next = e.nextSibling;
						var type = cm.GetCMType(e);

						if (type == "group") {
							break;
						}

						if (!cm_dataGrid_group_animation) {
							angular.element(e).remove();
						} else {
							lst.push(e);
						}

						e = next;
					}

					if (!lst.length) {
						return;
					}

					function timer() {
						var e = lst.shift();

						angular.element(e).remove();

						if (lst.length) {
							return $timeout(timer, cm_dataGrid_group_animation, false);
						}
					}

					$timeout(timer, cm_dataGrid_group_animation, false);

				},
				addRowsOfGroup: function(group, groupElement) {

					var visibleIndex = groupElement._visibleIndex;
					var rowIndex = groupElement._rowIndex;
					var rowValues = cc.CloneArray(angular.element(groupElement).data("cm_rowValues"));

					if (!rowValues.length) {
						return;
					}

					var fragment = document.createDocumentFragment();
					var varName = this.$scope.varName;

					var rowIndent = this.rowIndent;

					var nextSibling = groupElement.nextSibling;

					var self = this;
					function timer() {

						var rowScope = self.$scope.$parent.$new();
						var destroyRowScopeRef = {
							value: true
						};
						try {
							var rowData = rowValues.shift();

							rowScope.$index = visibleIndex;
							rowScope.$odd = !(visibleIndex & 1);
							rowScope.$even = !rowScope.$odd;
							rowScope.$first = (visibleIndex === 0);
							rowScope.$pageNumber = -1;
							rowScope.$pageCount = -1;
							rowScope.$rowIndex = rowIndex;
							rowScope.$row = rowData;
							if (varName) {
								rowScope[varName] = rowData;
							}

							var tr = self.rowRenderer(fragment, rowScope, rowIndex, rowIndent, destroyRowScopeRef);

							tr.data("cm_value", rowData);

							if (!destroyRowScopeRef.value) {
								tr.on('$destroy', _destroyScope(rowScope));
								tr.data('$isolateScope', rowScope);
								rowScope.$digest();
								rowScope = null;
							}

							rowIndex++;
							visibleIndex++;

						} finally {
							if (rowScope) {
								rowScope.$destroy();
							}
						}

						if (cm_dataGrid_group_animation) {
							groupElement.parentNode.insertBefore(fragment, nextSibling);

							if (rowValues.length) {
								return $timeout(timer, cm_dataGrid_group_animation, false);
							}
						}
					}

					if (!cm_dataGrid_group_animation) {
						for (; rowValues.length;) {
							timer();
						}
						groupElement.parentNode.insertBefore(fragment, nextSibling);
						return;
					}

					$timeout(timer, cm_dataGrid_group_animation, false);
				}
			};

		} ]);
})(window, window.angular);