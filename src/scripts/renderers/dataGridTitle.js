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

	var MIN_COLUMN_WIDTH = 32;
	var MIN_SORT_PARAMETERS_COLUMN_WIDTH = 90;

	var module = angular.module("camelia.renderers.grid");

	module.factory("camelia.renderers.grid.title", [ "$log",
		"$timeout",
		"camelia.core",
		"camelia.cmTypes",
		"cm_grid_rowIndentPx",
		"cm_grid_sizerPx",
		"camelia.i18n.Grid",
		function($log, $timeout, cc, cm, cm_dataGrid_rowIndentPx, cm_grid_sizerPx, i18n) {

			var anonymousId = 0;

			return {

				titleRenderer: function(parent) {

					var viewPort = cc.createElement(parent, "div", {
						id: "cm_title_" + (anonymousId++),
						className: "cm_dataGrid_title"
					});
					this.titleViewPort = viewPort[0];

					var ul = cc.createElement(viewPort, "ul", {
						className: "cm_dataGrid_ttitle"
					});
					this.titleBarElement = ul[0];

					this.titleStyleUpdate(viewPort);

					var columns = this.columns;
					var index = 0;
					var visibleIndex = 0;
					var scopeColLogicalIndex = -1;
					var percentWidthCount = 0;

					var visibleColumns = [];
					this.visibleColumns = visibleColumns;
					this.hasResizableColumnVisible = false;

					var self = this;
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
								$cm_columnIndex: index
							});
							column.titleElement = cellElement[0];
							column.visibleIndex = visibleColumns.length;
							cellElement.data("cm_column", column);

							self.titleCellRenderer(cellElement, column, index);

							self.titleCellStyleUpdate(cellElement);

							visibleColumns.push(column);

							if (column.$scope.resizeable) {
								self.hasResizableColumnVisible = true;
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
					this.titleCellRenderer(cellElement);
					this.lastTitleCellElement = cellElement[0];

					return viewPort;
				},

				titleStyleUpdate: function(element) {
					return cm.MixElementClasses(element, [ "cm_dataGrid_title" ]);
				},

				titleCellRenderer: function(element, column) {
					if (element[0]) {
						element = element[0];
					}
					var titleCell = element;

					var prevColumn = null;
					var hasParams = false;

					if (column) {
						var idx = anonymousId++;
						var parent = titleCell;

						var button = cc.createElement(parent, "button", {
							// id: "cm_tbut_" + idx,
							className: "cm_dataGrid_tbutton",
							tabIndex: this.tabIndex,
							role: "columnheader"
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
							id: "cm_tlab_" + idx,
							className: "cm_dataGrid_tlabel",
						// textNode: (title ? title : "")
						});

						column.labelElement = label[0];

						var self = this;
						column.$scope.$watch("title", function(newValue) {
							label.text(newValue ? newValue : "");

							self.titleAriaMessages(element, column, true);
						});

						if (column._criterias && column._criterias.length) {
							var parameters = cc.createElement(titleCell, "button", {
								className: "cm_dataGrid_tparams",
								tabIndex: -1,
								"aria-hidden": true,
								id: "cm_tparams_" + (anonymousId++)
							});
							column.parametersElement = parameters[0];

							button.attr("aria-expanded", false);

							cc.createElement(parameters, "div", {
								className: "cm_dataGrid_tpArrow"
							});

							cc.createElement(parameters, "div", {
								className: "cm_dataGrid_tpFiltred"
							});

							hasParams = true;

							titleCell._filtreable = true;
						}

						var prevIndex = column.visibleIndex - 1;
						if (prevIndex >= 0) {
							prevColumn = this.visibleColumns[prevIndex];
						}
					} else {
						// Find the last visible column
						prevColumn = this.visibleColumns[this.visibleColumns.length - 1];
					}

					var sizer = cc.createElement(titleCell, "div", {
						className: "cm_dataGrid_tsizer " + ((hasParams) ? "cm_dataGrid_tsizerHP" : ""),
						id: "cm_tsizer_" + (anonymousId++),
					});

					var sizerElement = sizer[0];
					if (column) {
						column.sizerElement = sizerElement;
					} else {
						this.lastSizerElement = sizerElement;
					}

					if (!prevColumn || !cc.toBoolean(prevColumn.$scope.resizeable)) {
						sizerElement.style.display = "none";
					}
				},

				titleCellStyleUpdate: function(element) {
					if (element[0]) {
						element = element[0];
					}
					var titleCell = element;
					var index = titleCell.cm_columnIndex;

					var column = this.columns[index];

					this.titleAriaMessages(element, column);

					var constantClasses = null;
					var align = angular.isString(column.titleAlign) ? column.titleAlign : column.cellAlign;
					if (align) {
						constantClasses = [ "cm_dataGrid_talign_" + align ];
					}

					return cm.MixElementClasses(element, [ "cm_dataGrid_tcell" ], constantClasses);
				},

				titleAriaMessages: function(element, column, reset) {

					var newAriaSorter = 0;
					var messageSorter = null;
					if (element._sortable) {
						newAriaSorter |= 0x01;
						messageSorter = "sortableColumn";

						if (element._ascending) {
							newAriaSorter |= 0x02;
							messageSorter = "sortAscending";

						} else if (element._descending) {
							newAriaSorter |= 0x04;
							messageSorter = "sortDescending";
						}
					}
					if (reset || column._ariaSorter != newAriaSorter) {
						column._ariaSorter = newAriaSorter;

						cc.setAudioDescription(column.buttonElement, messageSorter && cc.lang(i18n, messageSorter), "sorter");
					}

					var newAriaFiltred = 0;
					var messageFiltred = null;
					if (element._filtreable) {
						newAriaFiltred |= 0x01;
						messageFiltred = "filtreableColumn";

						if (element._filtred) {
							newAriaSorter |= 0x02;
							messageFiltred = "filtredColumn";
						}
					}
					if (reset || column._ariaFiltred != newAriaFiltred) {
						column._ariaFiltred = newAriaFiltred;

						cc.setAudioDescription(column.buttonElement, messageFiltred && cc.lang(i18n, messageFiltred), "filtred");
					}

				},

				titleLayout: function(container, width) {
					var self = this;

					if (this._hasData() && !this._naturalWidths) {
						var ret = this.computeColumnsNaturalWidths();
						if (ret === false) {
							return $timeout(function() {
								return self.titleLayout(container, width);
							}, 10, false);
						}
					}

					var leftWidth = width;
					var totalNatural = 0;
					var countPercent = 0;
					var percentColumns = [];
					var rowIndent = this.rowIndent;

					if (this.hasResizableColumnVisible) {
						leftWidth -= cm_grid_sizerPx;
					}

					angular.forEach(this.visibleColumns, function(column) {

						var rowIndentPx = !column.visibleIndex && (rowIndent * cm_dataGrid_rowIndentPx);

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

						column.width = nw;
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

					} else if (this.fillWidth) {
						// On repartit les naturals
					}
				},

				titleCellLayout: function(container) {
				},

				moveColumnTitle: function(column, beforeColumn) {

					var title = column.titleElement;
					var beforeTitle = beforeColumn && beforeColumn.titleElement;
					if (!beforeTitle) {
						beforeTitle = this._lastVisibleColumn.titleElement.nextSibling;
					}

					var parent = title.parentNode;
					parent.removeChild(title);
					parent.insertBefore(title, beforeTitle);

					var visibleColumns = this.visibleColumns;
					var i = 0;
					for (; i < visibleColumns.length; i++) {
						var sizerElement = visibleColumns[i].sizerElement;

						var resizeable = (i && cc.toBoolean(visibleColumns[i - 1].$scope.resizeable));
						sizerElement.style.display = (resizeable) ? "block" : "none";
					}

					if (this.lastSizerElement) {
						var resizeable = cc.toBoolean(visibleColumns[i - 1].$scope.resizeable);

						this.lastSizerElement.style.display = (resizeable) ? "block" : "none";
					}
				},

				beginMovingTitleCell: function(column, event, dx, layerX) {
					var titleBar = this.titleBarElement;
					var bcr = titleBar.getBoundingClientRect();
					var style = titleBar.style;
					style.height = bcr.height + "px";

					angular.forEach(this.visibleColumns, function(column) {
						var titleElement = column.titleElement;
						// bcr = titleElement.getBoundingClientRect();

						column._movingLeft = titleElement.offsetLeft;
					});
					var ltcLeft = this.lastTitleCellElement.offsetLeft;

					column.titleElement.style.zIndex = "1000";
					column.titleElement.style.backgroundColor = "transparent";

					angular.forEach(this.visibleColumns, function(column) {
						var titleElement = column.titleElement;

						var style = titleElement.style;
						style.left = column._movingLeft + "px";
						style.position = "absolute";
					});
					style = this.lastTitleCellElement.style;
					style.left = ltcLeft + "px";
					style.height = bcr.height + "px";
					style.position = "absolute";
				},
				movingTitleCell: function(column, event, dx, layerX) {
					var npos = column._movingLeft + dx;

					column.titleElement.style.left = npos + "px";

					var mx = npos + layerX;

					// console.log("mx=" + mx + " npos=" + npos + " layerX=" + layerX);

					this._movingOverColumnIndex = undefined;

					var self = this;
					angular.forEach(this.visibleColumns, function(col) {
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
								self._movingOverColumnIndex = col.visibleIndex;
							}
						}
						titleElement.style.left = left + "px";
						titleElement.style.transition = "300ms ease-in-out";
					});
				},

				endMovingTitleCell: function(column, event) {

					var overColumnIndex = this._movingOverColumnIndex;
					this._movingOverColumn = undefined;

					column.titleElement.style.zIndex = "";
					column.titleElement.style.backgroundColor = "";

					angular.forEach(this.visibleColumns, function(column) {
						var titleElement = column.titleElement;

						var style = titleElement.style;
						style.left = "";
						style.position = "";
						style.transition = "";

						column._movingLeft = undefined;
					});

					var style = this.lastTitleCellElement.style;
					style.left = "";
					style.height = "";
					style.position = "";

					var titleBar = this.titleBarElement;
					style = titleBar.style;
					style.height = "";
					style.width = "";

					return overColumnIndex;
				}
			};

		} ]);
})(window, window.angular);