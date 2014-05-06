(function(window, angular, undefined) {
	'use strict';

	var module = angular.module('camelia.directives.grid', [ 'camelia.core', 'camelia.criteriaRegistry' ]);

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
				cellImageURL: '@cellimageurl'
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
							column.appendCriteria(criteria);
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

	module.directive("cmCriteria", [ "camelia.core",
		"camelia.criteriaRegistry",
		"$log",
		function(cc, criteriaRegistry, $log) {
			return {
				require: "^cmDatacolumn",
				restrict: "E",
				scope: {
					name: '@',
					type: '@',
					value: '@',
					enabled: '=?'
				},
				compile: function() {
					return {
						post: function($scope, element, attrs, dataColumnController) {
							var type = $scope.type;

							var criteria = criteriaRegistry.get(type);
							if (criteria) {
								var criteria = new criteria($scope, element, attrs);
								dataColumnController.criterias.push(criteria);

							} else {
								$log.warn("Unknown criteria type '" + type + "'");
							}
						}
					};
				}
			};
		} ]);

})(window, window.angular);