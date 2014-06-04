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

	var module = angular.module('camelia.directives.grid', [ 'camelia.core' ]);

	module.value("cm_grid_componentProviderName", "camelia.components.grid:camelia.components.GridProvider");

	module.directive("cmDatagrid", [ "$injector",
		"$interpolate",
		"$log",
		"$q",
		"camelia.core",
		"cm_grid_componentProviderName",
		function($injector, $interpolate, $log, $q, cc, cm_grid_componentProviderName) {

			return {
				restrict: "E",
				scope: {
					dataModelProvider: '=?',
					dataModelProviderName: '@datamodelprovider',
					componentProvider: '=?',
					componentProviderName: '@componentprovider',
					rendererProvider: '=?',
					rendererProviderName: '@rendererprovider',
					selectionProvider: '=?',
					selectionProviderName: '@selectionprovider',
					value: '=',
					varName: '@var',
					style: '@',
					className: '@class',
					caption: '@',
					// rowClass: '@', // Raw attribute
					tabIndex: '@',
					id: '@',
					selection: '=?',
					cursor: '=?',
					first: '=?',
					rows: '=?',
					rowCount: '=?rowcount',
					selectable: '@',
					selectionCardinality: '@selectioncardinality'
				},
				replace: true,

				controller: function($scope) {
					// var dataGridProvider='camelia.datagrid';

					var componentProvider = $scope.componentProvider;
					if (!componentProvider) {
						var componentProviderName = $scope.componentProviderName || cm_grid_componentProviderName;
						componentProvider = cc.LoadProvider(componentProviderName);
					}
					this.componentProvider = componentProvider;

					$scope.columns = [];
					this.appendColumn = function(column) {
						$scope.columns.push(column);
					}

					$scope.groupProviders = [];
					this.appendGroupProvider = function(groupProvider) {
						$scope.groupProviders.push(groupProvider);
					}
				},
				compile: function() {
					return {
						pre: function($scope, element, attrs, controller) {

							$scope.rowClassRawExpression = element.attr("rowClass");

							var dataGrid = new controller.componentProvider.DataGrid($scope, element, $interpolate);
							controller.dataGrid = dataGrid;
						},
						post: function($scope, element, attrs, controller) {
							var dataGrid = controller.dataGrid;

							var promise = $injector.invoke(dataGrid.construct, dataGrid);

							if (!cc.isPromise(promise)) {
								promise = $q.when(promise);
							}

							promise.then(function(table) {
								$log.info("Table created ", table);

								element.replaceWith(table);

							}, function(reason) {
								$log.error("Failed to create table ", reason);
							});
						}
					};
				}
			};
		} ]);

	module.directive("cmDatacolumn", [ "camelia.core", function(cc) {
		return {
			require: "^cmDatagrid",
			restrict: "E",
			replace: true,
			scope: {
				id: '@',
				visible: '@',
				titleAlign: '@titlealign',
				cellAlign: '@cellalign',
				width: '@',
				maxWidth: '@maxwidth',
				minWidth: '@minwidth',
				title: '@',
				cellClass: '@',
				columnClass: '@',
				sorter: '@',
				resizeable: '@',
				checkable: '@',
				fieldName: '@fieldname',
				checkList: '=?',
				columnImageURL: '@columnimageurl',
				cellImageURL: '@cellimageurl',
				criteriaValue: '@criteriavalue',
			},
			controller: function($scope) {
				this.criterias = [];
			},
			compile: function() {
				return {
					pre: function($scope, element, attrs) {
						$scope.valueRawExpression = element.attr("text") || element.attr("value");
					},
					post: function($scope, element, attrs, datagridController) {
						var controller = element.controller("cmDatacolumn");

						var column = new datagridController.componentProvider.DataColumn($scope);

						angular.forEach(controller.criterias, function(criteria) {
							column.addCriteria(criteria);
						});

						datagridController.appendColumn(column);
					}
				};
			}
		};
	} ]);

	module.directive("cmDatagroup", [ "camelia.core", function(cc) {
		return {
			require: "^cmDatagrid",
			restrict: "E",
			scope: {
				title: '@',
				value: '@',
				closeable: '@',
				disabled: '@',
				collapsedGroups: '=?collapsedgroups',
				className: '@class',
				sorter: '@'
			},
			compile: function() {
				return {
					pre: function($scope, element, attrs) {
						$scope.titleRawExpression = element.attr("title");
						$scope.titleClassRawExpression = element.attr("titleclass");
						$scope.valueRawExpression = element.attr("value");
					},
					post: function($scope, element, attrs, dataGridController) {
						var column = new dataGridController.componentProvider.DataGroup($scope);

						dataGridController.appendGroupProvider(column);
					}
				}
			}
		};
	} ]);

	module.directive("cmCriteria", [ "camelia.core", "$log", "$injector", function(cc, $log, $injector) {
		return {
			require: "^cmDatacolumn",
			restrict: "E",
			scope: {
				type: '@'
			},
			compile: function() {
				return {
					pre: function($scope, element, attrs) {

						// console.log("PRE Criteria " + attrs.name);
					},
					post: function($scope, element, attrs, dataColumnController) {
						var type = $scope.type;
						if (!angular.isString(type) || !type.length) {
							throw new Error("Invalid criteria type (" + type + ")");
						}

						var criteriaName;
						var idx = type.indexOf('.');
						if (idx >= 0) {
							criteriaName = type;

						} else {
							criteriaName = "camelia.criteria." + type;
						}

						// console.log("POST Criteria " + attrs.name);

						var criterias = dataColumnController.criterias;
						try {
							$injector.invoke([ criteriaName, function(criteriaClass) {
								var criteria = new criteriaClass($scope, element, attrs);

								criterias.push(criteria);
							} ]);

						} catch (x) {
							$log.error("Can not instantiate criteria '" + criteriaName + "'", x);
						}

					}
				};
			}
		};
	} ]);

})(window, window.angular);