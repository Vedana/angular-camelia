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

	var module = angular.module('camelia.cursorProvider', [ "camelia.core" ]);

	module.factory('camelia.CursorProvider', [ "$rootScope", "camelia.core", function($rootScope, cc) {

		var scopeProto = cc.getProto($rootScope);

		function CursorProvider($parentScope) {
			cc.inheritScope(this, $parentScope);
		}

		CursorProvider.CURSOR_REQUESTED = "cm:cursorRequested";
		CursorProvider.CURSOR_CHANGED = "cm:cursorChanged";

		cc.extendProto(CursorProvider, scopeProto, {

			getRow: function() {
				var rowValue = this._rowCursor;

				return rowValue;
			},

			getColumn: function() {
				var column = this._columnCursor;

				return column;
			},

			setCursor: function(row, column, sourceEvent) {

				//cc.log("SetCursor row=", row, " column=", (column) ? column.id : null, " event=", sourceEvent);

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
					oldColumn: oldColumn,
					sourceEvent: sourceEvent
				});
			},

			requestCursor: function(row, column, event) {

				this.setCursor(row, column, event);

				if (false) {
					this.$emit(CursorProvider.REQUEST_CURSOR, {
						row: row,
						column: column
					});
				}
			}
		});

		return CursorProvider;
	} ]);

})(window, window.angular);