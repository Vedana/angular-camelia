/**
 * @product CameliaJS (c) 2016 Vedana http:// www.vedana.com
 * @license Creative Commons - The licensor permits others to copy, distribute,
 *          display, and perform the work. In return, licenses may not use the
 *          work for commercial purposes -- unless they get the licensor's
 *          permission.
 * @author olivier.oeuillot@vedana.com
 */

(function(window, angular, undefined) {
	'use strict';

	var module = angular.module('camelia.core');

	var ACCENTS_MAPPER = [ /[áãàâäåāăąȁȃȧǎǟǡ]/g,
		"a",
		/[æǣǽ]/g,
		"ae",
		/[çćĉċč]/g,
		"c",
		/[éèêëēĕėęěȅȇȩ]/g,
		"e",
		/[íìîïĩīĭįıȉȋǐ]/g,
		"i",
		/[ĳ]/g,
		"ij",
		/[ñńņňŉŋ]/g,
		"n",
		/[óõòôöōŏőȍȏǒȫȭȯȱ]/g,
		"o",
		/[œ]/g,
		"oe",
		/[úùûüµũūŭůűųǔǖǘǚǜ]/g,
		"u",
		/[ýÿŷȳ]/g,
		"y",
		/[ÀÁÂÃÄÅĀĂĄȀȂȦǍǞǠ]/g,
		"A",
		/[ÆǢǼ]/g,
		"AE",
		/[ÇĆĈĊČ]/g,
		"C",
		/[ÈÉÊËĒĔĖĘĚȄȆȨ]/g,
		"E",
		/[ÌÍÎÏĨĪĬĮİȈȊǏ]/g,
		"I",
		/[Ĳ]/g,
		"IJ",
		/[ÑŃŅŇŊ]/g,
		"N",
		/[ÓÔÕÖÒŌŎŐȌȎǑȪȬȮȰ]/g,
		"O",
		/[ŔŖŘ]/g,
		/[Œ]/g,
		"OE",
		"R",
		/[ÙÚÛÜŨŪŬŮŰŲǓǕǗǙǛ]/g,
		"U",
		/[ÝŶŸȲ]/g,
		"Y" ];

	module.factory('camelia.CharsetUtils', [ '$log', function($log) {

		return {
			removeAccents: function(text) {
				var mapper = ACCENTS_MAPPER;

				var ret = text;

				for (var i = 0; i < mapper.length;) {
					var expr = mapper[i++];
					var code = mapper[i++];

					ret = ret.replace(expr, code);
				}

				$log.debug("remove accents  of '" + text + "' to '" + ret + "'");

				return ret;
			}
		};

	} ]);

})(window, window.angular);
