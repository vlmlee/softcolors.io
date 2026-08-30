var defaultColors = [
    { 'hex': '#E53935', 'name': 'Cadmium Red' },
    { 'hex': '#3F51B5', 'name': 'Ultramarine Blue' },
    { 'hex': '#8BC34A', 'name': 'Sap Green' },
    { 'hex': '#FFEE58', 'name': 'Lemon Yellow' },
    { 'hex': '#E67E22', 'name': 'Burnt Sienna' },
    { 'hex': '#B71C1C', 'name': 'Alizarin Crimson' },
    { 'hex': '#01579B', 'name': 'Phthalo Blue' },
    { 'hex': '#00897B', 'name': 'Viridian' },
    { 'hex': '#FFB74D', 'name': 'Yellow Ochre' },
    { 'hex': '#37474F', 'name': 'Paynes Gray' }
];

var isShowingColorPicker = false;

var finishedLoading = false;

var handlers = {
    getColorNames: async function (colors) {
        return await $.ajax({
            url: '/getColorNames',
            data: {
                colors: colors.map(function (color) {
                    return color.replace(/^#/, '');
                }).join(',')
            },
            dataType: 'json',
            cache: false
        });
    }
}

// Watercolor-style wash: blur, desaturate, and drift away
function washOut($els, duration, stagger, complete) {
    duration = duration || 350;
    stagger = stagger || 50;
    var $visible = $els.filter(':visible');
    var pending = $visible.length;

    if (!pending) {
        if (complete) complete();
        return;
    }

    $visible.each(function (index) {
        var $el = $(this);
        $el
            .stop(true, false)
            .css('pointer-events', 'none')
            .delay(index * stagger)
            .animate({ opacity: 0 }, {
                duration: duration,
                easing: 'swing',
                step: function (now) {
                    var progress = 1 - now;
                    $el.css({
                        filter: 'blur(' + (progress * 5) + 'px) saturate(' + (1 - progress * 0.85) + ') brightness(' + (1 + progress * 0.45) + ')',
                        transform: 'scale(' + (1 + progress * 0.01) + ')'
                    });
                },
                complete: function () {
                    $el.hide().css({
                        opacity: '',
                        filter: '',
                        transform: '',
                        'pointer-events': ''
                    });
                    pending -= 1;
                    if (pending === 0 && complete) complete();
                }
            });
    });
}

function washIn($els, duration, stagger, complete) {
    duration = duration || 320;
    stagger = stagger || 50;
    var pending = $els.length;

    if (!pending) {
        if (complete) complete();
        return;
    }

    $els.each(function (index) {
        var $el = $(this);
        $el
            .stop(true, false)
            .show()
            .css({
                opacity: 0,
                filter: 'blur(5px) saturate(0.15) brightness(1.45)',
                transform: 'scale(1.01)',
                'pointer-events': 'none'
            })
            .delay(index * stagger)
            .animate({ opacity: 1 }, {
                duration: duration,
                easing: 'swing',
                step: function (now) {
                    var progress = 1 - now;
                    $el.css({
                        filter: 'blur(' + (progress * 5) + 'px) saturate(' + (1 - progress * 0.85) + ') brightness(' + (1 + progress * 0.45) + ')',
                        transform: 'scale(' + (1 + progress * 0.01) + ')'
                    });
                },
                complete: function () {
                    $el.css({
                        opacity: '',
                        filter: '',
                        transform: '',
                        'pointer-events': ''
                    });
                    pending -= 1;
                    if (pending === 0 && complete) complete();
                }
            });
    });
}

function showColorPicker() {
    isShowingColorPicker = true;
    // Brush rinses first, then the palette washes away
    washOut($('.paintbrush-image-container, .paintbrush-palette'), 350, 50, function () {
        $('.color-picker').fadeIn(200);
        $('.show-color-picker-button').hide();
        $('.show-brush-and-palette-button').show();
    });
}

function showBrushAndPalette() {
    isShowingColorPicker = false;
    $('.color-picker').hide();
    $('.show-color-picker-button, .waterdrop-button, .three-droplets-button').show();
    $('.show-brush-and-palette-button').hide();
    // Palette settles first, then brush reappears into it
    washIn($('.paintbrush-palette, .paintbrush-image-container'), 320, 50);
}

function setQueryParams(colors) {
    var queryParams = {
        colors: encodeURIComponent(colors.map(color => color.hex.slice(1)).join(','))
    };
    window.history.pushState({}, '', '?' + $.param(queryParams));
}

function getQueryParams() {
    var queryParams = window.location.search.substring(1);
    var hexes = decodeURIComponent(new URLSearchParams(queryParams).get('colors')).split(",").map(color => '#' + color);
    return hexes.length < 10 ? [...hexes, ...defaultColors.slice(hexes.length).map(color => color.hex)] : hexes;
}

var colorAnimations = {};

function hexToRgb(hex) {
    if (!hex || hex.charAt(0) !== '#' || hex.length < 7) return null;
    return {
        r: parseInt(hex.slice(1, 3), 16),
        g: parseInt(hex.slice(3, 5), 16),
        b: parseInt(hex.slice(5, 7), 16)
    };
}

function rgbToHex(r, g, b) {
    function toHex(x) {
        return ('0' + Math.round(x).toString(16)).slice(-2);
    }
    return '#' + toHex(r) + toHex(g) + toHex(b);
}

function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

function animateToColor(key, fromHex, toHex, apply, options) {
    options = options || {};
    var duration = options.duration != null ? options.duration : 520;
    var animate = options.animate !== false;
    var from = hexToRgb(fromHex);
    var to = hexToRgb(toHex);

    if (colorAnimations[key]) {
        cancelAnimationFrame(colorAnimations[key]);
        colorAnimations[key] = null;
    }

    // First paint or missing colors — set immediately
    if (!animate || !from || !to || fromHex.toUpperCase() === toHex.toUpperCase()) {
        apply(toHex);
        return;
    }

    var startTime = null;

    function frame(now) {
        if (startTime === null) startTime = now;
        var t = Math.min(1, (now - startTime) / duration);
        var eased = easeOutCubic(t);
        apply(rgbToHex(
            from.r + (to.r - from.r) * eased,
            from.g + (to.g - from.g) * eased,
            from.b + (to.b - from.b) * eased
        ));

        if (t < 1) {
            colorAnimations[key] = requestAnimationFrame(frame);
        } else {
            colorAnimations[key] = null;
        }
    }

    colorAnimations[key] = requestAnimationFrame(frame);
}

function setPanColors(colors, options) {
    for (var i = 0; i < colors.length; i++) {
        (function (index) {
            var targetHex = colors[index].hex;
            var $stops = $('#pigment-' + (index + 1) + ' stop');
            animateToColor(
                'pan-' + index,
                $stops.first().attr('stop-color'),
                targetHex,
                function (hex) {
                    $stops.attr('stop-color', hex);
                },
                options
            );
        })(i);
    }
}

async function setColorPalette(useDefault = false, modifier = modifyColorToPastelRich) {
    const colorsFromQueryParams = await getColorsFromQueryParams(useDefault);
    var softColors = colorsFromQueryParams.map(color => modifier(color.hex));
    var colors = await handlers.getColorNames(softColors);

    for (var i = 0; i < colorsFromQueryParams.length; i++) {
        (function (index) {
            var $box = $('.color-box').eq(index);
            var $modified = $('.color-box__modified').eq(index);

            animateToColor(
                'box-' + index,
                $box.css('background-color'),
                colorsFromQueryParams[index].hex,
                function (hex) {
                    $box.css('background-color', hex);
                },
                { duration: 250 }
            );
            animateToColor(
                'box-modified-' + index,
                $modified.css('background-color'),
                colors[index].hex,
                function (hex) {
                    $modified.css('background-color', hex);
                },
                { duration: 250 }
            );

            var colorName = colorsFromQueryParams[index].name + ' → ' + colors[index].name;
            $('.color-name').eq(index).text(colorName).attr('title', colorName);
            $('.color-code').eq(index).text(
                colorsFromQueryParams[index].hex.toUpperCase() + ' → ' + colors[index].hex.toUpperCase()
            );
        })(i);
    }

    setQueryParams(colorsFromQueryParams);
}

async function getColorsFromQueryParams(useDefault) {
    var queryParamColors = useDefault ? defaultColors.map(color => color.hex) : getQueryParams();
    var colors = await handlers.getColorNames(queryParamColors);

    finishedLoading = true;

    return colors.map(color => {
        return {
            hex: color.hex.toUpperCase(),
            name: color.name
        }
    });
}

function resetColors() {
    if (isShowingColorPicker) {
        setQueryParams(defaultColors);
        setColorPalette(true);
    } else {
        const colors = getQueryParams();
        setPanColors(colors.map(color => ({ hex: color })));
    }
}

function handleSoften() {
    if (isShowingColorPicker) {
        setColorPalette(false, modifyColorToPastelRich);
    } else {
        const colors = getQueryParams();
        setPanColors(colors.map(color => ({ hex: modifyColorToPastelRich(color) })));
    }
}

function handleSofter() {
    if (isShowingColorPicker) {
        setColorPalette(false, modifyColorToPastelSoft);
    } else {
        const colors = getQueryParams();
        setPanColors(colors.map(color => ({ hex: modifyColorToPastelSoft(color) })));
    }
}

function convertHexToHSL(hex) {
    var r = parseInt(hex.slice(1, 3), 16) / 255;
    var g = parseInt(hex.slice(3, 5), 16) / 255;
    var b = parseInt(hex.slice(5, 7), 16) / 255;
    var max = Math.max(r, g, b);
    var min = Math.min(r, g, b);
    var l = (max + min) / 2;
    var s = 0;
    var h = 0;

    if (max !== min) {
        var d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

        switch (max) {
            case r:
                h = ((g - b) / d) + (g < b ? 6 : 0);
                break;
            case g:
                h = ((b - r) / d) + 2;
                break;
            case b:
                h = ((r - g) / d) + 4;
                break;
        }
        h /= 6;
    }

    return { h: h, s: s, l: l };
}

function convertHSLToHex(h, s, l) {
    var r, g, b;

    if (s === 0) {
        r = g = b = l;
    } else {
        var hue2rgb = function (p, q, t) {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };

        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }

    function toHex(x) {
        return ('0' + Math.round(x * 255).toString(16)).slice(-2);
    }

    return '#' + toHex(r) + toHex(g) + toHex(b);
}

function modifyColorToPastelRich(hex) {
    var { h, s, l } = convertHexToHSL(hex);
    return convertHSLToHex(h, s * 0.6, l + (0.6 * (1 - l)));
}

function modifyColorToPastelSoft(hex) {
    var { h, s, l } = convertHexToHSL(hex);
    return convertHSLToHex(h, s * 0.4, l + (0.7 * (1 - l)));
}

function pPiling() {
    // Pagepiling -----------------------------------------------
    // More info at https: //github.com/alvarotrigo/pagePiling.js/
    $('#pagepiling').pagepiling({
        sectionsColor: ['#fefefe', '#2860BF'],
        anchors: ['home', 'about'],
        scrollingSpeed: 1000,
        easing: 'easeInCubic'
    });

    $('#about').click(function () {
        $.fn.pagepiling.moveSectionDown();
    });
    // ----------------------------------------------------------
}

// jQUery plugin to convert rgb values into hex
$.cssHooks.backgroundColor = {
    get: function (elem) {
        if (elem.currentStyle)
            var bg = elem.currentStyle["backgroundColor"];
        else if (window.getComputedStyle)
            var bg = document.defaultView.getComputedStyle(elem,
                null).getPropertyValue("background-color");
        if (!bg || bg.search("rgb") == -1)
            return bg;
        else {
            bg = bg.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/);
            if (!bg) return null;
            if (bg[4] !== undefined && parseFloat(bg[4]) === 0) return null;

            function hex(x) {
                return ("0" + parseInt(x).toString(16)).slice(-2);
            }
            return "#" + hex(bg[1]) + hex(bg[2]) + hex(bg[3]);
        }
    }
}

function delegation() {
    // Event delegations ----------------------------------------
    // This is to make sure AJAX DOM elements are properly handled.
    $('.content').on('click', '.submit', function (e) {
        e.preventDefault();
        handlers['convertColor'].call(this, e);
    }).on('click', '.clear', function () {
        $("input").val('');
    }).on('mouseenter', '.color-box', function () {
        var colorCode = $(this).css("backgroundColor");
        $(this).append("<p class='color-code'>" + colorCode + "<a class='popup-with-zoom-anim' href='#copied'><img class='save' src='../images/clipboard.svg' /></a></p>");

        $('.popup-with-zoom-anim').magnificPopup({
            type: 'inline',

            fixedContentPos: false,
            fixedBgPos: true,

            overflowY: 'auto',

            closeBtnInside: true,
            preloader: true,

            midClick: true,
            removalDelay: 300,
            mainClass: 'my-mfp-zoom-in'
        });

    }).on('click', '.save', function () {
        var tempValue = $('<input>');
        var colorCode = $('.color-code').text();
        $('.content').append(tempValue);
        tempValue.val(colorCode).select();
        document.execCommand("copy");
        tempValue.remove();
    }).on('mouseleave', '.color-box', function () {
        $(this).children().remove();
    });
    //-----------------------------------------------------------
}

function closeColorBoxPopup() {
    $('.color-box-popup').remove();
}

function normalizeHex(value) {
    if (!value) return null;
    var hex = value.trim().toUpperCase();
    if (hex.charAt(0) !== '#') hex = '#' + hex;
    if (!/^#[0-9A-F]{6}$/.test(hex)) return null;
    return hex;
}

function applyColorFromPopup($box, $popup) {
    var newColor = normalizeHex($popup.find('input').val());
    if (!newColor) return;

    var index = $('.color-box').index($box);
    var colors = getQueryParams().map(function (hex, i) {
        return { hex: i === index ? newColor : hex };
    });

    setQueryParams(colors);
    closeColorBoxPopup();
    setColorPalette(false, modifyColorToPastelRich);
    setPanColors(colors);
}

function openColorBoxPopup($box) {
    closeColorBoxPopup();

    var currentColor = ($box.css('background-color') || '').toUpperCase();
    var $popup = $(
        '<div class="color-box-popup">' +
            '<input type="text" maxlength="7" spellcheck="false" />' +
            '<button type="button">OK</button>' +
        '</div>'
    );

    $popup.find('input').val(currentColor);
    $box.append($popup);
    $popup.find('input').focus().select();

    $popup.on('click', function (e) {
        e.stopPropagation();
    });

    $popup.find('button').on('click', function (e) {
        e.stopPropagation();
        applyColorFromPopup($box, $popup);
    });

    $popup.find('input').on('keydown', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            applyColorFromPopup($box, $popup);
        }
    });
}

$(document).on('click', '.color-box', function (e) {
    e.stopPropagation();
    var $box = $(this);
    if ($box.find('.color-box-popup').length) {
        closeColorBoxPopup();
        return;
    }
    openColorBoxPopup($box);
});

$(document).on('click', function () {
    closeColorBoxPopup();
});

$(document).ready(function () {
    setColorPalette();
    resetColors();
    const elementsToHide = [
        '.color-picker',
        '.show-color-picker-button',
        '.show-brush-and-palette-button',
        '.waterdrop-button',
        '.three-droplets-button',
        '.reset-button',
        '.paintbrush-palette',
        '.paintbrush-image-container'
    ];
    $(elementsToHide.join(', ')).hide();

    const interval = setInterval(() => {
        if (finishedLoading) {
            clearInterval(interval);
            $(elementsToHide.join(', ')).show();
            showBrushAndPalette();
        }
    }, 1000);

    pPiling();
    delegation();
});
