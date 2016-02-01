/**
 * @product CameliaJS (c) 2016 Vedana http://www.vedana.com
 * @license Creative Commons - The licensor permits others to copy, distribute,
 *          display, and perform the work. In return, licenses may not use the
 *          work for commercial purposes -- unless they get the licensor's
 *          permission.
 * @author olivier.oeuillot@vedana.com
 */

(function(window, angular, undefined) {
	"use strict";

	var module = angular.module("camelia.i18n.progressMonitor", []);

	module.factory("camelia.i18n.ProgressMonitor", [ function() {

		return {
			'en': {
				canceled: "Canceled task",
				done: "Finished task"
			}
		};

	} ]);

})(window, window.angular);