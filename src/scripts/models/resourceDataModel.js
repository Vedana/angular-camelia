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

	var __SLOW_LOADING_SIMULATION = false;
	var __ERROR_LOADING_SIMULATION = 0;

	var module = angular.module('camelia.dataModel');

	module.factory('camelia.ResourceDataModel', [ '$q',
		'$timeout',
		'$log',
		'camelia.DataModel',
		'camelia.core',
		function($q, $timeout, $log, DataModel, cc) {

			var DEFAULT_VALUES = {
				pageSize: 20,
				offsetMod: 10,
				offsetParameter: "offset",
				countParameter: "count",
				sorterParameter: "sorter",
				filterParameter: "filter",
				actionName: "query",
				keepCache: false
			};

			var sessionId = 0;

			function ResourceDataModel($resource, configuration) {
				DataModel.call(this);

				angular.extend(this, angular.extend(DEFAULT_VALUES, configuration || {}));
				this.$resource = $resource;

				this._sessionId = 0;
				this._rowCount = -1;

				this._cache = [];

				var self = this;
				this.$on("begin", function() {
					self._sessionId = (sessionId++);
					// console.log("Start session " + self._sessionId);
				});

				this.$on("end", function() {
					// console.log("End session " + self._sessionId);
					self._sessionId = -1;

					var requestPromise = self._requestPromise;
					if (requestPromise) {
						self._requestPromise = undefined;
						requestPromise.cancel();
					}
				});

				this.$on("clearState", function() {
					// debugger;
					self._cache = [];
					self._rowCount = -1;
				});
			}

			cc.extend(ResourceDataModel, DataModel, {

				isRowAvailable: function() {
					this.needRowAvailable = false;
					var rowIndex = this.getRowIndex();

					var cache = this._cache;
					if (cache[rowIndex] !== undefined) {
						// console.log("Ask for #" + rowIndex + " => in cache !");
						return true;
					}

					if (this._rowCount >= 0 && rowIndex >= this._rowCount) {
						// console.log("Ask for #" + rowIndex + " => outside of rowCount");
						return false;
					}

					this.sortSupport = false;
					this.filterSupport = false;

					var deferred = $q.defer();

					var fetchProperties = this._fetchProperties;

					var offset = rowIndex;
					var fetchRows = (fetchProperties && fetchProperties.rows) || 0;
					var rows = Math.max(fetchRows, this.pageSize);

					if (this.offsetMod > 0) {
						offset -= (offset % this.offsetMod);

						var last = (rowIndex + rows - 1);
						last -= (last % this.offsetMod);

						rows = (Math.floor((last - offset) / this.pageSize) + 1) * this.pageSize;

						// console.log("rowIndex=" + rowIndex + " offset=" + offset + "
						// last="
						// + last + " rows=" + rows + " pageSize="+ this.pageSize);
					}

					if (this._keepCache === false) {
						cache = [];
						this._cache = cache;

					} else {
						for (var i = offset + rows - 1; i > offset; i--) {
							if (cache[i] === undefined) {
								break;
							}
							rows--;
						}
					}

					var currentSessionId = this._sessionId;

					var actionName = this.actionName;

					var params = {};
					params[this.offsetParameter] = offset;
					params[this.countParameter] = rows;

					if (this._sorters && this.sorterParameter) {
						var ss = [];
						params[this.sorterParameter] = ss;

						angular.forEach(this._sorters, function(sorter) {
							var expression = sorter.expression || sorter.column;

							if (!sorter.ascending) {
								expression += ":desc";
							}

							ss.push(expression);
						});

						this.sortSupport = true;
					}

					var filters = this._filters;
					if (filters && this.filterParameter) {

						var ps = [];
						angular.forEach(filters, function(filter) {

							if (filter.toJson) {
								var parameters = filter.toJson();
								if (parameters) {
									ps.push(parameters);
								}
								return;
							}

							if (typeof (filter) === "function") {
								filter(params);
								return;
							}

							var j = angular.toJson(filter);
							if (j) {
								ps.push(j);
								return;
							}
						});
						if (ps.length) {
							params[this.filterParameter] = ps;
						}

						this.filterSupport = true;
					}

					if (this._rowCount < 0 && this.requestRowCountParameter) {
						params[this.requestRowCountParameter] = true;
					}

					var requestPromise = this._requestPromise;
					if (requestPromise) {
						this._requestPromise = undefined;
						requestPromise.cancel();
					}

					var self = this;
					var ret = this.$resource[actionName].call(this.$resource, params, function(response, responseHeaders) {
						try {
							self._requestPromise = undefined;
							if (self._sessionId !== currentSessionId) {
								return deferred.reject("Session canceled");
							}
							if (__ERROR_LOADING_SIMULATION === 2) {
								deferred.reject({
									type: "RESOURCE_ERROR",
									error: "Simulation 2"
								});
								return;
							}
							if (__ERROR_LOADING_SIMULATION === 3) {
								throw new Error({
									type: "RESOURCE_ERROR",
									error: "Simulation 3"
								});
							}
							if (__SLOW_LOADING_SIMULATION) {
								$timeout(function() {
									deferred.notify({
										type: DataModel.DATA_LOADED,
										count: response.length
									});
								}, 1000 * 4);
							} else {
								deferred.notify({
									type: DataModel.DATA_LOADED,
									count: response.length
								});
							}

							for (var i = 0; i < response.length; i++) {
								cache[i + offset] = response[i];
								// console.log("Reg#" + (i + offset) + " => " + response[i]);
							}
							if (response.length < rows) {
								if (response.length || !offset) {
									self._rowCount = offset + response.length;
								}
							}

							// console.log("Ask for #" + rowIndex + " => Deferred " +
							// cache[rowIndex]);

							if (__SLOW_LOADING_SIMULATION) {
								$timeout(function() {
									deferred.resolve(cache[rowIndex] !== undefined);
								}, 1000 * 6);
							} else {
								deferred.resolve(cache[rowIndex] !== undefined);
							}
						} catch (x) {
							deferred.reject({
								type: "RESOURCE_ERROR",
								error: x
							});
						}
					}, function(error) {
						$log.error("Resource got error ", error);
						return deferred.reject({
							type: "RESOURCE_ERROR",
							error: error
						});
					});

					this._requestPromise = ret.$promise;

					this._requestPromise.then(null, null, function() {
						if (self._sessionId !== currentSessionId) {
							return;
						}

						console.log("progress ...");

						deferred.notify({
							type: DataModel.DATA_LOADING
						});
					});

					$timeout(function() {
						deferred.notify({
							type: DataModel.DATA_REQUESTING
						});
					}, 0);

					if (__ERROR_LOADING_SIMULATION === 1) {
						throw new Error({
							type: "RESOURCE_ERROR",
							error: "Simulation 1"
						});
					}

					if (__SLOW_LOADING_SIMULATION) {
						$timeout(function() {
							deferred.notify({
								type: DataModel.DATA_LOADING
							});
						}, 1000 * 2);
					}

					// console.log("Ask for #" + rowIndex + " => Returns promise");

					return deferred.promise;
				},

				setRowIndex: function(index) {
					// console.log("Set rowIndex=" + index);
					ResourceDataModel.prototype.$super.setRowIndex.call(this, index);
					this.needRowAvailable = true;
				},
				getRowData: function() {
					if (this.needRowAvailable) {
						debugger;
					}

					var rowIndex = this.getRowIndex();

					var ret = this._cache[rowIndex];

					// console.log("#" + rowIndex + " => " + ret + " " + typeof
					// (rowIndex));

					if (ret === undefined) {
						debugger;
					}

					return ret;
				},
				getRowCount: function(force) {
					return this._rowCount;
				},
				setSorters: function(sorters) {
					ResourceDataModel.prototype.$super.setSorters.call(this, sorters);
					this._cache = [];
					this._rowCount = -1;
				},
				setFilters: function(filters) {
					ResourceDataModel.prototype.$super.setFilters.call(this, filters);
					this._cache = [];
					this._rowCount = -1;
				},
				setGrouped: function(grouped) {
					ResourceDataModel.prototype.$super.setGrouped.call(this, grouped);
					this._cache = [];
					this._rowCount = -1;
				}

			});

			return ResourceDataModel;
		} ]);

})(window, window.angular);