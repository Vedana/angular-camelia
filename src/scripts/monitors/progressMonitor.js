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

	var module = angular.module("camelia.monitors", [ "camelia.core", "camelia.i18n.progressMonitor" ]);

	var _COMPUTE_TASKNAME_EVENT = "c:pm_computeName";

	var WORK_MIN_DELAY_MS = 500;
	// Caution, it is not a singleton if $injector is used !
	var anonymousId = 0;

	module.factory("camelia.monitor.ProgressMonitor", [  "$log",
	  "$rootScope",
		"$q",
		"$injector",
		"camelia.core",
		"camelia.ScopeWrapper",
		"camelia.i18n.ProgressMonitor",
		function($log, $rootScope, $q, $injector, cc, ScopeWrapper, i18n) {

			function ProgressMonitor($parentScope, options) {
				this._options = options || {};
				ScopeWrapper.call(this, ($parentScope || $rootScope).$new(true));

				this.id = this._options.id || "cm_progressMonitor_" + (anonymousId++);

				var self = this;

				this.$on(_COMPUTE_TASKNAME_EVENT, function($event, list) {
					if (self._canceled || self._done) {
						return;
					}

					if (self._taskName) {
						list.push(self._taskName);
					}
				});

				if (!($parentScope instanceof ProgressMonitor)) {
					this.$on(ProgressMonitor.SUB_TASKNAME_CHANGED_EVENT, function($event) {
						$event.stopPropagation();

						var taskName;
						var list = [];

						if (self._canceled) {
							taskName = self._options.canceledMessage || cc.lang(i18n, "canceled");

						} else if (self._done) {
							taskName = self._options.doneMessage || cc.lang(i18n, "done");

						} else {

							self.$broadcast(_COMPUTE_TASKNAME_EVENT, list);

							$log.debug("Collect task name:", list);

							taskName = list[list.length - 1];

							switch (self._options.labelFormat) {
							case 'concat':
								taskName = list.join(" ");
								break;
							}
						}

						if (self._computedTaskName === taskName) {
							return;
						}

						self._computedTaskName = taskName;

						$log.debug("Change taskName to '" + taskName);

						self.$broadcast(ProgressMonitor.TASKNAME_CHANGED_EVENT, self, taskName, list);
					});
				}
			}

			ProgressMonitor.TASKNAME_CHANGED_EVENT = "c:pm_taskNameChanged";
			ProgressMonitor.CANCELED_EVENT = "c:pm_canceled";
			ProgressMonitor.WORK_EVENT = "c:pm_work";
			ProgressMonitor.DONE_EVENT = "c:pm_done";
			ProgressMonitor._SUB_TASKNAME_CHANGED_EVENT = "c:pm_subTaskNameChanged";
			ProgressMonitor.BEGIN_PROGRESS_MONITOR_EVENT = "c:pm_begin";

			cc.extend(ProgressMonitor, ScopeWrapper, {
				getOptions: function() {
					return this._options;
				},
				beginTask: function(name, totalWork) {
					if (this._totalWork !== undefined) {
						throw new Error("BeginTask has already been called !");
					}
					if (isNaN(totalWork) || totalWork <= 0) {
						throw new Error("Invalid totalWork parameter (" + totalWork + ")");
					}

					this._totalWork = totalWork;
					this._currentWork = 0;

					this.setTaskName(name);

					$log.debug("Begin task '", name, "' totalWork=", totalWork);

					this.$emit(ProgressMonitor.BEGIN_PROGRESS_MONITOR_EVENT, this);
				},
				done: function() {
					if (this._done) {
						return;
					}
					this._done = true;
					if (this._currentWork < this._totalWork) {
						this._currentWork = this._totalWork;
						this.$broadcast(ProgressMonitor.WORK_EVENT, this, 1.0);
					}
					this.$broadcast(ProgressMonitor.DONE_EVENT, this);

					this.release();
				},
				_childDone: function() {
					this.$emit(ProgressMonitor._SUB_TASKNAME_CHANGED_EVENT);
				},
				isDone: function() {
					return this._done;
				},
				isCanceled: function() {
					return this._canceled;
				},
				setCanceled: function() {
					if (this._canceled || this._done) {
						return;
					}
					this._canceled = true;
					this.$broadcast(ProgressMonitor.CANCELED_EVENT, name);

					this.$emit(ProgressMonitor.SUB_TASKNAME_CHANGED_EVENT);

					this.release();
				},
				setTaskName: function(name) {
					if (this._canceled || this._done || this._taskName === name) {
						return;
					}
					this._taskName = name;

					this.$emit(ProgressMonitor.SUB_TASKNAME_CHANGED_EVENT, name);
				},
				getTaskName: function() {
					return this._computedTaskName;
				},
				worked: function(work) {
					$log.debug("Declare work ", work, " currentWork=", this._currentWork, " totalWork=", this._totalWork);
					if (isNaN(work) || work < 0) {
						throw new Error("Invalid work parameter (" + work + ")");
					}

					if (this._canceled || this._done) {
						return;
					}

					this._currentWork += work;
					if (this._currentWork > this._totalWork) {
						this._currentWork = this._totalWork;
					}

					var now = Date.now();
					if (now - this._lastTime < WORK_MIN_DELAY_MS) {
						return;
					}

					this._lastTime = now;

					var w = this._currentWork / this._totalWork;

					$log.debug("WORK_EVENT: ", w);

					this.$broadcast(ProgressMonitor.WORK_EVENT, this, w);
				},

				release: function() {
					this.$destroy();
				},

				then: function(promise, ticks, label, options) {
					if (!cc.isPromise(promise)) {
						throw new Error("First parameter must be a promise (" + promise + ")");
					}
					if (!ticks) {
						ticks = 1;
					}

					var QProgressMonitor = $injector.get("camelia.monitor.QProgressMonitor");

					return QProgressMonitor.then(this, promise, ticks, name, options);
				}
			});

			return ProgressMonitor;
		} ]);

})(window, window.angular);