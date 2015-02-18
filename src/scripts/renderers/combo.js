/**
 * @product CameliaJS (c) 2015 Vedana http://www.vedana.com
 * @license Creative Commons - The licensor permits others to copy, distribute,
 *          display, and perform the work. In return, licenses may not use the
 *          work for commercial purposes -- unless they get the licensor's
 *          permission.
 * @author olivier.oeuillot@vedana.com
 */

/* jshint sub: true, shadow: true, scripturl: true */
/* jshint -W080 */

(function(window, angular, undefined) {
	"use strict";

	// Caution, it is not a singleton if $injector is used !
	var anonymousId = 0;

	var __DISABLED_POPUP_CLOSE = false;

	var POPUP_OPEN_REQUEST_EVENT = "cm:popup_requestOpen";
	var POPUP_OPENED_EVENT = "cm:popup_opened";
	var POPUP_CLOSE_REQUEST_EVENT = "cm:popup_requestClose";
	var POPUP_CLOSED_EVENT = "cm:popup_closed";
	var PROPOSE_ITEM_EVENT = "cm:propose_item";
	var SELECT_ITEM_EVENT = "cm:select_item";
	var FOCUS_INPUT_EVENT = "cm:focus_input";
	var NEXT_POPUP_ITEM_EVENT = "cm:next_item";
	var PREVIOUS_POPUP_ITEM_EVENT = "cm:prev_item";
	var INPUT_CHANGED_EVENT = "c:inputChanged";
	var COMPLETE_INPUT_EVENT = "c:completeInput";
	var FILTER_CHANGED_EVENT = "c:filterChanged";
	var CLEAR_SUGGEST_EVENT = "c:clearSuggest";

	var POPUP_OPEN_REQUEST_ACTION_TYPE = "popupRequest";

	var module = angular.module("camelia.renderers.combo", [ "camelia.components.combo",
		"camelia.i18n.combo",
		"camelia.renderers.items" ]);

	module.value("cm_combo_className", "cm_combo");

	module.factory("camelia.renderers.Combo", [ "$log",
		"$q",
		"$exceptionHandler",
		"$timeout",
		"camelia.core",
		"camelia.cmTypes",
		"camelia.UI",
		"cm_combo_className",
		"camelia.Key",
		"camelia.i18n.Combo",
		"camelia.CharsetUtils",
		"camelia.renderers.Items",
		function($log, $q, $exceptionHandler, $timeout, cc, cm, cui, cm_combo_className, Key, i18n, c, ItemsRenderer) {

			function searchElements(target) {
				return cm.SearchElements({
					icon: null,
					button: null,
					input: null,
					label: null,
					tags: null,
					tag: null,
					tagRemove: null,
					popup: null,
					item: null,
					combo: null
				}, "combo", target);
			}

			var ComboRenderer = function(renderContext) {
				ItemsRenderer.call(this, renderContext);
			};

			cc.extend(ComboRenderer, ItemsRenderer,
					{
						render: function(parent) {
							var $scope = this.$scope;

							var container = cc.createElement(parent, "div", {
								id: this.combo.id,
								$cm_type: "combo"
							});

							this.containerElement = container[0];

							container.on("mouseover", this._onMouseOver());

							container.on("mouseout", this._onMouseOut());

							container.on("mousedown", this._onMouseDown());

							// container.on("dblclick", OnDoubleClick(renderContext));

							container.on("click", this._onSimpleClick());

							container.on("mouseup", this._onMouseUp());

							container.on("keydown", this._onKeyDown());
							container.on("keypress", this._onKeyPress());
							container.on("keyup", this._onKeyUp());

							cc.on(container, "focus", this._onFocus(), true, $scope);
							cc.on(container, "blur", this._onBlur(), true, $scope);

							var self = this;

							$scope.$watch("style", function onStyleChanged(style) {
								style = style || "";
								container.attr("style", style);
							});

							$scope.$watch("className", function onClassNameChanged() {
								self.comboStyleUpdate(container);
							});

							$scope.$on(POPUP_OPENED_EVENT, function() {
								cm.SwitchOnState(self, {
									combo: self.containerElement
								}, "openedPopup");
							});

							$scope.$on(POPUP_CLOSED_EVENT, function() {
								if (__DISABLED_POPUP_CLOSE) {
									return;
								}
								cm.ClearState(self, {
									combo: self.containerElement
								}, "openedPopup", false);
							});

							$scope.$on(SELECT_ITEM_EVENT, function($event, reason, item, event) {
								var $item = !item || item.$item || item;

								if ($scope.selectedItem === $item) {
									return;
								}

								$timeout(function() {
									$log.debug("Apply item=", $item);
									$scope.$apply(function() {
										$scope.selectedItem = $item;
									});
								}, 0, false);
							});

							container.on("cm_update", this._onStyleUpdate());

							var _containers = [ "begin", "tags", "input", "openButton", "end" ];

							var renderContext = {

								add: function(containerId, promiseFunc, priority) {
									var pos = -1;
									if (containerId) {
										pos = _containers.indexOf(containerId);
										if (pos < 0) {
											$log.error("Can not find container Id '" + containerId + "'");
										}
									}
									if (pos < 0) {
										pos = _containers.length;
									} else {
										pos++;
									}

									if (isNaN(priority)) {
										priority = 0;
									}

									for (;; pos++) {
										var item = _containers[pos];
										if (!item || typeof (item) === "string") {
											break;
										}

										if (_containers[pos].priority < priority) {
											break;
										}
									}

									_containers.splice(pos, 0, {
										promiseFunc: promiseFunc,
										priority: priority
									});
								}
							};

							this.comboRenderer(renderContext);

							var bcontainer = cc.createElement(container, "div", {
								className: "cm_combo_container"
							});

							var promisesFunc = [];
							angular.forEach(_containers, function each(item) {
								if (!item.promiseFunc) {
									return;
								}
								promisesFunc.push(item.promiseFunc);
							});

							if (false) { // Right To Left
								promisesFunc.reverse();
							}

							var retPromise = null;

							for (var i = 0; i < promisesFunc.length; i++) {
								var f = promisesFunc[i];

								if (!retPromise) {
									var ret = f(bcontainer);

									if (!cc.isPromise(ret)) {
										continue;
									}

									retPromise = ret;
									continue;
								}

								retPromise = retPromise.then(cc.callPromise(f, this, bcontainer));
							}

							retPromise = cc.ensurePromise(retPromise);

							return retPromise.then(function onSuccess(result) {

								self.comboStyleUpdate(container);

								return container;
							});
						},

						/**
						 * @returns {Promise}
						 */
						comboRenderer: function(renderContext) {
							renderContext.add("input", this.inputRenderer.bind(this));

							if (cc.toBoolean(this.$scope.hasOpenPopupButton) === false) {
								renderContext.add("openButton", this.openButtonRenderer.bind(this));
							}
							if (this.$scope.tags !== undefined) {
								renderContext.add("begin", this.tagsRenderer.bind(this));
							}
						},

						inputRenderer: function(parent) {
							var $scope = this.$scope;

							var self = this;
							var inputContainer = cc.createElement(parent, "div", {
								className: "cm_combo_cinput"
							});

							var shadowInput = cc.createElement(inputContainer, "input", {
								id: this.combo.id + "_shadowInput",
								className: "cm_combo_shadowInput",
								tabIndex: -1,
								disabled: true,
								"aria-hidden": true
							});

							var input = cc.createElement(inputContainer, "input", {
								id: this.combo.id + "_input",
								$cm_type: "input",
								maxlength: this.$scope.maxLength,
								size: this.$scope.textSize,
								placeholder: this.$scope.placeholder
							});

							input.on("scroll", function(event) {
								shadowInput[0].scrollLeft = input[0].scrollLeft;
							});

							$scope.$watch("maxTextLength", function onMaxTextLengthChanged(newMaxLength) {
								input.attr("maxlength", newMaxLength);
							});
							$scope.$watch("textSize", function onTextSizeChanged(newTextSize) {
								input.attr("size", newTextSize);
							});
							$scope.$watch("placeholder", function onPlaceholderChanged(newPlaceholder) {
								input.attr("placeholder", newPlaceholder);
							});

							var oldValue;
							$scope.$on(INPUT_CHANGED_EVENT, function($event, reason, event) {
								var proposal = input.prop("cm_proposalLabel");
								var value = input.val();
								if (oldValue === value) {
									// $log.debug("input#INPUT_CHANGED_EVENT: Input old value ! '"
									// + value + "' proposal='" + proposal + "'");
									return;
								}
								oldValue = value;

								// $log.debug("input#INPUT_CHANGED_EVENT: Input changed ! '" +
								// value + "' proposal='" + proposal +"'");

								$scope.$broadcast(FILTER_CHANGED_EVENT, value, reason, event);
							});

							$scope.$on(FOCUS_INPUT_EVENT, function($event, reason, event) {
								// $log.debug("input#FOCUS_INPUT_EVENT: focus");
								input[0].focus();
							});

							$scope.$on(SELECT_ITEM_EVENT, function($event, reason, item, label, event) {
								// $log.debug("input#SELECT_ITEM_EVENT: item=", item);
								// $scope.$broadcast(PROPOSE_ITEM_EVENT, reason, item, false,
								// event);

								if (reason === "propose") {
									return;
								}

								label = label || (item && item.label);

								// $log.debug("SIE1: SET input '" + label + "'")
								input.val(label ? label : "");
								$timeout(function() {
									var l = input.val().length;
									input[0].setSelectionRange(l, l);
								}, 10, false);
							});

							$scope.$on(CLEAR_SUGGEST_EVENT, function($event, reason, event) {
								shadowInput.val("");
							});

							$scope.$on(PROPOSE_ITEM_EVENT, function($event, reason, item, mergeInput, event) {
								// $log.debug("input#PROPOSE_ITEM_EVENT: item=", item);

								if (!item) {
									input.data("cm_proposal", null);
									input.prop("cm_proposalLabel", null);

									// $log.debug("SIE4: SET input ''");

									shadowInput.val("");

									$scope.$broadcast(SELECT_ITEM_EVENT, "propose", null, null, event);
									return;
								}

								input.prop("cm_proposalLabel", item.label);
								input.data("cm_proposal", item);

								var value = input.val();
								if (value) {
									var label = item.label;
									if (mergeInput) {
										label = value + label.substring(value.length);
									}

									// $log.debug("SIE2: SET shadow '" + label + "'")
									shadowInput.val(label);
									shadowInput[0].scrollLeft = input[0].scrollLeft;

									if (label === value) {
										$scope.$broadcast(SELECT_ITEM_EVENT, "propose", item, label, event);
										return;
									}
								}

								$scope.$broadcast(SELECT_ITEM_EVENT, "propose", null, null, event);
							});

							$scope.$on(COMPLETE_INPUT_EVENT, function($event, reason, event) {
								// $log.debug("input#COMPLETE_INPUT_EVENT: shadow=",
								// shadowInput.val());

								var si = shadowInput.val();
								if (si && input.val() !== si) {
									// $log.debug("SIE3: SET input '" + si + "'");
									$event.done = true;

									var item = input.data("cm_proposal");

									$scope.$broadcast(SELECT_ITEM_EVENT, "complete", item, si, event);
								}
							});

							$scope.$on(POPUP_OPEN_REQUEST_EVENT, function($event, reason, event) {
								self.processSuggestRequest(input.val(), null, reason);
							});

							$scope.$on(FILTER_CHANGED_EVENT, function($event, reason, event) {
								$log.debug("SIE5: Clear shadow ''");

								shadowInput.val("");

								if (self.isPopupOpened()) {
									return;
								}

								var value = input.val();
								if (!value) {
									$scope.$broadcast(PROPOSE_ITEM_EVENT, reason, null, false, event);
									return;
								}

								// $log.debug("input#FILTER_CHANGED_EVENT: value=", value);

								self.listItems(value, 1, self._buildCriterias()).then(function onSuccess(items) {
									$scope.$broadcast(PROPOSE_ITEM_EVENT, reason, items[0], true, event);
								});
							});

							this.inputStyleUpdate(input);

							return $q.when(inputContainer);
						},

						openButtonRenderer: function(parent) {

							var button = cc.createElement(parent, "button", {
								id: this.combo.id + "_openButton",
								$cm_type: "button",
								$cm_actionType: POPUP_OPEN_REQUEST_ACTION_TYPE,
								$fa_classes: [ "fa", "fa-caret-down" ]
							});

							this.buttonStyleUpdate(button);

							return $q.when(button);
						},

						tagsRenderer: function(parent) {
							var ul = cc.createElement(parent, "ul", {
								id: "cm_ctags_" + (anonymousId++),
								$cm_type: "tags",
								cssDisplay: "none"
							});

							var self = this;
							this.$scope.$watchCollection("tags", function onChange(newTags) {
								self.constructTags(ul, newTags);
							});
							if (this.$scope.tags) {
								this.constructTags(ul, this.$scope.tags);
							}

							this.tagsStyleUpdate(ul);

							return $q.when(ul);
						},

						constructTags: function(container, tags) {
							var self = this;

							var objs = [];
							var lis = (container[0] || container).querySelectorAll(".cm_combo_tag");
							for (var i = 0; i < lis.length; i++) {
								var li = angular.element(lis[i]);
								objs.push(li.data("cm_tag"));
							}

							var p = document.createDocumentFragment();

							var expressions = null;

							var cmps = [];
							angular.forEach(tags, function(tag) {
								var idx = objs.indexOf(tag);
								if (idx >= 0) {
									cmps.push(lis[idx]);
									objs[idx] = null;
									return;
								}

								if (!expressions) {
									expressions = {};
									[ "tagLabel", "tagTooltip", "tagClass" ].forEach(function(name) {
										var expression = self.$scope[name + "RawExpression"];
										if (!expression) {
											return;
										}

										var exp = self.$interpolate(expression);

										expressions[name] = function(tagScope) {
											return tagScope.$eval(exp);
										};
									});
								}

								var newTagComponent = self.tagRenderer(p, tag, expressions);
								if (!newTagComponent) {
									return;
								}

								cmps.push(newTagComponent);
							});

							for (var i = 0; i < objs.length; i++) {
								if (!objs[i]) {
									continue;
								}
								angular.element(lis[i]).remove();
							}

							if (!cmps.length) {
								container.css("display", "none");
								return;
							}
							container.css("display", "");

							p = angular.element(document.createDocumentFragment());
							angular.forEach(cmps, function(cmp) {
								p.append(cmp);
							});

							container.append(p);
						},

						tagRenderer: function(container, tag, expressions) {
							var li = cc.createElement(container, "li", {
								id: "cm_ctag_" + (anonymousId++),
								$cm_type: "tag",
								tabIndex: -1,
								$cm_focusable: true
							});

							var tagScope = this.$scope.$parent.$new();
							tagScope.$tag = tag;
							if (this.$scope.tagVar) {
								tagScope[this.$scope.tagVar] = tag;
							}

							var text = "";
							if (expressions.tagLabel) {
								text = tagScope.$eval(expressions.tagLabel);
							}
							if (typeof (tag.toTagText) === "function") {
								text = tag.toTagText();
							}
							if (!text) {
								text = tag.toString();
							}

							li.data("cm_tag", tag);

							cc.createElement(li, "span", {
								className: "cm_combo_tagBLabel",
								textNode: text
							});
							var removeButton = cc.createElement(li, "a", {
								$cm_type: "tagRemove",
								href: "javascript:void(0)",
								"aria-hidden": true,
								tabIndex: -1,
								$cm_classes: "fa fa-times"
							});

							this.tagRemoveStyleUpdate(removeButton);

							var tooltip = "";
							if (expressions.tagTooltip) {
								tooltip = tagScope.$eval(expressions.tagTooltip);
							}
							if (typeof (tag.toTagTooltip) === "function") {
								tooltip = tag.toTagTooltip();
							}
							if (tooltip) {
								li.attr("title", tooltip);
							}

							var className = "";
							if (expressions.tagClass) {
								className = tagScope.$eval(expressions.tagClass);
							}
							if (className) {
								li.prop("cm_classes", className);
							}

							li.data('$isolateScope', tagScope);

							this.tagStyleUpdate(li);
							return li;
						},

						_onMouseOver: function() {
							var self = this;

							return function(event) {
								var target = event.target;

								var elements = searchElements(target);

								cm.SwitchOnState(self, elements, "over");
							};
						},

						_onMouseOut: function() {
							var self = this;

							return function(event) {
								var target = event.relatedTarget;

								var elements = searchElements(target);
								cm.SwitchOffState(self, elements, "over");
							};
						},

						_onFocus: function() {
							var self = this;

							return function(event) {
								var target = event.target;

								var elements = searchElements(target);
								cm.SwitchOnState(self, elements, "focus");
							};
						},

						_onBlur: function() {
							var self = this;

							return function(event) {
								var target = event.relatedTarget;

								$log.debug("blur=", event.relatedTarget, event.target, event.source);

								var elements = searchElements(target);
								cm.SwitchOffState(self, elements, "focus");

								if (!elements.combo && self.isPopupOpened()) {
									$timeout(function() {
										if (self.containerElement.hasAttribute("cm_focus")) {
											return;
										}
										self.$scope.$broadcast(POPUP_CLOSE_REQUEST_EVENT, "blur", event);
									}, 100, false);
								}
							};
						},

						_onMouseDown: function() {
							var self = this;

							return function(event) {
								var target = event.target;

								var elements = searchElements(target);
								cm.SwitchOnState(self, elements, "mouseDown");
							};
						},

						_onMouseUp: function() {
							var self = this;

							return function(event) {
								var elements = searchElements();
								cm.ClearState(self, elements, "mouseDown");
							};
						},

						_onKeyDown: function() {
							var self = this;
							var $scope = this.$scope;

							return function(event) {
								var target = event.target;
								var elements = searchElements(target);
								var cancel = false;

								if (cancel) {
									event.stopPropagation();
									event.preventDefault();
								}
							};
						},

						_onKeyPress: function() {
							var self = this;
							var $scope = this.$scope;

							return function(event) {
								var target = event.target;
								var elements = searchElements(target);
								var openedPopup = self.isPopupOpened();

								var cancel = false;

								if (elements.input) {
									var input = elements.input;

									switch (event.keyCode) {
									case Key.VK_BACK_SPACE:
										if (!input.selectionStart && !input.selectionEnd) {
											var prevTag = cui.GetPreviousFocusable(self.containerElement, target);
											if (prevTag) {
												var tag = angular.element(prevTag).data("cm_tag");
												if (!tag) {
													$log.error("No data associated to tag element " + elements.tag);
													break;
												}
												self.processTagRemove(tag);
											}
										}
										break;
									}
								} else {

									switch (event.keyCode) {
									case Key.VK_DELETE:
									case Key.VK_BACK_SPACE:
										cancel = true;
										break;
									}
								}

								if (cancel) {
									event.stopPropagation();
									event.preventDefault();
								}
							};
						},

						_onKeyUp: function() {
							var self = this;
							var $scope = this.$scope;

							return function(event) {
								var target = event.target;
								var elements = searchElements(target);
								var cancel = false;

								var next;

								var openedPopup = self.isPopupOpened();

								if (elements.input) {
									var input = elements.input;
									var inputChanged = false;

									switch (event.keyCode) {
									case Key.VK_LEFT:
										if (!input.selectionStart && !input.selectionEnd) {
											next = cui.GetPreviousFocusable(self.containerElement, target);
										}
										break;
									case Key.VK_RIGHT:
										if (input.selectionEnd === input.value.length) {

											var $event = $scope.$broadcast(COMPLETE_INPUT_EVENT, "rightKey", event);
											if (!$event.done) {
												// next = cui.GetNextFocusable(self.containerElement,
												// target);
											}
										}
										break;

									case Key.VK_DOWN:
										cancel = true;
										if (!openedPopup) {
											$scope.$broadcast(POPUP_OPEN_REQUEST_EVENT, "downKey", event);
											break;
										}

										$scope.$broadcast(NEXT_POPUP_ITEM_EVENT, "downKey", event);
										break;

									case Key.VK_UP:
										cancel = true;
										if (!openedPopup) {
											$scope.$broadcast(POPUP_OPEN_REQUEST_EVENT, "upKey", event);
											break;
										}

										$scope.$broadcast(PREVIOUS_POPUP_ITEM_EVENT, "upKey", event);
										break;

									case Key.VK_RETURN:
									case Key.VK_ENTER:
										if (openedPopup) {
											$scope.$broadcast(POPUP_CLOSE_REQUEST_EVENT, "enterKey", event);
										}
										$scope.$broadcast("keyEnter", event);
										break;

									default:
										inputChanged = true;
										break;
									}

									if (inputChanged) {
										elements.input.cm_changed = true;
										$scope.$broadcast(INPUT_CHANGED_EVENT, "key", event);
									}

								} else if (elements.item) {
									switch (event.keyCode) {
									case Key.VK_UP:
										cancel = true;
										next = cui.GetPreviousFocusable(elements.items, target);
										break;
									case Key.VK_DOWN:
										cancel = true;
										next = cui.GetNextFocusable(elements.items, target);
										break;

									case Key.VK_RETURN:
									case Key.VK_ENTER:
										var item = angular.element(elements.item).data("cm_item");

										if (item) {
											$scope.$broadcast(CLEAR_SUGGEST_EVENT, "nextItem", event);
											$scope.$broadcast(SELECT_ITEM_EVENT, "itemClick", item, null, event);
										}
										$scope.$broadcast(POPUP_CLOSE_REQUEST_EVENT, "itemClick", event);
										$scope.$broadcast(FOCUS_INPUT_EVENT, "itemClick", event);
										break;
									}

								} else {
									switch (event.keyCode) {
									case Key.VK_RIGHT:
										cancel = true;
										next = cui.GetNextFocusable(self.containerElement, target);
										break;

									case Key.VK_LEFT:
										cancel = true;
										next = cui.GetPreviousFocusable(self.containerElement, target);
										break;

									case Key.VK_DOWN:
										if (elements.button && elements.button.cm_actionType === POPUP_OPEN_REQUEST_ACTION_TYPE &&
												!openedPopup) {
											cancel = true;
											$scope.$broadcast(POPUP_OPEN_REQUEST_EVENT, "downKey", event);
											$scope.$broadcast(FOCUS_INPUT_EVENT, "popupOpened", event);
										}
										break;

									case Key.VK_UP:
										if (elements.button && elements.button.cm_actionType === POPUP_OPEN_REQUEST_ACTION_TYPE &&
												openedPopup) {
											cancel = true;
											$scope.$broadcast(POPUP_CLOSE_REQUEST_EVENT, "upKey", event);
											$scope.$broadcast(FOCUS_INPUT_EVENT, "popupOpened", event);
										}
										break;

									case Key.VK_DELETE:
									case Key.VK_BACK_SPACE:
										cancel = true;
										if (elements.tag) {
											var tag = elements.tag && angular.element(elements.tag).data("cm_tag");
											if (!tag) {
												$log.error("No data associated to tag element " + elements.tag);
												break;
											}

											next = ((event.keyCode === Key.VK_DELETE) ? cui.GetNextFocusable : cui.GetPreviousFocusable)
													.bind(cui)(self.containerElement, target);

											self.processTagRemove(tag);
										}
										break;
									}
								}

								if (!cancel) {
									switch (event.keyCode) {
									case Key.VK_ESCAPE:
										$scope.$broadcast(POPUP_CLOSE_REQUEST_EVENT, "escapeKey", event);
										break;
									}
								}

								if (next) {
									next.focus();
								}

								if (cancel) {
									event.stopPropagation();
									event.preventDefault();
								} else {
									$scope.$broadcast("cm:keyPress", event, elements);
								}
							};
						},

						_onSimpleClick: function() {
							var self = this;
							var $scope = this.$scope;

							return function(event) {
								var target = event.target;

								var elements = searchElements(target);

								cc.log("Simple click on ", target, " elements=", elements);

								if (elements.tagRemove) {
									var tag = elements.tag && angular.element(elements.tag).data("cm_tag");
									if (!tag) {
										$log.error("No data associated to tag element " + elements.tag);
										return;
									}

									self.processTagRemove(tag);

									$scope.$broadcast(FOCUS_INPUT_EVENT, "tagRemoved", event);

								} else if (elements.button) {
									if (elements.button.cm_actionType === POPUP_OPEN_REQUEST_ACTION_TYPE) {

										if (!self.isPopupOpened()) {
											$scope.$broadcast(POPUP_OPEN_REQUEST_EVENT, "buttonClick", event);
										} else {
											$scope.$broadcast(POPUP_CLOSE_REQUEST_EVENT, "buttonClick", event);
										}

										$scope.$broadcast(FOCUS_INPUT_EVENT, "popupOpened", event);
									}

								} else if (elements.item) {
									var item = angular.element(elements.item).data("cm_item");

									if (item) {
										$scope.$broadcast(SELECT_ITEM_EVENT, "itemClick", item, null, event);
									}
									$scope.$broadcast(POPUP_CLOSE_REQUEST_EVENT, "itemClick", event);
									$scope.$broadcast(FOCUS_INPUT_EVENT, "itemClick", event);
								}
							};
						},

						_onStyleUpdate: function() {

							var self = this;

							return function(event) {
								var target = event.relatedTarget;

								var type = cm.GetCMType(target);
								if (!type) {
									return;
								}

								var elt = angular.element(target);

								var rp = self[type + "StyleUpdate"];
								if (rp) {
									rp.call(self, elt);
									event.stopPropagation();
									return;
								}

								$log.error("Can  not find function for " + type);
							};
						},

						comboStyleUpdate: function(element) {
							var classes = cm_combo_className.split(" ");

							var className = this.$scope.className;
							if (className) {
								classes.push(className);
							}

							return cm.MixElementClasses(element, classes);
						},

						iconStyleUpdate: function(element) {
							if (element[0]) {
								element = element[0];
							}
							var l = [ "cm_combo_icon" ];
							if (element.iconType) {
								l.push("cm_combo_icon_" + element.iconType);
							}

							return cm.MixElementClasses(element, l, element.fa_classes);
						},

						inputStyleUpdate: function(element) {
							if (element[0]) {
								element = element[0];
							}
							return cm.MixElementClasses(element, [ "cm_combo_input" ]);
						},

						labelStyleUpdate: function(element) {
							if (element[0]) {
								element = element[0];
							}
							var l = [ "cm_combo_label" ];
							if (element.labelType) {
								l.push("cm_combo_label_" + element.labelType);
							}

							return cm.MixElementClasses(element, l, element.fa_classes);
						},

						buttonStyleUpdate: function(element) {
							if (element[0]) {
								element = element[0];
							}
							var l = [ "cm_combo_button" ];
							if (element.cm_actionType) {
								l.push("cm_combo_button_" + element.cm_actionType);
							}

							return cm.MixElementClasses(element, l, element.fa_classes);
						},

						tagsStyleUpdate: function(element) {
							if (element[0]) {
								element = element[0];
							}
							var l = [ "cm_combo_tags" ];
							return cm.MixElementClasses(element, l, element.fa_classes);
						},

						tagStyleUpdate: function(element) {
							if (element[0]) {
								element = element[0];
							}
							var l = [ "cm_combo_tag" ];
							if (element.tagClassName) {
								l.push("cm_combo_tag_" + element.tagClassName);
							}

							return cm.MixElementClasses(element, l, element.fa_classes);
						},
						tagRemoveStyleUpdate: function(element) {
							if (element[0]) {
								element = element[0];
							}
							var l = [ "cm_combo_tagRemove" ];

							return cm.MixElementClasses(element, l, element.cm_classes);
						},
						itemsStyleUpdate: function(element) {
							if (element[0]) {
								element = element[0];
							}
							var l = [ "cm_combo_items" ];

							return cm.MixElementClasses(element, l, element.cm_classes);
						},
						itemStyleUpdate: function(element) {
							if (element[0]) {
								element = element[0];
							}
							var l = [ "cm_combo_item" ];

							if (element.hasAttribute("cm_noSelectable")) {
								l = [ "cm_combo_item_noSelectable" ];
							}

							return cm.MixElementClasses(element, l, element.cm_classes);
						},

						processTagRemove: function(tag) {
							var $scope = this.$scope;

							var tags = $scope.tags;
							if (!tags) {
								$log.error("No tags list ?");
								return;
							}

							var idx = tags.indexOf(tag);
							if (idx < 0) {
								$log.error("Can not find tag '", tag, "' in tags list ", tags);
								return;
							}

							$scope.$apply(function() {
								tags.splice(idx, 1);
							});
						},

						isPopupOpened: function() {
							var items = this.containerElement.querySelector(".cm_combo_items");
							if (items) {
								return true;
							}

							return false;
						},
						_renderItems: function(container, items) {
							container.css("visibility", "hidden");

							var old = container[0].getElementsByTagName("li");
							angular.element(old).remove();

							var tabIndex = this.$scope.tabIndex || 0;

							var fragment = document.createDocumentFragment();

							var self = this;
							items.forEach(function(item) {
								var li = cc.createElement(fragment, "li", {
									id: "cm_comboItem_" + (anonymousId++),
									$cm_type: "item",
									tabIndex: tabIndex,
									textNode: (item.label || "*** no-label ***")
								});
								if (item.className) {
									li.prop("cm_classes", item.className);
								}

								li.data("cm_item", item);

								self.itemStyleUpdate(li);
							});

							if (!fragment.firstChild) {
								var li = cc.createElement(fragment, "li", {
									id: "cm_comboItem_" + (anonymousId++),
									$cm_type: "item",
									tabIndex: tabIndex,
									textNode: cc.lang(i18n, "no_result"),
									cm_noSelectable: true
								});

								self.itemStyleUpdate(li);
							}

							container.append(fragment);
							container.css("visibility", "");
						},

						_buildCriterias: function() {
							var scope = this.$scope;

							return {
								ignoreAccents: scope.suggestIgnoreAccents,
								ignoreCase: scope.suggestIgnoreCase,
							};
						},
						processSuggestRequest: function(inputValue, selectedItem, reason, event) {
							var $scope = this.$scope;

							var fragment = document.createDocumentFragment();
							var ul = cc.createElement(fragment, "ul", {
								$cm_type: "items"
							});

							var pmh = $scope.popupMaxHeight;
							if (pmh) {
								if (parseFloat(pmh) === pmh) {
									pmh = pmh + "px";
								}

								ul.attr("cm_popupHeight", true);
								ul.css("maxHeight", pmh);
							}

							var $popupScope = $scope.$new(true);
							ul.data('$isolateScope', $popupScope);

							var self = this;
							var selectedId = null;
							var itemsPromise = this.listItems(inputValue, -1, this._buildCriterias());

							itemsPromise.then(function(items) {
								self._renderItems(ul, items);
								if (reason === "downKey") {
									var selectedLI = cui.GetNextFocusable(ul[0]);
									selectedLI.setAttribute("cm_selected", true);
									self.itemStyleUpdate(selectedLI);

									selectedId = selectedLI.id;

									$scope.$broadcast(CLEAR_SUGGEST_EVENT, "nextItem", event);
									$scope.$broadcast(SELECT_ITEM_EVENT, "openPopup", items[0], null, event);
								}

								self.itemsStyleUpdate(ul);

								self.containerElement.appendChild(fragment);

								$scope.$broadcast(POPUP_OPENED_EVENT, ul);
							});

							$popupScope.$on(POPUP_CLOSE_REQUEST_EVENT, function($event, request, event) {

								if (!__DISABLED_POPUP_CLOSE) {
									ul.remove();
								}
								self.containerElement.setAttribute("cm_closedPopup", true);

								$scope.$broadcast(POPUP_CLOSED_EVENT, ul);
							});

							function selectItem(direction, event) {
								var selectedLI = selectedId && document.getElementById(selectedId);
								if (selectedLI) {
									selectedLI.removeAttribute("cm_selected");
									self.itemStyleUpdate(selectedLI);
								}
								selectedId = null;

								var item = null;
								var selectedLI = (direction === "down" ? cui.GetNextFocusable : cui.GetPreviousFocusable).bind(cui)(
										ul[0], selectedLI);
								if (selectedLI) {
									selectedId = selectedLI.id;

									selectedLI.setAttribute("cm_selected", true);
									self.itemStyleUpdate(selectedLI);

									item = angular.element(selectedLI).data("cm_item");

									cui.EnsureVisible(ul[0], selectedLI);
								}

								$scope.$broadcast(CLEAR_SUGGEST_EVENT, "nextItem", event);
								$scope.$broadcast(SELECT_ITEM_EVENT, "nextItem", item, null, event);
							}

							$popupScope.$on(NEXT_POPUP_ITEM_EVENT, function($event, reason, event) {
								$log.debug("Process NEXT_POPUP_ITEM_EVENT");
								selectItem("down", event);
							});
							$popupScope.$on(PREVIOUS_POPUP_ITEM_EVENT, function($event, reason, event) {
								$log.debug("Process PREVIOUS_POPUP_ITEM_EVENT");
								selectItem("up", event);
							});

							$scope.$on(FILTER_CHANGED_EVENT, function($event, inputValue, reason, event) {
								$log.debug("Process FILTER_CHANGED_EVENT '" + inputValue + "'");

								var itemsPromise = self.listItems(inputValue, -1, self._buildCriterias());
								itemsPromise.then(function(items) {
									self._renderItems(ul, items);

									$scope.$broadcast(PROPOSE_ITEM_EVENT, reason, items[0], true, event);
								});
							});

						}
					});

			return ComboRenderer;
		} ]);

})(window, window.angular);