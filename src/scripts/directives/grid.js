/**
 * @product CameliaJS (c) 2015 Vedana http://www.vedana.com
 * @license Creative Commons - The licensor permits others to copy, distribute,
 *          display, and perform the work. In return, licenses may not use the
 *          work for commercial purposes -- unless they get the licensor's
 *          permission.
 * @author olivier.oeuillot@vedana.com
 */

(function(window, angular, undefined) {
	'use strict';

	var module = angular.module('camelia.directives.grid', [ 'camelia.core',
		'camelia.directives.template',
		'camelia.components.grid' ]);

	module.value("cm_grid_componentProviderName", "camelia.components.grid:camelia.components.GridProvider");

	module.directive("cmDatagrid",
			[ "$injector",
				"$interpolate",
				"$log",
				"$q",
				"$exceptionHandler",
				"camelia.core",
				"cm_grid_componentProviderName",
				"camelia.directives.TemplateContainer",
				function($injector, $interpolate, $log, $q, $exceptionHandler, cc, cm_grid_componentProviderName,
						TemplateContainer) {

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
							lookId: '@',
							caption: '@',
							// rowClass: '@', // Raw attribute
							tabIndex: '@',
							id: '@',
							selection: '=?',
							cursor: '=?',
							columnCursor: '=?',
							first: '=?',
							rows: '=?',
							rowCount: '=?rowcount',
							selectable: '@',
							selectionCardinality: '@selectioncardinality'
						},
						replace: true,

						controller: [ "$scope", function($scope) {
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
							};

							this.getColumnIndex = function() {
								return $scope.columns.length;
							};

							$scope.groupProviders = [];
							this.appendGroupProvider = function(groupProvider) {
								$scope.groupProviders.push(groupProvider);
							};

							this.getProviderIndex = function() {
								return $scope.groupProviders.length;
							};
						} ],
						compile: function() {
							return {
								pre: function($scope, element, attrs, controller) {

									$scope.rowClassRawExpression = element.attr("rowClass");

									var dataGrid = new controller.componentProvider.DataGrid($scope, element, $interpolate);
									controller.dataGrid = dataGrid;

									TemplateContainer.MarkTemplateContainer($scope, element);
								},
								post: function($scope, element, attrs, controller) {
									TemplateContainer.RegisterTemplates($scope);

									var dataGrid = controller.dataGrid;

									var promise = $injector.invoke(dataGrid.construct, dataGrid);

									if (!cc.isPromise(promise)) {
										promise = $q.when(promise);
									}

									promise.then(function onSuccess(table) {
										$log.info("Table created ", table);

										element.replaceWith(table);

									}, function onError(reason) {
										if (reason instanceof Error) {
											$exceptionHandler(reason);

										} else {
											$log.error("Failed to create table ", reason);
										}
									});
								}
							};
						}
					};
				} ]);

	module.directive("cmDatacolumn", [ "camelia.core",
		"camelia.directives.TemplateContainer",

		function(cc, TemplateContainer) {
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
					watched: '@',
					editable: '@' // For aria-readOnly
				},
				controller: function() {
					this.criterias = [];
				},
				compile: function() {
					return {
						pre: function($scope, element, attrs) {
							$scope.valueRawExpression = element.attr("text") || element.attr("value");

							TemplateContainer.MarkTemplateContainer($scope, element);
						},
						post: function($scope, element, attrs, datagridController) {
							TemplateContainer.RegisterTemplates($scope);

							if ($scope.fieldName) {
								if (/[^\w]/.test($scope.fieldName)) {
									throw new Error("Invalid fieldName expression '" + $scope.fieldName + "' use value='{{" +
											$scope.fieldName + "}}' instead !");
								}
							}

							var controller = element.controller("cmDatacolumn");

							var column = new datagridController.componentProvider.DataColumn($scope, datagridController
									.getColumnIndex() + 1);

							angular.forEach(controller.criterias, function(criteria) {
								column.addCriteria(criteria);
							});

							datagridController.appendColumn(column);
						}
					};
				}
			};
		} ]);

	module.directive("cmDatagroup", [ "camelia.core",
		"camelia.directives.TemplateContainer",
		function(cc, TemplateContainer) {
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

							TemplateContainer.MarkTemplateContainer($scope, element);
						},
						post: function($scope, element, attrs, dataGridController) {
							TemplateContainer.RegisterTemplates($scope);

							var column = new dataGridController.componentProvider.DataGroup($scope, dataGridController
									.getProviderIndex() + 1);

							dataGridController.appendGroupProvider(column);
						}
					};
				}
			};
		} ]);

	module.directive("cmCriteria", [ "camelia.core",
		"$log",
		"$injector",
		"camelia.directives.TemplateContainer",
		function(cc, $log, $injector, TemplateContainer) {
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
							TemplateContainer.MarkTemplateContainer($scope, element);
						},
						post: function($scope, element, attrs, dataColumnController) {
							TemplateContainer.RegisterTemplates($scope);

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
								$injector.invoke([ criteriaName, function(CriteriaClass) {
									var criteria = new CriteriaClass($scope, element, attrs);

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