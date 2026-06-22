;(function () {
    // Android: navigator.vibrate patterns
    var PATTERNS = {
        light:     [10],
        medium:    [20],
        heavy:     [35],
        selection: [8],
        success:   [10, 30, 20],
        warning:   [20, 30, 15],
        error:     [15, 10, 15, 10, 15],
    };

    // iOS: <input type="checkbox" switch> triggers Taptic Engine when toggled.
    // Must be in DOM, not display:none — opacity:0 + off-screen works.
    var _el = null;
    function _init() {
        if (_el || typeof document === 'undefined') return;
        var inp = document.createElement('input');
        inp.type = 'checkbox';
        inp.setAttribute('switch', '');
        inp.style.cssText = 'position:fixed;top:-200px;left:-200px;opacity:0;pointer-events:none;';
        document.body.appendChild(inp);
        _el = inp;
    }

    window._h = {
        trigger: function (preset) {
            if (navigator.vibrate) {
                navigator.vibrate(PATTERNS[preset] || PATTERNS.medium);
                return;
            }
            // iOS path
            if (!_el) _init();
            if (_el) _el.checked = !_el.checked;
        }
    };

    if (document.body) _init();
    else document.addEventListener('DOMContentLoaded', _init, { once: true });
})();
