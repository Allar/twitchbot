const
    path = require('path'),
    express = require('express'),
    router = express.Router();

router.use('/', require(path.join(__dirname, 'api.js')));

module.exports = router;
