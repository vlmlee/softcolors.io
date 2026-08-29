var defaultColors = [
    {'hex': '#E53935', 'name': 'Cadmium Red'},
    {'hex': '#3f51b5', 'name': 'Ultramarine Blue'},
    {'hex': '#8bc34a', 'name': 'Sap Green'},
    {'hex': '#ffee58', 'name': 'Lemon Yellow'},
    {'hex': '#e67e22', 'name': 'Burnt Sienna'},
    {'hex': '#b71c1c', 'name': 'Alizarin Crimson'},
    {'hex': '#01579b', 'name': 'Phthalo Blue'},
    {'hex': '#00897b', 'name': 'Viridian'},
    {'hex': '#ffb74d', 'name': 'Yellow Ochre'},
    {'hex': '#37474f', 'name': 'Paynes Gray'}
];

var handlers = {
    getColorNames: async function(colors) {
        var colorNames = await $.ajax({
            url: '/getColorNames',
            type: 'POST',
            data: { colors: colors.map(color => color.hex.slice(1)) },
            dataType: 'json'
        });
        return colorNames;
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

    $visible.each(function(index) {
        var $el = $(this);
        $el
            .stop(true, false)
            .css('pointer-events', 'none')
            .delay(index * stagger)
            .animate({ opacity: 0 }, {
                duration: duration,
                easing: 'swing',
                step: function(now) {
                    var progress = 1 - now;
                    $el.css({
                        filter: 'blur(' + (progress * 5) + 'px) saturate(' + (1 - progress * 0.85) + ') brightness(' + (1 + progress * 0.45) + ')',
                        transform: 'scale(' + (1 + progress * 0.01) + ')'
                    });
                },
                complete: function() {
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

    $els.each(function(index) {
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
                step: function(now) {
                    var progress = 1 - now;
                    $el.css({
                        filter: 'blur(' + (progress * 5) + 'px) saturate(' + (1 - progress * 0.85) + ') brightness(' + (1 + progress * 0.45) + ')',
                        transform: 'scale(' + (1 + progress * 0.01) + ')'
                    });
                },
                complete: function() {
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
    // Brush rinses first, then the palette washes away
    washOut($('.paintbrush-image-container, .paintbrush-palette'), 350, 50, function() {
        $('.color-picker').fadeIn(200);
        $('.show-color-picker-button, .waterdrop-button, .three-droplets-button').hide();
        $('.show-brush-and-palette-button').show();
    });
}

function showBrushAndPalette() {
    $('.color-picker').hide();
    $('.show-color-picker-button, .waterdrop-button, .three-droplets-button').show();
    $('.show-brush-and-palette-button').hide();
    // Palette settles first, then brush reappears into it
    washIn($('.paintbrush-palette, .paintbrush-image-container'), 320, 50);
}

async function setDefaultColors() {
    // var colorNames = await handlers.getColorNames(defaultColors);

    for (var i = 0; i < defaultColors.length; i++) {
        $('.color-box').eq(i).css('background-color', defaultColors[i].hex);
        $('.color-box__modified').eq(i).css('background-color', modifyColorToPastelSoft(defaultColors[i].hex));
        var colorName = defaultColors[i].name + ' → ' + defaultColors[i].name;
        $('.color-name').eq(i).text(colorName).attr('title', colorName);
        $('.color-code').eq(i).text(defaultColors[i].hex.toUpperCase() + ' → ' + modifyColorToPastelSoft(defaultColors[i].hex).toUpperCase());
        $('#pigment-' + (i + 1) + ' stop').attr('stop-color', defaultColors[i].hex);
    }

    var queryParams = {};
    for (var i = 0; i < defaultColors.length; i++) {
        queryParams["color" + (i + 1)] = defaultColors[i].hex.slice(1);
    }
    window.history.pushState({}, '', '?' + $.param(queryParams));
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
        var hue2rgb = function(p, q, t) {
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

    $('#about').click(function() {
        $.fn.pagepiling.moveSectionDown();
    });
    // ----------------------------------------------------------
}

// jQUery plugin to convert rgb values into hex
$.cssHooks.backgroundColor = {
    get: function(elem) {
        if (elem.currentStyle)
            var bg = elem.currentStyle["backgroundColor"];
        else if (window.getComputedStyle)
            var bg = document.defaultView.getComputedStyle(elem,
                null).getPropertyValue("background-color");
        if (bg.search("rgb") == -1)
            return bg;
        else {
            bg = bg.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);

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
    $('.content').on('click', '.submit', function(e) {
        e.preventDefault();
        handlers['convertColor'].call(this, e);
    }).on('click', '.clear', function() {
        $("input").val('');
    }).on('mouseenter', '.color-box', function() {
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

    }).on('click', '.save', function() {
        var tempValue = $('<input>');
        var colorCode = $('.color-code').text();
        $('.content').append(tempValue);
        tempValue.val(colorCode).select();
        document.execCommand("copy");
        tempValue.remove();
    }).on('mouseleave', '.color-box', function() {
        $(this).children().remove();
    });
    //-----------------------------------------------------------
}

function genericClickHandler() {
    // In order to follow the DRY principle, we create a generic 
    // click handler for all buttons and links using the data-action 
    // attribute. Here, we map the data-action attribute's value to 
    // its respective handler function.
    $("button[data-action]").on("click", function(e) {
        e.preventDefault();
        var link = $(this),
            action = link.data("action");

        if (typeof handlers[action] === "function") {
            handlers[action].call(this, e);
        }
    });
}

$(document).ready(function() {
    showBrushAndPalette();
    setDefaultColors();
    pPiling();
    delegation();
    genericClickHandler();
});
