(function(window, angular, undefined) {
	'use strict';

	var module = angular.module('camelia.renderers.grid');

	module.value("cm_grid_group_animation", 0);

	module.factory('camelia.renderers.grid.table', [ "$log",
		"$q",
		"$timeout",
		"$injector",
		"camelia.core",
		"camelia.cmTypes",
		'camelia.renderers.grid.utils',
		"cm_grid_rowIndentPx",
		"cm_grid_group_animation",
		function($log, $q, $timeout, $injector, cc, cm, cu, cm_dataGrid_rowIndentPx, cm_dataGrid_group_animation) {

			var anonymousId = 0;

			return {
				TableRenderer: function(parent, renderContext) {

					var viewPort = cc.createElement(parent, "div", {
						id: "cm_table_" + (anonymousId++),
						className: "cm_dataGrid_table"
					});
					renderContext.tableViewPort = viewPort[0];

					viewPort.on("scroll", function(event) {
						renderContext.titleViewPort.scrollLeft = renderContext.tableViewPort.scrollLeft;
					});

					var table = cc.createElement(viewPort, "table", {
						role: "grid",
						className: "cm_dataGrid_ttable",
						cellPadding: 0,
						cellSpacing: 0
					});
					renderContext.tableElement = table[0];

					var caption = null;
					var captionText = renderContext.$scope.caption;
					if (captionText !== undefined) {
						caption = cc.createElement(table, "caption", {
							className: "cm_dataGrid_caption",
						});

						caption.text(captionText);
					}

					renderContext.$scope.$watch('caption', function() {
						var captionText = renderContext.$scope.caption;

						if (!caption) {
							caption = cc.createElement(thead, "caption", {
								className: "cm_dataGrid_caption"
							});
						}

						caption.text(angular.isString(captionText) ? captionText : "");
					});

					var rowIndent = renderContext.rowIndent;
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

					var visibleColumns = renderContext.visibleColumns;
					angular.forEach(visibleColumns, function(column) {
						var col = cc.createElement(colgroup, "col", {
							className: "cm_dataGrid_col"
						});
						col.data("cm_column", column);
						column.bodyColElement = col[0];
					});

					if (renderContext.hasResizableColumnVisible) {
						renderContext.rightColElement = cc.createElement(colgroup, "col", {
							"aria-hidden": true,
							className: "cm_dataGrid_colSizer"
						})[0];
					}

					var thead = cc.createElement(table, "thead", {
						className: "cm_dataGrid_thead"
					});
					renderContext.tableTHead = thead[0];

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

						if (column.visibleIndex == 0 && rowIndent) {
							th.colspan = (1 + rowIndent);
						}

						var title = column.$scope.title;
						if (title) {
							th.text(title);
						}
						column.$scope.$watch("title", function(newValue) {
							th.text(newValue ? newValue : "");
						});
					});

					var tbody = cc.createElement(table, "tbody", {
						className: "cm_dataGrid_tbody",
						id: "cm_tbody_" + (anonymousId++)
					});
					renderContext.tableTBody = tbody[0];

					renderContext.rendererProvider.TableStyleUpdate(viewPort, renderContext);

					return viewPort;
				},

				NewCriteriaExpression: function(column, criteria) {

				},

				TableRowsRenderer: function(tbody, renderContext) {
					renderContext._hasData = undefined;

					var dataModel = renderContext.dataModel;
					if (!dataModel) {
						return;
					}
					var dataGrid = renderContext.dataGrid;

					var varName = renderContext.$scope.varName;

					var self = this;

					// Prepare columns

					var visibleColumns = renderContext.visibleColumns;
					angular.forEach(visibleColumns, function(column) {
						var interpolatedExpression = column.interpolatedExpression;
						if (interpolatedExpression) {
							return;
						}

						var expression = column.$scope.valueRawExpression;
						if (!expression && column.$scope.fieldName) {
							expression = $interpolate.startSymbol() + "$row." + column.$scope.fieldName + $interpolate.endSymbol();
						}
						if (expression) {
							interpolatedExpression = renderContext.$interpolate(expression);
							column.interpolatedExpression = interpolatedExpression;
						}
					});

					// Prepare filters

					var filtredColumns = renderContext.filtredColumns;
					if (filtredColumns && filtredColumns.length) {
						var filters = [];

						angular.forEach(filtredColumns, function(column) {
							var criterias = column._criterias;
							if (!criterias || !criterias.length) {
								return;
							}

							angular.forEach(criterias, function(criteria) {
								if (criteria.$scope.enabled !== true) {
									return;
								}

								filters.push(self.NewCriteriaExpression(column, criteria));
							});
						});

						if (filters.length) {
							dataModel = $injector.invoke([ "camelia.FiltredDataModel", function(FiltredDataModel) {
								return new FiltredDataModel(dataModel);
							} ]);

							dataModel.setFilters(filters);
						}
					}

					// Prepare sorters

					var sorters = renderContext.sorters;
					if (sorters && sorters.length) {
						var sorter0 = sorters[0];

						var columnSorters = sorter0.column.$scope.sorter;
						if (columnSorters && columnSorters != "server") {
							dataModel = $injector.invoke([ "camelia.SortedDataModel", function(SortedDataModel) {
								return new SortedDataModel(dataModel);
							} ]);
							dataModel.setSorters([ {
								expression: columnSorters,
								column: sorter0.column,
								ascending: sorter0.ascending
							} ]);
						}
					}

					var groupDataModel = null;
					var groupProvider = renderContext.selectedGroupProvider;
					if (groupProvider) {
						dataModel = $injector.invoke([ "camelia.GroupedDataModel", function(GroupedDataModel) {
							return new GroupedDataModel(dataModel, groupProvider, renderContext.$interpolate, varName);
						} ]);
						groupDataModel = dataModel;
					}

					var rowIndent = (groupDataModel) ? 1 : 0;

					dataModel.setScope(renderContext.$scope.$parent);

					var groupRenderer = renderContext.rendererProvider.GroupRenderer;
					var rowRenderer = renderContext.rendererProvider.RowRenderer;
					var cellRenderer = renderContext.rendererProvider.CellRenderer;

					var first = renderContext.$scope.first;
					if (!angular.isNumber(first) || first < 0) {
						first = 0;
					}
					dataGrid.first = first;
					var rowIndex = first;

					var rows = renderContext.$scope.rows;
					if (!angular.isNumber(rows)) {
						rows = -1;
					}
					dataGrid.rows = rows;

					if (!angular.isNumber(dataGrid.maxRows)) {
						dataGrid.maxRows = -1;
					}

					var rowCount = dataModel.getRowCount(false);
					if (rowCount < 0) {
						rowCount = -1;
					}
					dataGrid.rowCount = rowCount;

					var visibleIndex = 0;
					var tbodyElement = tbody[0] || tbody;

					var rowScope = renderContext.$scope.$parent.$new();
					var currentGroup = null;
					var groupIndex = -1;

					function availablePromise(available) {
						if (!available) {
							dataModel.setRowIndex(-1);
							rowScope.$destroy();

							dataGrid.rowCount = first + visibleIndex;
							dataGrid.maxRows = Math.max(dataGrid.maxRows, dataGrid.rowCount);
							return false;
						}

						var groupCollapsed = false;

						for (; rows < 0 || visibleIndex < rows;) {
							var nextAvailable;

							try {
								var rowData = dataModel.getRowData();
								if (groupDataModel) {
									var group = groupDataModel.getGroup(rowScope, rowData);
									if (group !== currentGroup) {
										currentGroup = group;
										groupIndex++;

										groupCollapsed = groupProvider.getCollapsedProvider().contains(group);

										rowScope.$group = group;
										rowScope.$count = groupDataModel.getGroupCount(group);

										var tr = groupRenderer(tbodyElement, renderContext, groupProvider, rowScope, groupIndex,
												groupCollapsed);
										tr.data("cm_rowValues", groupDataModel.getGroupValues(group));
										tr.data("cm_value", group);

										var trElement = tr[0];
										trElement._visibleIndex = visibleIndex;
										trElement._rowIndex = rowIndex;

										delete rowScope.$count;
									}
								}

								if (!groupCollapsed) {
									rowScope.$index = visibleIndex;
									rowScope.$odd = !(visibleIndex & 1);
									rowScope.$even = !rowScope.$odd;
									rowScope.$first = (visibleIndex == 0);
									rowScope.$pageNumber = -1;
									rowScope.$pageCount = -1;
									rowScope.$rowIndex = rowIndex;
									rowScope.$row = rowData;
									if (varName) {
										rowScope[varName] = rowData;
									}

									var tr = rowRenderer(tbodyElement, renderContext, rowScope, rowIndex, cellRenderer, rowIndent);

									tr.data("cm_value", rowData);
								}

								rowIndex++;
								visibleIndex++;

								dataModel.setRowIndex(rowIndex);

								nextAvailable = dataModel.isRowAvailable();

								renderContext._hasData = true;

							} catch (x) {
								dataModel.setRowIndex(-1);
								rowScope.$destroy();

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
						rowScope.$destroy();

						dataGrid.maxRows = Math.max(dataGrid.maxRows, Math.max(first + visibleIndex, dataGrid.rowCount));

						return $q.when(false);
					}

					var nextAvailable;
					try {
						dataModel.setRowIndex(rowIndex);

						nextAvailable = dataModel.isRowAvailable();

					} catch (x) {
						dataModel.setRowIndex(-1);
						rowScope.$destroy();

						throw x;
					}

					if (!cc.isPromise(nextAvailable)) {
						return availablePromise(nextAvailable);
					}

					return nextAvailable.then(availablePromise);
				},

				TableStyleUpdate: function(body, renderContext) {
					return cm.MixElementClasses(body, [ "cm_dataGrid_table" ], [ "cm_dataGrid_table_scroll" ]);
				},

				TableLayout: function(container, renderContext) {

				},

				MoveColumnTable: function(column, renderContext, beforeColumn) {

					function move(name) {
						var title = column[name];
						var beforeTitle = beforeColumn && beforeColumn[name];
						if (!beforeTitle) {
							beforeTitle = renderContext._lastVisibleColumn[name].nextSibling;
						}

						var parent = title.parentNode;
						parent.removeChild(title);
						parent.insertBefore(title, beforeTitle);
					}

					move("bodyColElement");
					move("bodyTitleElement");

					var moveColumnRow = renderContext.rendererProvider.MoveColumnRow;
					var self = this;
					cu.ForEachBodyElement(renderContext, "row", function(row) {
						moveColumnRow.call(self, row, renderContext, column, beforeColumn);
					});
				},
				RemoveRowsOfGroup: function(group, renderContext, groupElement) {
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
				AddRowsOfGroup: function(group, renderContext, groupElement) {

					var visibleIndex = groupElement._visibleIndex;
					var rowIndex = groupElement._rowIndex;
					var rowValues = cc.CloneArray(angular.element(groupElement).data("cm_rowValues"));

					if (!rowValues.length) {
						return;
					}

					var rowRenderer = renderContext.rendererProvider.RowRenderer;
					var cellRenderer = renderContext.rendererProvider.CellRenderer;

					var fragment = document.createDocumentFragment();
					var varName = renderContext.$scope.varName;

					var rowIndent = renderContext.rowIndent;

					var nextSibling = groupElement.nextSibling;

					function timer() {

						var rowScope = renderContext.$scope.$parent.$new();
						try {
							var rowData = rowValues.shift();

							rowScope.$index = visibleIndex;
							rowScope.$odd = !(visibleIndex & 1);
							rowScope.$even = !rowScope.$odd;
							rowScope.$first = (visibleIndex == 0);
							rowScope.$pageNumber = -1;
							rowScope.$pageCount = -1;
							rowScope.$rowIndex = rowIndex;
							rowScope.$row = rowData;
							if (varName) {
								rowScope[varName] = rowData;
							}

							var tr = rowRenderer(fragment, renderContext, rowScope, rowIndex, cellRenderer, rowIndent);

							tr.data("cm_value", rowData);

							rowIndex++;
							visibleIndex++;

						} finally {
							rowScope.$destroy();
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