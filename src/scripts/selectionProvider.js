/**
 * @license CameliaJS (c) 2014 Vedana http://www.vedana.com
 * @author olivier@oeuillot.net
 */

(function(window, angular, undefined) {
	'use strict';

	var module = angular.module('camelia.selectionProvider', [ "camelia.core" ]);

	module.factory('camelia.SelectionProvider', [ "$rootScope",
		"$injector",
		function($rootScope, $injector) {

			var scopeProto = $rootScope.__proto__ || Object.getPrototypeOf($rootScope);

			/*
			 * ------------------------ SelectionProvider --------------------------
			 */

			function SelectionProvider() {
				scopeProto.constructor.call(this);
				this.$parent = $rootScope;
			}

			SelectionProvider.SELECTION_CHANGING_EVENT = "selectionChanging";
			SelectionProvider.SELECTION_CHANGED_EVENT = "selectionChanged";
			SelectionProvider.SELECTION_SET_EVENT = "selectionSet";

			SelectionProvider.From = function(parameter) {
				var ArraySelectionProvider = $injector.invoke([ "camelia.ArraySelectionProvider",
					function(ArraySelectionProvider) {
						return ArraySelectionProvider;
					} ]);

				if (parameter === undefined) {
					return new ArraySelectionProvider([]);
				}

				if (angular.isArray(parameter)) {
					return new ArraySelectionProvider(parameter);
				}

				return new ArraySelectionProvider([ parameter ]);
			}

			SelectionProvider.prototype = Object.create(scopeProto);
			angular.extend(SelectionProvider.prototype, {
				constructor: SelectionProvider,

				_lock: false,

				/**
				 * Returns the selected items
				 * 
				 * @returns {Array | Promise} Returns a list or a Promise
				 */
				get: function() {
					return null;
				},

				/**
				 * Returns the first element
				 * 
				 * @returns {Object} Returns the first Element
				 */
				getFirstElement: function() {
					return null;
				},
				/**
				 * Changes the selection to an item or an array of items.
				 */
				set: function(array) {
					if (array !== undefined && !angular.isArray(array)) {
						array = arguments;
					}
					if (!this._lock) {
						var self = this;
						return this.run(function() {
							return self._processSet(array)
						});
					}

					return this._processSet(array);
				},
				_processSet: function(array) {
					return -1;
				},
				/**
				 * Add an item or an array of items.
				 */
				add: function(array) {
					if (!angular.isArray(array)) {
						array = arguments;
					}
					if (!this._lock) {
						var self = this;
						return this.run(function() {
							return self._processAdd(array)
						});
					}
					return this._processAdd(array);
				},
				_processAdd: function(array) {
					return -1;
				},
				/**
				 * Removes an item or an array of items.
				 */
				remove: function(array) {
					if (!angular.isArray(array)) {
						array = arguments;
					}
					if (!this._lock) {
						var self = this;
						return this.run(function() {
							return self._processRemove(array)
						});
					}
					return this._processRemove(array);
				},
				_processRemove: function(array) {
					return -1;
				},
				/**
				 * Clear the selection
				 */
				clear: function() {
					if (!this._lock) {
						var self = this;
						return this.run(function() {
							return self._processClear();
						});
					}
					return this._processClear();
				},
				_processClear: function() {
					return -1;
				},
				run: function(func) {
					var lock = this._lock;

					if (!lock) {
						this._lock = true;
						this._startLock();
					}

					var ret;
					try {
						ret = func();

					} finally {
						if (!lock) {
							this._lock = lock;
							this._endLock();
						}
					}

					return ret;
				},

				_startLock: function() {
					this.$broadcast("startLock");
				},

				_endLock: function() {
					this.$broadcast("endLock");
				},
				contains: function(obj) {
					return false;
				},
				containsAll: function(obj) {
					return false;
				},
				count: function() {
					return -1;
				}

			});

			return SelectionProvider;
		} ]);

	/*
	 * ------------------------ ArraySelectionProvider --------------------
	 */

	module.factory('camelia.ArraySelectionProvider', [ "camelia.core",
		"camelia.SelectionProvider",
		function(cc, SelectionProvider) {

			/**
			 * SelectionProvider for an array of objects
			 */

			function ArraySelectionProvider(array) {
				SelectionProvider.prototype.constructor.call(this);

				this._array = array;
			}

			function mergeList(addList1, addList2, removeList1, removeList2, list) {
				if (!list || !list.length) {
					return;
				}
				angular.forEach(list, function(item) {
					if (removeList2) {
						var pos2 = removeList2.indexOf(item);
						if (pos2 >= 0) {
							removeList2.splice(pos2, 1);
						}
					}
					if (removeList1) {
						var pos = removeList1.indexOf(item);
						if (pos >= 0) {
							removeList1.splice(pos, 1);
							return;
						}
					}
					if (addList1 && addList1.indexOf(item) < 0) {
						addList1.push(item);

						if (addList2 && addList2.indexOf(item) < 0) {
							addList2.push(item);
						}
					}
				});
			}

			ArraySelectionProvider.prototype = Object.create(SelectionProvider.prototype);
			angular.extend(ArraySelectionProvider.prototype, {
				constructor: ArraySelectionProvider,

				_array: [],

				get: function() {
					return this._array;
				},
				getFirstElement: function() {
					var array = this.get();
					if (!array || !array.length) {
						return undefined;
					}

					return array[0];
				},
				_processList: function(fct) {

					var current = this._array;
					if (!current) {
						current = [];
						this._array = current;
					}

					if (!this._targetArray) {
						this._targetArray = (this._array) ? cc.CloneArray(this._array) : [];
						this._added = [];
						this._removed = [];
					}

					var addedLength = this._added.length;
					var removedLength = this._removed.length;

					fct.call(this);

					return (this._added.length - addedLength) + (removedLength - this._removed.length);
				},
				_processSet: function(newArray) {
					return this._processList(function() {
						// Add old entries to REMOVED
						// Remove old entries to ADDED
						mergeList(this._removed, null, this._added, null, this._targetArray);

						if (!newArray || !newArray.length) {
							// Clear selection
							this._targetArray = [];
							return;
						}

						this._targetArray = cc.CloneArray(newArray);

						mergeList(this._added, null, this._removed, null, this._targetArray);
					});
				},
				_processAdd: function(addedList) {
					return this._processList(function() {
						mergeList(this._added, this._targetArray, this._removed, null, addedList);
					});
				},
				_processRemove: function(removedList) {
					return this._processList(function() {
						mergeList(this._removed, null, this._added, this._targetArray, removedList);
					});
				},
				_processClear: function() {
					return this._processList(function() {
						this._removed = cc.CloneArray(this._array);
						this._added = [];
						this._targetArray = [];
					});
				},
				contains: function(obj) {
					var array = this._array;
					if (!array) {
						return false;
					}
					return array.indexOf(obj) >= 0;
				},
				containsAll: function(obj) {
					if (!angular.isArray(obj)) {
						if (angular.isObject(obj)) {
							return this.contains(obj);
						}

						throw new Error("Invalid paramater for containsAll(<array>) method");
					}
					var array = this._array;
					if (!array) {
						return false;
					}

					for (var i = 0; i < obj.length; i++) {
						if (array.indexOf(obj[i]) < 0) {
							return false;
						}
					}

					return true;
				},
				count: function() {
					if (!this._array) {
						return 0;
					}
					return this._array.length;
				},
				_endLock: function() {
					SelectionProvider.prototype._endLock.call(this);

					var oldSelection = this._array || [];

					var newSelection = this._targetArray || [];
					this._targetArray = undefined;

					var added = this._added || [];
					this._added = undefined;

					var removed = this._removed || [];
					this._removed = undefined;

					var clearAll = !!this._clearAll;
					this._clearAll = undefined;

					if (!added.length && !removed.length && !clearAll) {
						return;
					}

					var arg = {
						oldSelection: oldSelection,
						newSelection: newSelection,
						added: added,
						removed: removed,
						clearAll: clearAll
					};

					var event = this.$emit(SelectionProvider.SELECTION_CHANGING_EVENT, arg);
					if (event.defaultPrevented) {
						return;
					}

					this._array = newSelection.slice();

					this.$emit(SelectionProvider.SELECTION_SET_EVENT, arg);

					this.$emit(SelectionProvider.SELECTION_CHANGED_EVENT, arg);
				}
			});

			return ArraySelectionProvider;
		} ]);

})(window, window.angular);