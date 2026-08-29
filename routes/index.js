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
