/**
 * @product CameliaJS (c) 2014 Vedana http://www.vedana.com
 * @license Creative Commons - The licensor permits others to copy, distribute,
 *          display, and perform the work. In return, licenses may not use the
 *          work for commercial purposes -- unless they get the licensor's
 *          permission.
 * @author olivier.oeuillot@vedana.com
 */

(function(window, angular, undefined) {
	"use strict";

	var module = angular.module("camelia.renderers.grid");

	module.value("cm_grid_animation_pageChange", "camelia.animations.grid.PageChange");

	var ROW_OR_GROUP = {
		row: true,
		group: true
	};

	var CELL_OR_GROUPTITLE = {
		cell: true,
		groupTitle: true
	};

	var DOUBLE_CLICK_DELAY_MS = 300;

	module.factory("camelia.renderers.grid.core",
			[ "$log",
				"$q",
				"$window",
				"$timeout",
				"$exceptionHandler",
				"camelia.core",
				"camelia.cmTypes",
				"camelia.animations.Animation",
				"cm_grid_className",
				"cm_grid_rowIndentPx",
				"camelia.Key",
				"camelia.SelectionProvider",
				"camelia.CursorProvider",
				"camelia.renderers.FiltersPopup",
				"cm_grid_sizerPx",
				"cm_grid_animation_pageChange",
				function($log, $q, $window, $timeout, $exceptionHandler, cc, cm, Animation, cm_dataGrid_className,
						cm_dataGrid_rowIndentPx, Key, SelectionProvider, CursorProvider, FiltersPopupRenderer, cm_grid_sizerPx,
						cm_grid_animation_pageChange) {

					function searchElements(node) {
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

					function GridRenderer(renderContext) {
						angular.extend(this, renderContext);
					}

					GridRenderer.prototype = {
						render: function(parent) {
							var $scope = this.$scope;

							$scope.$broadcast("cm:dataGrid_rendering");

							var container = cc.createElement(parent, "div", {
								id: this.dataGrid.id,
								$cm_type: "grid"
							});
							this.container = container[0];

							$scope.$watch("style", function(style) {
								style = style || "";
								container.attr("style", style);
							});

							var self = this;
							$scope.$watch("className", function() {
								self.gridStyleUpdate(container);
							});

							var tabIndex = $scope.tabIndex;
							if (!tabIndex || tabIndex < 0) {
								tabIndex = 0;
							}
							this.tabIndex = tabIndex;
							this.rowIndent = 0;

							this.setupGroupProviders();

							this.tableInstallWatchs();

							$scope.$on(CursorProvider.CURSOR_CHANGED, function(event, data) {

								var sourceEvent = self._selectionSourceEvent;

								console.log("GridRenderer.CURSOR_CHANGED SourceEvent=", sourceEvent);

								if (data.oldRow) {
									// BLUR event update the element
									var oldElement = self.getElementFromValue(data.oldRow, ROW_OR_GROUP);
									if (oldElement && oldElement._cursor) {
										oldElement._cursor = undefined;
										cc.BubbleEvent(oldElement, "cm_update");
									}
								}
								if (data.row) {
									var element = self.getElementFromValue(data.row, ROW_OR_GROUP);
									if (element && !element._cursor) {
										element._cursor = true;
										cc.BubbleEvent(element, "cm_update");
									}
								}

								var selectionProvider = self.selectionProvider;
								if (!selectionProvider) {
									return;
								}

								var cursorValue = data.row;
								var rowValue = cursorValue;

								if (self.groupProviders) {
									var groupElement = self.getElementFromValue(cursorValue, "group");
									if (groupElement) {
										rowValue = angular.element(groupElement).data("cm_rowValues");
									}
								}

								selectionProvider.run(function() {

									self.selectionStrategy.select(selectionProvider, rowValue, cursorValue, sourceEvent, function(
											cursorRowId) {
										return self._computeRowRangeFromCursor(cursorValue, cursorRowId);
									});
								});
							});

							container.on("mouseover", this._onMouseOver());

							container.on("mouseout", this._onMouseOut());

							container.on("mousedown", this._onMouseDown());

							container.on("dblclick", this._onDoubleClick());

							container.on("click", this._onSimpleClick());

							container.on("mouseup", this._onMouseUp());

							container.on("keydown", this._onKeyPress());
							// container.on("keypress", OnKeyPress(renderContext));

							this._offFocus = cc.on(container, "focus", this._onFocus(), true, $scope);
							this._offBlur = cc.on(container, "blur", this._onBlur(), true, $scope);

							$scope.$on("$destroy", function() {
								self._offFocus();
								self._offBlur();

								self.tableDestroy();

								var dr = self._deferredRefresh;
								if (dr) {
									self._deferredRefresh = null;
									dr.reject({
										code: "DESTROYED",
										message: "Component is destroyed"
									});
								}
							});

							container.on("cm_update", this._onGridStyleUpdate());

							$scope.$broadcast("cm:gridTitleRendering");

							var titlePromise = this.titleRenderer(container);
							titlePromise = cc.ensurePromise(titlePromise);

							return titlePromise.then(function onSuccess(title) {
								$scope.$broadcast("cm:gridTitleRendered");

								self._title = title;

								$scope.$broadcast("cm:gridBodyRendering");

								self._monitorPositions(function() {

									var fragment = angular.element(document.createDocumentFragment());

									var bodyContainer = cc.createElement(fragment, "div", {
										styleClass: "cm_dataGrid_bcontainer"
									});
									self.bodyContainer = bodyContainer[0];

									var tablePromise = self.tableViewPortRenderer(bodyContainer);
									tablePromise = cc.ensurePromise(tablePromise);

									tablePromise.then(function onSuccess(tableViewPort) {
										// self._body = body;
										// self._hideBody(); // TODO Verify
										self.tableViewPort = tableViewPort;

										container.append(fragment);

										$scope.$broadcast("cm:gridBodyRendered");

										var win = angular.element($window);

										var resizeHandler = self._onResize();
										win.on("resize", resizeHandler);

										$scope.$on("$destroy", function() {
											win.off("resize", resizeHandler);
										});

										var layoutPromise = self.gridLayout();
										layoutPromise = cc.ensurePromise(layoutPromise);

										layoutPromise.then(function onSuccess(result) {
											$scope.$broadcast("cm:gridRendered");

											$scope.$on(SelectionProvider.SELECTION_CHANGED_EVENT, self._onSelectionChanged());

											self._gridReady(container).then(function onSuccess() {
												$scope.$broadcast("cm:gridReady", true);

												return $q.when(true);

											}, function onError(reason) {
												$scope.$broadcast("cm:gridReady", false, reason);

												$log.error("GridReady error ", reason);

												return $q.reject(reason);
											});
										});
									});
								});

								return container;
							});
						},

						setupGroupProviders: function() {
							this.selectedGroupProvider = null;

							var groupProviders = this.groupProviders;
							if (groupProviders) {
								for (var i = 0; i < groupProviders.length; i++) {
									var groupProvider = groupProviders[i];
									if (cc.toBoolean(groupProvider.disabled)) {
										continue;
									}
									this.selectedGroupProvider = groupProvider;
									break;
								}
							}

							if (!this.selectedGroupProvider) {
								return;
							}

							this.rowIndent = 1;
							var self = this;
							this.selectedGroupProvider.collapsedProvider.$on(SelectionProvider.SELECTION_CHANGED_EVENT, self
									._onCollapsedChanged());

						},

						/**
						 * @returns {Promise}
						 */
						_gridReady: function(element, focusFirstCell) {

							var row;
							var cell;

							if (this.focusCellId) {
								cell = document.getElementById(this.focusCellId);
								if (cell) {
									row = cell.parentNode;
								}
							}

							if (!row && this.selectionProvider) {
								var rowValue = this.selectionProvider.getFirstElement();
								if (rowValue) {
									row = this.getElementFromValue(rowValue, "row");
								}
							}

							if (!row) {
								row = this.getFirstRow();
								if (!row) {
									return $q.when(false);
								}
							}

							if (!cell) {
								cell = cm.GetNextType(row.firstChild, CELL_OR_GROUPTITLE);
								if (!cell) {
									return $q.when(false);
								}
							}

							if (!focusFirstCell) {
								this._setCursor(cell);
								return $q.when(true);
							}

							var cnt = 10;
							return $timeout(function onTimer() {

								// Sometime, it is not yet drawn !
								if (!cell.getBoundingClientRect().width) {
									if (--cnt > 0) {
										return $timeout(onTimer, 100, false);
									}

									return $q.reject({
										code: "COMPONENT_NOT_DRAWN",
										message: "The specified component is not drawn"
									});
								}

								cc.setFocus(cell);
								return true;
							}, 100, false);
						},

						_setCursor: function(element, event) {

							// cc.log("SetCursor ", element);

							var cid = this.focusCellId;
							if (cid && (!element || element.id !== cid)) {
								this.focusCellId = null;

								var oldCursor = document.getElementById(cid);
								if (oldCursor) {
									oldCursor.tabIndex = -1;
								}
							}

							if (element) {
								this.focusCellId = element.id;

								element.tabIndex = this.tabIndex;

								if (this.cursorProvider) {
									var tr = element.parentNode;

									var cursorValue = angular.element(tr).data("cm_value");
									this.registerElement(tr, cursorValue);

									var logicalIndex = element.cm_lindex;
									var column = this.columns[logicalIndex];

									this.cursorProvider.requestCursor(cursorValue, column, event);
								}
							}
						},

						gridStyleUpdate: function(element) {
							var classes = cm_dataGrid_className.split(" ");

							var className = this.$scope.className;
							if (className) {
								classes.push(className);
							}

							return cm.MixElementClasses(element, classes);
						},

						/**
						 * @returns {Promise}
						 */
						gridLayout: function() {
							var container = this.container;
							var oldLayoutState = this.layoutState;
							this.layoutState = "uninitialized";

							$log.debug("GridLayout beginning (containerSize=" + this._containerSizeSetted + ")");

							var self = this;

							if (!this.tableViewPort) {
								$log.error("Table view port is NULL");
								// TODO Align columns to default values

								var cr = this.bodyContainer.getBoundingClientRect();

								var promise = this.titleLayout($container, cr.width);
								promise = cc.ensurePromise(promise);

								return promise.then(function() {
									self.layoutState = "bodyDone";

									self._alignColumns(true);

									self._showBody();

									self.layoutState = "complete";
									return $q.when(true);
								});
							}

							if (!this._containerSizeSetted) {
								var containerStyle = this.container.style;
								if (containerStyle.width || containerStyle.height) {
									var dr = this.container.getBoundingClientRect();
									if (dr.height && dr.width) {
										this._containerSizeSetted = true;
										var hr = this.titleViewPort.getBoundingClientRect();

										var ts = this.tableViewPort.style;
										ts.width = dr.width + "px";
										// ts.height = (dr.height - hr.height) + "px";
									}
								} else {
									this._containerSizeSetted = true;
								}
							}

							var cr = this.tableViewPort.getBoundingClientRect();
							if (!cr || (cr.width < 1 && cr.height < 1)) {
								$log.debug("No bounding client rect ", cr, "  => timeout 10ms");

								if (oldLayoutState !== "uninitialized") {
									this._hideBody();
								}

								return $timeout(function() {
									return self.gridLayout();
								}, 10, false);
							}

							if (this.gridWidth === cr.width && this.gridHeight === cr.height) {
								$log.debug("Begin layout : Already done");

								self._alignColumns(true);

								self._showBody();

								this.layoutState = "complete";
								return $q.when(true);
							}

							$log.debug("Begin layout to " + cr.width + "," + cr.height);

							this.gridWidth = cr.width;
							this.gridHeight = cr.height;

							this.$scope.$broadcast("cm:dataGrid_layout_begin");

							var $container = angular.element(container);

							var promise = this.titleLayout($container, cr.width);
							promise = cc.ensurePromise(promise);

							return promise.then(function() {
								self.layoutState = "titleDone";

								var promise2 = self.tableLayout($container, cr.width, cr.height);
								promise2 = cc.ensurePromise(promise2);

								return promise2.then(function() {
									self.layoutState = "bodyDone";

									self._alignColumns(true);

									self._showBody();

									var cursor = self._cursor;
									if (cursor) {
										var p = cursor.parentNode;
										for (; p && p.nodeType == Node.ELEMENT_NODE; p = p.parentNode) {
										}

										if (!p || p.nodeType != Node.DOCUMENT_NODE) {
											cursor = null;
											self._cursor = null;
										}
									}

									self.layoutState = "complete";

									self.$scope.$broadcast("cm:gridLayoutEnd");

									return $q.when(true);
								});
							});
						},

						_hasData: function() {
							var tbody = this.getTableBody();

							return tbody && tbody.firstChild;
						},

						_alignColumns: function(columnConstraints) {
							var total = 0;
							var invalidLayout = false;

							var rowIndent = this.rowIndent;

							var self = this;
							angular.forEach(this.visibleColumns, function(column) {

								var titleStyle = column.titleElement.style;

								var width = column.width;
								if (width === undefined) {
									invalidLayout = true;
									titleStyle.width = "auto";
									return;
								}

								var bodyWidth = width;
								if (!column.visibleIndex && rowIndent) {
									bodyWidth -= rowIndent * cm_dataGrid_rowIndentPx;
								}
								titleStyle.width = width + "px";
								// titleStyle.position = "static";

								if (self.tableViewPort) {
									column.bodyColElement.style.width = (columnConstraints) ? (bodyWidth + "px") : "auto";
								}
								total += width;

								// $log.debug("GridWidth[" + column.id + "] width=" + width + "
								// total=" + total);
							});

							$log.debug("GridWidth old=" + this.gridWidth + " total=" + total + " invalidLayout=" + invalidLayout);

							if (invalidLayout) {
								this.tableElement.style.width = "auto";
								$log.debug("AlignColumns ... Invalid layout");
								return;
							}

							var gridWidth = this.gridWidth;

							var sizer = 0;
							if (false && total < gridWidth) {

								sizer = gridWidth - total;
								total -= sizer;

							} else if (this.hasResizableColumnVisible) {
								sizer = cm_grid_sizerPx;
							}

							if (this.rightColElement) {
								this.rightColElement.style.width = (sizer) + "px";

								total += sizer;
							}

							this.tableElement.style.width = (columnConstraints) ? (total + "px") : "auto";
							// this.tableElement.style.tableLayout = "fixed";

							$log.debug("AlignColumns ... total=" + total + " sizer=" + sizer + " columnConstraints=" +
									columnConstraints);
						},

						_computeRowRangeFromCursor: function(rowValue, cursorRowValue) {

							var mark1;
							var mark2;

							var ret = [];

							var tbody = this.getTableBody();
							if (!tbody) {
								return null;
							}

							var r = tbody.firstChild;
							for (; r; r = r.nextSibling) {
								if (r.nodeType != Node.ELEMENT_NODE) {
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
						},

						_emitClick: function(elements, eventName, event) {

							var row = elements.row;
							if (!row) {
								return;
							}
							var rowValue = angular.element(row).data("cm_value");

							var params = {
								grid: this.grid,
								event: event,
								row: row,
								rowValue: rowValue
							};

							var cell = elements.cell;
							if (cell) {
								params.cell = cell;

								var logicalIndex = cell.cm_lindex;
								params.column = this.columns[logicalIndex];
							}

							this.$scope.$emit(eventName, params);
						},

						onKeyPress_Cell: function(cell, event, groupElement) {
							var row = cell.parentNode;
							var parentNode = row.parentNode;
							var columnLogicalIndex = cell.cm_lindex;
							var next = row;
							var cancel = false;
							var activate = false;
							var focusCell = false;
							var viewPort = this.tableViewPort;

							var group;
							var collapsedProvider;
							if (groupElement) {
								group = angular.element(groupElement).data("cm_value");
								collapsedProvider = this.selectedGroupProvider.getCollapsedProvider();
							}

							var dataGrid = this.dataGrid;
							function prevPage() {
								if ((!next || next.id === row.id) && dataGrid.rows > 0) {
									var nextFirst = dataGrid.first - dataGrid.rows;
									if (nextFirst < 0) {
										nextFirst = 0;
									}
									if (dataGrid.first > nextFirst) {
										dataGrid.setFirst(nextFirst);
									}

									next = null;
								}
							}

							function nextPage() {
								if ((!next || next.id === row.id) && dataGrid.rows > 0) {
									var nextFirst = dataGrid.first + dataGrid.rows;
									if (dataGrid.rowCount < 0 || nextFirst < dataGrid.rowCount) {
										dataGrid.setFirst(nextFirst);
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
								next = cm.GetPreviousVisibleType(viewPort, parentNode.lastChild, ROW_OR_GROUP);
								if (next && next.id == row.id && (viewPort.scrollHeight > viewPort.offsetHeight)) {
									viewPort.scrollTop += viewPort.clientHeight - row.offsetHeight;

									next = cm.GetPreviousVisibleType(viewPort, parentNode.lastChild, ROW_OR_GROUP);
								}
								nextPage();
								break;

							case Key.VK_END:
								cancel = true;
								next = cm.GetPreviousType(parentNode.lastChild, ROW_OR_GROUP);
								nextPage();
								break;

							case Key.VK_UP:
								cancel = true;
								next = cm.GetPreviousType(row.previousSibling, ROW_OR_GROUP);
								prevPage();
								break;

							case Key.VK_PAGE_UP:
								cancel = true;
								next = cm.GetNextVisibleType(viewPort, parentNode.firstChild, ROW_OR_GROUP);
								if (next && next.id == row.id) {
									viewPort.scrollTop -= viewPort.clientHeight - row.offsetHeight;

									next = cm.GetNextVisibleType(viewPort, parentNode.firstChild, ROW_OR_GROUP);
								}
								prevPage();
								break;

							case Key.VK_HOME:
								cancel = true;
								next = cm.GetNextType(parentNode.firstChild, ROW_OR_GROUP);
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
										this._toggleGroupExpand(groupElement);
									}

								} else if (angular.isNumber(columnLogicalIndex)) {
									var column = this.columns[columnLogicalIndex];

									var nextColumn = this.visibleColumns[column.visibleIndex + 1];
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
										this._toggleGroupExpand(groupElement);
									}

								} else if (angular.isNumber(columnLogicalIndex)) {
									var column = this.columns[columnLogicalIndex];

									if (column.visibleIndex > 0) {
										var nextColumn = this.visibleColumns[column.visibleIndex - 1];
										columnLogicalIndex = nextColumn.logicalIndex;

										focusCell = true;
									}
								}
								break;
							}

							var self = this;
							if (activate) {
								var selectionStrategy = this.selectionStrategy;
								if (selectionStrategy) {
									var rowValue = angular.element(next).data("cm_value");
									this.registerElement(next, rowValue);

									var cursorValue = rowValue;

									if (this.groupProviders) {
										var groupElement = this.getElementFromValue(cursorValue, "group");
										if (groupElement) {
											rowValue = angular.element(groupElement).data("cm_rowValues");
										}
									}

									selectionStrategy.select(this.selectionProvider, rowValue, cursorValue, event, function(cursorRowId) {
										return self._computeRowRangeFromCursor(cursorValue, cursorRowId);
									}, true);
								}
							}

							if (next && next.id !== row.id) {
								this.registerElement(next);

								focusCell = true;
							}

							if (focusCell) {
								var cell = cm.GetNextType(next.firstChild, CELL_OR_GROUPTITLE, function(c, type) {
									if (c.cm_lindex === undefined || columnLogicalIndex === undefined) {
										return true;
									}
									return c.cm_lindex === columnLogicalIndex;
								});

								if (cell) {
									this._registerSelectionEvent(event);

									cc.setFocus(cell);
								}
							}

							if (cancel) {
								event.stopPropagation();
								event.preventDefault();
							}
						},

						_onCollapsedChanged: function() {
							var self = this;

							return function(event, params) {
								self._switchElementsFromEvent(params, "group", "_collapsed", function(groupElement, group) {
									// Add the group to the collapse list, remove all rows of
									// group
									self.removeRowsOfGroup(group, groupElement);

								}, function(groupElement) {
									// Remove the group to the collapse list, show all rows of
									// this
									// group

									var group = angular.element(groupElement).data("cm_value");

									self.addRowsOfGroup(group, groupElement);
								});
							};
						},

						_onSelectionChanged: function() {
							var self = this;
							return function(event, params) {
								self._switchElementsFromEvent(params, "row", "_selected");
							};
						},

						_switchElementsFromEvent: function(params, type, propertyName, funcAdd, funcRemove) {
							var size = params.removed.length + params.added.length;
							var cache = (size > 1) ? {} : null;

							var self = this;
							if (params.clearAll && !params.removed.length) {
								this.forEachBodyElement(type, function(element) {
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
									var element = self.getElementFromValue(rowValue, type, cache);
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
								var element = self.getElementFromValue(rowValue, type, cache);
								if (!element || element[propertyName]) {
									return;
								}

								element[propertyName] = true;
								cc.BubbleEvent(element, "cm_update");

								if (funcAdd) {
									funcAdd(element, rowValue);
								}
							});
						},

						_onResizeColumnMoving: function(column, event) {
							var dx = event.clientX - this.columnMoveClientX;

							var newWidth = this.columnResizingWidth + dx;

							if (newWidth < column.computedMinWidth) {
								newWidth = column.computedMinWidth;
							}
							if (column.maxWidth && newWidth > column.maxWidth) {
								newWidth = column.maxWidth;
							}

							if (newWidth != column.width) {
								column.width = newWidth;
								column.specifiedWidthPx = newWidth + "px";
								this._alignColumns(true);
							}

							event.preventDefault();
							event.stopPropagation();
						},

						_onResizeColumnMouseUp: function(column, event) {
							console.log("On resize column mouse up");

							this._onResizeColumnRelease();
							this.$scope.$broadcast("cm:dataGrid_resized", column);

							event.preventDefault();
							event.stopPropagation();
						},

						_onResizeColumnRelease: function() {
							console.log("On resize column release");

							if (this.columnMouseMoveListener) {
								document.removeEventListener("mousemove", this.columnMouseMoveListener, true);
								this.columnMouseMoveListener = undefined;
							}

							if (this.columnMouseUpListener) {
								document.removeEventListener("mouseup", this.columnMouseUpListener, true);
								this.columnMouseUpListener = undefined;
							}

							this.columnResizing = undefined;
							this.columnResizingWidth = undefined;
						},

						_onResizeColumn: function(column, tsizer, event) {
							console.log("On resize column " + column);

							// All Column sizes become specified
							if (!this._allWidthSpecified) {
								this._allWidthSpecified = true;

								angular.forEach(this.visibleColumns, function(column) {
									column.specifiedWidthPx = column.width + "px";
								});
							}

							this.$scope.$broadcast("cm:dataGrid_resizing", column);

							if (this.columnResizing) {
								this._onResizeColumnRelease();
							}

							var self = this;
							this.columnMouseUpListener = function(event) {
								return self._onResizeColumnMouseUp(column, event);
							};

							this.columnMouseMoveListener = function(event) {
								return self._onResizeColumnMoving(column, event);
							};

							document.addEventListener("mousemove", this.columnMouseMoveListener, true);
							document.addEventListener("mouseup", this.columnMouseUpListener, true);

							this.columnResizing = true;
							this.columnResizingWidth = column.width;
							this.columnMoveClientX = event.clientX;

							event.preventDefault();
							event.stopPropagation();
						},

						_toggleColumnSort: function(column, event) {

							this.$scope.$broadcast("cm:dataGrid_sorting");

							var old = this.sorters;

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
								});
							}

							var sorters = [];
							this.sorters = sorters;

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

							var promise = this._refreshRows();

							var self = this;
							return promise.then(function onSuccess() {
								self.$scope.$broadcast("cm:gridSorted", true);

								return true;

							}, function onError(reason) {
								self.$scope.$broadcast("cm:gridSorted", false, reason);

								return $q.reject(reason);
							});
						},

						_monitorPositions: function(func) {

							var oldFirst = this.dataGrid.first;
							var oldRows = this.dataGrid.rows;
							var oldRowCount = this.dataGrid.rowCount;
							var oldMaxRows = this.dataGrid.maxRows;

							var promise = func.call(this);
							promise = cc.ensurePromise(promise);

							var self = this;
							return promise.then(function() {

								var dataGrid = self.dataGrid;
								var $scope = self.$scope;

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

									$scope.$broadcast("cm:firstChanged", dataGrid.first);
								}

								if (oldRows != dataGrid.rows) {
									event.rowsChanged = true;
									sendEvent = true;

									$scope.$broadcast("cm:rowsChanged", dataGrid.rows);
								}

								if (oldRowCount != dataGrid.rowCount) {
									event.rowCountChanged = true;
									sendEvent = true;
									$scope.rowCount = rowCount;

									$scope.$broadcast("cm:rowCountChanged", dataGrid.rowCount);
								}

								if (oldMaxRows != dataGrid.maxRows) {
									event.maxRowsChanged = true;
									sendEvent = true;
									$scope.maxRows = maxRows;

									$scope.$broadcast("cm:maxRowsChanged", dataGrid.maxRows);
								}

								if (sendEvent) {
									$scope.$broadcast("cm:positionsChanged", event);
								}
							});
						},

						/**
						 * Called when first, rows, dataModel changed
						 */
						updateData: function(updateColumnWidths) {

							if (updateColumnWidths === undefined) {
								updateColumnWidths = true;
							}

							var self = this;

							return this._monitorPositions(function() {
								return self._refreshRows(updateColumnWidths).then(null, function onError(reason) {
									$log.error("UpdateData failed ", reason);

									return $q.reject(reason);
								});
							});
						},

						_hideBody: function() {
							if (!this.tableViewPort) {
								return;
							}

							var ts = this.tableViewPort.style;
							ts.width = "auto";
							// ts.height = "auto";
							ts.visibility = "hidden";
							// this.tableElement.style.tableLayout = "";

							$log.debug("DatagridRenderer.Hide body");
						},
						_showBody: function() {
							if (!this.tableViewPort) {
								return;
							}

							var ts = this.tableViewPort.style;

							// this.tableElement.style.tableLayout = "fixed";
							ts.visibility = "";
							$log.debug("DatagridRenderer.Show body");
						},

						_clearPageAnimation: function() {
							var animation = this._pageAnimation;
							if (!animation) {
								return;
							}
							this._pageAnimation = undefined;

							try {
								animation.cancel();

							} catch (x) {
								$exceptionHandler(x, "Page Animation cancel() error");

							} finally {

								try {
									animation.$destroy();

								} catch (x) {
								}
							}
						},

						/**
						 * @returns {Promise}
						 */
						runPromise: function(fct) {
							if (!this._refreshing) {
								try {
									var ret = fct();
									return cc.ensurePromise(ret);

								} catch (x) {
									return $q.reject(x);
								}
							}

							if (this._deferredRefresh) {
								return this._deferredRefresh;
							}

							this._deferredRefresh = $q.defer();
							return this._deferredRefresh;
						},
						/**
						 * @returns {Promise}
						 */
						_refreshRows: function(updateColumnWidths, focus) {
							$log.debug("Refresh rows");

							if (this.$scope.refreshing) {
								return $q.reject({
									code: "ALREADY_REFRESHING",
									message: "Already refreshing"
								});
							}
							this.$scope.refreshing = true;

							if (updateColumnWidths) {
								this._naturalWidths = undefined;
								this._containerSizeSetted = undefined;
								this.gridWidth = -1;

								// this._alignColumns(false); // TODO sans animation !
							}

							this._clearPageAnimation();

							var dataGrid = this.dataGrid;
							var first = this.$scope.first;
							if (!angular.isNumber(first) || first < 0) {
								first = 0;
							}
							dataGrid.first = first;

							var rows = this.$scope.rows;
							if (!angular.isNumber(rows)) {
								rows = -1;
							}
							dataGrid.rows = rows;

							var oldTableViewPort = this.tableViewPort;
							this.tableViewPort = null;

							var oldErrorPage = this.errorPage;
							this.errorPage = null;

							var animation = Animation.newInstance(cm_grid_animation_pageChange, this.$scope, {
								first: first,
								oldFirst: this._renderedFirst,
								rows: rows,
								renderer: this,
								oldTableViewPort: oldTableViewPort,
								oldErrorPage: oldErrorPage
							});

							var self = this;

							this._pageAnimation = animation;

							var startPromise = animation.start();
							startPromise = cc.ensurePromise(startPromise);

							return startPromise.then(function onSuccess() {

								function processResult(eventName, param) {
									animation.end().then(function onSuccess(newTableViewPort) {
										self.tableViewPort = newTableViewPort;

										return self.gridLayout().then(function onSuccess(result) {

											var p = self._gridReady(self.container, focus !== false);

											self.$scope.$broadcast(eventName || "cm:gridRefreshed", param);

											if (self.container._errored) {
												self.container._errored = false;
												cc.BubbleEvent(self.container, "cm_update");

												self.$scope.$emit("cm:error", {
													source: self.dataGrid,
													error: false
												});
											}

											return p;
										});
									});
								}

								var promise = self.tableRowsRenderer();
								promise = cc.ensurePromise(promise);

								return promise.then(function onSuccess(newTableViewPort) {
									if (newTableViewPort[0]) {
										newTableViewPort = newTableViewPort[0];
									}

									var dataGrid = self.dataGrid;
									$log.debug("first=" + dataGrid.first + " visibleRows=" + dataGrid.visibleRows + " rows=" +
											dataGrid.rows + " maxRows=" + dataGrid.maxRows + " rowCount=" + dataGrid.rowCount);

									if (!dataGrid.visibleRows && dataGrid.first) {
										var newFirst = 0;
										if (dataGrid.maxRows > 0) {
											newFirst = Math.floor((dataGrid.maxRows - 1) / dataGrid.rows) * dataGrid.rows;
											if (newFirst < 0) {
												newFirst = 0;
											}
										}

										$timeout(function() {
											$log.debug("Change first to " + newFirst);
											self.$scope.first = newFirst;

											self.$scope.$digest();
										}, 10, false);
									}

									return processResult();

								}, function onError(reason) {
									// Failed
									$log.error("Catch process failed message ", reason);

									// Show error page
									animation.showErrorPage(reason).then(function onSuccess(errorPage) {
										if (errorPage[0]) {
											errorPage = errorPage[0];
										}
										self.errorPage = errorPage;

										return self.gridLayout().then(function onSuccess(result) {

											var p = self._gridReady(self.container, focus !== false);

											self.$scope.$broadcast("cm:gridErrored", reason);

											if (!self.container._errored) {
												self.container._errored = true;
												cc.BubbleEvent(self.container, "cm_update");

												self.$scope.$emit("cm:error", {
													source: self.dataGrid,
													error: false
												});
											}

											return $q.reject(reason);
										});
									});

								}, function onNotification(notification) {
									// $log.debug("Update", update);
									return notification;

								})['finally'](function onFinally() {
									$log.debug("Refresh: finally ...");
									self.$scope.refreshing = false;

									var df = self._deferredRefresh;
									if (df) {
										self._deferredRefresh = undefined;

										$timeout(function() {
											df.resolve(true);
										});
									}
								});
							});
						},

						_moveColumn: function(column, targetIndex, giveFocus) {

							var visibleColumns = this.visibleColumns;
							var beforeColumn = visibleColumns[targetIndex + ((targetIndex > column.visibleIndex) ? 1 : 0)];

							this._lastVisibleColumn = visibleColumns[visibleColumns.length - 1];

							visibleColumns.splice(column.visibleIndex, 1);
							visibleColumns.splice(targetIndex, 0, column);

							var idx = 0;
							angular.forEach(visibleColumns, function(column) {
								column.beforeMovingVisibleIndex = column.visibleIndex;
								column.visibleIndex = idx++;
							});

							var titlePromise = this.moveColumnTitle(column, beforeColumn);
							titlePromise = cc.ensurePromise(titlePromise);

							var self = this;
							titlePromise.then(function onSuccess() {

								var tablePromise = self.moveColumnTable(column, beforeColumn);
								tablePromise = cc.ensurePromise(tablePromise);

								tablePromise.then(function onSuccess() {
									self._lastVisibleColumn = undefined;

									if (!column.beforeMovingVisibleIndex || !column.visibleIndex) {
										self._alignColumns(true);
									}

									if (giveFocus !== false) {
										column.buttonElement.focus();
									}
								});
							});
						},

						_registerSelectionEvent: function(event) {

							$log.debug("Register event ", event);

							this._selectionSourceEvent = event;
							var self = this;
							$timeout(function() {
								$log.debug("Unregister event ", event);

								self._selectionSourceEvent = undefined;
							}, 10, false);
						},

						_toggleGroupExpand: function(element) {
							var groupElement = angular.element(element);
							var group = groupElement.data("cm_value");

							var collapsedProvider = this.selectedGroupProvider.getCollapsedProvider();

							var collapsed = !collapsedProvider.contains(group);

							if (collapsed) {
								collapsedProvider.add(group);

							} else {
								collapsedProvider.remove(group);
							}
						},

						_onTitleCellMouseDown: function(event, tcell) {
							var clientX = event.clientX;
							var column = angular.element(tcell).data("cm_column");

							this._onTitleCellClear();

							this.titleCellMoving = true;
							this.titleCellMovingClientX = clientX;
							this.titleCellMovingLayerX = event.layerX;
							// console.log("Target=" + event.target.tagName + "/" +
							// event.target.id + " " + event.layerX);

							var self = this;
							this.titleCellMouseUpListener = function(event) {
								return self._onTitleCellMouseUp(tcell, event, column);
							};

							this.titleCellMouseMoveListener = function(event) {
								return self._onTitleCellMouseMoving(tcell, event, column);
							};

							document.addEventListener("mousemove", this.titleCellMouseMoveListener, true);
							document.addEventListener("mouseup", this.titleCellMouseUpListener, true);
						},

						_onTitleCellMouseMoving: function(tcell, event, column) {
							var dx = event.clientX - this.titleCellMovingClientX;

							if (dx < -20 || dx > 20) {
								if (!this.titleCellColumnMoving) {
									this.titleCellColumnMoving = column;

									// Move cell title !
									this.beginMovingTitleCell(column, event, dx, this.titleCellMovingLayerX);
								}
							}
							if (this.titleCellColumnMoving) {
								this.movingTitleCell(column, event, dx, this.titleCellMovingLayerX);
							}
						},

						_onTitleCellMouseUp: function(tcell, event, column) {

							var elements = searchElements(event.target);

							if (!this.titleCellColumnMoving) {
								if (elements.tcell && elements.tcell.id == tcell.id) {
									if (elements.tparams) {
										this._showFilterPopup(column, elements.tparams, event, elements);

									} else if (tcell._sortable) {
										this._toggleColumnSort(column, event);
									}
								}

							} else {
								// Redraw the table body

								var dx = event.clientX - this.titleCellMovingClientX;

								var targetIndex = this.endMovingTitleCell(column, event, dx);
								if (angular.isNumber(targetIndex)) {
									this._moveColumn(column, targetIndex);
								}
							}

							this._onTitleCellClear();

							cm.ClearState(this, elements, "mouseDown");
							event.stopPropagation();
							return false;
						},

						_showFilterPopup: function(column, filterButton, event, elements) {
							var dataModel = this.dataModel;

							var self = this;
							var popup = new FiltersPopupRenderer(this.$scope, {}, column, dataModel, function() {

								var promise = self._monitorPositions(function() {
									return self._refreshRows(false, false);
								});

								return promise.then(function onSuccess() {
									return self.gridLayout().then(function onSuccess(result) {
										self.$scope.$broadcast("cm:gridFiltred", true);

										return result;
									});

								}, function onError(reason) {
									$log.error("Can not refreshRows failed ", reason);
									self.$scope.$broadcast("cm:gridFiltred", false, reason);

									return $q.reject(reason);
								});
							});

							popup.$scope.$on("cm:popup_opened", function() {
								cm.SwitchOnState(self, elements, "openedPopup");
							});

							popup.$scope.$on("cm:popup_closed", function() {
								cm.ClearState(self, elements, "openedPopup");
							});

							return popup.open({
								reference: filterButton,
								valign: "bottom",
								deltaY: 2
							});
						},

						_onTitleCellClear: function() {

							if (this.titleCellColumnMoving) {
								// Move cell title !
								this.endMovingTitleCell(this.titleCellColumnMoving);

								this.titleCellColumnMoving = undefined;
							}

							if (this.titleCellMouseMoveListener) {
								document.removeEventListener("mousemove", this.titleCellMouseMoveListener, true);
								this.titleCellMouseMoveListener = undefined;
							}

							if (this.titleCellMouseUpListener) {
								document.removeEventListener("mouseup", this.titleCellMouseUpListener, true);
								this.titleCellMouseUpListener = undefined;
							}

							this.titleCellMoving = undefined;
							this.titleCellColumnMoving = undefined;
						},

						onKeyPress_Title: function(tcell, event, elements) {
							var next = tcell;
							var cancel = false;
							var column = angular.element(tcell).data("cm_column");

							switch (event.keyCode) {
							case Key.VK_LEFT:
								cancel = true;

								if (event.ctrlKey) {
									// Move column !
									if (column.visibleIndex) {
										this._moveColumn(column, column.visibleIndex - 1);
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
									if (column.visibleIndex < this.visibleColumns.length - 1) {
										this._moveColumn(column, column.visibleIndex + 1);
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

								this._toggleColumnSort(column, event);
								break;

							case Key.VK_DOWN:
								cancel = true;

								if (column.titleElement._filtreable) {
									elements.tparams = column.parametersElement;

									this._showFilterPopup(column, elements.tparams, event, elements);
								}
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
						},

						_onResize: function() {
							$log.debug("On resize ...");
							var self = this;
							return function resizeHandler(event) {
								try {
									self.gridLayout();

								} catch (x) {
									$exceptionHandler(x, "Exception while resizing");
								}
							};
						},

						_onMouseOver: function() {
							var self = this;
							return function(event) {
								var target = event.target;

								if (self.columnResizing || self.titleCellMoving) {
									return;
								}

								var elements = searchElements(target);
								cm.SwitchOnState(self, elements, "over");
							};
						},

						_onMouseOut: function() {
							var self = this;
							return function(event) {
								var target = event.relatedTarget;

								var elements = searchElements(target);
								cm.SwitchOffState(self, elements, "over");
							};
						},

						_onFocus: function() {
							var self = this;
							return function(event) {
								var target = event.target;

								var elements = searchElements(target);

								self._lastFocusEventData = Date.now();

								// cc.log("Grid.OnFocus ", target, elements);

								cm.SwitchOnState(self, elements, "focus", function(elements) {
									var cell = elements.cell || elements.groupTitle;
									if (cell) {
										self._setCursor(cell, event);
									}
								});
							};
						},

						_onBlur: function() {
							var self = this;
							return function(event) {
								var target = event.relatedTarget;

								// cc.log("BLUR ", target);

								var elements = searchElements(target);
								cm.SwitchOffState(self, elements, "focus");
							};
						},

						_onDoubleClick: function() {
							var self = this;

							return function(event) {
								var target = event.target;
								var elements = searchElements(target);

								// cc.log("Double click on ", target, " elements=", elements);

								if (elements.group) {
									var promise = self._groupSimpleClickPromise;
									if (promise) {
										self._groupSimpleClickPromise = undefined;

										$timeout.cancel(promise);
									}

									self._toggleGroupExpand(elements.group);
									return;
								}

								self._emitClick(elements, "RowDoubleClick", event);
							};
						},

						_onSimpleClick: function() {
							var self = this;
							return function(event) {
								var target = event.target;

								var elements = searchElements(target);

								// cc.log("Simple click on ", target, " elements=", elements);

								if (!self._lastFocusEventData && elements.row && elements.cell) {
									var row = angular.element(elements.row).data("cm_value");
									self.registerElement(elements.row, row);

									var logicalIndex = elements.cell.cm_lindex;
									var column = self.columns[logicalIndex];

									var cursorProvider = self.cursorProvider;
									var cursorRow = cursorProvider.getRow();
									var cursorColumn = cursorProvider.getColumn();

									if (column === cursorColumn && row === cursorRow) {
										var selectionProvider = self.selectionProvider;

										if (selectionProvider) {
											selectionProvider.run(function() {
												self.selectionStrategy.select(selectionProvider, row, row, event, function(cursorRowId) {
													return self._computeRowRangeFromCursor(row, cursorRowId);
												});
											});
										}
									}
								}

								self._lastFocusEventData = 0;

								self._emitClick(elements, "RowClick", event);
							};
						},

						_onMouseDown: function() {
							var self = this;

							return function(event) {
								var target = event.target;

								// cc.log("Mouse down on ", target);

								var elements = searchElements(target);
								cm.SwitchOnState(self, elements, "mouseDown", function(elements) {

									var tsizer = elements.tsizer;
									if (tsizer) {
										var targetColumn;

										if (elements.tcell) {
											var c = angular.element(elements.tcell).data("cm_column");
											var vi = c.visibleIndex;

											targetColumn = self.visibleColumns[vi - 1];

										} else {
											targetColumn = self.visibleColumns[self.visibleColumns.length - 1];
										}

										self._onResizeColumn(targetColumn, tsizer, event);

										// event.stopPropagation();
										return false;
									}

									var groupExpand = elements.groupExpand;
									if (groupExpand) {
										self._toggleGroupExpand(elements.group);

										return false;
									}

									var row = elements.row;
									if (row) {
										self.registerElement(row);

										self._registerSelectionEvent(event, false);
									}

									var tcell = elements.tcell;
									if (tcell) {
										self._onTitleCellMouseDown(event, tcell);
										event.stopPropagation();
										return false;
									}

									if (elements.group) {
										var promise = self._groupSimpleClickPromise;
										if (promise) {
											self._groupSimpleClickPromise = undefined;
											$timeout.cancel(promise);
										}

										self._groupSimpleClickPromise = $timeout(function() {
											self._groupSimpleClickPromise = undefined;

											self.registerElement(elements.group);

											self._registerSelectionEvent(event, false);

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
						},

						_onMouseUp: function() {
							var self = this;

							return function(event) {
								var elements = searchElements();
								cm.ClearState(self, elements, "mouseDown", function(elements) {
								});
							};
						},

						_onKeyPress: function() {
							var self = this;
							return function(event) {
								var target = event.target;
								var elements = searchElements(target);

								// cc.log("KeyPress ", target, " event=", event, " elements=",
								// elements);

								if (elements.tcell) {
									// Le titre
									return self.onKeyPress_Title(elements.tcell, event, elements);
								}

								if (elements.cell) {
									// Cellule
									return self.onKeyPress_Cell(elements.cell, event);
								}

								if (elements.groupTitle) {
									// Cellule
									return self.onKeyPress_Cell(elements.groupTitle, event, elements.group);
								}
							};
						},

						_onGridStyleUpdate: function() {
							var _styleUpdateMapper = {
								grid: "gridStyleUpdate",
								table: "tableStyleUpdate",
								row: "rowStyleUpdate",
								cell: "cellStyleUpdate",
								title: "titleStyleUpdate",
								tcell: "titleCellStyleUpdate",
								group: "groupStyleUpdate"
							};

							var self = this;
							return function(event) {
								var target = event.relatedTarget;

								var type = cm.GetCMType(target);

								//$log.debug("Type of ", target, " => ", type);

								if (!type) {
									return;
								}

								var elt = angular.element(target);

								// cc.log("Update relatedTarget=", target, " type=" + type + "
								// over="
								// + target._over + " mouseDown="+ target._mouseDown);

								var rp = self[_styleUpdateMapper[type]];
								if (rp) {
									rp.call(self, elt);
									event.stopPropagation();
									return;
								}
							};
						}

					};

					return GridRenderer;
				} ]);
})(window, window.angular);