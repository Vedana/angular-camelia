/**
 * @product CameliaJS (c) 2015 Vedana http://www.vedana.com
 * @license Creative Commons - The licensor permits others to copy, distribute, display, and perform the work. In return, licenses may not use the work for commercial purposes -- unless they get the licensor's permission.
 * @author olivier.oeuillot@vedana.com
 */

(function(window, angular, undefined) {
	'use strict';

	var module = angular.module('camelia.key', []);
	
	module.factory('camelia.Key', [ function() {

		return {

			/** @field public static final Number */
			VK_CANCEL: 0x03,

			/** @field public static final Number */
			VK_HELP: 0x06,

			/** @field public static final Number */
			VK_BACK_SPACE: 0x08,

			/** @field public static final Number */
			VK_TAB: 0x09,

			/** @field public static final Number */
			VK_CLEAR: 0x0C,

			/** @field public static final Number */
			VK_RETURN: 0x0D,

			/** @field public static final Number */
			VK_ENTER: 0x0E,

			/** @field public static final Number */
			VK_SHIFT: 0x10,

			/** @field public static final Number */
			VK_CONTROL: 0x11,
			/** @field public static final Number */
			VK_ALT: 0x12,
			/** @field public static final Number */
			VK_PAUSE: 0x13,
			/** @field public static final Number */
			VK_CAPS_LOCK: 0x14,
			/** @field public static final Number */
			VK_ESCAPE: 0x1B,
			/** @field public static final Number */
			VK_SPACE: 0x20,
			/** @field public static final Number */
			VK_PAGE_UP: 0x21,
			/** @field public static final Number */
			VK_PAGE_DOWN: 0x22,
			/** @field public static final Number */
			VK_END: 0x23,
			/** @field public static final Number */
			VK_HOME: 0x24,
			/** @field public static final Number */
			VK_LEFT: 0x25,
			/** @field public static final Number */
			VK_UP: 0x26,
			/** @field public static final Number */
			VK_RIGHT: 0x27,
			/** @field public static final Number */
			VK_DOWN: 0x28,
			/** @field public static final Number */
			VK_PRINTSCREEN: 0x2C,
			/** @field public static final Number */
			VK_INSERT: 0x2D,
			/** @field public static final Number */
			VK_DELETE: 0x2E,

			/** @field public static final Number */
			VK_SEMICOLON: 0x3B,
			/** @field public static final Number */
			VK_EQUALS: 0x3D,
			/** @field public static final Number */
			VK_CONTEXTMENU: 0x5D,
			/** @field public static final Number */
			VK_NUMPAD0: 0x60,
			/** @field public static final Number */
			VK_NUMPAD1: 0x61,
			/** @field public static final Number */
			VK_NUMPAD2: 0x62,
			/** @field public static final Number */
			VK_NUMPAD3: 0x63,
			/** @field public static final Number */
			VK_NUMPAD4: 0x64,
			/** @field public static final Number */
			VK_NUMPAD5: 0x65,
			/** @field public static final Number */
			VK_NUMPAD6: 0x66,
			/** @field public static final Number */
			VK_NUMPAD7: 0x67,
			/** @field public static final Number */
			VK_NUMPAD8: 0x68,
			/** @field public static final Number */
			VK_NUMPAD9: 0x69,
			/** @field public static final Number */
			VK_MULTIPLY: 0x6A,
			/** @field public static final Number */
			VK_ADD: 0x6B,
			/** @field public static final Number */
			VK_SEPARATOR: 0x6C,
			/** @field public static final Number */
			VK_SUBTRACT: 0x6D,
			/** @field public static final Number */
			VK_DECIMAL: 0x6E,
			/** @field public static final Number */
			VK_DIVIDE: 0x6F,
			/** @field public static final Number */
			VK_F1: 0x70,
			/** @field public static final Number */
			VK_F2: 0x71,
			/** @field public static final Number */
			VK_F3: 0x72,
			/** @field public static final Number */
			VK_F4: 0x73,
			/** @field public static final Number */
			VK_F5: 0x74,
			/** @field public static final Number */
			VK_F6: 0x75,
			/** @field public static final Number */
			VK_F7: 0x76,
			/** @field public static final Number */
			VK_F8: 0x77,
			/** @field public static final Number */
			VK_F9: 0x78,
			/** @field public static final Number */
			VK_F10: 0x79,
			/** @field public static final Number */
			VK_F11: 0x7A,
			/** @field public static final Number */
			VK_F12: 0x7B,

			/** @field public static final Number */
			VK_NUM_LOCK: 0x90,
			/** @field public static final Number */
			VK_SCROLL_LOCK: 0x91,

			/** @field public static final Number */
			VK_COMMA: 0xBC,
			/** @field public static final Number */
			VK_PERIOD: 0xBE,
			/** @field public static final Number */
			VK_SLASH: 0xBF,
			/** @field public static final Number */
			VK_BACK_QUOTE: 0xC0,
			/** @field public static final Number */
			VK_OPEN_BRACKET: 0xDB,
			/** @field public static final Number */
			VK_BACK_SLASH: 0xDC,
			/** @field public static final Number */
			VK_CLOSE_BRACKET: 0xDD,
			/** @field public static final Number */
			VK_QUOTE: 0xDE,

			/** @field public static final Number */
			KF_SHIFT: 0x01,

			/** @field public static final Number */
			KF_CONTROL: 0x02,

			/** @field public static final Number */
			KF_ALT: 0x04,

			/** @field public static final Number */
			KF_META: 0x08

		};

	} ]);

})(window, window.angular);