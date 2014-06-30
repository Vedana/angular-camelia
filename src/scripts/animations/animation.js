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

	var module = angular.module("camelia.animations", [ "camelia.core" ]);

	module.factory("camelia.animations.Animation", [ "$log",
		"$timeout",
		"$rootScope",
		"camelia.core",
		function($log, $timeout, $rootScope, cc) {

			var scopeProto = cc.getProto($rootScope);

			var Animation = function($scope, params) {

				cc.inheritScope(this, $scope);

				this._params = params;

				var self = this;
				this.$on("$destroy", function() {
					self._params = undefined;
				});
			};

			Animation.newInstance = function(animationName, $scope, params) {
				var AnimationProvider = cc.LoadProvider(animationName);
				if (!AnimationProvider) {
					throw new Error("Can not animation '" + animationName + "'");
				}

				return new AnimationProvider($scope, params);
			};

			cc.extendProto(Animation, scopeProto, {

				start: function() {

					if (this._timeout) {
						var self = this;

						this._showTimerPromise = $timeout(function() {
							self.end("timeout");

						}, this._timeout, false);
					}

					this._processStart();
				},

				_processStart: function() {
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

					this._processEnd(raison);
				},

				_processEnd: function(raison) {
					this._destroy();
				},

				_destroy: function() {
					var self = this;
					$timeout(function() {
						self.$destroy();
					}, 0, false);
				}
			});

			return Animation;
		} ]);

})(window, window.angular);