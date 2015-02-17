/**
 * @product CameliaJS (c) 2015 Vedana http://www.vedana.com
 * @license Creative Commons - The licensor permits others to copy, distribute,
 *          display, and perform the work. In return, licenses may not use the
 *          work for commercial purposes -- unless they get the licensor's
 *          permission.
 * @author olivier.oeuillot@vedana.com
 */

(function(window, angular, undefined) {
	'use strict';

	var module = angular.module('camelia.templateRegistry', [ 'camelia.core' ]);

	module.factory('camelia.TemplateRegistry', [ '$log', '$q', 'camelia.core', function($log, $q, cc) {

		var doc = angular.element(document);
		var controller = doc.controller('cmTemplateRegistry');

		if (!controller) {
			controller = {
				templatesByScopeAndId: []
			};

			doc.data('$cmTemplateRegistryController', controller);
		}

		var templatesByScopeAndId = controller.templatesByScopeAndId;

		var TemplateRegistry = {

			RegisterTemplates: function($scope) {

				var templates = $scope.templates;
				if (!templates) {
					return;
				}

				var self = this;
				angular.forEach(templates, function(template) {
					var id = template.id;
					if (!id) {
						return;
					}

					self.Register($scope, template);
				});
			},

			Register: function($containerScope, template) {

				var byId;
				var idx = templatesByScopeAndId.indexOf($containerScope);
				if (idx >= 0) {
					byId = templatesByScopeAndId[idx];

				} else {
					byId = {};
					templatesByScopeAndId.unshift(byId);

					$containerScope.$on('$destroy', function() {
						var idx2 = templatesByScopeAndId.indexOf($containerScope);
						if (idx2 < 0) {
							return;
						}

						templatesByScopeAndId.splice(idx2, 1);
					});
				}

				byId[template.id] = template;
			},

			FindById: function(id) {
				for (var i = 0; i < templatesByScopeAndId.length; i++) {
					var byId = templatesByScopeAndId[i];

					var target = byId(id);
					if (target) {
						return target;
					}
				}

				return null;
			},

			PrepareTemplates: function(scopeTemplates, interpolateFct, name) {
				if (!scopeTemplates) {
					return null;
				}

				var templates = [];
				var enabledExpressions = {};
				var self = this;

				angular.forEach(scopeTemplates, function(template) {
					var $tScope = template.$scope;

					if (name && $tScope.name !== name) {
						return;
					}

					var enabledExp = $tScope.enabledExpresion;
					if (enabledExp) {
						if (enabledExp === 'false') {
							return;
						}

						enabledExpressions[template.id] = interpolateFct(enabledExp);
					}

					var refId = $tScope.refId;
					if (refId) {
						var refTemplate = self.FindById(refId);
						if (!refTemplate) {
							$log.error('Can not fin template id=' + refId);
							return;
						}

						template = refTemplate;
					}

					templates.push(template);
				});

				if (!templates.length) {
					return null;
				}

				return {
					templates: templates,
					enabledExpressions: enabledExpressions
				};
			}
		};

		return TemplateRegistry;
	} ]);

})(window, window.angular);