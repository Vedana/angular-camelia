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

	var module = angular.module("camelia.monitors");

	module.factory("camelia.monitor.QProgressMonitor", [ "$log",
		"$q",
		"camelia.core",
		"camelia.monitor.SubProgressMonitor",
		function($log, $q, cc, SubProgressMonitor) {

			var QProgressMonitor = {};

			QProgressMonitor.then = function(parentProgressMonitor, promise, ticks, label, options) {

				var sub = new SubProgressMonitor(parentProgressMonitor, ticks, options);
				sub.beginTask(label, 1);

				var deferred = $q.defer();

				promise.then(function onSuccess(value) {
					sub.done();

					deferred.resolve(value);

				}, function onError(reason) {
					sub.done();
					deferred.reject(reason);

				}, function onNotity(notification) {
					deferred.notify(notification);
				});

				return deferred.promise;
			};

			return QProgressMonitor;
		} ]);

})(window, window.angular);