(function(window, angular, undefined) {
	'use strict';

	var module = angular.module('camelia.cursorProvider', [ "camelia.core" ]);
	
	module.factory('camelia.CursorProvider', [ "$rootScope", "camelia.core", function($rootScope, cc) {

		var scopeProto = $rootScope.__proto__ || Object.getPrototypeOf($rootScope);

		function CursorProvider(cardinality) {
			scopeProto.constructor.call(this);
		}

		CursorProvider.CURSOR_CHANGED = "cursorChanged";

		CursorProvider.prototype = Object.create(scopeProto);
		angular.extend(CursorProvider.prototype, {
			constructor: CursorProvider,

			getRowCursor: function() {
				var rowValue = this._rowCursor;

				return rowValue;
			},

			setCursor: function(row, column) {

				// cc.log("SetCursor row=", row, " column=", (column) ? column.id :
				// null);

				if (this._rowCursor === row && this._columnCursor === column) {
					return;
				}

				var oldRow = this._rowCursor;
				var oldColumn = this._columnCursor;

				this._rowCursor = row;
				this._columnCursor = column;

				this.$emit(CursorProvider.CURSOR_CHANGED, {
					row: row,
					column: column,
					oldRow: oldRow,
					oldColumn: oldColumn
				});
			}
		});

		return CursorProvider;
	} ]);

})(window, window.angular);