/**
 * @product CameliaJS (c) 2014 Vedana http://www.vedana.com
 * @license Creative Commons - The licensor permits others to copy, distribute,
 *          display, and perform the work. In return, licenses may not use the
 *          work for commercial purposes -- unless they get the licensor's
 *          permission.
 * @author olivier.oeuillot@vedana.com
 */

(function(window, angular, undefined) {
	"use strict";

	var module = angular.module("camelia.renderers.grid", [ "camelia.dataModel",
		"camelia.selectionProvider",
		"camelia.cursorProvider",
		"camelia.selectionStrategy",
		"camelia.key",
		"camelia.renderers.popup",
		"camelia.components.grid",
		"camelia.animations.grid",
		"camelia.i18n.grid" ]);

	module.value("cm_grid_rowIndentPx", 16);
	module.value("cm_grid_className", "cm_dataGrid");
	module.value("cm_grid_sizerPx", 6);

	module.factory("camelia.renderers.GridProvider", [ "$log",
		"camelia.renderers.grid.core",
		"camelia.renderers.grid.group",
		"camelia.renderers.grid.row",
		"camelia.renderers.grid.table",
		"camelia.renderers.grid.title",
		"camelia.renderers.grid.utils",
		function($log, CoreRenderers, GroupRenderers, RowRenderers, TableRenderers, TitleRenderers, GridUtils) {

			angular.forEach([ GroupRenderers, RowRenderers, TableRenderers, TitleRenderers, GridUtils ], function(renderer) {
				angular.extend(CoreRenderers.prototype, renderer);
			});

			return CoreRenderers;
		} ]);

})(window, window.angular);