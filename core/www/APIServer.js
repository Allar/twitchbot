const
    path = require('path'),
    express = require('express'),
    app = express(),
    http = require('http').Server(app),
    io = require('socket.io')(http),
    bodyParser = require('body-parser'),
    config = require(path.join(__dirname, '..', 'Settings.js')),
    Logger = new (require(path.join(__dirname, '..', 'debug', 'Logger.js')))('CORE.WWW.APIServer');

function APIServer() {
    this.init = function () {
        app.use(bodyParser.json());
        app.use(bodyParser.urlencoded({ extended: true }));
        app.use(require(path.join(__dirname, 'controllers')));

        http.listen(config.api.port, function () {
            Logger.info('API Server online at *:%d', config.api.port);
        });
    };
}

module.exports = APIServer;
