/**
 * @license CameliaJS (c) 2014 Vedana http://www.vedana.com
 * @author olivier@oeuillot.net
 */

(function(window, angular, undefined) {
	'use strict';

	var module = angular.module('camelia.selectionStrategy', [ "camelia.core" ]);

	module.factory('camelia.SelectionStrategy', [ "$rootScope", "$injector", function($rootScope, $injector) {

		var scopeProto = $rootScope.__proto__ || Object.getPrototypeOf($rootScope);

		function SelectionStrategy(cardinality) {
			scopeProto.constructor.call(this);
			this.$parent = $rootScope;

			this._cardinality = SelectionStrategy._GetCardinality(cardinality);
		}

		SelectionStrategy.BASE_CHANGED_EVENT = "baseChanged";
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
		}

		SelectionStrategy.CreateDefault = function(cardinality) {
			return $injector.invoke([ "camelia.WinSelectionStrategy", function(WinSelectionStrategy) {
				return new WinSelectionStrategy(cardinality);
			} ]);
		};

		SelectionStrategy.prototype = Object.create(scopeProto);
		angular.extend(SelectionStrategy.prototype, {
			constructor: SelectionStrategy,

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
		function(SelectionStrategy) {

			var WinSelectionStrategy = function(cardinality) {
				SelectionStrategy.prototype.constructor.call(this, cardinality);
			}

			WinSelectionStrategy.prototype = Object.create(SelectionStrategy.prototype);
			angular.extend(WinSelectionStrategy.prototype, {
				constructor: WinSelectionStrategy,

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

						if (this._cardinality != 0x00) {
							selectionProvider.add(rowValues);
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