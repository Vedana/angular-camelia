(function(window, angular, undefined) {
	'use strict';

	var module = angular.module("camelia.renderers.grid");

	module.factory("camelia.renderers.grid.row", [ "$log",
		"$timeout",
		"$interpolate",
		"camelia.core",
		"camelia.cmTypes",
		"camelia.renderers.grid.utils",
		function($log, $timeout, $interpolate, cc, cm, cu) {

			var anonymousId = 0;

			return {
				RowRenderer: function(parentElement, renderContext, rowScope, index, cellRenderer, rowIdent) {
					var doc = parentElement.ownerDocument || document;

					var tr = cc.createElement(parentElement, "tr", {
						id: "cm_row_" + (anonymousId++),
						role: "row",
						tabIndex: -1,
						$cm_rowIndex: index
					});

					var rowElement = tr[0];
					rowElement._rowIdent = rowIdent;

					var rowClassMode = renderContext.rowClassMode;
					if (rowClassMode === undefined) {
						rowClassMode = 0;

						var expression = renderContext.$scope.rowClassRawExpression;
						if (expression && expression.length) {
							var $interpolate = renderContext.$interpolate;
							var rowClassExpression = expression;
							rowClassMode = 3;

							if (expression.indexOf($interpolate.startSymbol()) >= 0) {
								rowClassMode = 1;
								rowClassExpression = renderContext.$interpolate(expression);

							} else if (expression.charAt(0) == '{' && expression.charAt(expression.length - 1) == '}') {
								// ng-class expression !
								rowClassMode = 2;
							}

							renderContext.rowClassExpression = rowClassExpression;
						}

						renderContext.rowClassMode = rowClassMode;
					}

					if (rowClassMode) {
						var obj = renderContext.rowClassExpression;
						if (rowClassMode != 3) {
							obj = rowScope.$eval(obj);
						}

						if (obj) {
							if (angular.isString(obj)) {
								rowElement.cm_rowClasses = obj.split(" ");

							} else if (angular.isObject(obj)) {
								var ar = [];

								angular.forEach(obj, function(value, key) {
									if (value) {
										ar.push(key);
									}
								});

								if (ar.length) {
									rowElement.cm_rowClasses = ar;
								}
							}
						}
					}

					var selectionProvider = renderContext.selectionProvider;
					if (selectionProvider && selectionProvider.contains(rowScope.$row)) {
						rowElement._selected = true;
					}

					renderContext.rendererProvider.RowStyleUpdate(tr, renderContext);

					var cellStyleUpdate = renderContext.rendererProvider.CellStyleUpdate;

					for (var i = 0; i < rowIdent; i++) {
						var td = cc.createElement(tr, "td", {
							id: "cm_cindent_" + (anonymousId++),
							"aria-hidden": "true"
						});
					}

					var columnIndex = 0;
					angular.forEach(renderContext.visibleColumns, function(column) {
						var tdTag = (column.scope) ? "th" : "td";

						var td = cc.createElement(tr, tdTag, {
							id: "cm_cell_" + (anonymousId++),
							"aria-labelledBy": column.titleElement.id,
							tabIndex: -1,
							nowrap: "nowrap",
							role: "gridcell",
							$cm_lindex: column.logicalIndex
						});

						if (column.scope) {
							td.attr("scope", "row");
						}

						cellStyleUpdate(td, renderContext);

						cellRenderer(td, renderContext, rowScope, index, column, columnIndex);

						columnIndex++;
					});

					var td = cc.createElement(tr, "td", {
						"aria-hidden": "true"
					});

					return tr;
				},

				RowStyleUpdate: function(element, renderContext) {
					var tr = element;
					if (tr[0]) {
						tr = tr[0];
					}
					var index = tr.cm_rowIndex;

					var classes = [ "cm_dataGrid_row", "cm_dataGrid_row_" + ((index % 2) ? "odd" : "even") ];

					if (tr.cm_rowClasses) {
						classes.push.apply(classes, tr.cm_rowClasses);
					}

					return cm.MixElementClasses(tr, classes);
				},

				CellRenderer: function(td, renderContext, rowScope, index, column, columnIndex) {
					var label = cc.createElement(td, "label", {
						className: "cm_dataGrid_clabel"
					});

					var value = null;
					var interpolatedExpression = column.interpolatedExpression;
					if (!interpolatedExpression) {
						var expression = column.$scope.valueRawExpression;
						if (!expression && column.$scope.fieldName) {
							expression = $interpolate.startSymbol() + "$row." + column.$scope.fieldName + $interpolate.endSymbol();
						}
						if (expression) {
							interpolatedExpression = renderContext.$interpolate(expression);
							column.interpolatedExpression = interpolatedExpression;
						}
					}

					if (interpolatedExpression) {
						var value = rowScope.$eval(interpolatedExpression);
						if (value) {
							label.text(value);
						}
					}
				},

				CellStyleUpdate: function(element, renderContext) {
					var cell = element;
					if (cell[0]) {
						cell = cell[0];
					}
					var index = cell.cm_lindex;

					var column = renderContext.columns[index];
					var cts = [];

					var classes = [ "cm_dataGrid_cell" ];
					if (!column.visibleIndex) {
						classes.push("cm_dataGrid_cfirst");

					}
					if (column.visibleIndex == renderContext.visibleColumns.length - 1) {
						classes.push("cm_dataGrid_clast");
					}

					if (column.cellAlign) {
						cts.push("cm_dataGrid_calign_" + column.cellAlign);
					}

					if (column.cellClasses) {
						classes.push.apply(classes, column.cellClasses);
					}

					if (cell.cm_cellClasses) {
						classes.push.apply(classes, tr.cm_cellClasses);
					}

					return cm.MixElementClasses(cell, classes, cts);
				},

				ComputeColumnsNaturalWidths: function(renderContext) {
					var row = cu.GetFirstRow(renderContext);
					if (!row) {
						return;
					}
					var rowBCR = row.getBoundingClientRect();
					if (rowBCR.width < 1) {
						return false;
					}

					var cells = row.cells;
					angular.forEach(renderContext.visibleColumns, function(column) {
						var cell = cells[column.visibleIndex + renderContext.rowIndent];
						if (!cell) {
							return;
						}

						var cr = cell.getBoundingClientRect();
						column.naturalWidth = cr.width;
					});
				},

				MoveColumnRow: function(row, renderContext, column, beforeColumn) {
					var cells = row.cells;
					var rowIdent = row._rowIdent;
					var visibleColumns = renderContext.visibleColumns;
					var visibleIndex = column.beforeMovingVisibleIndex;

					var cell = cells[visibleIndex + rowIdent];
					var beforeCell = beforeColumn && cells[beforeColumn.beforeMovingVisibleIndex + rowIdent];
					if (!beforeCell) {
						beforeCell = cells[renderContext._lastVisibleColumn.beforeMovingVisibleIndex + rowIdent].nextSibling;
					}

					row.removeChild(cell);
					row.insertBefore(cell, beforeCell);

					if (!column.visibleIndex) {
						this.CellStyleUpdate(cell, renderContext);

						var firstCell = cells[rowIdent];
						if (!beforeColumn || firstCell.id != beforeColumn.id) {
							this.CellStyleUpdate(firstCell, renderContext);
						}

					} else if (column.visibleIndex == visibleColumns.length - 1) {
						this.CellStyleUpdate(cell, renderContext);

						var lastCell = cells[rowIdent + visibleColumns.length - 1];
						if (!beforeColumn || lastCell.id != beforeColumn.id) {
							this.CellStyleUpdate(lastCell, renderContext);
						}
					}
				}
			};
		} ]);
})(window, window.angular);