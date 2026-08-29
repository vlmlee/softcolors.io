const express = require('express'),
    router = express.Router(),
    tinycolor = require('tinycolor2'),
    _ = require('underscore'),
    path = require('path');

/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('index', { title: 'Soft Colors' });
});

router.get('/getColorNames', async function(req, res, next) {
    const response = await fetch(`https://api.color.pizza/v1/?values=${req.query.colors}`).then(response => response.json());
    res.json(response.colors);
});

router.post('/convertColor', function(req, res, next) {
    var colors = {};
    const inputColor = req.body.hex || req.body.rgb;
    colors.hex = tinycolor(inputColor).toHexString();
    colors.rgb = tinycolor(inputColor).toRgbString();
    colors.softRgb = tinycolor(inputColor).desaturate(5).lighten(5).toRgbString();
    colors.softHex = tinycolor(inputColor).desaturate(5).lighten(5).toHexString();
    res.json(colors);
});

router.get('/choose', function(req, res, next) {
    const preselectedColors = [
        '#FF6600',
        '#18AF90',
        '#2F9BB7',
        '#FFD65A',
        '#FF884D',
        '#9CABE4',
        '#DADADA',
        '#81B9C3',
        '#B388DD',
        '#FC7D74'
    ];
    res.json(preselectedColors);
});

router.get('/chooseColor', function(req, res, next) {
    res.sendFile('color-boxes.hbs', {
        root: path.join(__dirname, '../views')
    });
});

router.get('/random', function(req, res, next) {
    var randomColors = [];
    _.times(10, function() {
        var randomColor = tinycolor.random().desaturate(5).lighten(10).toHexString();

        while (randomColor === '#ffffff') {
            randomColor = tinycolor.random().desaturate(5).lighten(10).toHexString();
        }

        randomColors.push(randomColor);
    });
    res.json(randomColors);
});

module.exports = router;
