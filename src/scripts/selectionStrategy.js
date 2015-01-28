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

	var module = angular.module('camelia.selectionStrategy', [ "camelia.core", "camelia.scopedObject" ]);

	module.factory('camelia.SelectionStrategy', [ "$rootScope",
		"$injector",
		"camelia.core",
		"camelia.ScopedObject",
		function($rootScope, $injector, cc, ScopedObject) {

			function SelectionStrategy($parentScope, cardinality) {
				ScopedObject.call(this, $parentScope);

				this._cardinality = SelectionStrategy._GetCardinality(cardinality);
			}

			SelectionStrategy.BASE_CHANGED_EVENT = "cm:baseChanged";

			SelectionStrategy.OPTIONAL = "optional";
			SelectionStrategy.ZEROMANY = "zeroMany";
			SelectionStrategy.ONE = "one";
			SelectionStrategy.ONEMANY = "oneMany";

			SelectionStrategy._GetCardinality = function(type) {
				switch (type.toLowerCase()) {
				case "optional":
				case "?":
					return 0;

				case "zeromany":
				case "*":
					return 2;

				case "one":
				case "1":
					return 1;

				case "onemany":
				case "+":
					return 3;
				}

				throw new Error("Invalid '" + type + "' cardinality");
			};

			SelectionStrategy.CreateDefault = function($parentScope, cardinality) {
				return $injector.invoke([ "camelia.WinSelectionStrategy", function(WinSelectionStrategy) {
					return new WinSelectionStrategy($parentScope, cardinality);
				} ]);
			};

			cc.extend(SelectionStrategy, ScopedObject, {
				getBase: function() {
					return null;
				},

				select: function(selectionProvider, rowValues, cursorValue, event, computeRangeFunc, byKeyPress, activate) {
					return null;
				}
			});

			return SelectionStrategy;
		} ]);

	/*
	 * ------------------------ WinSelectionStrategy --------------------------
	 */

	module.factory('camelia.WinSelectionStrategy', [ "camelia.SelectionStrategy",
		'camelia.core',
		function(SelectionStrategy, cc) {

			var WinSelectionStrategy = function($parentScope, cardinality) {
				SelectionStrategy.prototype.constructor.call(this, $parentScope, cardinality);
			};

			cc.extend(WinSelectionStrategy, SelectionStrategy, {

				getBase: function() {
					return this._base;
				},

				select: function(selectionProvider, rowValues, cursorValue, event, computeRangeFunc, activate) {

					var byKeyPress = (event && event.type && !event.type.indexOf("key"));

					if (byKeyPress && event.ctrlKey && !activate) {
						return;
					}

					if (this._cardinality == 0x01) {
						this._base = cursorValue;
						this.$emit(SelectionStrategy.BASE_CHANGED_EVENT, cursorValue);

						selectionProvider.set(rowValues);
						return;
					}

					if (event && event.shiftKey) {
						var range = computeRangeFunc(this.getBase());
						if (range) {
							if (event.ctrlKey) {
								selectionProvider.add(range);
								return;
							}

							selectionProvider.set(range);
							return;
						}
					}

					if (event && event.ctrlKey) {
						var count = selectionProvider.count();
						if (selectionProvider.containsAll(rowValues)) {
							if (this._cardinality == 0x03 && count < 2) {
								return;
							}
							selectionProvider.remove(rowValues);
							return;
						}

						if (this._cardinality) {
							selectionProvider.add(rowValues);

							// this._base = cursorValue;
							// this.$emit(SelectionStrategy.BASE_CHANGED_EVENT, cursorValue);
							return;
						}
					}

					this._base = cursorValue;
					this.$emit(SelectionStrategy.BASE_CHANGED_EVENT, cursorValue);

					selectionProvider.set(rowValues);
				}
			});

			return WinSelectionStrategy;
		} ]);

})(window, window.angular);