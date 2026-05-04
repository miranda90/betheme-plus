/**
 * Fix BeBuilder mfnoptsinputs.showhidefields: condiciones compuestas deben leer valores
 * solo dentro del formulario del elemento editado (evita .val() del primer match global).
 *
 * Depende de window.mfnoptsinputs tras scripts.js del Visual Builder.
 */
(function () {
	var $ = window.jQuery || window.$;
	if (!$) {
		return;
	}

	if (typeof window.mfnoptsinputs === 'undefined' || !window.mfnoptsinputs.showhidefields) {
		return;
	}

	function getConditionScope(formrow) {
		var $s = formrow.closest('.mfn-element-fields-wrapper');
		if ($s.length) {
			return $s;
		}
		$s = formrow.closest('.mfn-ui .mfn-form');
		if ($s.length) {
			return $s;
		}
		return formrow.closest('.mfn-ui');
	}

	function readTriggerValue($scope, cid) {
		var $row = $scope.find('#' + cid).filter('.mfn-form-row').first();
		if (!$row.length) {
			$row = $('#' + cid + '.mfn-form-row').first();
		}
		if ($row.find('.single-segmented-option.segmented-options').length || $row.find('.visual-options').length) {
			return $row.find('input:checked').val();
		}
		var v = $row.find('.mfn-field-value').first().val();
		if (typeof v !== 'undefined' && v !== null && v !== '') {
			return v;
		}
		return $row.find('.condition-field, .field-to-object').first().val();
	}

	function matchesIs(c, val, regex) {
		if (val === '' && c.val === '') {
			return true;
		}
		if (val === '' || typeof val === 'undefined' || val === null) {
			return false;
		}
		var cv = c.val;
		if (Array.isArray(cv)) {
			return cv.indexOf(val) !== -1 || cv.indexOf(String(val)) !== -1;
		}
		if (typeof cv === 'string' && typeof cv.includes === 'function') {
			return cv.includes(val) || regex.test(val);
		}
		if (cv != null && typeof cv === 'object' && typeof cv.includes === 'function') {
			return cv.includes(val) || regex.test(val);
		}
		return String(cv) === String(val) || regex.test(String(val));
	}

	function matchesIsnt(c, val) {
		return (
			(c.val === '' && val !== '') ||
			(val === '' && c.val !== '') ||
			val != c.val
		);
	}

	mfnoptsinputs.showhidefields = function (formrow) {
		var raw = formrow.attr('data-condition');
		if (!raw) {
			return;
		}

		var $scope = getConditionScope(formrow);
		var val = '';
		var regex = /\{featured_image:(\d+):badge\}/;

		mfnoptsinputs.relation = 'AND';
		mfnoptsinputs.condition = JSON.parse(raw);

		if (
			Array.isArray(mfnoptsinputs.condition) &&
			typeof mfnoptsinputs.condition[0] === 'string'
		) {
			mfnoptsinputs.relation = mfnoptsinputs.condition[0];
			mfnoptsinputs.condition.splice(0, 1);
		}

		if (Array.isArray(mfnoptsinputs.condition)) {
			var show = 0;
			var c_l = mfnoptsinputs.condition.length;

			mfnoptsinputs.condition.forEach(function (c) {
				val = readTriggerValue($scope, c.id);

				if (c.opt === 'is' && matchesIs(c, val, regex)) {
					show++;
				} else if (c.opt === 'isnt' && matchesIsnt(c, val)) {
					show++;
				} else if (mfnoptsinputs.relation === 'OR') {
					show--;
				} else {
					show = 0;
				}
			});

			if (mfnoptsinputs.relation === 'OR' && show >= 0) {
				formrow.addClass('conditionally-show').removeClass('conditionally-hide');
			} else if (show === c_l) {
				formrow.addClass('conditionally-show').removeClass('conditionally-hide');
			} else {
				formrow.addClass('conditionally-hide').removeClass('conditionally-show');
			}
		} else {
			val = readTriggerValue($scope, mfnoptsinputs.condition.id);
			var cond = mfnoptsinputs.condition;
			if (
				cond.opt === 'is' &&
				matchesIs(cond, val, regex)
			) {
				formrow.addClass('conditionally-show').removeClass('conditionally-hide');
			} else if (cond.opt === 'isnt' && matchesIsnt(cond, val)) {
				formrow.addClass('conditionally-show').removeClass('conditionally-hide');
			} else {
				formrow.addClass('conditionally-hide').removeClass('conditionally-show');
			}
		}
	};

	$(document).on(
		'click',
		'.panel-edit-item ul.sidebar-panel-content-tabs > li[data-tab="advanced"], .panel-edit-item ul.sidebar-panel-content-tabs > li[data-tab="style"]',
		function () {
			if (typeof window.mfnoptsinputs === 'undefined' || !mfnoptsinputs.startValues) {
				return;
			}
			window.setTimeout(function () {
				mfnoptsinputs.startValues();
			}, 50);
		}
	);

	/**
	 * Persistencia split-text (BeTheme Plus): asegura que el valor quede en `mfn.pagedata`
	 * para el `uid` editado. Si solo existía en `edited_item` o hubo réplicas, el guardado
	 * / re_render podía no llevar el último valor del select "Estilo de animación".
	 */
	var SPLIT_TEXT_ATTR_KEYS = ['split_text_animation_style', 'split_text_type', 'split_text_stagger'];

	function syncSplitTextAttrsToPagedata($field) {
		var name = $field.attr('name');
		if (!name || SPLIT_TEXT_ATTR_KEYS.indexOf(name) === -1) {
			return;
		}
		var val = $field.val();
		var ei = window.edited_item;
		if (!ei || !ei.uid) {
			return;
		}
		if (!ei.attr) {
			ei.attr = {};
		}
		ei.attr[name] = val;
		var pd = window.mfn && window.mfn.pagedata;
		if (!pd || !pd.length) {
			return;
		}
		for (var i = 0; i < pd.length; i++) {
			if (pd[i].uid === ei.uid) {
				if (!pd[i].attr) {
					pd[i].attr = {};
				}
				pd[i].attr[name] = val;
			}
		}
	}

	$(document).on('change', '.panel-edit-item .mfn-field-value', function () {
		var n = $(this).attr('name');
		if (!n || SPLIT_TEXT_ATTR_KEYS.indexOf(n) === -1) {
			return;
		}
		syncSplitTextAttrsToPagedata($(this));
	});
})();
