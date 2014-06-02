/**
 * @product CameliaJS (c) 2014 Vedana http://www.vedana.com
 * @license Creative Commons - The licensor permits others to copy, distribute, display, and perform the work. In return, licenses may not use the work for commercial purposes -- unless they get the licensor's permission.
 * @author olivier.oeuillot@vedana.com
 */

(function(window, angular, undefined) {
	'use strict';

	var module = angular.module("camelia.core");

	module.factory("camelia.EventTarget", [ "$log", "$exceptionHandler", function($log, $exceptionHandler) {

		var EventTarget = function(source, getParentEventTargetFunc) {
			this.$$listeners = {};
			this.$$getParentEventTarget = getParentEventTargetFunc;
		};

		EventTarget.prototype = {

			on: function(name, listener) {
				var namedListeners = this.$$listeners[name];
				if (!namedListeners) {
					this.$$listeners[name] = namedListeners = [];
				}
				namedListeners.push(listener);

				return function() {
					namedListeners[namedListeners.indexOf(listener)] = null;
				};
			},

			emit: function(name, args) {
				var stopPropagation;
				var event = {
					name: name,
					target: this,
					stopPropagation: function() {
						stopPropagation = true;
					},
					preventDefault: function() {
						event.defaultPrevented = true;
					},
					defaultPrevented: false
				};
				var listenerArgs = concat([ event ], arguments, 1);

				var source = this;
				for (; source;) {
					var namedListeners = source.$$listeners[name];
					if (namedListeners) {
						event.source = source;

						var length = namedListeners.length;
						for (var i = 0; i < length; i++) {

							// if listeners were deregistered, defragment the array
							if (!namedListeners[i]) {
								namedListeners.splice(i, 1);
								i--;
								length--;
								continue;
							}

							try {
								namedListeners[i].apply(null, listenerArgs);

							} catch (e) {
								$exceptionHandler(e);
							}
						}

						if (stopPropagation) {
							return event;
						}
					}

					source = source.$$getParentEventTarget && source.$$getParentEventTarget();
				}

				return event;
			}
		};

		return EventTarget;
	} ]);
})(window, window.angular);
