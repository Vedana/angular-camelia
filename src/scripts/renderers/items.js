/**
 * @product CameliaJS (c) 2015 Vedana http://www.vedana.com
 * @license Creative Commons - The licensor permits others to copy, distribute,
 *          display, and perform the work. In return, licenses may not use the
 *          work for commercial purposes -- unless they get the licensor's
 *          permission.
 * @author olivier.oeuillot@vedana.com
 */

/* jshint sub: true, shadow: true, scripturl: true */
/* jshint -W080 */

(function(window, angular, undefined) {
	"use strict";

	var module = angular.module("camelia.renderers.items", [ "camelia.core" ]);

	var MAX_ITEMS = 64;

	module.factory("camelia.renderers.Items", [ "$log",
		"$q",
		"$exceptionHandler",
		"$timeout",
		"camelia.core",
		"camelia.CharsetUtils",
		function($log, $q, $exceptionHandler, $timeout, cc, chu) {

			function ItemsRenderer(renderContext) {
				angular.extend(this, renderContext);
			}

			ItemsRenderer.prototype = {

				listItems: function(inputValue, maxItems, criterias) {

					if (!maxItems || maxItems < 0 || maxItems > MAX_ITEMS) {
						maxItems = MAX_ITEMS;
					}

					var key = {
						inputValue: inputValue,
						maxItems: maxItems,
						criterias: criterias
					};
					var jsonKey = angular.toJson(key);
					if (this._lastKey === jsonKey) {
						return $q.when(this._lastItems);
					}

					criterias = criterias || {};

					var ret = [];
					var itemsContext = {
						list: ret,
						ignoreAccents: criterias.ignoreAccents,
						ignoreCase: criterias.ignoreCase,
						maxItems: maxItems || this.$scope.maxItems || -1,
						offset: 0,
						$interpolate: this.$interpolate,
						$scope: this.$scope
					};

					if (itemsContext.ignoreAccents) {
						inputValue = chu.removeAccents(inputValue);
					}

					if (inputValue) {
						itemsContext.filterRegexp = new RegExp("^" + cc.escapeRegexp(inputValue) + ".*$",
								(itemsContext.ignoreCase) ? "i" : "");
					}

					var items = this.$scope.items || [];

					var retPromise = null;

					for (var i = 0; i < items.length; i++) {
						var item = items[i];
						var promise = item.filter(itemsContext, inputValue);

						if (!retPromise) {
							if (!cc.isPromise(promise)) {
								if (itemsContext.maxItems > 0 && itemsContext.list.length >= itemsContext.maxItems) {
									break;
								}
								continue;
							}

							retPromise = promise;
							continue;
						}

						retPromise = retPromise.then(function() {
							if (itemsContext.maxItems > 0 && itemsContext.list.length >= itemsContext.maxItems) {
								return;
							}
							return cc.callPromise(promise, self);
						});
					}

					if (!retPromise) {
						retPromise = $q.when(ret);
					}

					return retPromise.then(function() {
						$log.debug("Search of '" + inputValue + "' maxItems=" + itemsContext.maxItems + " returns " + ret.length +
								" items");

						self._lastKey = jsonKey;
						self._lastItems = ret;

						return ret;
					});
				}
			};

			return ItemsRenderer;

		} ]);
})(window, window.angular);