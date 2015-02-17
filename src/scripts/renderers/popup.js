/**
 * @product CameliaJS (c) 2015 Vedana http://www.vedana.com
 * @license Creative Commons - The licensor permits others to copy, distribute,
 *          display, and perform the work. In return, licenses may not use the
 *          work for commercial purposes -- unless they get the licensor's
 *          permission.
 * @author olivier.oeuillot@vedana.com
 */

(function(window, angular, undefined) {
	"use strict";

	var module = angular.module("camelia.renderers.popup", [ "camelia.components.popup" ]);

	module.value("cm_popup_className", "cm_popup");

	// Caution, it is not a singleton if $injector is used !
	var anonymousId = 0;

	module.factory("camelia.renderers.Popup", [ "$log",
		"$q",
		"$exceptionHandler",
		"$timeout",
		"$rootScope",
		"camelia.core",
		"camelia.cmTypes",
		"cm_popup_className",
		"camelia.Key",
		function($log, $q, $exceptionHandler, $timeout, $rootScope, cc, cm, cmPopupClassName, Key) {

			function PopupRenderer($scope, configuration) {

				if (configuration) {
					this.configuration = configuration;
				}

				this._releaseScope = true;
				this.$scope = $scope || $rootScope.$new(true);
			}

			PopupRenderer.INITIALIZING = 0x01;
			PopupRenderer.INITIALIZED = 0x02;
			PopupRenderer.RENDERING = 0x04;
			PopupRenderer.RENDERED = 0x08;
			PopupRenderer.OPENED = 0x10;
			PopupRenderer.CLOSED = 0x20;
			PopupRenderer.DESTROYED = 0x40;

			PopupRenderer.prototype = {
				_setState: function(mask, state) {

					var newState = (this._state & (~mask)) | (state || 0);

					if (this._state === newState) {
						return;
					}

					this._state = newState;

					// Fire event
				},
				_addState: function(state) {
					if (this._state & state) {
						return;
					}
					this._state |= state;

					// Fire event
				},
				containsState: function(mask) {
					if (mask) {
						return this._state & mask;
					}

					return this._state;
				},

				/**
				 * @returns Promise|undefined
				 */
				initialize: function() {
					if (this.containsState(PopupRenderer.DESTROYED)) {
						throw new Error("Already destroyed");
					}

					if (this.containsState(PopupRenderer.INITIALIZING)) {
						return;
					}
					this._addState(PopupRenderer.INITIALIZING);

					var promise = this._initialize.apply(this, arguments);
					promise = cc.ensurePromise(promise);

					var self = this;
					return promise.then(function() {
						self._addState(PopupRenderer.INITIALIZED);

						var renderPromise = self.render();
						renderPromise = cc.ensurePromise(renderPromise);

						return renderPromise;
					});
				},

				_initialize: function() {

				},

				render: function() {
					if (this.containsState(PopupRenderer.DESTROYED)) {
						throw new Error("Already destroyed");
					}

					if (this.containsState(PopupRenderer.RENDERING)) {
						return;
					}
					this._addState(PopupRenderer.RENDERING);

					this.$emit("cm:popup_rendering");

					var parent = angular.element(document.createDocumentFragment());

					var className = cmPopupClassName;
					if (this.configuration.className) {
						className += " " + this.configuration.className;
					}

					var container = cc.createElement(parent, "div", {
						id: "cm_popup_" + (anonymousId++),
						className: className
					});
					this.container = container[0];

					container.data("$isolateScope", this.$scope);

					var promise = this._render(angular.element(this.container));
					promise = cc.ensurePromise(promise);

					var self = this;
					return promise.then(function() {
						document.body.appendChild(self.container);

						self._addState(PopupRenderer.RENDERED);

						self.$emit("cm:popup_rendered");
					});
				},

				_render: function(container) {
					return this._fillBody(container, container);
				},

				/**
				 * @returns Promise
				 */
				open: function(position) {
					var self = this;

					if (this.containsState(PopupRenderer.DESTROYED)) {
						throw new Error("Already destroyed");
					}

					if (!this.containsState(PopupRenderer.RENDERED)) {
						if (!this.containsState(PopupRenderer.INITIALIZING)) {
							var promise = this.initialize();
							promise = cc.ensurePromise(promise);

							return promise.then(function() {
								return self.open(position);
							});
						}

						return null;
					}

					if (this.containsState(PopupRenderer.OPENED)) {
						return null;
					}
					this._setState(PopupRenderer.CLOSED, 0);

					this._position = position;

					function waitLayout() {
						var container = self.container;
						if (!container.offsetWidth && !container.offsetHeight) {
							return $timeout(waitLayout, 10, false);
						}

						self.$emit("cm:popup_DOMReady");

						// If already closed, show it
						container.style.display = "";

						// Update position
						self._updatePosition(container, position);

						self.$emit("cm:popup_opened");

						self._addState(PopupRenderer.OPENED);

						self._open(angular.element(container));

						return container;
					}

					return $timeout(waitLayout, 10, false);
				},

				_open: function() {

				},

				_updatePosition: function(container, position) {
					position = position || {};

					var x;
					var y;

					if (angular.isNumber(position.X) && angular.isNumber(position.Y)) {
						x = position.X;
						y = position.Y;

					} else if (position.reference) {
						var cr = position.reference.getBoundingClientRect();

						x = cr.left;
						y = cr.top;

						switch (position.halign) {
						case "right":
							x += cr.width;

							if (position.deltaX) {
								x += position.deltaX;
							}

							break;
						}

						switch (position.valign) {
						case "bottom":
							y += cr.height;

							if (position.deltaY) {
								y += position.deltaY;
							}
							break;
						}
					}

					if (!angular.isNumber(x)) {
						return false;
					}

					var style = container.style;
					style.left = x + "px";
					style.top = y + "px";

					return true;
				},

				close: function() {
					if (this.containsState(PopupRenderer.DESTROYED)) {
						throw new Error("Already destroyed");
					}
					if (this.containsState(PopupRenderer.CLOSED) || !this.containsState(PopupRenderer.OPENED)) {
						return false;
					}
					this._setState(PopupRenderer.OPENED, PopupRenderer.CLOSED);

					var container = this.container;
					if (!container) {
						return false;
					}

					container.style.display = "none";

					this._close(angular.element(container));

					this.$emit("cm:popup_closed");

					if (this._closeDestroy) {
						this.destroy();
					}

					return true;
				},

				_close: function() {

				},

				destroy: function() {
					if (!this.containsState(PopupRenderer.CLOSED) || this.containsState(PopupRenderer.DESTROYED)) {
						return false;
					}
					this._setState(PopupRenderer.OPENED, PopupRenderer.DESTROYED);

					var container = this.container;
					if (!container) {
						return false;
					}
					this.container = undefined;

					angular.element(container).remove();

					this.$emit("cm:popup_destroyed");

					if (this.$scope && this._releaseScope) {
						this.$scope.$destroy();
						this.$scope = undefined;
					}

					return true;
				},

				_fillBody: function(container, configuration) {
					if (configuration.fillPopup) {
						return configuration.fillPopup(container);
					}
				},

				$emit: function() {
					if (!this.$scope) {
						return;
					}
					this.$scope.$emit.apply(this.$scope, arguments);
				}
			};

			return PopupRenderer;
		} ]);

})(window, window.angular);