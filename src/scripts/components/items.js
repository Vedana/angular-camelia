/**
 * @product CameliaJS (c) 2016 Vedana http://www.vedana.com
 * @license Creative Commons - The licensor permits others to copy, distribute,
 *          display, and perform the work. In return, licenses may not use the
 *          work for commercial purposes -- unless they get the licensor's
 *          permission.
 * @author olivier.oeuillot@vedana.com
 */

(function(window, angular, undefined) {
	'use strict';

	var module = angular.module("camelia.components.items", [ "camelia.core", "camelia.dataModel" ]);

	var anonymousId = 0;

	var whiteSpacesSplitRegExp = /[\p{P}\p{Z}\p{S}]+/;

	/*
	 * ------------------------ Item --------------------------
	 */

	module.factory("camelia.components.Item", [ "$log", "camelia.core", "camelia.CharsetUtils", function($log, cc, chu) {

		var Item = function($scope, element, containerScope) {
			this.$scope = $scope;
			this.id = $scope.id || ("item_" + (anonymousId++));
			// element.data("cm_component", this);

			if (!containerScope.items) {
				containerScope.items = [];
			}

			containerScope.items.push(this);
		};

		Item.prototype = {

			isVisible: function() {
				return this.$scope.visible !== false;
			},

			hasItem: function(listContext, item) {
				var $scope = this.$scope;

				if (angular.equals(item, $scope.value)) {
					return true;
				}

				return false;
			},

			/**
			 * @returns {Promise}
			 */
			filter: function(listContext, filterValue) {
				var $scope = this.$scope;

				if (!filterValue) {
					listContext.list.push($scope);
					return;
				}

				var words = this._words;
				if (!words) {
					words = $scope.searchWords || $scope.label;
					if (!angular.isArray(words)) {
						var swords = words.split(whiteSpacesSplitRegExp);

						// $log.debug("Split '" + words + "' to ", swords);
						words = swords;
					}
					if (listContext.ignoreAccents) {
						for (var j = 0; j < words.length; j++) {
							words[j] = chu.removeAccents(words[j]);
						}
					}
					this._words = words;
				}

				var regExp = listContext.filterRegexp;
				for (var i = 0; i < words.length; i++) {
					var test = regExp.test(words[i]);
					// $log.debug("Test '" + regExp + "' of '" + words[i] + "' returns " +
					// test);

					if (!test) {
						continue;
					}

					if (listContext.offset > 0) {
						listContext.offset--;
						return;
					}

					listContext.list.push($scope);
					return;
				}
			}

		};

		return Item;

	} ]);

	/*
	 * ------------------------ Items --------------------------
	 */

	module.factory("camelia.components.Items", [ "$log",
		"$q",
		"camelia.core",
		"camelia.DataModel",
		function($log, $q, cc, DataModel) {

			var Items = function($scope, element, containerScope) {
				this.$scope = $scope;
				this.id = $scope.id || ("items_" + (anonymousId++));
				// element.data("cm_component", this);

				if (!containerScope.items) {
					containerScope.items = [];
				}

				containerScope.items.push(this);
			};

			Items.prototype = {

				isVisible: function() {
					return this.$scope.visible !== false;
				},

				hasItem: function(listContext, item) {
					var $scope = this.$scope;

					var label;
					var itemLabel = $scope.itemLabel;
					if (itemLabel) {
						var labelExpression = listContext.$interpolate(itemLabel);

						var $itemScope = listContext.$scope.$parent.$new(false);
						try {
							$itemScope.$item = item;
							var varName = this.$scope.varName;
							if (varName) {
								$itemScope[varName] = item;
							}

							label = $itemScope.$eval(labelExpression);
							if (label !== undefined) {
								return true;
							}
						} finally {
							$itemScope.destroy();
						}
					}

					var itemColumn = this.$scope.itemColumn;
					if (itemColumn) {
						label = item[this.$scope.itemColumn];
						if (label !== undefined) {
							return true;
						}
					}

					label = item.label;
					if (label) {
						return true;
					}

					return false;
				},

				filter: function(listContext, filterValue) {
					var $scope = this.$scope;

					var dataModel = DataModel.From($scope.value || []);

					// ignoreAccents: criterias.ignoreAccents,
					// ignoreCase: criterias.ignoreCase,
					// maxItems: maxItems || this.$scope.maxItems

					var filter = {
						startsWith: filterValue
					};

					var fetchProperties = {};
					if (listContext.maxItems) {
						fetchProperties.rows = listContext.maxItems;
					}
					if (listContext.ignoreAccents) {
						fetchProperties.ignoreAccents = true;
						filter.ignoreAccents = true;

					}
					if (listContext.ignoreCase) {
						fetchProperties.ignoreCase = true;
						filter.ignoreCase = true;
					}

					var columnName = $scope.itemColumn || $scope.id || "comboColumn";

					dataModel.setFilters([ {
						id: columnName,
						filters: [ {
							type: "Alphabetic",
							parameters: filter
						} ]
					} ]);
					dataModel.setSorters([ {
						column: columnName,
						ascending: true
					} ]);

					dataModel.setFetchProperties(fetchProperties);

					var context = {
						listContext: listContext
					};

					var rowCount = dataModel.getRowCount();
					rowCount = cc.ensurePromise(rowCount);

					function release() {
						dataModel.setRowIndex(-1);

						var evalScope = context.$scope;
						if (evalScope) {
							evalScope.$destroy();
						}
					}

					var self = this;
					return rowCount.then(function onSuccess0(rowCount) {
						var index = 0;

						if (rowCount >= 0) {
							if (listContext.offset > 0) {
								if (rowCount <= listContext.offset) {
									listContext.offset -= rowCount;

									return $q.when(false);
								}

								index = listContext.offset;
							}
						}

						var deferred = $q.defer();

						dataModel.setRowIndex(index);
						var available = dataModel.isRowAvailable();
						available = cc.ensurePromise(available);

						function onError(reason) {
							release();

							deferred.reject(reason);
						}

						function onUpdate(update) {
							deferred.notify(update);
						}

						function onSuccess(result) {
							if (!result) {
								release();

								return deferred.resolve(false);
							}

							if (listContext.offset > 0) {
								listContext.offset--;

							} else {
								var row = dataModel.getRowData();
								self._processRow(context, listContext.list, row);

								index++;
								if (listContext.maxItems > 0) {
									listContext.maxItems--;

									if (!listContext.maxItems) {
										release();
										return deferred.resolve(true);
									}
								}
							}

							dataModel.setRowIndex(index);
							available = dataModel.isRowAvailable();
							available = cc.ensurePromise(available);

							return available.then(onSuccess, onError, onUpdate);
						}

						available.then(onSuccess, onError, onUpdate);

						return deferred.promise;
					});
				},
				_processRow: function(context, list, row) {
					var $itemScope = context.$itemScope;
					var listContext = context.listContext;

					if (!$itemScope) {

						$itemScope = listContext.$scope.$parent.$new(false);
						context.$itemScope = $itemScope;

						var $interpolate = listContext.$interpolate;

						var self = this;
						angular.forEach([ "itemLabel", "itemTooltip", "itemClass", "itemDisabled" ], function(expName) {
							var exp = self.$scope[expName];
							if (!exp) {
								return;
							}

							context[expName + "Expression"] = $interpolate(exp);
						});
					}

					$itemScope.$item = row;
					var varName = this.$scope.varName;
					if (varName) {
						$itemScope[varName] = row;
					}

					var ret = {
						$item: row
					};

					var label;
					if (context.itemLabelExpression) {
						label = $itemScope.$eval(context.itemLabelExpression);

					} else if (this.$scope.itemColumn) {
						label = row[this.$scope.itemColumn];

					} else if (typeof (row.toItemText) === "function") {
						label = row.toItemText();

					} else if (row.label !== undefined) {
						label = row.label;

					} else {
						label = String(row);
					}
					ret.label = label;

					var tooltip = null;
					if (context.itemTooltipExpression) {
						tooltip = $itemScope.$eval(context.itemTooltipExpression);

					} else if (row.tooltip !== undefined) {
						tooltip = row.tooltip;
					}
					if (tooltip) {
						ret.tooltip = tooltip;
					}

					var className = null;
					if (context.itemClassExpression) {
						className = $itemScope.$eval(context.itemClassExpression);

					} else if (row.className !== undefined) {
						className = row.className;
					}
					if (className) {
						ret.className = className;
					}

					var disabled = false;
					if (context.itemDisabledExpression) {
						disabled = $itemScope.$eval(context.itemDisabledExpression);

					} else if (row.disabled !== undefined) {
						disabled = row.disabled;
					}
					if (disabled) {
						ret.disabled = disabled;
					}

					list.push(ret);
				}
			};

			return Items;

		} ]);

})(window, window.angular);