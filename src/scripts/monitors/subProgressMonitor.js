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

	var WORK_MIN_DELAY_MS = 500;

	var module = angular.module("camelia.monitors");

	module.factory("camelia.monitor.SubProgressMonitor", [ "$log",
		"$q",
		"camelia.core",
		"camelia.monitor.ProgressMonitor",
		function($log, $q, cc, ProgressMonitor) {

			function SubProgressMonitor(parentProgressMonitor, ticks, options) {
				if (!(parentProgressMonitor instanceof ProgressMonitor)) {
					throw new Error("Parent is not a progressMonitor !" + parentProgressMonitor);
				}
				if (isNaN(ticks) || ticks <= 0) {
					throw new Error("Invalid ticks parameter (" + ticks + ")");
				}

				this._parent = parentProgressMonitor;

				ProgressMonitor.call(this, parentProgressMonitor.$scope, options);

				this._canceled = parentProgressMonitor.isCanceled();
				this._done = parentProgressMonitor.isDone();

				this._ticks = ticks;
				this._ticksSent = 0;
				this._waitingWork = 0;
			}

			cc.extend(SubProgressMonitor, ProgressMonitor, {
				beginTask: function(name, totalWork) {
					if (this._totalWork !== undefined) {
						throw new Error("BeginTask has already been called !");
					}
					if (isNaN(totalWork) || totalWork <= 0) {
						throw new Error("Invalid totalWork parameter (" + totalWork + ")");
					}

					this._totalWork = totalWork;
					this._currentWork = 0;
					if (name) {
						this.setTaskName(name);
					}
				},
				done: function() {
					if (this._done) {
						return;
					}
					this._done = true;

					var tick = this._ticks - this._ticksSent;
					if (tick > 0) {
						this._parent.worked(tick);
					}
					this.$broadcast(ProgressMonitor.DONE_EVENT);

					this._parent._childDone();

					this.release();
				},
				isCanceled: function() {
					return this._canceled;
				},
				setCanceled: function() {
					if (this._canceled || this._done) {
						return;
					}
					this._parent.setCanceled();
				},
				worked: function(work) {
					if (isNaN(work) || work < 0) {
						throw new Error("Invalid work parameter (" + work + ")");
					}
					if (this.$$destroyed) {
						throw new Error("Illegal state of subProgressMonitor");
					}

					if (this._canceled || this._done) {
						return;
					}

					var now = Date.now();
					if (now - this._lastTime < WORK_MIN_DELAY_MS) {
						this._waitingWork += work;
						return;
					}

					this._currentWork += work + this._waitingWork;
					this._waitingWork = 0;
					if (this._currentWork > this._totalWork) {
						this._currentWork = this._totalWork;
					}

					this._lastTime = now;

					var ticks = this._currentWork / this._totalWork * this._ticks;
					ticks -= this._ticksSent;
					if (ticks <= 0) {
						return;
					}

					this._ticksSent += ticks;

					this._parent.worked(ticks);
				}
			});

			return SubProgressMonitor;
		} ]);

})(window, window.angular);