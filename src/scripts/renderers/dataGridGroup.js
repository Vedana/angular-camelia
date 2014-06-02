/**
 * @product CameliaJS (c) 2014 Vedana http://www.vedana.com
 * @license Creative Commons - The licensor permits others to copy, distribute, display, and perform the work. In return, licenses may not use the work for commercial purposes -- unless they get the licensor's permission.
 * @author olivier.oeuillot@vedana.com
 */

(function(window, angular, undefined) {
	'use strict';

	var module = angular.module("camelia.renderers.grid");

	module.factory("camelia.renderers.grid.group", [ "$log",
		"camelia.core",
		"camelia.cmTypes",
		function($log, cc, cm) {

			var anonymousId = 0;

			return {
				groupRenderer: function(parentElement, groupProvider, groupScope, index, collapsed) {
					var doc = parentElement.ownerDocument || document;

					var tr = cc.createElement(parentElement, "tr", {
						id: "cm_group_" + (anonymousId++),
						role: "row",
						// "aria-hidden": "true",
						tabIndex: -1,
						$cm_groupIndex: index
					});

					var groupElement = tr[0];
					groupElement._collapsed = collapsed;

					var groupClassMode = groupProvider.titleClassMode;
					if (groupClassMode === undefined) {
						groupClassMode = 0;

						var expression = groupProvider.$scope.titleClassRawExpression;
						if (expression && expression.length) {
							var $interpolate = this.$interpolate;
							var groupClassExpression = expression;
							groupClassMode = 3;

							if (expression.indexOf($interpolate.startSymbol()) >= 0) {
								groupClassMode = 1;
								groupClassExpression = this.$interpolate(expression);

							} else if (expression.charAt(0) == '{' && expression.charAt(expression.length - 1) == '}') {
								// ng-class expression !
								groupClassMode = 2;
							}

							groupProvider.titleClassExpression = groupClassExpression;
						}

						groupProvider.titleClassMode = groupClassMode;
					}

					if (groupClassMode) {
						var obj = groupProvider.titleClassExpression;
						if (groupClassMode != 3) {
							obj = groupScope.$eval(obj);
						}

						if (obj) {
							if (angular.isString(obj)) {
								groupElement.cm_groupClasses = obj.split(" ");

							} else if (angular.isObject(obj)) {
								var ar = [];

								angular.forEach(obj, function(value, key) {
									if (value) {
										ar.push(key);
									}
								});

								if (ar.length) {
									groupElement.cm_groupClasses = ar;
								}
							}
						}
					}

					this.groupStyleUpdate(tr);

					var td = cc.createElement(tr, "td", {
						id: "cm_groupTitle_" + (anonymousId++),
						tabIndex: -1,
						nowrap: "nowrap",
						role: "gridcell",
						className: "cm_dataGrid_gcell",
						colspan: (this.visibleColumns.length + 1 + this.rowIndent)
					});

					var cellRenderer = this.groupTitleRenderer(td, groupProvider, groupScope, index);

					return tr;
				},

				groupTitleRenderer: function(td, groupProvider, groupScope, index) {
					var container = cc.createElement(td, "div", {
						className: "cm_dataGrid_gcontainer"
					});

					var expand = cc.createElement(container, "div", {
						className: "cm_dataGrid_gexpand",
						id: "cm_groupExpand_" + (anonymousId++)
					});

					var label = cc.createElement(container, "label", {
						className: "cm_dataGrid_glabel"
					});

					var value = null;
					var interpolatedExpression = groupProvider.interpolatedTitleExpression;
					if (!interpolatedExpression) {
						var expression = groupProvider.$scope.titleRawExpression;
						if (expression) {
							interpolatedExpression = this.$interpolate(expression);
							groupProvider.interpolatedTitleExpression = interpolatedExpression;
						}
					}

					if (interpolatedExpression) {
						var value = groupScope.$eval(interpolatedExpression);
						if (value) {
							label.text(value);
						}
					}

					var line = cc.createElement(container, "div", {
						className: "cm_dataGrid_gline"
					});

				},

				groupStyleUpdate: function(element) {
					var tr = element;
					if (tr[0]) {
						tr = tr[0];
					}

					var classes = [ "cm_dataGrid_group" ];

					if (tr.cm_groupClasses) {
						classes.push.apply(classes, tr.cm_groupClasses);
					}

					return cm.MixElementClasses(tr, classes);
				},
			};

		} ]);
})(window, window.angular);