const
    path = require('path'),
    irc = require('tmi.js'),
    Promise = require('promise'),
    config = require(path.join(__dirname, 'Settings.js')),
    LoggerObj = require(path.join(__dirname, 'debug', 'Logger.js')),
    Logger = new LoggerObj('CORE#Twitch.js'),
    JoinQueue = require(path.join(__dirname, 'util', 'JoinQueue.js')),
    MessageQueue = require(path.join(__dirname, 'util', 'MessageQueue.js')),
    TrollCoinBotAPI = require(path.join(__dirname, 'api', 'TrollCoinBot.api.js'));

function Twitch() {
    const self = this;

    self.client = null;
    self.CommandHandler = null;
    self.JoinQueue = new JoinQueue();
    self.MessageQueue = new MessageQueue();

    self.init = function (cmdHandler) {
        Logger.info('Initializing instance');

        self.CommandHandler = cmdHandler;

        Logger.info('Creating tmi.js client');
        self.client = new irc.client({
            options: {
                debug: config.twitch.debug
            },
            connection: {
                reconnect: true,
                secure: true
            },
            identity: {
                username: config.twitch.user,
                password: config.twitch.auth
            }
        });

        Logger.info('Generating listeners');
        self.client.addListener('connected', function (address, port) {
            Logger.info('Connected to server => %s:%d', address, port);

            Logger.info('Joining self => %s', config.twitch.user);
            self.joinChannel(config.twitch.user.toLowerCase());

            Logger.info('Loading channels from API');
            TrollCoinBotAPI.Channels.Get('twitch').then(function (result) {
                result.forEach(function (row) {
                    self.joinChannel(row.channel.toLowerCase());
                });
            });
        });

        self.client.addListener('message', function (channel, user, message, fromSelf) {
            if (!fromSelf) {
                if (message.indexOf('!') === 0) {
                    let cmd, params = 'null';

                    if (message.indexOf(' ') > -1) {
                        cmd = message.substr(1, message.indexOf(' ')).trim().toLowerCase();
                        params = message.substr(message.indexOf(' ')).trim();
                    } else
                        cmd = message.substr(1);

                    self.CommandHandler.handle({
                        prefix: 'twitch',
                        channel: dehash(channel),
                        user: 'twitch_' + user['username'].toLowerCase(),
                        nick: user['username'].toLowerCase(),
                        cmd: cmd,
                        params: params,
                        rights: (user.badges && 'broadcaster' in user.badges) ? 2 : user.mod ? 1 : 0
                    }, function (msg) {
                        if (msg) self.sendMessage(channel, msg);
                    });
                }
            }
        });

        self.client.connect();

        setInterval(self.CheckJoinQueue, 100);
        setInterval(self.CheckMessageQueue, 100);
    };

    self.sendMessage = function (channel, msg) {
        self.MessageQueue.add({ target: dehash(channel), message: msg });
    };

    self.inChannel = function (channel) {
        return (self.client.getChannels().indexOf('#' + channel) > -1);
    };

    self.joinChannel = function (channel) {
        if (!self.inChannel(channel)) self.JoinQueue.add(channel);
    };

    self.partChannel = function (channel, instant) {
        instant = instant || false;

        if (self.inChannel(channel)) {
            if (instant) self.client.part(channel);
            else {
                setTimeout(function () {
                    self.client.part(channel);
                }, 5000);
            }
        }
    };

    self.CheckJoinQueue = function () {
        self.JoinQueue.get(function (channel) {
            if (channel != null) self.client.join(channel);
        });
    };

    this.stop = function () {
        Logger.info('Stopping...');

        return new Promise(function (fulfill, reject) {
            clearInterval(self.CheckJoinQueue);
            clearInterval(self.CheckMessageQueue);
            //clearTimeout(self.UpdateUserLists);

            self.client.disconnect().then(function (ignored) {
                fulfill();
            }).catch(function (ignored) {
                fulfill();
            });
        });
    };

    self.CheckMessageQueue = function () {
        self.MessageQueue.get(function (message) {
            if (message != null) self.client.say(message.target, message.message);
        });
    };
}

function dehash(channel) {
    return channel.replace(/^#/, '');
}

function capitalize(input) {
    return input[0].toUpperCase() + input.substr(1);
}

module.exports = Twitch;
