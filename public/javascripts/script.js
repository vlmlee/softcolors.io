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
    convert: function(e) {
        e.preventDefault();

        setTimeout(function() {
            $.get('/convert', function(form) {
                $('.content').html(form).hide().fadeIn(300);
            }, 'html');
        }, animationTiming($('.color-box')));
    },

    convertColor: function(e) {
        e.preventDefault();
        $.post('/convertColor', $('#inputColorForm').serialize(), function(color) {
            // use $("[name='rgb']").attr('value', color.convertedRGBColor); for hex -> rbg conversion
            // use $("[name='hex']").attr('value', color.convertedHexColor); for rbg -> hex conversion
            $("input[name='rgb']").val(color.rgb);
            $("input[name='hex']").val(color.hex);
            $("input[name='soft-rgb']").val(color.softRgb);
            $("input[name='soft-hex']").val(color.softHex);

            // Change colors of colorboxes
            $('.convert-color-box').css({ "background-color": color.hex });
            $('.convert-soft-color-box').css({ "background-color": color.softHex });
        }, 'json');
    },

    choose: function(e) {
        e.preventDefault();

        setTimeout(function() {
            $.get('/choose', function(colors) {
                handlers.chooseColor(colors);
            }, 'json');
        }, animationTiming($('.color-box')));
    },

    chooseColor: function(colors) {
        $.get('/chooseColor', function(colorBoxes) {
            var colorBoxes = $(colorBoxes);
            $('.content').html(colorBoxes);
        }, 'html');
    },

    random: function(e) {
        e.preventDefault();

        setTimeout(function() {
            $.get('/random', function(randomColors) {
                handlers.chooseRandomColor(randomColors);
            }, 'json');
        }, animationTiming($('.color-box')));
    },

    chooseRandomColor: function(randomColors) {
        $.get('/chooseColor', function(colorBoxes) {
            var colorBoxes = $(colorBoxes);
            $('.content').html(colorBoxes);
        }, 'html');
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
        $('.show-color-picker-button').hide();
        $('.show-brush-and-palette-button').show();
    });
}

function showBrushAndPalette() {
    $('.color-picker').hide();
    $('.show-color-picker-button').show();
    $('.show-brush-and-palette-button').hide();
    // Palette settles first, then brush reappears into it
    washIn($('.paintbrush-palette, .paintbrush-image-container'), 320, 50);
}

function setDefaultColors() {
    for (var i = 0; i < defaultColors.length; i++) {
        $('.color-box').eq(i).css('background-color', defaultColors[i].hex);
        $('.color-box__modified').eq(i).css('background-color', defaultColors[i].hex);
        $('.color-name').eq(i).text(defaultColors[i].name + ' → ' + defaultColors[i].name);
        $('.color-code').eq(i).text(defaultColors[i].hex.toUpperCase() + ' → ' + defaultColors[i].hex.toUpperCase());
    }

    var queryParams = {};
    for (var i = 0; i < defaultColors.length; i++) {
        queryParams["color" + (i + 1)] = defaultColors[i].hex.slice(1);
    }
    window.history.pushState({}, '', '?' + $.param(queryParams));
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
