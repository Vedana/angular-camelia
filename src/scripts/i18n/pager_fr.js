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

	var module = angular.module("camelia.i18n.pager");

	module.config([ '$provide', function($provide) {

		$provide.decorator("camelia.i18n.Pager", [ '$delegate', function($delegate) {

			return angular.extend($delegate, {
				'fr': {
					bfirst_label: "Premier",
					blast_label: "Dernier",
					bprev_label: "Précédent",
					bprev_tooltip: "Voir la page précédente",
					bnext_label: "Suivant",
					bnext_tooltip: "Voir la page suivante",
					index_label: "{pageIndex}",
					index_tooltip: "Voir page #{pageIndex}",
					cindex_label: "{pageIndex}",
					cindex_tooltip: "Page courrante #{pageIndex}",
					uindex_label: "...",
					uindex_tooltip: "Voir la page suivante",
					separator: " ",
					noPages: "Aucune page"
				}
			});
		} ]);
	} ]);

})(window, window.angular);