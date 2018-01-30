const
    path = require('path'),
    Promise = require('promise'),
    config = require(path.join(__dirname, '..', 'Settings.js')),
    HttpClient = require(path.join(__dirname, '..', 'io', 'HttpClient.js'));

module.exports = {
    Auth: {
        GetToken: function (email, password, app) {
            return new Promise(function (fulfill, reject) {
                HttpClient.post({
                    host: 'api.trollcoinbot.com',
                    port: 443,
                    path: '/auth/token'
                }, {
                    email: email,
                    pass: password,
                    app: app
                }).then(function (response) {
                    try {
                        fulfill(JSON.parse(response.body));
                    } catch (ex) {
                        reject(ex);
                    }
                });
            });
        },

        Validate: function (app, token) {
            return new Promise(function (fulfill, reject) {
                HttpClient.get({
                    host: 'api.trollcoinbot.com',
                    port: 443,
                    path: '/auth/valid/' + app + '/' + token
                }).then(function (response) {
                    try {
                        fulfill(JSON.parse(response.body));
                    } catch (ex) {
                        reject(ex);
                    }
                });
            });
        }
    },

    Bets: {
        Lock: function (instance, channel) {
            return new Promise(function (fulfill, reject) {
                module.exports.Settings.Set(
                    instance,
                    channel,
                    'bets_locked',
                    'true'
                ).then(function (json) {
                    fulfill(json);
                });
            });
        },

        Unlock: function (instance, channel) {
            return new Promise(function (fulfill, reject) {
                module.exports.Settings.Set(
                    instance,
                    channel,
                    'bets_locked',
                    'false'
                ).then(function (json) {
                    fulfill(json);
                });
            });
        },

        IsLocked: function (instance, channel) {
            return new Promise(function (fulfill, reject) {
                module.exports.Settings.Get(
                    instance,
                    channel,
                    'bets_locked'
                ).then(function (locked) {
                    fulfill(locked ? locked === 'true' : true);
                });
            });
        },

        Place: function (instance, channel, user, ticket, amount) {
            return new Promise(function (fulfill, reject) {
                HttpClient.post({
                    host: 'localhost',
                    port: config.api.port,
                    path: '/papi/' + instance + '/bets/' + channel + '/place'
                }, { user: user, bet: ticket, amount: amount }).then(function (response) {
                    try {
                        fulfill(JSON.parse(response.body));
                    } catch (ex) {
                        reject(ex);
                    }
                });
            });
        },

        Update: function (instance, channel, user, ticket, amount) {
            return new Promise(function (fulfill, reject) {
                HttpClient.put({
                    host: 'localhost',
                    port: config.api.port,
                    path: '/papi/' + instance + '/bets/' + channel + '/place'
                }, { user: user, bet: ticket, amount: amount }).then(function (response) {
                    try {
                        fulfill(JSON.parse(response.body));
                    } catch (ex) {
                        reject(ex);
                    }
                });
            });
        },

        Remove: function (instance, channel, user) {
            return new Promise(function (fulfill, reject) {
                HttpClient.delete({
                    host: 'localhost',
                    port: config.api.port,
                    path: '/papi/' + instance + '/bets/' + channel + '/remove'
                }, {user: user}).then(function (response) {
                    try {
                        fulfill(JSON.parse(response.body));
                    } catch (ex) {
                        reject(ex);
                    }
                });
            });
        },

        GetByChannel: function (instance, channel) {
            return new Promise(function (fulfill, reject) {
                HttpClient.get({
                    host: 'localhost',
                    port: config.api.port,
                    path: '/api/' + instance + '/bets/' + channel
                }).then(function (response) {
                    try {
                        fulfill(JSON.parse(response.body));
                    } catch (ex) {
                        reject(ex);
                    }
                });
            });
        },

        GetByUser: function (instance, channel, user) {
            return new Promise(function (fulfill, reject) {
                HttpClient.get({
                    host: 'localhost',
                    port: config.api.port,
                    path: '/api/' + instance + '/bets/' + channel + '/user/' + user
                }).then(function (response) {
                    try {
                        fulfill(JSON.parse(response.body));
                    } catch (ex) {
                        reject(ex);
                    }
                });
            });
        },

        GetByTicket: function (instance, channel, ticket) {
            return new Promise(function (fulfill, reject) {
                HttpClient.get({
                    host: 'localhost',
                    port: config.api.port,
                    path: '/api/' + instance + '/bets/' + channel + '/ticket/' + ticket
                }).then(function (response) {
                    try {
                        fulfill(JSON.parse(response.body));
                    } catch (ex) {
                        reject(ex);
                    }
                });
            });
        },

        ClearForChannel: function (instance, channel) {
            return new Promise(function (fulfill, reject) {
                HttpClient.delete({
                    host: 'localhost',
                    port: config.api.port,
                    path: '/papi/' + instance + '/bets/' + channel + '/clear'
                }).then(function (response) {
                    try {
                        fulfill(JSON.parse(response.body));
                    } catch (ex) {
                        reject(ex);
                    }
                });
            });
        }
    },

    Channels: {
        Get: function (instance) {
            return new Promise(function (fulfill, reject) {
                HttpClient.get({
                    host: 'localhost',
                    port: config.api.port,
                    path: '/api/' + instance + '/channels'
                }).then(function (response) {
                    try {
                        fulfill(JSON.parse(response.body));
                    } catch (ex) {
                        reject(ex);
                    }
                });
            });
        },

        Join: function (instance, channel) {
            return new Promise(function (fulfill, reject) {
                HttpClient.post({
                    host: 'localhost',
                    port: config.api.port,
                    path: '/papi/' + instance + '/join/' + channel
                }).then(function (response) {
                    try {
                        fulfill(JSON.parse(response.body));
                    } catch (ex) {
                        reject(ex);
                    }
                });
            })
        },

        Part: function (instance, channel) {
            return new Promise(function (fulfill, reject) {
                HttpClient.delete({
                    host: 'localhost',
                    port: config.api.port,
                    path: '/papi/' + instance + '/part/' + channel
                }).then(function (response) {
                    try {
                        fulfill(JSON.parse(response.body));
                    } catch (ex) {
                        reject(ex);
                    }
                });
            });
        }
    },

    Queue: {
        Clear: function (instance, channel) {
            return new Promise(function (fulfill, reject) {
                HttpClient.delete({
                    host: 'localhost',
                    port: config.api.port,
                    path: '/papi/' + instance + '/queue/clear'
                }, {channel: channel}).then(function (response) {
                    try {
                        fulfill(JSON.parse(response.body));
                    } catch (ex) {
                        reject(ex);
                    }
                });
            })
        },

        Get: function (instance, channel, page) {
            page = page || 1;

            return new Promise(function (fulfill, reject) {
                HttpClient.get({
                    host: 'localhost',
                    port: config.api.port,
                    path: '/api/' + instance + '/queue/' + channel + '/page/' + page
                }).then(function (response) {
                    try {
                        fulfill(JSON.parse(response.body));
                    } catch (ex) {
                        reject(ex);
                    }
                });
            });
        },

        Add: function (instance, channel, user) {
            return new Promise(function (fulfill, reject) {
                HttpClient.post({
                    host: 'localhost',
                    port: config.api.port,
                    path: '/papi/' + instance + '/queue/add'
                }, {
                    channel: channel,
                    user: user
                }).then(function (response) {
                    try {
                        fulfill(JSON.parse(response.body));
                    } catch (ex) {
                        reject(ex);
                    }
                });
            });
        },

        Delete: function (instance, channel, user) {
            return new Promise(function (fulfill, reject) {
                HttpClient.delete({
                    host: 'localhost',
                    port: config.api.port,
                    path: '/papi/' + instance + '/queue/delete'
                }, {
                    channel: channel,
                    user: user
                }).then(function (response) {
                    try {
                        fulfill(JSON.parse(response.body));
                    } catch (ex) {
                        reject(ex);
                    }
                });
            });
        },

        IsUserInQueue: function (instance, channel, user) {
            return new Promise(function (fulfill, reject) {
                HttpClient.get({
                    host: 'localhost',
                    port: config.api.port,
                    path: '/api/' + instance + '/queue/' + channel + '/' + user
                }).then(function (response) {
                    try {
                        fulfill(JSON.parse(response.body));
                    } catch (ex) {
                        reject(ex);
                    }
                });
            });
        }
    },

    Commands: {
        Get: function (instance, channel, page) {
            page = page || 1;

            return new Promise(function (fulfill, reject) {
                HttpClient.get({
                    host: ' localhost',
                    port: config.api.port,
                    path: '/api/' + instance + '/commands/' + channel + '/page/' + page
                }).then(function (response) {
                    try {
                        fulfill(JSON.parse(response.body));
                    } catch (ex) {
                        reject(ex);
                    }
                });
            });
        },

        GetByName: function (instance, channel, cmdName) {
            return new Promise(function (fulfill, reject) {
                HttpClient.get({
                    host: 'localhost',
                    port: config.api.port,
                    path: '/api/' + instance + '/commands/' + channel + '/' + cmdName
                }).then(function (response) {
                    try {
                        fulfill(JSON.parse(response.body));
                    } catch (ex) {
                        reject(ex);
                    }
                });
            });
        },

        Add: function (instance, channel, cmd, cmdResponse) {
            return new Promise(function (fulfill, reject) {
                HttpClient.post({
                    host: 'localhost',
                    port: config.api.port,
                    path: '/papi/' + instance + '/commands/add'
                }, {
                    channel: channel,
                    command: cmd,
                    response: cmdResponse
                }).then(function (response) {
                    try {
                        fulfill(JSON.parse(response.body));
                    } catch (ex) {
                        reject(ex);
                    }
                });
            });
        },

        Delete: function (instance, channel, cmd) {
            return new Promise(function (fulfill, reject) {
                HttpClient.delete({
                    host: 'localhost',
                    port: config.api.port,
                    path: '/papi/' + instance + '/commands/delete'
                }, {
                    channel: channel,
                    command: cmd
                }).then(function (response) {
                    try {
                        fulfill(JSON.parse(response.body));
                    } catch (ex) {
                        reject(ex);
                    }
                });
            });
        },

        Edit: function (instance, channel, cmd, cmdResponse) {
            return new Promise(function (fulfill, reject) {
                HttpClient.put({
                    host: 'localhost',
                    port: config.api.port,
                    path: '/papi/' + json.prefix + '/commands/edit'
                }, {
                    channel: channel,
                    command: cmd,
                    response: cmdResponse
                }).then(function (response) {
                    try {
                        fulfill(JSON.parse(response.body));
                    } catch (ex) {
                        reject(ex);
                    }
                });
            });
        }
    },

    Daemon: {
        GetAddress: function (account) {
            return new Promise(function (fulfill, reject) {
                HttpClient.get({
                    host: 'localhost',
                    port: config.api.port,
                    path: '/api/daemon/address/' + account
                }).then(function (response) {
                    try {
                        fulfill(JSON.parse(response.body));
                    } catch (ex) {
                        reject(ex);
                    }
                });
            });
        },

        GetBalance: function (account) {
            return new Promise(function (fulfill, reject) {
                HttpClient.get({
                    host: 'localhost',
                    port: config.api.port,
                    path: '/api/daemon/balance/' + account
                }).then(function (response) {
                    try {
                        fulfill(JSON.parse(response.body));
                    } catch (ex) {
                        reject(ex);
                    }
                });
            });
        },

        Move: function (fromAccount, toAccount, amount) {
            return new Promise(function (fulfill, reject) {
                HttpClient.put({
                    host: 'localhost',
                    port: config.api.port,
                    path: '/papi/daemon/move'
                }, {
                    from: fromAccount,
                    to: toAccount,
                    amount: amount
                }).then(function (response) {
                    try {
                        fulfill(JSON.parse(response.body));
                    } catch (ex) {
                        reject(ex);
                    }
                });
            });
        },

        SendFrom: function (fromAccount, toAddress, amount) {
            return new Promise(function (fulfill, reject) {
                HttpClient.put({
                    host: 'localhost',
                    port: config.api.port,
                    path: '/papi/daemon/sendfrom'
                }, {
                    from: fromAccount,
                    to: toAddress,
                    amount: amount
                }).then(function (response) {
                    try {
                        fulfill(JSON.parse(response.body));
                    } catch (ex) {
                        reject(ex);
                    }
                });
            });
        }
    },

    Matches: {
        Get: function (instance, channel, pending, page) {
            page = page || 1;

            return new Promise(function (fulfill, reject) {
                HttpClient.get({
                    host: 'localhost',
                    port: config.api.port,
                    path: '/api/' + instance + '/matches/' + channel + '/page/' + page
                }).then(function (response) {
                    try {
                        fulfill(JSON.parse(response.body));
                    } catch (ex) {
                        reject(ex);
                    }
                });
            });
        },

        GetConfirmed: function (instance, channel) {
            return new Promise(function (fulfill, reject) {
                HttpClient.get({
                    host: 'localhost',
                    port: config.api.port,
                    path: '/api/' + instance + '/matches/' + channel + '?pending=0'
                }).then(function (response) {
                    try {
                        fulfill(JSON.parse(response.body));
                    } catch (ex) {
                        reject(ex);
                    }
                });
            });
        },

        GetCurrent: function (instance, channel) {
            return new Promise(function (fulfill, reject) {
                HttpClient.get({
                    host: 'localhost',
                    port: config.api.port,
                    path: '/api/' + instance + '/matches/' + channel + '?pending=0&started=1'
                }).then(function (response) {
                    try {
                        fulfill(JSON.parse(response.body));
                    } catch (ex) {
                        reject(ex);
                    }
                });
            });
        },

        GetByUser: function (instance, channel, user) {
            return new Promise(function (fulfill, reject) {
                HttpClient.get({
                    host: 'localhost',
                    port: config.api.port,
                    path: '/api/' + instance + '/matches/' + channel + '/' + user
                }).then(function (response) {
                    try {
                        fulfill(JSON.parse(response.body));
                    } catch (ex) {
                        reject(ex);
                    }
                });
            });
        },

        GetPendingByUser: function (instance, channel, user) {
            return new Promise(function (fulfill, reject) {
                HttpClient.get({
                    host: 'localhost',
                    port: config.api.port,
                    path: '/api/' + instance + '/matches/' + channel + '/' + user + '?pending=1'
                }).then(function (response) {
                    try {
                        fulfill(JSON.parse(response.body));
                    } catch (ex) {
                        reject(ex);
                    }
                });
            });
        },

        Create: function (instance, match) {
            return new Promise(function (fulfill, reject) {
                HttpClient.post({
                    host: 'localhost',
                    port: config.api.port,
                    path: '/papi/' + instance + '/matches/add'
                }, match).then(function (response) {
                    try {
                        fulfill(JSON.parse(response.body));
                    } catch (ex) {
                        reject(ex);
                    }
                });
            });
        },

        Start: function (instance, channel, match) {
            return new Promise(function (fulfill, reject) {
                HttpClient.post({
                    host: 'localhost',
                    port: config.api.port,
                    path: '/papi/' + instance + '/matches/start'
                }, {
                    channel: channel,
                    u1: match.user1,
                    u2: match.user2
                }).then(function (response) {
                    try {
                        fulfill(JSON.parse(response.body));
                    } catch (ex) {
                        reject(ex);
                    }
                });
            });
        },

        Accept: function (instance, channel, nick) {
            return new Promise(function (fulfill, reject) {
                HttpClient.put({
                    host: 'localhost',
                    port: config.api.port,
                    path: '/papi/' + instance + '/matches/accept'
                }, {
                    channel: channel,
                    user2: nick
                }).then(function (response) {
                    try {
                        fulfill(JSON.parse(response.body));
                    } catch (ex) {
                        reject(ex);
                    }
                });
            });
        },

        Decline: function (instance, channel, nick) {
            return new Promise(function (fulfill, reject) {
                HttpClient.delete({
                    host: 'localhost',
                    port: config.api.port,
                    path: '/papi/' + instance + '/matches/decline'
                }, {
                    channel: channel,
                    user2: nick
                }).then(function (response) {
                    try {
                        fulfill(JSON.parse(response.body));
                    } catch (ex) {
                        reject(ex);
                    }
                });
            });
        },

        Clear: function (instance, channel) {
            return new Promise(function (fulfill, reject) {
                HttpClient.delete({
                    host: 'localhost',
                    port: config.api.port,
                    path: '/papi/' + instance + '/matches/' + channel + '/clear'
                }).then(function (response) {
                    try {
                        fulfill(JSON.parse(response.body));
                    } catch (ex) {
                        reject(ex);
                    }
                });
            });
        },

        Destroy: function (instance, channel, user2) {
            return new Promise(function (fulfill, reject) {
                HttpClient.delete({
                    host: 'localhost',
                    port: config.api.port,
                    path: '/papi/' + instance + '/matches/destroy'
                }, {
                    channel: channel,
                    user2: user2
                }).then(function (response) {
                    try {
                        fulfill(JSON.parse(response.body));
                    } catch (ex) {
                        reject(ex);
                    }
                });
            });
        }
    },

    Settings: {
        GetAllForChannel: function (instance, channel) {
            return new Promise(function (fulfill, reject) {
                HttpClient.get({
                    host: 'localhost',
                    port: config.api.port,
                    path: '/api/' + instance + '/settings/' + channel
                }).then(function (response) {
                    try {
                        fulfill(JSON.parse(response.body));
                    } catch (ex) {
                        reject(ex);
                    }
                });
            });
        },

        Get: function (instance, channel, setting) {
            return new Promise(function (fulfill, reject) {
                module.exports.Settings.GetAllForChannel(
                    instance,
                    channel
                ).then(function (json) {
                    fulfill(setting in json.settings ? json.settings[setting] : null);
                });
            });
        },

        Set: function (instance, channel, setting, value) {
            return new Promise(function (fulfill, reject) {
                HttpClient.put({
                    host: 'localhost',
                    port: config.api.port,
                    path: '/papi/' + instance + '/settings/' + channel + '/' + setting + '/' + value
                }).then(function (response) {
                    try {
                        fulfill(JSON.parse(response.body));
                    } catch (ex) {
                        reject(ex);
                    }
                });
            });
        }
    },

    Spotify: {
        GetCurrentSong: function (instance, channel) {
            return new Promise(function (fulfill, reject) {
                HttpClient.get({
                    host: 'api.trollcoinbot.com',
                    port: 443,
                    path: '/spotify/current-song/' + instance + '_' + channel
                }).then(function (response) {
                    try {
                        fulfill(JSON.parse(response.body));
                    } catch (ex) {
                        reject(ex);
                    }
                });
            });
        }
    }
};
