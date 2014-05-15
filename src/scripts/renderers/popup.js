/**
 * @license CameliaJS (c) 2014 Vedana http://www.vedana.com
 * @author olivier@oeuillot.net
 */

(function(window, angular, undefined) {
	"use strict";

	var module = angular.module("camelia.renderers.popup", [ "camelia.components.popup",
		"camelia.key",
		"camelia.i18n.pager" ]);

	module.value("cm_popup_className", "cm_popup");

	module.factory("camelia.renderers.Popup", [ "$log",
		"$q",
		"$exceptionHandler",
		"$timeout",
		"$rootScope",
		"camelia.core",
		"camelia.cmTypes",
		"cm_popup_className",
		"camelia.Key",
		function($log, $q, $exceptionHandler, $timeout, $rootScope, cc, cm, cm_popup_className, Key) {

			var anonymousId = 0;

			function PopupRenderer(configuration) {

				if (configuration) {
					this.configuration = configuration;
				}
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

					if (this._state == newState) {
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
					if (this.containsState(PopupRenderer.INITIALIZING)) {
						return;
					}
					this._addState(PopupRenderer.INITIALIZING);

					var promise = this._initialize.apply(this, arguments);
					if (!cc.isPromise(promise)) {
						promise = $q.when(promise);
					}

					var self = this;
					return promise.then(function() {
						self._addState(PopupRenderer.INITIALIZED);

						var renderPromise = self.render();
						if (!cc.isPromise(renderPromise)) {
							renderPromise = $q.when(renderPromise);
						}

						return renderPromise;
					});
				},

				_initialize: function() {

				},

				render: function() {
					if (this.containsState(PopupRenderer.RENDERING)) {
						return;
					}
					this._addState(PopupRenderer.RENDERING);

					this.$emit("cm_popup_rendering");

					var parent = angular.element(document.createDocumentFragment());

					var className = cm_popup_className;
					if (this.configuration.className) {
						className += " " + this.configuration.className;
					}

					var container = cc.createElement(parent, "div", {
						id: "cm_popup_" + (anonymousId++),
						className: className
					});
					this.container = container[0];

					var $scope = $rootScope.$new();

					container.data("$isolateScope", $scope);

					var promise = this._render(angular.element(this.container));
					if (!cc.isPromise(promise)) {
						promise = $q.when(promise);
					}

					var self = this;
					return promise.then(function() {
						document.body.appendChild(self.container);

						self._addState(PopupRenderer.RENDERED);

						self.$emit("cm_popup_rendered");
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

					if (!this.containsState(PopupRenderer.RENDERED)) {
						if (!this.containsState(PopupRenderer.INITIALIZING)) {
							var promise = this.initialize();
							if (!cc.isPromise(promise)) {
								promise = $q.when(promise);
							}

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

						self.$emit("cm_popup_DOMReady");

						// If already closed, show it
						container.style.display = "";

						// Update position
						self._updatePosition(container, position);

						self.$emit("cm_popup_opened");

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

					return true;
				},

				_fillBody: function(container, configuration) {
					if (configuration.fillPopup) {
						return configuration.fillPopup(container);
					}
				},

				$emit: function() {

				}
			};

			return PopupRenderer;
		} ]);

})(window, window.angular);