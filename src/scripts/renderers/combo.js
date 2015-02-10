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

	var module = angular.module("camelia.renderers.combo", [ "camelia.components.combo",
		"camelia.key",
		"camelia.i18n.combo" ]);

	module.value("cm_combo_className", "cm_combo");

	module.factory("camelia.renderers.Combo", [ "$log",
		"$q",
		"$exceptionHandler",
		"camelia.core",
		"camelia.cmTypes",
		"cm_combo_className",
		"camelia.Key",
		"camelia.i18n.Combo",
		function($log, $q, $exceptionHandler, cc, cm, cm_combo_className, Key, i18n) {

			function searchElements(target) {
				return cm.SearchElements({
					icon: null,
					button: null,
					input: null,
					label: null,
					tags: null,
					tag: null,
					tagRemove: null,
					combo: null
				}, "combo", target);
			}

			var ComboRenderer = function(renderContext) {
				angular.extend(this, renderContext);
			};

			ComboRenderer.prototype = {
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

					container.on("keydown", this._onKeyPress());
					// container.on("keypress", OnKeyPress(renderContext));

					this._offFocus = cc.on(container, "focus", this._onFocus(), true, $scope);
					this._offBlur = cc.on(container, "blur", this._onBlur(), true, $scope);

					var self = this;
					$scope.$on("$destroy", function() {
						self._offFocus();
						self._offBlur();
					});

					$scope.$watch("style", function onStyleChanged(style) {
						style = style || "";
						container.attr("style", style);
					});

					$scope.$watch("className", function onClassNameChanged() {
						self.comboStyleUpdate(container);
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
							var ret = f(container);

							if (!cc.isPromise(ret)) {
								continue;
							}

							retPromise = ret;
							continue;
						}

						retPromise.then(this._callPromise(f, container));
					}

					retPromise = cc.ensurePromise(retPromise);

					return retPromise.then(function onSuccess(result) {

						self.comboStyleUpdate(container);

						return container;
					});
				},
				_callPromise: function(f, container) {
					return function() {
						var ret = f(container);
						return ret;
					};
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

					var inputContainer = cc.createElement(parent, "div", {
						className: "cm_combo_cinput"
					});

					var input = cc.createElement(inputContainer, "input", {
						id: this.combo.id + "_input",
						className: "cm_combo_input",
						$cm_type: "input"
					});

					this.$scope.$watch("maxTextLength", function onMaxTextLength(newMaxLength) {
						input.attr("maxlength", newMaxLength);
					});
					this.$scope.$watch("textSize", function onTextSize(newTextSize) {
						input.attr("size", newTextSize);
					});

					if (this.$scope.maxLength) {
						input.attr("maxlength", this.$scope.maxLength);
					}
					if (this.$scope.textSize) {
						input.attr("size", this.$scope.textSize);
					}

					return $q.when(inputContainer);
				},

				openButtonRenderer: function(parent) {

					var button = cc.createElement(parent, "button", {
						id: this.combo.id + "_openButton",
						className: "cm_combo_button fa fa-caret-down",
						$cm_type: "button",
						$cm_action: "openPopup",
						$fa_classes: [ "fa", "fa-caret-down" ]
					});

					return $q.when(button);
				},

				tagsRenderer: function(parent) {
					var ul = cc.createElement(parent, "ul", {
						id: "cm_ctags_" + (anonymousId++),
						className: "cm_combo_tags",
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
						container[0].style.display = "none";
						return;
					}
					container[0].style.display = "";

					p = angular.element(document.createDocumentFragment());
					angular.forEach(cmps, function(cmp) {
						p.append(cmp);
					});

					container.append(p);
				},

				tagRenderer: function(container, tag, expressions) {
					var li = cc.createElement(container, "li", {
						id: "cm_ctag_" + (anonymousId++),
						className: "cm_combo_tag",
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
					cc.createElement(li, "a", {
						$cm_type: "tagRemove",
						href: "javascript:void(0)",
						"aria-hidden": false,
						tabIndex: -1,
						className: "cm_combo_tagRemove fa fa-times",
						$fa_classes: "fa fa-times"
					});

					var tooltip = "";
					if (expressions.tagTooltip) {
						tooltip = tagScope.$eval(expressions.tagTooltip);
					}
					if (typeof (tag.toTagTooltip) === "function") {
						tooltip = tag.toTagTooltip();
					}
					if (tooltip) {
						li[0].title = tooltip;
					}

					var className = "";
					if (expressions.tagClass) {
						className = tagScope.$eval(expressions.tagClass);
					}
					if (className) {
						li[0].className = className;
					}

					li.data('$isolateScope', tagScope);
					return li;
				},

				_onMouseOver: function() {
					var self = this;

					return function(event) {
						var target = event.target;

						var elements = searchElements(target);

						console.log("elements=", elements);

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

						var elements = searchElements(target);
						cm.SwitchOffState(self, elements, "focus");
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

				_onKeyPress: function() {
					var self = this;

					return function(event) {
						var target = event.target;
						var elements = searchElements(target);
						var cancel = false;

						var next;

						if (elements.input) {
							switch (event.keyCode) {
							case Key.VK_LEFT:
								if (!elements.input.selectionStart) {
									next = cm.GetPreviousFocusable(self.containerElement, target);
								}
								break;
							case Key.VK_RIGHT:
								if (elements.input.selectionStart === elements.input.value.length) {
									next = cm.GetNextFocusable(self.containerElement, target);
								}
								break;
							case Key.VK_BACK_SPACE:
								if (!elements.input.selectionStart) {
									var prevTag = cm.GetPreviousFocusable(self.containerElement, target);
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

							case Key.VK_RETURN:
							case Key.VK_ENTER:
								self.$scope.$broadcast("keyEnter", event);
								break;
							}

							self.$scope.$broadcast("keyPress", event);

						} else {
							switch (event.keyCode) {
							case Key.VK_RIGHT:
								cancel = true;
								next = cm.GetNextFocusable(self.containerElement, target);
								break;

							case Key.VK_LEFT:
								cancel = true;
								next = cm.GetPreviousFocusable(self.containerElement, target);
								break;

							case Key.VK_DELETE:
							case Key.VK_BACK_SPACE:
								if (elements.tag) {
									cancel = true;
									var tag = elements.tag && angular.element(elements.tag).data("cm_tag");
									if (!tag) {
										$log.error("No data associated to tag element " + elements.tag);
										break;
									}

									next = ((event.keyCode === Key.VK_DELETE) ? cm.GetNextFocusable : cm.GetPreviousFocusable).bind(cm)(
											self.containerElement, target);

									self.processTagRemove(tag);
								}
								break;
							}
						}

						if (next) {
							next.focus();
						}

						if (cancel) {
							event.stopPropagation();
							event.preventDefault();
						}
					};
				},

				_onSimpleClick: function() {
					var self = this;

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
					if (element.buttonType) {
						l.push("cm_combo_button_" + element.buttonType);
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

					return cm.MixElementClasses(element, l, element.fa_classes);
				},

				processTagRemove: function(tag) {
					var scope = this.$scope;

					var tags = scope.tags;
					if (!tags) {
						$log.error("No tags list ?");
						scope.$digest();
						return;
					}

					var idx = tags.indexOf(tag);
					if (idx < 0) {
						$log.error("Can not find tag '", tag, "' in tags list ", tags);
						scope.$digest();
						return;
					}

					tags.splice(idx, 1);

					scope.$digest();
				}
			};

			return ComboRenderer;
		} ]);

})(window, window.angular);