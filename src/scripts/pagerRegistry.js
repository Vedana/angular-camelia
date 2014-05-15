/**
 * @license CameliaJS (c) 2014 Vedana http://www.vedana.com
 * @author olivier@oeuillot.net
 */

(function(window, angular, undefined) {
	'use strict';

	var module = angular.module("camelia.pagerRegistry", [ "camelia.core" ]);

	module.factory("camelia.pagerRegistry", [ "$log", "$q", "camelia.core",

	function($log, $q, cc) {

		var waitIds = document._camelia_pagerRegistry;
		if (!waitIds) {
			waitIds = {};
			document._camelia_pagerRegistry = waitIds;
		}

		function garbagePagerIds() {
			angular.forEach(waitIds, function(pagers, targetId) {
				for (var i = 0; i < pagers.length;) {
					var pager = pagers[i];

					// Pager still alive ?
					if (document.getElementById(pager.id)) {
						i++;
						continue;
					}

					// No remove it !
					pager.deferred.reject("Pager garbaged !");

					pagers.splice(i, 1);
				}

				if (pagers.length) {
					return;
				}

				delete waitIds[targetId];
			});
		}

		function waitTarget(pagerId, targetId) {
			garbagePagerIds();

			var ts = waitIds[targetId];
			if (!ts) {
				ts = [];
				waitIds[targetId] = ts;
			}

			var deferred = $q.defer();

			ts.push({
				id: pagerId,
				deferred: deferred
			});

			return deferred.promise;
		}

		function declare(targetId) {
			garbagePagerIds();

			if (targetId.nodeType == 1) {
				targetId = targetId.id;
			}

			var ts = waitIds[targetId];
			if (!ts) {
				return;
			}
			delete waitIds[targetId];

			var targetElement = document.getElementById(targetId);
			if (!targetElement) {
				return;
			}

			cc.Assert(targetElement && targetElement.nodeType == 1, "pagerRegistry", "Invalid element type ", targetElement);

			var targetComponent = angular.element(targetElement).data("cm_component");
			cc.Assert(targetComponent && targetComponent.$scope, "pagerRegistry", "Invalid component ", targetComponent);

			angular.forEach(ts, function(pager) {
				var deferred = pager.deferred;

				deferred.resolve(targetComponent);
			});
		}

		return {
			waitTarget: waitTarget,
			declareTarget: declare
		};
	} ]);

})(window, window.angular);