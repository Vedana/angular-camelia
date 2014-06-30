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

	var module = angular.module("camelia.renderers.grid");

	module.factory("camelia.renderers.grid.row", [ "$log",
		"$interpolate",
		"camelia.core",
		"camelia.cmTypes",
		function($log, $interpolate, cc, cm) {

			var anonymousId = 0;

			return {
				rowRenderer: function(parentElement, rowScope, index, rowIdent, destroyScopeRef) {
					if (!rowScope) {
						throw new Error("RowScope is invalid " + rowScope);
					}

					var doc = parentElement.ownerDocument || document;

					var tr = cc.createElement(parentElement, "tr", {
						id: "cm_row_" + (anonymousId++),
						role: "row",
						tabIndex: -1,
						$cm_rowIndex: index
					});

					var rowElement = tr[0];
					rowElement._rowIdent = rowIdent;

					var rowClassMode = this.rowClassMode;
					if (rowClassMode === undefined) {
						rowClassMode = 0;

						var expression = this.$scope.rowClassRawExpression;
						if (expression && expression.length) {
							var $interpolate = this.$interpolate;
							var rowClassExpression = expression;
							rowClassMode = 3;

							if (expression.indexOf($interpolate.startSymbol()) >= 0) {
								rowClassMode = 1;
								rowClassExpression = this.$interpolate(expression);

							} else if (expression.charAt(0) == '{' && expression.charAt(expression.length - 1) == '}') {
								// ng-class expression !
								rowClassMode = 2;
							}

							this.rowClassExpression = rowClassExpression;
						}

						this.rowClassMode = rowClassMode;
					}

					if (rowClassMode) {
						var obj = this.rowClassExpression;
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

					var selectionProvider = this.selectionProvider;
					if (selectionProvider && selectionProvider.contains(rowScope.$row)) {
						rowElement._selected = true;
					}

					this.rowStyleUpdate(tr);

					for (var i = 0; i < rowIdent; i++) {
						var td = cc.createElement(tr, "td", {
							id: "cm_cindent_" + (anonymousId++),
							"aria-hidden": "true"
						});
					}

					var self = this;
					var columnIndex = 0;
					angular.forEach(this.visibleColumns, function(column) {
						var tdTag = (column.scope) ? "th" : "td";

						var tdIdx = (anonymousId++);
						var td = cc.createElement(tr, tdTag, {
							id: "cm_cell_" + tdIdx,
							"aria-labelledBy": column.labelElement.id + " cm_cell_" + tdIdx,
							tabIndex: -1,
							nowrap: "nowrap",
							role: "gridcell",
							$cm_lindex: column.logicalIndex
						});

						if (column.scope) {
							td.attr("scope", "row");
						}

						self.cellStyleUpdate(td);

						self.cellRenderer(td, rowScope, index, column, columnIndex, destroyScopeRef);

						columnIndex++;
					});

					cc.createElement(tr, "td", {
						"aria-hidden": "true"
					});

					return tr;
				},

				rowStyleUpdate: function(element) {
					var tr = element;
					if (tr[0]) {
						tr = tr[0];
					}
					var index = tr.cm_rowIndex;

					var classes = [ "cm_dataGrid_row", "cm_dataGrid_row_" + ((index % 2) ? "odd" : "even") ];

					if (tr.cm_rowClasses) {
						classes.push.apply(classes, tr.cm_rowClasses);
					}

					var ariaState = 0;
					if (tr._selected) {
						ariaState |= 0x01;
					}
					if (tr.ariaState != ariaState) {
						tr.ariaState = ariaState;

						if (tr._selected) {
							tr.setAttribute("aria-selected", tr._selected);
						} else {
							tr.removeAttribute("aria-selected");
						}
					}

					return cm.MixElementClasses(tr, classes);
				},

				cellRenderer: function(td, rowScope, index, column, columnIndex, destroyScopeRef) {
					var value;

					var templates = column.templates;
					if (templates) {
						for (var i = 0; i < templates.length; i++) {
							var template = templates[i];

							var templateIE = column.templatesIE[template.id];
							if (templateIE) {
								if (rowScope.$eval(templateIE) === false) {
									continue;
								}
							}

							var comp = template.transclude(td, rowScope);

							destroyScopeRef.value = false;

							if (column.editable === false) {
								// td.attr("aria-readonly", true);
							}

							return comp;
						}
					}

					// td.attr("aria-readonly", true);

					var label = cc.createElement(td, "label", {
						className: "cm_dataGrid_clabel"
					});

					var valueExpression = column.valueExpression;
					if (!valueExpression) {
						return label;
					}

					if (column.$scope.watched) {
						destroyScopeRef.value = false;

						rowScope.$watch(column.interpolatedExpression, function(newText) {
							label.text((newText == undefined) ? '' : newText);
						});

					} else {
						if (valueExpression) {
							value = valueExpression(rowScope);
						}

						if (value) {
							label.text(value);
						}
					}

					return label;
				},

				cellStyleUpdate: function(element) {
					var cell = element;
					if (cell[0]) {
						cell = cell[0];
					}
					var index = cell.cm_lindex;

					var column = this.columns[index];
					var cts = [];

					var classes = [ "cm_dataGrid_cell" ];
					if (!column.visibleIndex) {
						classes.push("cm_dataGrid_cfirst");

					}
					if (column.visibleIndex == this.visibleColumns.length - 1) {
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

				computeColumnsNaturalWidths: function() {
					var row = this.getFirstRow();
					if (!row) {
						return;
					}
					var rowBCR = row.getBoundingClientRect();
					if (rowBCR.width < 1) {
						return false;
					}

					var cells = row.cells;
					var rowIndent = this.rowIndent;
					angular.forEach(this.visibleColumns, function(column) {
						var cell = cells[column.visibleIndex + rowIndent];
						if (!cell) {
							return;
						}

						var cr = cell.getBoundingClientRect();
						column.naturalWidth = cr.width;
					});
				},

				moveColumnRow: function(row, column, beforeColumn) {
					var cells = row.cells;
					var rowIdent = row._rowIdent;
					var visibleColumns = this.visibleColumns;
					var visibleIndex = column.beforeMovingVisibleIndex;

					var cell = cells[visibleIndex + rowIdent];
					var beforeCell = beforeColumn && cells[beforeColumn.beforeMovingVisibleIndex + rowIdent];
					if (!beforeCell) {
						beforeCell = cells[this._lastVisibleColumn.beforeMovingVisibleIndex + rowIdent].nextSibling;
					}

					row.removeChild(cell);
					row.insertBefore(cell, beforeCell);

					if (!column.visibleIndex) {
						this.cellStyleUpdate(cell);

						var firstCell = cells[rowIdent];
						if (!beforeColumn || firstCell.id != beforeColumn.id) {
							this.cellStyleUpdate(firstCell);
						}

					} else if (column.visibleIndex == visibleColumns.length - 1) {
						this.cellStyleUpdate(cell);

						var lastCell = cells[rowIdent + visibleColumns.length - 1];
						if (!beforeColumn || lastCell.id != beforeColumn.id) {
							this.cellStyleUpdate(lastCell);
						}
					}
				}
			};
		} ]);
})(window, window.angular);