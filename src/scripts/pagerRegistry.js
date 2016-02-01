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

	var module = angular.module("camelia.pagerRegistry", [ "camelia.core" ]);

	module.factory("camelia.PagerRegistry", [ "$log", "$q", "camelia.core", function($log, $q, cc) {

		var doc = angular.element(document);
		var controller = doc.controller("cmPagerRegistry");

		if (!controller) {
			controller = {
				promisesByTargetId: {}
			};

			doc.data('$cmPagerRegistryController', controller);
		}

		var promisesByTargetId = controller.promisesByTargetId;

		var PagerRegistry = {

			RegisterWaitingFor: function($pagerScope, targetId) {

				var pagerDeferredList = promisesByTargetId[targetId];

				var target = document.getElementById(targetId);
				if (target && target.cmPagerRegistred) {
					delete promisesByTargetId[targetId];

					if (pagerDeferredList) {
						angular.forEach(pagerDeferredList, function(deferred) {
							deferred.resolve(target);
						});
					}

					return $q.when(target);
				}

				if (!pagerDeferredList) {
					pagerDeferredList = [];
					promisesByTargetId[targetId] = pagerDeferredList;
				}

				var deferred = $q.defer();
				pagerDeferredList.push(deferred);

				var off = $pagerScope.$on("$destroy", function() {
					var idx = pagerDeferredList.indexOf(deferred);
					if (idx < 0) {
						off();
						return;
					}

					if (pagerDeferredList.length > 1) {
						pagerDeferredList.splice(idx, 1);

					} else {
						delete promisesByTargetId[targetId];
					}

					deferred.reject("Pager destroyed");

					off();
				});

				return deferred.promise;
			},

			DeclareTarget: function(target) {
				if (target[0]) {
					target = target[0];
				}

				target.cmPagerRegistred = true;
				var targetId = target.id;

				var ts = promisesByTargetId[targetId];
				delete promisesByTargetId[targetId];
				if (!ts) {
					return;
				}

				angular.forEach(ts, function(deferred) {
					deferred.resolve(target);
				});
			}
		};

		return PagerRegistry;
	} ]);

})(window, window.angular);