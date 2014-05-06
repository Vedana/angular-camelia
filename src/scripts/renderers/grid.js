(function(window, angular, undefined) {
	"use strict";

	var module = angular.module("camelia.renderers.grid", [ "camelia.dataModel",
		"camelia.selectionProvider",
		"camelia.cursorProvider",
		"camelia.selectionStrategy",
		"camelia.key",
		"camelia.components.grid" ]);

	module.factory("camelia.renderers.GridProvider", [ "$log",
		"camelia.renderers.grid.core",
		"camelia.renderers.grid.group",
		"camelia.renderers.grid.row",
		"camelia.renderers.grid.table",
		"camelia.renderers.grid.title",
		function($log, CoreRenderers, GroupRenderers, RowRenderers, TableRenderers, TitleRenderers) {

			var renderers = {};

			angular.forEach([ CoreRenderers, GroupRenderers, RowRenderers, TableRenderers, TitleRenderers ], function(
					renderer) {
				angular.extend(renderers, renderer);
			});

			return renderers;
		} ]);

})(window, window.angular);