const config = {};

config.name = 'TrollCoinBot';
config.version = '4.4.0';
config.debug = true;
config.fileLogging = false;

config.api = {};
config.api.port = 3000;

config.daemon = {};
config.daemon.id = '';
config.daemon.ip = '';
config.daemon.user = '';
config.daemon.pass = '';
config.daemon.port = '';

config.mysql = {};
config.mysql.connectionLimit = 100;
config.mysql.host = '';
config.mysql.user = '';
config.mysql.pass = '';
config.mysql.name = '';

config.twitch = {};
config.twitch.user = '';
config.twitch.auth = '';//OAuth
config.twitch.debug = false;

module.exports = config;
