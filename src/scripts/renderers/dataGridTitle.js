(function(window, angular, undefined) {
	'use strict';

	var MIN_COLUMN_WIDTH = 32;
	var MIN_SORT_PARAMETERS_COLUMN_WIDTH = 90;

	var module = angular.module("camelia.renderers.grid");

	module.factory("camelia.renderers.grid.title", [ "$log",
		"$timeout",
		"camelia.core",
		"camelia.cmTypes",
		"camelia.renderers.grid.utils",
		"cm_grid_rowIndentPx",
		function($log, $timeout, cc, cm, cu, cm_dataGrid_rowIndentPx) {

			var anonymousId = 0;

			return {

				TitleRenderer: function(parent, renderContext) {

					var viewPort = cc.createElement(parent, "div", {
						id: "cm_title_" + (anonymousId++),
						className: "cm_dataGrid_title"
					});
					renderContext.titleViewPort = viewPort[0];

					var ul = cc.createElement(viewPort, "ul", {
						className: "cm_dataGrid_ttitle"
					});
					renderContext.titleBarElement = ul[0];

					renderContext.rendererProvider.TitleStyleUpdate(viewPort, renderContext);

					var columns = renderContext.columns;
					var index = 0;
					var visibleIndex = 0;
					var scopeColLogicalIndex = -1;
					var titleCellRenderer = renderContext.rendererProvider.TitleCellRenderer;
					var titleCellStyleUpdate = renderContext.rendererProvider.TitleCellStyleUpdate;
					var percentWidthCount = 0;

					var visibleColumns = [];
					renderContext.visibleColumns = visibleColumns;
					renderContext.hasResizableColumnVisible = false;

					angular.forEach(columns, function(column) {

						column.logicalIndex = index;
						column.visibleIndex = -1;
						column.columnId = "cm_column_" + (anonymousId++);

						if (column.scope) {
							if (scopeColLogicalIndex >= 0) {
								column.scope = false;
							} else {
								scopeColLogicalIndex = index;
							}
						}

						if (column.visible) {
							var cellElement = cc.createElement(ul, "li", {
								id: "cm_tcell_" + (anonymousId++),
								$cm_columnIndex: index,
								role: "columnheader"
							});
							column.titleElement = cellElement[0];
							column.visibleIndex = visibleColumns.length;
							cellElement.data("cm_column", column);

							titleCellStyleUpdate(cellElement, renderContext);

							titleCellRenderer(cellElement, renderContext, column, index);

							visibleColumns.push(column);

							if (column.$scope.resizeable) {
								renderContext.hasResizableColumnVisible = true;
							}
						}

						index++;
					});

					if (scopeColLogicalIndex < 0 && columns[0]) {
						columns[0].scope = true;
					}

					var cellElement = cc.createElement(ul, "li", {
						className: [ "cm_dataGrid_tcell", "cm_dataGrid_tcell_right" ],
						"aria-hidden": true
					});
					cc.createElement(cellElement, "span");
					titleCellRenderer(cellElement, renderContext);
					renderContext.lastTitleCellElement = cellElement[0];

					return viewPort;
				},

				TitleStyleUpdate: function(element, renderContext) {
					return cm.MixElementClasses(element, [ "cm_dataGrid_title" ]);
				},

				TitleCellRenderer: function(element, renderContext, column) {
					if (element[0]) {
						element = element[0];
					}
					var titleCell = element;

					var prevColumn = null;

					if (column) {
						var parent = titleCell;

						var button = cc.createElement(parent, "button", {
							className: "cm_dataGrid_tbutton",
							tabIndex: renderContext.tabIndex
						});
						column.buttonElement = button[0];
						parent = button;

						var sorter = column.$scope.sorter;
						if (sorter) {
							var cursor = cc.createElement(titleCell, "div", {
								className: "cm_dataGrid_tcursor"
							});

							titleCell._sortable = true;
						}

						var title = column.$scope.title;

						var label = cc.createElement(parent, "label", {
							className: "cm_dataGrid_tlabel",
							textNode: (title ? title : "")
						});

						column.labelElement = label[0];

						column.$scope.$watch("title", function(newValue) {
							label.text(newValue ? newValue : "");
						});

						var hasParams = false;
						if (column.$scope.filters || true) {
							var parameters = cc.createElement(titleCell, "button", {
								className: "cm_dataGrid_tparams",
								tabIndex: -1,
								id: "cm_tparams_" + (anonymousId++)
							});
							column.parametersElement = parameters[0];

							cc.createElement(parameters, "div", {
								className: "cm_dataGrid_tpArrow"
							});

							hasParams = true;

							titleCell._filtreable = true;
						}

						var prevIndex = column.visibleIndex - 1;
						if (prevIndex >= 0) {
							prevColumn = renderContext.visibleColumns[prevIndex];
						}
					} else {
						// Find the last visible column
						prevColumn = renderContext.visibleColumns[renderContext.visibleColumns.length - 1];
					}

					var sizer = cc.createElement(titleCell, "div", {
						className: "cm_dataGrid_tsizer " + ((hasParams) ? "cm_dataGrid_tsizerHP" : ""),
						id: "cm_tsizer_" + (anonymousId++),
					});

					var sizerElement = sizer[0];
					if (column) {
						column.sizerElement = sizerElement;
					} else {
						renderContext.lastSizerElement = sizerElement;
					}

					if (!prevColumn || !cc.toBoolean(prevColumn.$scope.resizeable)) {
						sizerElement.style.display = "none";
					}
				},

				TitleCellStyleUpdate: function(element, renderContext) {
					if (element[0]) {
						element = element[0];
					}
					var titleCell = element;
					var index = titleCell.cm_columnIndex;

					var column = renderContext.columns[index];

					var constantClasses = null;
					var align = angular.isString(column.titleAlign) ? column.titleAlign : column.cellAlign;
					if (align) {
						constantClasses = [ "cm_dataGrid_talign_" + align ];
					}

					return cm.MixElementClasses(element, [ "cm_dataGrid_tcell" /*
																																			 * ,
																																			 * "cm_dataGrid_tcell_" +
																																			 * index
																																			 */], constantClasses);
				},

				TitleLayout: function(container, renderContext, width) {
					if (renderContext._hasData && !renderContext._naturalWidths) {
						var ret = this.ComputeColumnsNaturalWidths(renderContext);
						if (ret === false) {
							return $timeout(function() {
								return renderContext.rendererProvider.TitleLayout(container, renderContext, width);
							}, 10, false);
						}
					}

					var leftWidth = width;
					var totalNatural = 0;
					var countPercent = 0;
					var percentColumns = [];

					if (renderContext.hasResizableColumnVisible) {
						leftWidth -= 6;
					}

					angular.forEach(renderContext.visibleColumns, function(column) {

						var rowIndentPx = !column.visibleIndex && (renderContext.rowIndent * cm_dataGrid_rowIndentPx);

						var minWidth = column.minWidth || 0;
						if (!minWidth || minWidth < (MIN_COLUMN_WIDTH + rowIndentPx)) {
							minWidth = MIN_COLUMN_WIDTH + rowIndentPx;
						}
						column.computedMinWidth = minWidth;

						var specifiedWidthPx = column.specifiedWidthPx;
						if (specifiedWidthPx !== undefined && specifiedWidthPx > 0) {
							leftWidth -= specifiedWidthPx;
							column.width = specifiedWidthPx;
							column.widthType = "specified";
							return;
						}

						var specifiedWidthPercent = column.specifiedWidthPercent;
						if (specifiedWidthPercent !== undefined && specifiedWidthPercent > 0) {
							countPercent++;
							column.widthType = "percent";
							column.layoutFinished = undefined;

							column.width = minWidth;
							leftWidth -= minWidth;
							if (column.naturalWidth > minWidth) {
								totalNatural += column.naturalWidth - minWidth;
							}

							percentColumns.push(column);
							return;
						}

						var nw = column.naturalWidth || 0;

						if (nw < column.computedMinWidth) {
							nw = column.computedMinWidth;
						}

						if (column.maxWidth && nw > column.maxWidth) {
							nw = column.maxWidth;
						}

						column.width = nw
						leftWidth -= nw;
						column.widthType = "natural";
					});

					if (countPercent) {
						var modified = true;

						if (false) {
							if (totalNatural > 0 && totalNatural <= leftWidth) {
								angular.forEach(percentColumns, function(column) {
									var d = column.naturalWidth - column.width;
									if (d > 0) {
										column.width += d;
										leftWidth -= d;
									}
								});
							}
						}

						// On répartit ce qu'il reste
						for (; modified && leftWidth >= 1;) {

							var totalPercent = 0;
							angular.forEach(percentColumns, function(column) {
								if (column.layoutFinished) {
									return;
								}

								totalPercent += column.specifiedWidthPercent;
							});

							var lw = leftWidth;

							angular.forEach(percentColumns, function(column) {
								if (column.layoutFinished) {
									return;
								}

								var colWidth = lw * (column.specifiedWidthPercent / totalPercent);

								if (colWidth > leftWidth) {
									colWidth = leftWidth;
								}

								var nw = column.width + colWidth;
								if (column.minWidth && nw < column.minWidth) {
									nw = column.minWidth;
								}
								if (column.maxWidth && nw > column.maxWidth) {
									nw = column.maxWidth;
								}

								if (nw == column.width) {
									column.layoutFinished = true;
									return;
								}

								leftWidth -= (nw - column.width);
								column.width = nw;
								modified = true;
							});
						}

					} else if (renderContext.fillWidth) {
						// On repartit les naturals
					}
				},

				TitleCellLayout: function(container, renderContext) {
				},

				MoveColumnTitle: function(column, renderContext, beforeColumn) {

					var title = column.titleElement;
					var beforeTitle = beforeColumn && beforeColumn.titleElement;
					if (!beforeTitle) {
						beforeTitle = renderContext._lastVisibleColumn.titleElement.nextSibling;
					}

					var parent = title.parentNode;
					parent.removeChild(title);
					parent.insertBefore(title, beforeTitle);

					var visibleColumns = renderContext.visibleColumns;
					var i = 0;
					for (; i < visibleColumns.length; i++) {
						var sizerElement = visibleColumns[i].sizerElement;

						var resizeable = (i && cc.toBoolean(visibleColumns[i - 1].$scope.resizeable));
						sizerElement.style.display = (resizeable) ? "block" : "none";
					}

					if (renderContext.lastSizerElement) {
						var resizeable = cc.toBoolean(visibleColumns[i - 1].$scope.resizeable);

						renderContext.lastSizerElement.style.display = (resizeable) ? "block" : "none";
					}
				},

				BeginMovingTitleCell: function(column, renderContext, event, dx, layerX) {
					var titleBar = renderContext.titleBarElement;
					var bcr = titleBar.getBoundingClientRect();
					var style = titleBar.style;
					style.height = bcr.height + "px";

					angular.forEach(renderContext.visibleColumns, function(column) {
						var titleElement = column.titleElement;
						// bcr = titleElement.getBoundingClientRect();

						column._movingLeft = titleElement.offsetLeft;
					});
					var ltcLeft = renderContext.lastTitleCellElement.offsetLeft;

					column.titleElement.style.zIndex = "1000";
					column.titleElement.style.backgroundColor = "transparent";

					angular.forEach(renderContext.visibleColumns, function(column) {
						var titleElement = column.titleElement;

						var style = titleElement.style;
						style.left = column._movingLeft + "px";
						style.position = "absolute";
					});
					style = renderContext.lastTitleCellElement.style;
					style.left = ltcLeft + "px";
					style.height = bcr.height + "px";
					style.position = "absolute";
				},
				MovingTitleCell: function(column, renderContext, event, dx, layerX) {
					var npos = column._movingLeft + dx;

					column.titleElement.style.left = npos + "px";

					var mx = npos + layerX;

					// console.log("mx=" + mx + " npos=" + npos + " layerX=" + layerX);

					renderContext._movingOverColumnIndex = undefined;

					angular.forEach(renderContext.visibleColumns, function(col) {
						var titleElement = col.titleElement;
						if (titleElement.id == column.titleElement.id) {
							return;
						}

						var left = col._movingLeft;

						if (mx < col._movingLeft + col.width) {
							if (col._movingLeft < column._movingLeft) {
								left += column.width;
							}
						}
						if (mx >= col._movingLeft) {
							if (col._movingLeft > column._movingLeft) {
								left -= column.width;
							}

							if (mx < col._movingLeft + col.width) {
								renderContext._movingOverColumnIndex = col.visibleIndex;
							}
						}
						titleElement.style.left = left + "px";
						titleElement.style.transition = "300ms ease-in-out";
					});
				},

				EndMovingTitleCell: function(column, renderContext, event) {

					var overColumnIndex = renderContext._movingOverColumnIndex;
					renderContext._movingOverColumn = undefined;

					column.titleElement.style.zIndex = "";
					column.titleElement.style.backgroundColor = "";

					angular.forEach(renderContext.visibleColumns, function(column) {
						var titleElement = column.titleElement;

						var style = titleElement.style;
						style.left = "";
						style.position = "";
						style.transition = "";

						column._movingLeft = undefined;
					});

					var style = renderContext.lastTitleCellElement.style;
					style.left = "";
					style.height = "";
					style.position = "";

					var titleBar = renderContext.titleBarElement;
					style = titleBar.style;
					style.height = "";
					style.width = "";

					return overColumnIndex;
				},
			};

		} ]);
})(window, window.angular);