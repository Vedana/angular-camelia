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

	var module = angular.module("camelia.animations", [ "camelia.core", "camelia.scopedObject" ]);

	module.factory("camelia.animations.Animation", [ "$log",
		"$timeout",
		"$rootScope",
		"$q",
		"camelia.core",
		"camelia.ScopedObject",
		function($log, $timeout, $rootScope, $q, cc, ScopedObject) {

			function Animation($scope, params) {

				ScopedObject.call(this, $scope);

				this._params = params;

				var self = this;
				this.$on("$destroy", function() {
					if (self._destroyed) {
						return;
					}

					self._destroyed = true;
					self._processDestroy();
				});
			}

			Animation.newInstance = function(animationName, $scope, params) {
				var AnimationProvider = cc.LoadProvider(animationName);
				if (!AnimationProvider) {
					throw new Error("Can not find animation '" + animationName + "'");
				}

				return new AnimationProvider($scope, params);
			};

			cc.extend(Animation, ScopedObject, {

				start: function() {

					if (this._timeout) {
						var self = this;

						this._showTimerPromise = $timeout(function() {
							self.end("timeout");

						}, this._timeout, false);
					}

					var ret = this._processStart();
					if (cc.isPromise(ret)) {
						return ret;
					}

					return $q.when(ret);
				},

				_processStart: function() {

					return $q.when(false);
				},

				cancel: function() {

					if (this.canceled || this.ended) {
						return;
					}
					this.canceled = true;

					var showTimerPromise = this._showTimerPromise;
					if (showTimerPromise) {
						this._showTimerPromise = null;

						$timeout.cancel(showTimerPromise);
					}

					this._processCancel();
				},

				_processCancel: function() {
					this._destroy();
				},

				end: function(raison) {
					if (this.ended || this.canceled) {
						return;
					}
					this.ended = true;

					var showTimerPromise = this._showTimerPromise;
					if (showTimerPromise) {
						this._showTimerPromise = null;

						$timeout.cancel(showTimerPromise);
					}

					var ret = this._processEnd(raison);
					if (cc.isPromise(ret)) {
						return ret;
					}

					return $q.when(ret);
				},

				_processEnd: function(raison) {
					this._destroy();

					return $q.when(false);
				},

				_destroy: function() {
					this._params = undefined;

					var showTimerPromise = this._showTimerPromise;
					if (showTimerPromise) {
						$timeout.cancel(showTimerPromise);
					}

					var self = this;
					$timeout(function() {
						self.$destroy();
					}, 0, false);
				},

				_processDestroy: function() {
					this._params = undefined;

					var showTimerPromise = this._showTimerPromise;
					if (showTimerPromise) {
						$timeout.cancel(showTimerPromise);
					}
				},

				toString: function() {
					return "[Animation $id=" + this.$id + "]";
				}
			});

			return Animation;
		} ]);

})(window, window.angular);