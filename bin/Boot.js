const
    path = require('path'),
    APIServer = new (require(path.join(__dirname, '..', 'core', 'www', 'APIServer.js')))();

APIServer.init();
