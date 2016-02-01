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

	var module = angular.module('camelia.directives.combo', [ 'camelia.core',
		'camelia.directives.template',
		'camelia.directives.items',
		'camelia.components.combo' ]);

	module.value("cm_combo_componentProviderName", "camelia.components.combo:camelia.components.Combo");

	module.directive("cmCombo", [ "$injector",
		"$interpolate",
		"$log",
		"$q",
		"$exceptionHandler",
		"camelia.core",
		"cm_combo_componentProviderName",
		"camelia.directives.TemplateContainer",
		"camelia.directives.ItemsContainer",
		function($injector, $interpolate, $log, $q, $exceptionHandler, cc, cm_combo_componentProviderName,
				TemplateContainer, ItemsContainer) {

			return {
				restrict: "E",
				scope: {
					id: '@',
					forElementId: '@for',
					selectedItem: '=?selecteditem',
					style: '@',
					className: '@class',
					maxTextLength: '@maxtextlength',
					textSize: '@textsize',
					tabIndex: '@tabindex',
					tags: '=?',
					tagVar: '@tagvar',
					value: '=?',
					popupMaxHeight: '@popupmaxheight',
					maxItems: '@maxitems',
					placeholder: '@placeholder',
					suggestIgnoreAccents: "@suggestignoreaccents",
					suggestIgnoreCase: "@suggestignorecase",
					// tagLabel: '@taglabel',
					// tagTooltip: '@tagtooltip',
					// tagClass: '@tagclass',
					hasOpenPopupButton: '@hasopenpopupbutton'
				},

				controller: [ "$scope", function($scope) {
					var componentProvider = $scope.componentProvider;
					if (!componentProvider) {
						var componentProviderName = $scope.componentProviderName || cm_combo_componentProviderName;
						componentProvider = cc.LoadProvider(componentProviderName);
					}
					this.componentProvider = componentProvider;
				} ],
				compile: function() {
					return {
						pre: function($scope, element, attrs, controller) {
							TemplateContainer.MarkTemplateContainer($scope, element);
							ItemsContainer.MarkItemsContainer($scope, element);

							var tagsRawExpression = element.attr("tags");
							if (tagsRawExpression) {
								$scope.tagVar = element.attr("tagVar");
								$scope.tagLabelRawExpression = element.attr("tagLabel");
								$scope.tagTooltipRawExpression = element.attr("tagTooltip");
								$scope.tagClassRawExpression = element.attr("tagClass");
							}
						},
						post: function($scope, element, attrs, controller, transludeFunc) {
							TemplateContainer.RegisterTemplates($scope);

							var combo = new controller.componentProvider($scope, element, $interpolate);

							var promise = $injector.invoke(combo.construct, combo);

							if (!cc.isPromise(promise)) {
								promise = $q.when(promise);
							}

							promise.then(function onSuccess(comboElement) {
								$log.info("Combo created ", comboElement);

								element.replaceWith(comboElement);

							}, function onError(reason) {
								if (reason instanceof Error) {
									$exceptionHandler(reason);

								} else {
									$log.error("Failed to create combo ", reason);
								}
							});
						}
					};
				}
			};
		} ]);
})(window, window.angular);