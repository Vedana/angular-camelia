(function(window, angular, undefined) {
	"use strict";

	var module = angular.module("camelia.renderers.grid");

	var ROW_OR_GROUP = {
		row: true,
		group: true
	};

	var CELL_OR_GROUPTITLE = {
		cell: true,
		groupTitle: true
	};

	var DOUBLE_CLICK_DELAY_MS = 300;

	module.factory("camelia.renderers.grid.core", [ "$log",
		"$q",
		"$window",
		"$timeout",
		"$exceptionHandler",
		"camelia.core",
		"camelia.cmTypes",
		"cm_grid_className",
		"cm_grid_rowIndentPx",
		"camelia.Key",
		"camelia.SelectionProvider",
		"camelia.CursorProvider",
		"camelia.renderers.grid.utils",
		function($log, $q, $window, $timeout, $exceptionHandler, cc, cm, cm_dataGrid_className, cm_dataGrid_rowIndentPx,
				Key, SelectionProvider, CursorProvider, cu) {

			function SearchElements(node) {
				var ret = cm.SearchElements({
					tcell: null,
					title: null,
					cell: null,
					row: null,
					table: null,
					grid: null,
					group: null,
					groupExpand: null
				}, "grid", node);

				return ret;
			}

			function OnResize(renderContext) {
				$log.debug("On resize ...");
				return function resizeHandler(event) {
					try {
						renderContext.rendererProvider.GridLayout(renderContext);
					} catch (x) {
						$exceptionHandler(x, "Exception while resizing");
					}
				};
			}

			function OnMouseOver(renderContext) {
				return function(event) {
					var target = event.target;

					if (renderContext.columnResizing || renderContext.titleCellMoving) {
						return;
					}

					var elements = SearchElements(target);
					cm.SwitchOnState(renderContext, elements, "over");
				};
			}

			function OnMouseOut(renderContext) {
				return function(event) {
					var target = event.relatedTarget;

					var elements = SearchElements(target);
					cm.SwitchOffState(renderContext, elements, "over");
				};
			}

			function OnFocus(renderContext) {
				return function(event) {
					var target = event.target;

					cc.log("OnFocus ", target);

					var elements = SearchElements(target);
					cm.SwitchOnState(renderContext, elements, "focus", function(elements) {
						var cell = elements.cell || elements.groupTitle;
						if (cell) {
							SetCursor(cell, renderContext);
						}
					});
				};
			}

			function OnBlur(renderContext) {
				return function(event) {
					var target = event.relatedTarget;

					// cc.log("BLUR ", target);

					var elements = SearchElements(target);
					cm.SwitchOffState(renderContext, elements, "focus");
				};
			}

			function _ComputeRowRangeFromCursor(renderContext, rowValue, cursorRowValue) {

				var mark1;
				var mark2;

				var ret = [];

				var r = renderContext.tableTBody.firstChild;
				for (; r; r = r.nextSibling) {
					if (r.nodeType != 1) {
						continue;
					}

					var ctype = cm.GetCMType(r);
					if (!ROW_OR_GROUP[ctype]) {
						continue;
					}

					var rValue = angular.element(r).data("cm_value");

					if (!mark1 && rValue === cursorRowValue) {
						mark1 = true;
					}
					if (!mark2 && rValue === rowValue) {
						mark2 = true;
					}

					if (mark1 || mark2) {
						ret.push(rValue);
					}

					if (mark1 && mark2) {
						return ret;
					}
				}

				return null;
			}

			function OnDoubleClick(renderContext) {
				return function(event) {
					var target = event.target;
					var elements = SearchElements(target);

					// cc.log("Double click on ", target, " elements=", elements);

					if (elements.group) {
						var promise = renderContext._groupSimpleClickPromise;
						if (promise) {
							renderContext._groupSimpleClickPromise = undefined;

							$timeout.cancel(promise);
						}

						ToggleGroupExpand(elements.group, renderContext);
						return;
					}

					EmitClick(renderContext, elements, "RowDoubleClick", event);
				}
			}

			function EmitClick(renderContext, elements, eventName, event) {

				var row = elements.row;
				if (!row) {
					return;
				}
				var rowValue = angular.element(row).data("cm_value");

				var params = {
					grid: renderContext.grid,
					event: event,
					row: row,
					rowValue: rowValue
				};

				var cell = elements.cell;
				if (cell) {
					params.cell = cell;

					var logicalIndex = cell.cm_lindex;
					params.column = renderContext.columns[logicalIndex];
				}

				renderContext.$scope.$emit(eventName, params);
			}

			function OnSimpleClick(renderContext) {
				return function(event) {
					var target = event.target;

					var elements = SearchElements(target);

					// cc.log("Simple click on ", target, " elements=", elements);

					EmitClick(renderContext, elements, "RowClick", event);
				}
			}

			function OnMouseDown(renderContext) {
				return function(event) {
					var target = event.target;

					// cc.log("Mouse down on ", target);

					var elements = SearchElements(target);
					cm.SwitchOnState(renderContext, elements, "mouseDown", function(elements) {

						var tsizer = elements.tsizer;
						if (tsizer) {
							var targetColumn;

							if (elements.tcell) {
								var c = angular.element(elements.tcell).data("cm_column");
								var vi = c.visibleIndex;

								targetColumn = renderContext.visibleColumns[vi - 1];

							} else {
								targetColumn = renderContext.visibleColumns[renderContext.visibleColumns.length - 1];
							}

							OnResizeColumn(targetColumn, renderContext, tsizer, event);

							// event.stopPropagation();
							return false;
						}

						var groupExpand = elements.groupExpand;
						if (groupExpand) {
							ToggleGroupExpand(elements.group, renderContext);

							return false;
						}

						var row = elements.row;
						if (row) {
							cu.RegisterElement(renderContext, row);

							RegisterSelectionEvent(event, renderContext, false);
						}

						var tcell = elements.tcell;
						if (tcell) {
							OnTitleCellMouseDown(renderContext, event, tcell);
							event.stopPropagation();
							return false;
						}

						if (elements.group) {
							var promise = renderContext._groupSimpleClickPromise;
							if (promise) {
								renderContext._groupSimpleClickPromise = undefined;
								$timeout.cancel(promise);
							}

							renderContext._groupSimpleClickPromise = $timeout(function() {
								renderContext._groupSimpleClickPromise = undefined;

								cu.RegisterElement(renderContext, elements.group);

								RegisterSelectionEvent(event, renderContext, false);

								if (elements.groupTitle) {
									elements.groupTitle.focus();
								}
							}, DOUBLE_CLICK_DELAY_MS, false);

							event.stopPropagation();
							event.preventDefault();
							return false;
						}

						event.stopPropagation();
						return false;
					});
				};
			}

			function ToggleGroupExpand(element, renderContext) {
				var groupElement = angular.element(element);
				var group = groupElement.data("cm_value");

				var collapsedProvider = renderContext.selectedGroupProvider.getCollapsedProvider();

				var collapsed = !collapsedProvider.contains(group);

				if (collapsed) {
					collapsedProvider.add(group);

				} else {
					collapsedProvider.remove(group);
				}

			}

			function OnTitleCellMouseDown(renderContext, event, tcell) {
				var clientX = event.clientX;
				var column = angular.element(tcell).data("cm_column");

				OnTitleCellClear(renderContext);

				renderContext.titleCellMoving = true;
				renderContext.titleCellMovingClientX = clientX;
				renderContext.titleCellMovingLayerX = event.layerX;
				console.log("Target=" + event.target.tagName + "/" + event.target.id + " " + event.layerX);

				renderContext.titleCellMouseUpListener = function(event) {
					return OnTitleCellMouseUp(tcell, renderContext, event, column);
				};

				renderContext.titleCellMouseMoveListener = function(event) {
					return OnTitleCellMouseMoving(tcell, renderContext, event, column);
				};

				document.addEventListener("mousemove", renderContext.titleCellMouseMoveListener, true);
				document.addEventListener("mouseup", renderContext.titleCellMouseUpListener, true);
			}

			function OnTitleCellMouseMoving(tcell, renderContext, event, column) {
				var dx = event.clientX - renderContext.titleCellMovingClientX;

				if (dx < -20 || dx > 20) {
					if (!renderContext.titleCellColumnMoving) {
						renderContext.titleCellColumnMoving = column;

						// Move cell title !
						renderContext.rendererProvider.BeginMovingTitleCell(column, renderContext, event, dx,
								renderContext.titleCellMovingLayerX);
					}
				}
				if (renderContext.titleCellColumnMoving) {
					renderContext.rendererProvider.MovingTitleCell(column, renderContext, event, dx,
							renderContext.titleCellMovingLayerX);
				}
			}

			function OnTitleCellMouseUp(tcell, renderContext, event, column) {

				if (!renderContext.titleCellColumnMoving) {
					var elements = SearchElements(event.target);

					if (elements.tcell && elements.tcell.id == tcell.id) {
						if (tcell._sortable) {
							ToggleColumnSort(column, renderContext, event);
						}
					}
				} else {
					// Redraw the table body

					var dx = event.clientX - renderContext.titleCellMovingClientX;

					var targetIndex = renderContext.rendererProvider.EndMovingTitleCell(column, renderContext, event, dx);
					if (angular.isNumber(targetIndex)) {
						MoveColumn(column, renderContext, targetIndex);
					}
				}

				OnTitleCellClear(renderContext);

				cm.ClearState(renderContext, "mouseDown");
				event.stopPropagation();
				return false;
			}

			function OnTitleCellClear(renderContext) {

				if (renderContext.titleCellColumnMoving) {
					// Move cell title !
					renderContext.rendererProvider.EndMovingTitleCell(renderContext.titleCellColumnMoving, renderContext);

					renderContext.titleCellColumnMoving = undefined;
				}

				if (renderContext.titleCellMouseMoveListener) {
					document.removeEventListener("mousemove", renderContext.titleCellMouseMoveListener, true);
					renderContext.titleCellMouseMoveListener = undefined;
				}

				if (renderContext.titleCellMouseUpListener) {
					document.removeEventListener("mouseup", renderContext.titleCellMouseUpListener, true);
					renderContext.titleCellMouseUpListener = undefined;
				}

				renderContext.titleCellMoving = undefined;
				renderContext.titleCellColumnMoving = undefined;
			}

			function OnMouseUp(renderContext) {
				return function(event) {
					var elements = SearchElements();
					cm.ClearState(renderContext, "mouseDown", elements, function(elements) {
					});
				};
			}

			function OnKeyPress(renderContext) {
				return function(event) {
					var target = event.target;
					var elements = SearchElements(target);

					// cc.log("KeyPress ", target, " event=", event, " elements=",
					// elements);

					if (elements.tcell) {
						// Le titre
						return OnKeyPress_Title(elements.tcell, renderContext, event);
					}

					if (elements.cell) {
						// Cellule
						return OnKeyPress_Cell(elements.cell, renderContext, event);
					}

					if (elements.groupTitle) {
						// Cellule
						return OnKeyPress_Cell(elements.groupTitle, renderContext, event, elements.group);
					}
				};
			}

			function OnKeyPress_Title(tcell, renderContext, event) {
				var next = tcell;
				var cancel = false;
				var column = angular.element(tcell).data("cm_column");

				switch (event.keyCode) {
				case Key.VK_LEFT:
					cancel = true;

					if (event.ctrlKey) {
						// Move column !
						if (column.visibleIndex) {
							MoveColumn(column, renderContext, column.visibleIndex - 1);
						}
					} else {
						next = cm.GetPreviousType(tcell.previousSibling, "tcell");
						if (!next) {
							next = cm.GetPreviousType(tcell.parentNode.lastChild, "tcell");
						}
					}
					break;

				case Key.VK_RIGHT:
					cancel = true;

					if (event.ctrlKey) {
						// Move column !
						if (column.visibleIndex < renderContext.visibleColumns.length - 1) {
							MoveColumn(column, renderContext, column.visibleIndex + 1);
						}
					} else {
						next = cm.GetNextType(tcell.nextSibling, "tcell");
						if (!next) {
							next = cm.GetNextType(tcell.parentNode.firstChild, "tcell");
						}
					}
					break;

				case Key.VK_HOME:
					cancel = true;
					next = cm.GetNextType(tcell.parentNode.firstChild, "tcell");
					break;

				case Key.VK_END:
					cancel = true;
					next = cm.GetPreviousType(tcell.parentNode.lastChild, "tcell");
					break;

				case Key.VK_SPACE:
					cancel = true;

					ToggleColumnSort(column, renderContext, event);
					break;
				}

				if (next && next.id != tcell.id) {
					var column = angular.element(next).data("cm_column");
					column.buttonElement.focus();
				}

				if (cancel) {
					event.stopPropagation();
					event.preventDefault();
				}
			}

			function OnKeyPress_Cell(cell, renderContext, event, groupElement) {
				var row = cell.parentNode;
				var columnLogicalIndex = cell.cm_lindex;
				var next = row;
				var cancel = false;
				var activate = false;
				var focusCell = false;
				var viewPort = renderContext.tableViewPort;

				var group;
				var collapsedProvider;
				if (groupElement) {
					group = angular.element(groupElement).data("cm_value");
					collapsedProvider = renderContext.selectedGroupProvider.getCollapsedProvider();
				}

				function prevPage() {
					if ((!next || next.id == row.id) && renderContext.dataGrid.rows > 0) {
						var nextFirst = renderContext.dataGrid.first - renderContext.dataGrid.rows;
						if (nextFirst < 0) {
							nextFirst = 0;
						}
						if (renderContext.dataGrid.first > nextFirst) {
							renderContext.dataGrid.setFirst(nextFirst);
						}

						next = null;
					}
				}

				function nextPage() {
					if ((!next || next.id == row.id) && renderContext.dataGrid.rows > 0) {
						var nextFirst = renderContext.dataGrid.first + renderContext.dataGrid.rows;
						if (renderContext.dataGrid.rowCount < 0 || nextFirst < renderContext.dataGrid.rowCount) {
							renderContext.dataGrid.setFirst(nextFirst);
						}

						next = null;
					}
				}

				switch (event.keyCode) {
				case Key.VK_DOWN:
					cancel = true;
					next = cm.GetNextType(row.nextSibling, ROW_OR_GROUP);
					nextPage();
					break;

				case Key.VK_PAGE_DOWN:
					cancel = true;
					next = cm.GetPreviousVisibleType(viewPort, row.parentNode.lastChild, ROW_OR_GROUP);
					if (next && next.id == row.id && (viewPort.scrollHeight > viewPort.offsetHeight)) {
						viewPort.scrollTop += viewPort.clientHeight - row.offsetHeight;

						next = cm.GetPreviousVisibleType(viewPort, row.parentNode.lastChild, ROW_OR_GROUP);
					}
					nextPage();
					break;

				case Key.VK_END:
					cancel = true;
					next = cm.GetPreviousType(row.parentNode.lastChild, ROW_OR_GROUP);
					nextPage();
					break;

				case Key.VK_UP:
					cancel = true;
					next = cm.GetPreviousType(row.previousSibling, ROW_OR_GROUP);
					prevPage();
					break;

				case Key.VK_PAGE_UP:
					cancel = true;
					next = cm.GetNextVisibleType(viewPort, row.parentNode.firstChild, ROW_OR_GROUP);
					if (next && next.id == row.id) {
						viewPort.scrollTop -= viewPort.clientHeight - row.offsetHeight;

						next = cm.GetNextVisibleType(viewPort, row.parentNode.firstChild, ROW_OR_GROUP);
					}
					prevPage();
					break;

				case Key.VK_HOME:
					cancel = true;
					next = cm.GetNextType(row.parentNode.firstChild, ROW_OR_GROUP);
					prevPage();
					break;

				case Key.VK_SPACE:
					cancel = true;
					activate = true;
					break;

				case Key.VK_RIGHT:
					cancel = true;
					if (groupElement) {
						if (collapsedProvider.contains(group)) {
							ToggleGroupExpand(groupElement, renderContext);
						}

					} else if (angular.isNumber(columnLogicalIndex)) {
						var column = renderContext.columns[columnLogicalIndex];

						var nextColumn = renderContext.visibleColumns[column.visibleIndex + 1];
						if (nextColumn) {
							columnLogicalIndex = nextColumn.logicalIndex;
							focusCell = true;
						}
					}

					break;

				case Key.VK_LEFT:
					cancel = true;
					if (groupElement) {
						if (!collapsedProvider.contains(group)) {
							ToggleGroupExpand(groupElement, renderContext);
						}

					} else if (angular.isNumber(columnLogicalIndex)) {
						var column = renderContext.columns[columnLogicalIndex];

						if (column.visibleIndex > 0) {
							var nextColumn = renderContext.visibleColumns[column.visibleIndex - 1];
							columnLogicalIndex = nextColumn.logicalIndex;

							focusCell = true;
						}
					}
					break;
				}

				if (activate) {
					var selectionStrategy = renderContext.selectionStrategy;
					if (selectionStrategy) {
						var rowValue = angular.element(next).data("cm_value");
						cu.RegisterElement(renderContext, next, rowValue);

						var cursorValue = rowValue;

						if (renderContext.groupProviders) {
							var groupElement = cu.GetElementFromValue(renderContext, cursorValue, "group");
							if (groupElement) {
								rowValue = angular.element(groupElement).data("cm_rowValues");
							}
						}

						selectionStrategy.select(renderContext.selectionProvider, rowValue, cursorValue, event, function(
								cursorRowId) {
							return _ComputeRowRangeFromCursor(renderContext, cursorValue, cursorRowId);
						}, true);
					}
				}

				if (next && next.id != row.id) {
					cu.RegisterElement(renderContext, next);

					focusCell = true;
				}

				if (focusCell) {
					var cell = cm.GetNextType(next.firstChild, CELL_OR_GROUPTITLE, function(c, type) {
						if (c.cm_lindex === undefined || columnLogicalIndex === undefined) {
							return true;
						}
						return c.cm_lindex == columnLogicalIndex;
					});

					if (cell) {
						RegisterSelectionEvent(event, renderContext);

						SetFocus(cell, renderContext, true);
					}
				}

				if (cancel) {
					event.stopPropagation();
					event.preventDefault();
				}
			}

			function OnCollapsedChanged(renderContext) {
				return function(event, params) {
					SwitchElementsFromEvent(params, renderContext, "group", "_collapsed", function(groupElement, group) {
						// Add the group to the collapse list, remove all rows of group
						renderContext.rendererProvider.RemoveRowsOfGroup(group, renderContext, groupElement);

					}, function(groupElement) {
						// Remove the group to the collapse list, show all rows of this
						// group

						var group = angular.element(groupElement).data("cm_value");

						renderContext.rendererProvider.AddRowsOfGroup(group, renderContext, groupElement);
					});
				};
			}

			function OnSelectionChanged(renderContext) {
				return function(event, params) {
					SwitchElementsFromEvent(params, renderContext, "row", "_selected");
				};
			}

			function SwitchElementsFromEvent(params, renderContext, type, propertyName, funcAdd, funcRemove) {
				var size = params.removed.length + params.added.length;
				var cache = (size > 1) ? {} : null;

				if (params.clearAll && !params.removed.length) {
					ForEachBodyElement(renderContext, type, function(element) {
						if (!element[propertyName]) {
							return;
						}
						element[propertyName] = undefined;
						cc.BubbleEvent(element, "cm_update");

						if (funcRemove) {
							funcRemove(element);
						}
					}, type);

				} else {
					angular.forEach(params.removed, function(rowValue) {
						var element = cu.GetElementFromValue(renderContext, rowValue, type, cache);
						if (!element || !element[propertyName]) {
							return;
						}

						element[propertyName] = undefined;
						cc.BubbleEvent(element, "cm_update");

						if (funcRemove) {
							funcRemove(element);
						}
					});
				}

				angular.forEach(params.added, function(rowValue) {
					var element = cu.GetElementFromValue(renderContext, rowValue, type, cache);
					if (!element || element[propertyName]) {
						return;
					}

					element[propertyName] = true;
					cc.BubbleEvent(element, "cm_update");

					if (funcAdd) {
						funcAdd(element, rowValue);
					}
				});
			}

			function OnResizeColumnMoving(column, renderContext, event) {
				var dx = event.clientX - renderContext.columnMoveClientX;

				var newWidth = renderContext.columnResizingWidth + dx;

				if (newWidth < column.computedMinWidth) {
					newWidth = column.computedMinWidth;
				}
				if (column.maxWidth && newWidth > column.maxWidth) {
					newWidth = column.maxWidth;
				}

				if (newWidth != column.width) {
					column.width = newWidth;
					column.specifiedWidthPx = newWidth + "px";
					AlignColumns(renderContext);
				}

				event.preventDefault();
				event.stopPropagation();
			}

			function OnResizeColumnMouseUp(column, renderContext, event) {
				console.log("On resize column mouse up");

				OnResizeColumnRelease(renderContext);
				renderContext.$scope.$emit("cm_dataGrid_resized", column);

				event.preventDefault();
				event.stopPropagation();
			}

			function OnResizeColumnRelease(renderContext) {
				console.log("On resize column release");

				if (renderContext.columnMouseMoveListener) {
					document.removeEventListener("mousemove", renderContext.columnMouseMoveListener, true);
					renderContext.columnMouseMoveListener = undefined;
				}

				if (renderContext.columnMouseUpListener) {
					document.removeEventListener("mouseup", renderContext.columnMouseUpListener, true);
					renderContext.columnMouseUpListener = undefined;
				}

				renderContext.columnResizing = undefined;
				renderContext.columnResizingWidth = undefined;
			}

			function OnResizeColumn(column, renderContext, tsizer, event) {
				console.log("On resize column " + column);

				// All Column sizes become specified
				if (!renderContext._allWidthSpecified) {
					renderContext._allWidthSpecified = true;

					angular.forEach(renderContext.visibleColumns, function(column) {
						column.specifiedWidthPx = column.width + "px";
					});
				}

				renderContext.$scope.$emit("cm_dataGrid_resizing", column);

				if (renderContext.columnResizing) {
					OnResizeColumnRelease(renderContext);
				}

				renderContext.columnMouseUpListener = function(event) {
					return OnResizeColumnMouseUp(column, renderContext, event);
				};

				renderContext.columnMouseMoveListener = function(event) {
					return OnResizeColumnMoving(column, renderContext, event);
				};

				document.addEventListener("mousemove", renderContext.columnMouseMoveListener, true);
				document.addEventListener("mouseup", renderContext.columnMouseUpListener, true);

				renderContext.columnResizing = true;
				renderContext.columnResizingWidth = column.width;
				renderContext.columnMoveClientX = event.clientX;

				event.preventDefault();
				event.stopPropagation();
			}

			function ToggleColumnSort(column, renderContext, event) {

				renderContext.$scope.$emit("cm_dataGrid_sorting");

				var old = renderContext.sorters;

				var updatedColumns = {};

				var ascending = true;
				if (old) {
					angular.forEach(old, function(sorter) {
						var scol = sorter.column;

						if (scol === column) {
							ascending = !sorter.ascending;
						}

						var element = scol.titleElement;
						if (element) {
							element._ascending = undefined;
							element._descending = undefined;
						}

						updatedColumns[scol.columnId] = scol;
					})
				}

				var sorters = [];
				renderContext.sorters = sorters;

				sorters.push({
					column: column,
					ascending: ascending
				});

				angular.forEach(sorters, function(sorter) {
					var column = sorter.column;
					var element = column.titleElement;
					var ascending = !!sorter.ascending;

					element._ascending = ascending;
					element._descending = !ascending;

					updatedColumns[column.columnId] = column;
				});

				angular.forEach(updatedColumns, function(column) {
					var element = column.titleElement;

					if (element) {
						cc.BubbleEvent(element, "cm_update");
					}
				});

				var promise = RefreshRows(renderContext);

				return promise.then(function() {
					renderContext.$scope.$emit("cm_dataGrid_sorted");
				});
			}

			function MonitorPositions(renderContext, func) {

				var oldFirst = renderContext.dataGrid.first;
				var oldRows = renderContext.dataGrid.rows;
				var oldRowCount = renderContext.dataGrid.rowCount;
				var oldMaxRows = renderContext.dataGrid.maxRows;

				var promise = func(renderContext);
				if (!cc.isPromise(promise)) {
					promise = $q.when(promise);
				}

				return promise.then(function() {

					var dataGrid = renderContext.dataGrid;
					var $scope = renderContext.$scope;

					var first = dataGrid.first;
					var rows = dataGrid.rows;
					var rowCount = dataGrid.rowCount;
					var maxRows = dataGrid.maxRows;
					var event = {
						first: first,
						rows: rows,
						rowCount: rowCount,
						maxRows: maxRows
					};
					var sendEvent = false;

					if (oldFirst != dataGrid.first) {
						event.firstChanged = true;
						sendEvent = true;

						$scope.$emit("firstChanged", dataGrid.first);
					}

					if (oldRows != dataGrid.rows) {
						event.rowsChanged = true;
						sendEvent = true;

						$scope.$emit("rowsChanged", dataGrid.rows);
					}

					if (oldRowCount != dataGrid.rowCount) {
						event.rowCountChanged = true;
						sendEvent = true;
						$scope.rowCount = rowCount;

						$scope.$emit("rowCountChanged", dataGrid.rowCount);
					}

					if (oldMaxRows != dataGrid.maxRows) {
						event.maxRowsChanged = true;
						sendEvent = true;
						$scope.maxRows = maxRows;

						$scope.$emit("maxRowsChanged", dataGrid.maxRows);
					}

					if (sendEvent) {
						$scope.$emit("positionsChanged", event);
					}
				});
			}

			function UpdateData(renderContext, resetPositions) {
				if (resetPositions) {
					renderContext.first = 0;
					renderContext.rowCount = -1;
					renderContext.maxRows = -1;
				}

				MonitorPositions(renderContext, function() {
					return RefreshRows(renderContext, true);

				}).then(function() {
					GridLayout(renderContext);
				});
			}

			/**
			 * @returns {Promise}
			 * @param {Object}
			 *          renderContext
			 */
			function RefreshRows(renderContext, updateColumnWidths) {
				var tbody = renderContext.tableTBody;
				var table = tbody.parentNode;
				if (!table) {
					// Big Problem !
					throw new Error("Tbody already dettached");
				}

				var ts;
				if (updateColumnWidths) {
					renderContext._naturalWidths = undefined;
					renderContext._containerSizeSetted = undefined;
					renderContext.gridWidth = -1;
					renderContext._hasData = false;

					if (renderContext.layoutState == "complete") {
						ts = renderContext.tableViewPort.style;
						ts.width = "auto";
						ts.height = "auto";
						ts.visibility = "hidden";

						AlignColumns(renderContext);
					}
				}

				var forceHeight = false;
				if (!table.style.height || table.style.height.indexOf("px") < 0) {
					forceHeight = true;

					var cr = table.getBoundingClientRect();
					table.style.height = cr.height + "px";
				}

				table.removeChild(tbody);
				angular.element(tbody).empty(); // clear Data informations

				var promise = renderContext.rendererProvider.TableRowsRenderer(tbody, renderContext);
				if (!cc.isPromise(promise)) {
					promise = $q.when(promise);
				}

				return promise.then(function() {
					if (forceHeight) {
						table.style.height = "auto";
					}
					table.appendChild(tbody);

					var container = renderContext.container;

					renderContext.rendererProvider.GridReady(container, renderContext, true);

					renderContext.$scope.$emit("cm_dataGrid_refreshed");
				});
			}

			function OnGridStyleUpdate(renderContext) {

				var _styleUpdateMapper = {
					grid: "GridStyleUpdate",
					table: "TableStyleUpdate",
					row: "RowStyleUpdate",
					cell: "CellStyleUpdate",
					title: "TitleStyleUpdate",
					tcell: "TitleCellStyleUpdate",
					group: "GroupStyleUpdate"
				};

				return function(event) {
					var target = event.relatedTarget;

					var type = cm.GetCMType(target);
					if (!type) {
						return;
					}

					var elt = angular.element(target);

					// cc.log("Update relatedTarget=", target, " type=" + type + " over="
					// + target._over + " mouseDown="+ target._mouseDown);

					var rp = renderContext.rendererProvider[_styleUpdateMapper[type]];
					if (rp) {
						rp(elt, renderContext);
						event.stopPropagation();
						return;
					}
				};
			}

			function MoveColumn(column, renderContext, targetIndex, giveFocus) {

				var visibleColumns = renderContext.visibleColumns;
				var beforeColumn = visibleColumns[targetIndex + ((targetIndex > column.visibleIndex) ? 1 : 0)];

				var visibleColumns = renderContext.visibleColumns;
				renderContext._lastVisibleColumn = visibleColumns[visibleColumns.length - 1];

				visibleColumns.splice(column.visibleIndex, 1);
				visibleColumns.splice(targetIndex, 0, column);

				var idx = 0;
				angular.forEach(visibleColumns, function(column) {
					column.beforeMovingVisibleIndex = column.visibleIndex;
					column.visibleIndex = idx++;
				});

				var titlePromise = renderContext.rendererProvider.MoveColumnTitle(column, renderContext, beforeColumn);
				if (!cc.isPromise(titlePromise)) {
					titlePromise = $q.when(titlePromise);
				}

				var self = this;
				titlePromise.then(function() {

					var tablePromise = renderContext.rendererProvider.MoveColumnTable(column, renderContext, beforeColumn);
					if (!cc.isPromise(tablePromise)) {
						tablePromise = $q.when(tablePromise);
					}

					tablePromise.then(function() {
						renderContext._lastVisibleColumn = undefined;

						if (!column.beforeMovingVisibleIndex || !column.visibleIndex) {
							AlignColumns(renderContext);
						}

						if (giveFocus !== false) {
							column.buttonElement.focus();
						}
					});
				});
			}

			function RegisterSelectionEvent(event, renderContext) {

				renderContext._selectionSourceEvent = event;
				$timeout(function() {
					renderContext._selectionSourceEvent = undefined;
				}, 10, false);
			}

			function GridRenderer(parent, renderContext) {
				renderContext.$scope.$emit("cm_dataGrid_rendering");

				var container = cc.createElement(parent, "div", {
					id: renderContext.dataGrid.id,
					$cm_type: "grid"
				});
				renderContext.container = container[0];

				renderContext.$scope.$watch("style", function(style) {
					style = style || "";
					container.attr("style", style);
				});

				renderContext.$scope.$watch("className", function() {
					renderContext.rendererProvider.GridStyleUpdate(container, renderContext);
				});

				var tabIndex = renderContext.$scope.tabIndex;
				if (!tabIndex || tabIndex < 0) {
					tabIndex = 0;
				}
				renderContext.tabIndex = tabIndex;
				renderContext.rowIndent = 0;

				SetupGroupProviders(renderContext);

				renderContext.cursorProvider.$on(CursorProvider.CURSOR_CHANGED, function(event, data) {

					var sourceEvent = renderContext._selectionSourceEvent;

					if (data.oldRow) {
						// BLUR event update the element
						var oldElement = cu.GetElementFromValue(renderContext, data.oldRow, ROW_OR_GROUP);
						if (oldElement && oldElement._cursor) {
							oldElement._cursor = undefined;
							cc.BubbleEvent(oldElement, "cm_update");
						}
					}
					if (data.row) {
						var element = cu.GetElementFromValue(renderContext, data.row, ROW_OR_GROUP);
						if (element && !element._cursor) {
							element._cursor = true;
							cc.BubbleEvent(element, "cm_update");
						}
					}

					var selectionProvider = renderContext.selectionProvider;
					if (!selectionProvider) {
						return;
					}

					var cursorValue = data.row;
					var rowValue = cursorValue;

					if (renderContext.groupProviders) {
						var groupElement = cu.GetElementFromValue(renderContext, cursorValue, "group");
						if (groupElement) {
							rowValue = angular.element(groupElement).data("cm_rowValues");
						}
					}

					selectionProvider.run(function() {

						renderContext.selectionStrategy.select(selectionProvider, rowValue, cursorValue, sourceEvent, function(
								cursorRowId) {
							return _ComputeRowRangeFromCursor(renderContext, cursorValue, cursorRowId);
						});
					});
				});

				container.on("mouseover", OnMouseOver(renderContext));

				container.on("mouseout", OnMouseOut(renderContext));

				container.on("mousedown", OnMouseDown(renderContext));

				container.on("dblclick", OnDoubleClick(renderContext));

				container.on("click", OnSimpleClick(renderContext));

				container.on("mouseup", OnMouseUp(renderContext));

				container.on("keydown", OnKeyPress(renderContext));
				// container.on("keypress", OnKeyPress(renderContext));

				renderContext._focusListener = OnFocus(renderContext);
				container[0].addEventListener("focus", renderContext._focusListener, true);

				renderContext._blurListener = OnBlur(renderContext);
				container[0].addEventListener("blur", renderContext._blurListener, true);

				renderContext.$scope.$on("$destroy", function() {
					var listener = renderContext._focusListener;
					if (listener) {
						renderContext._focusListener = undefined;
						container[0].removeEventListener("focus", listener, true);
					}

					listener = renderContext._blurListener;
					if (listener) {
						renderContext._blurListener = undefined;
						container[0].removeEventListener("blur", listener, true);
					}
				});

				container.on("cm_update", OnGridStyleUpdate(renderContext));

				renderContext.$scope.$emit("cm_dataGrid_title_rendering");

				var titlePromise = renderContext.rendererProvider.TitleRenderer(container, renderContext);
				if (!cc.isPromise(titlePromise)) {
					titlePromise = $q.when(titlePromise);
				}

				return titlePromise.then(function(title) {
					renderContext.$scope.$emit("cm_dataGrid_title_rendered");

					renderContext._title = title;

					renderContext.$scope.$emit("cm_dataGrid_body_rendering");

					MonitorPositions(renderContext, function() {

						var fragment = angular.element(document.createDocumentFragment());

						var bodyPromise = renderContext.rendererProvider.TableRenderer(fragment, renderContext);
						if (!cc.isPromise(bodyPromise)) {
							bodyPromise = $q.when(bodyPromise);
						}

						bodyPromise.then(function(body) {
							renderContext._body = body;

							container.append(fragment);

							renderContext.$scope.$emit("cm_dataGrid_body_rendered");

							var win = angular.element($window);

							var resizeHandler = OnResize(renderContext);
							win.on("resize", resizeHandler);

							renderContext.$scope.$on("$destroy", function() {
								win.off("resize", resizeHandler);
							});

							var layoutPromise = renderContext.rendererProvider.GridLayout(renderContext);
							if (!cc.isPromise(layoutPromise)) {
								layoutPromise = $q.when(layoutPromise);
							}

							layoutPromise.then(function() {
								renderContext.$scope.$emit("cm_dataGrid_rendered");

								var selectionProvider = renderContext.selectionProvider;
								if (selectionProvider) {
									selectionProvider.$on(SelectionProvider.SELECTION_CHANGED_EVENT, OnSelectionChanged(renderContext));
								}

								renderContext.rendererProvider.GridReady(container, renderContext);

								renderContext.$scope.$emit("cm_dataGrid_ready");
							});
						});
					});

					return container;
				});
			}

			function SetupGroupProviders(renderContext) {
				renderContext.selectedGroupProvider = null;

				var groupProviders = renderContext.groupProviders;
				if (groupProviders) {
					for (var i = 0; i < groupProviders.length; i++) {
						var groupProvider = groupProviders[i];
						if (cc.toBoolean(groupProvider.disabled)) {
							continue;
						}
						renderContext.selectedGroupProvider = groupProvider;
						break;
					}
				}

				if (!renderContext.selectedGroupProvider) {
					return;
				}

				renderContext.rowIndent = 1;
				renderContext.selectedGroupProvider.collapsedProvider.$on(SelectionProvider.SELECTION_CHANGED_EVENT,
						OnCollapsedChanged(renderContext));
			}

			function GridReady(element, renderContext, focusFirstCell) {

				var row;
				var cell;

				if (renderContext.focusCellId) {
					cell = document.getElementById(renderContext.focusCellId);
					if (cell) {
						row = cell.parentNode;
					}
				}

				if (!row && renderContext.selectionProvider) {
					var rowValue = renderContext.selectionProvider.getFirstElement();
					if (rowValue) {
						row = cu.GetElementFromValue(renderContext, rowValue, "row");
					}
				}

				if (!row) {
					var tbody = renderContext.tableTBody;
					var row = cm.GetNextType(tbody.firstChild, "row"); // Not a group
					if (!row) {
						return false;
					}
				}

				if (!cell) {
					var cell = cm.GetNextType(row.firstChild, CELL_OR_GROUPTITLE);
					if (!cell) {
						return false;
					}
				}

				if (!focusFirstCell) {
					SetCursor(cell, renderContext);
					return true;
				}

				// Sometime, it is not yet drawn !
				if (cell.getBoundingClientRect().width) {
					SetFocus(cell, renderContext);
					return true;
				}

				$timeout(function() {
					SetFocus(cell, renderContext);
				}, 50, false);

				return true;
			}

			function SetCursor(element, renderContext) {

				cc.log("SetCursor ", element);

				var cid = renderContext.focusCellId;
				if (cid && (!element || element.id != cid)) {
					renderContext.focusCellId = null;

					var oldCursor = document.getElementById(cid);
					if (oldCursor) {
						oldCursor.tabIndex = -1;
					}
				}

				if (element) {
					renderContext.focusCellId = element.id;

					element.tabIndex = renderContext.tabIndex;

					if (renderContext.cursorProvider) {
						var tr = element.parentNode;

						var cursorValue = angular.element(tr).data("cm_value");
						cu.RegisterElement(renderContext, tr, cursorValue);

						var logicalIndex = element.cm_lindex;
						var column = renderContext.columns[logicalIndex];

						renderContext.cursorProvider.setCursor(cursorValue, column);
					}
				}
			}

			function SetFocus(element, renderContext) {

				// cc.log("SetFocus ", element, " focus=" + focus)

				try {
					element.focus();

				} catch (x) {
					$log.error(x);
				}
			}

			function GridStyleUpdate(element, renderContext) {
				var classes = cm_dataGrid_className.split(" ");

				var className = renderContext.$scope.className;
				if (className) {
					classes.push(className);
				}

				return cm.MixElementClasses(element, classes);
			}

			function GridLayout(renderContext) {
				var container = renderContext.container;
				renderContext.layoutState = "uninitialized";

				$log.debug("GridLayout beginning (containerSize=" + renderContext._containerSizeSetted + ")");

				if (!renderContext._containerSizeSetted) {
					var containerStyle = renderContext.container.style;
					if (containerStyle.width || containerStyle.height) {
						var dr = renderContext.container.getBoundingClientRect();
						if (dr.height && dr.width) {
							renderContext._containerSizeSetted = true;
							var hr = renderContext.titleViewPort.getBoundingClientRect();

							var ts = renderContext.tableViewPort.style;
							ts.width = dr.width + "px";
							ts.height = (dr.height - hr.height) + "px";
						}
					} else {
						renderContext._containerSizeSetted = true;
					}
				}

				var cr = renderContext.tableViewPort.getBoundingClientRect();
				if (!cr || (cr.width < 1 && cr.height < 1)) {
					$log.debug("No bounding client rect ", cr, "  => timeout");

					return $timeout(function() {
						renderContext.rendererProvider.GridLayout(renderContext);
					}, 10, false);
				}

				$log.debug("Begin layout " + renderContext.gridWidth + "," + cr.width + " " + renderContext.gridHeight + ","
						+ cr.height);

				if (renderContext.gridWidth == cr.width && renderContext.gridHeight == cr.height) {
					renderContext.layoutState = "complete";
					return true;
				}
				renderContext.gridWidth = cr.width;
				renderContext.gridHeight = cr.height;

				var ts = renderContext.tableViewPort.style;
				ts.visibility = "";

				renderContext.$scope.$emit("cm_dataGrid_layout_begin");

				var $container = angular.element(container);

				var promise = renderContext.rendererProvider.TitleLayout($container, renderContext, cr.width);
				if (!cc.isPromise(promise)) {
					promise = $q.when(promise);
				}

				return promise.then(function() {
					renderContext.layoutState = "titleDone";

					var promise2 = renderContext.rendererProvider.TableLayout($container, renderContext, cr.width, cr.height);

					if (!cc.isPromise(promise2)) {
						promise2 = $q.when(promise2);
					}

					promise2.then(function() {
						renderContext.layoutState = "bodyDone";

						AlignColumns(renderContext);

						var cursor = renderContext._cursor;
						if (cursor) {
							var p = cursor.parentNode;
							for (; p && p.nodeType == 1; p = p.parentNode)
								;
							if (!p || p.nodeType != 9) {
								cursor = null;
								renderContext._cursor = null;
							}
						}

						renderContext.layoutState = "complete";

						renderContext.$scope.$emit("cm_dataGrid_layout_end");
					});
				});
			}

			function AlignColumns(renderContext) {
				var total = 0;
				var hasData = renderContext._hasData;

				angular.forEach(renderContext.visibleColumns, function(column) {

					var width = column.width;
					var bodyWidth = width;
					if (!column.visibleIndex && renderContext.rowIndent) {
						bodyWidth -= renderContext.rowIndent * cm_dataGrid_rowIndentPx;
					}

					var titleStyle = column.titleElement.style;
					titleStyle.width = width + "px";
					// titleStyle.position = "static";

					column.bodyColElement.style.width = (hasData) ? (bodyWidth + "px") : "auto";
					total += width;
				});

				var sizer = 0;
				if (total < renderContext.gridWidth) {

					sizer = renderContext.gridWidth - total;
					total -= sizer;

				} else if (renderContext.hasResizableColumnVisible) {
					sizer = 6;
				}

				if (renderContext.rightColElement) {
					renderContext.rightColElement.style.width = (sizer) + "px";

					total += sizer;
				}

				renderContext.tableElement.style.width = (hasData) ? (total + "px") : "auto";
				renderContext.tableElement.style.tableLayout = "fixed";

				$log.debug("AlignColumns ... total=" + total);
			}

			var renderers = {
				GridRenderer: GridRenderer,

				GridLayout: GridLayout,

				GridStyleUpdate: GridStyleUpdate,

				GridReady: GridReady,

				UpdateData: UpdateData
			};

			return renderers;

		} ]);
})(window, window.angular);