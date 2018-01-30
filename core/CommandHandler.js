const
    path = require('path'),
    config = require(path.join(__dirname, 'Settings.js')),
    LoggerObj = require(path.join(__dirname, 'debug', 'Logger.js')),
    Logger = new LoggerObj('CORE#CommandHandler'),
    TrollCoinBotAPI = require(path.join(__dirname, 'api', 'TrollCoinBot.api.js')),
    Logic = require(path.join(__dirname, 'util', 'CommandLogic.js')),
    EventEmitter = require('events').EventEmitter;

module.exports = {
    handle: function (json, callback) {
        handleRootCommand(json, function (handled, output) {
            if (handled) return callback(output);

            handleBroadcasterCommand(json, function (handled, output) {
                if (handled) return callback(output);

                handleModCommand(json, function (handled, output) {
                    if (handled) return callback(output);

                    handleUserCommand(json, function (handled, output) {
                        if (handled) return callback(output);

                        handleCustomCommand(json, function (handled, output) {
                            return callback(output);
                        });
                    });
                });
            });
        });
    },

    eventEmitter: new EventEmitter()
};

function handleRootCommand(json, callback) {
    if (config.debug) Logger.log('#handleRootCommand -> ', JSON.stringify(json));

    if (json.user.toLowerCase() !== 'twitch_therootuser' && json.user.toLowerCase() !== 'smashcast_rootuser')
        return callback(false, null);

    switch (json.cmd) {
        case 'exec':
            module.exports.eventEmitter.emit('root#exec', json.params);
            return callback(true, null);

        default:
            return callback(false, null);
    }
}

function handleBroadcasterCommand(json, callback) {
    if (config.debug) Logger.log('#handleBroadcasterCommand -> ' + JSON.stringify(json));

    if (json.rights < 2) return callback(false, null);

    let temp, subCmd, data;

    switch (json.cmd) {
        case 'trollcoinbot':
            switch (json.params.toLowerCase()) {
                case 'leave':
                case 'part':
                    TrollCoinBotAPI.Channels.Part(json.prefix, json.channel).then(function (response) {
                        return callback(true, response.message);
                    });
            }
            return callback(false, null);

        case 'bets':
            temp = json.params.split(' ');

            switch (temp[0].toLowerCase()) {
                case 'open':
                case 'unlock':
                    TrollCoinBotAPI.Bets.Unlock(json.prefix, json.channel).then(function (r) {
                        return callback(true, r.success ? 'Bets are now unlocked!' : null);
                    });
                    return callback(true, null);

                case 'close':
                case 'lock':
                    TrollCoinBotAPI.Bets.Lock(json.prefix, json.channel).then(function (r) {
                        return callback(true, r.success ? 'Bets have been locked!' : null);
                    });
                    return callback(true, null);

                case 'clear':
                    Logic.Bets.ClearAllForChannel(json.prefix, json.channel).then(function (msg) {
                        return callback(true, msg);
                    });
                    return callback(true, null);

                case 'end':
                    Logic.Bets.End(json.prefix, json.channel, temp[1]).then(function (msg) {
                        return callback(true, msg);
                    });

                    return callback(true, null);
            }
            return callback(false, null);

        case 'queue':
            switch (json.params.toLowerCase()) {
                case 'clear':
                    TrollCoinBotAPI.Queue.Clear(
                        json.prefix,
                        json.channel
                    ).then(function (response) {
                        Logger.log(JSON.stringify(response));
                        return callback(true, response.message);
                    });
                    return callback(true, null);

                case 'next':
                    TrollCoinBotAPI.Queue.Get(
                        json.prefix,
                        json.channel,
                        1
                    ).then(function (response) {
                        if (response.users.length > 0) {
                            callback(true, 'Next in queue: ' + response.users[0].user);

                            TrollCoinBotAPI.Queue.Delete(
                                json.prefix,
                                json.channel,
                                response.users[0].user
                            ).then(function (ignored) {
                            });
                        } else {
                            return callback(true, 'No users in queue!');
                        }
                    });
                    return callback(true, null);
            }
            return callback(false, null);

        case 'match':
            temp = json.params.split(' ');
            switch (temp[0].toLowerCase()) {
                case 'clear':
                    TrollCoinBotAPI.Matches.Clear(
                        json.prefix,
                        json.channel
                    ).then(function (response) {
                        return callback(true, response.message);
                    });
                    return callback(true, null);

                case 'start':
                    TrollCoinBotAPI.Matches.GetConfirmed(
                        json.prefix,
                        json.channel
                    ).then(function (matches) {
                        if (matches.matches.length > 0) {

                            TrollCoinBotAPI.Matches.Start(
                                json.prefix,
                                json.channel,
                                matches.matches[0]
                            ).then(function (response) {
                                return callback(true, response.message);
                            });
                        }
                    });
                    return callback(true, null);

                case 'next':
                    TrollCoinBotAPI.Matches.GetConfirmed(json.prefix, json.channel).then(function (response) {
                        if (response.matches.length > 0) {
                            let match = response.matches[0],
                                u1 = match.user1.toString(),
                                u2 = match.user2.toString(),
                                amt = match.amount,
                                game = match.game;

                            return callback(true,
                                'Next Match: @' + u1 + ' vs @' + u2 + ' for ' +
                                (amt > 0 ? amt + ' TROLLs' : 'GLORY') +
                                (game === null ? '' : ' in a game of ' + game.toUpperCase()) + '!'
                            );
                        } else {
                            return callback(true, '@' + json.nick + ' -> No matches in queue!');
                        }
                    });
                    return callback(true, null);

                case 'end':
                    if (temp.length === 2) {
                        TrollCoinBotAPI.Matches.GetCurrent(
                            json.prefix,
                            json.channel
                        ).then(function (cMatch) {
                            if (cMatch.matches.length > 0) {
                                let match = cMatch.matches[0];
                                temp[1] = stripNick(json.prefix, temp[1]).toLowerCase();

                                if (temp[1] === match.user1 || temp[1] === match.user2) {
                                    let amt = match.amount,
                                        winner = temp[1].toLowerCase(),
                                        loser = (winner === match.user1 ? match.user2 : match.user1).toLowerCase(),
                                        msg;

                                    msg = '@' + winner + ' has defeated @' + loser + ' claiming the ' +
                                        (amt > 0 ? 'pot of ' + (amt * 2) + 'TROLLs' : 'GLORY') + '!';

                                    if (amt > 0) {
                                        TrollCoinBotAPI.Daemon.Move(
                                            prefixNick(json.prefix, 'trollcoinbot'),
                                            prefixNick(json.prefix, winner),
                                            amt * 2
                                        ).then(function (move) {
                                            callback(true, move.message);
                                        });
                                    }

                                    return callback(true, msg);
                                }
                            }
                        });
                    }
                    return callback(true, null);

                case 'destroy':
                    TrollCoinBotAPI.Matches.GetConfirmed(json.prefix, json.channel).then(function (matches) {
                        if (matches.matches.length > 0) {
                            let match = matches.matches[0];

                            TrollCoinBotAPI.Matches.Destroy(
                                json.prefix,
                                json.channel,
                                match.user2
                            ).then(function (destroy) {
                                callback(true, destroy.message);

                                if (match.amount > 0) {
                                    //User1 return payment
                                    TrollCoinBotAPI.Daemon.move(
                                        prefixNick(json.prefix, 'trollcoinbot'),
                                        prefixNick(json.prefix, match.user1),
                                        match.amount
                                    ).then(function (move) {
                                        callback(true, move.message);
                                    });

                                    //User2 return payment
                                    TrollCoinBotAPI.Daemon.move(
                                        prefixNick(json.prefix, 'trollcoinbot'),
                                        prefixNick(json.prefix, match.user2),
                                        match.amount
                                    ).then(function (move) {
                                        callback(true, move.message);
                                    });
                                    return callback(true, null);
                                }
                            });
                        } else {
                            return callback(true, 'No match to destroy!');
                        }
                    });
                    return callback(false, null);
            }
            return callback(false, null);

        default:
            return callback(false, null);
    }
}

function handleModCommand(json, callback) {
    if (config.debug) Logger.log('#handleModCommand -> ' + JSON.stringify(json));

    if (json.rights < 1) return callback(false, null);

    let temp, subCmd, data;

    switch (json.cmd) {
        case 'addcom':
            temp = json.params.split(' ');

            if (temp.length > 1) {
                subCmd = temp[0].substr(1);
                data = json.params.substr(json.params.indexOf(' ')).trim();

                TrollCoinBotAPI.Commands.Add(json.prefix, json.channel, subCmd, data).then(function (add) {
                    return callback(true, '@' + json.nick + ' -> ' + add.message);
                });
            }
            return callback(true, null);

        case 'delcom':
            if (json.params.indexOf('!') === 0 && json.params.indexOf(' ') === -1) {
                TrollCoinBotAPI.Commands.Delete(json.prefix, json.channel, json.params.substr(1)).then(function (del) {
                    return callback(true, '@' + json.nick + ' -> ' + del.message);
                });
            }
            return callback(true, null);

        case 'editcom':
            temp = json.params.split(' ');

            if (temp.length > 2 && temp[0].indexOf('!') === 0) {
                subCmd = temp[0].substr(1).trim();
                data = json.params.substr(json.params.indexOf(temp[0]) + temp[0].length).trim();

                TrollCoinBotAPI.Commands.Edit(json.prefix, json.channel, subCmd, data).then(function (editCom) {
                    return callback(true, '@' + json.nick + ' -> ' + editCom.message);
                });
            }
            return callback(true, null);

        default:
            return callback(false, null);
    }
}

function handleUserCommand(json, callback) {
    if (config.debug) Logger.log('#handleUserCommand -> ' + JSON.stringify(json));

    let temp, subCmd, api, type;

    switch (json.cmd) {
        case 'about':
            return callback(true, 'TrollCoinBot ' + config.version + ' created in NodeJS by RootUser https://twitter.com/BitOBytes');

        case 'join':
            if (json.channel === config.name.toLowerCase()) {
                TrollCoinBotAPI.Channels.Join(json.prefix, json.nick).then(function (join) {
                    return callback(true, join.message);
                });
            }
            return callback(true, null);

        case 'song':
            TrollCoinBotAPI.Spotify.GetCurrentSong(json.prefix, json.channel).then(function (json) {
                if (json.song !== null && json.song !== '') return callback(true, 'Currently playing: ' + json.song);
            });
            return callback(true, null);

        case 'commands':
        case 'help':
            return callback(true,
                'Global Commands: https://www.trollcoinbot.com/commands | Channel Commands: ' +
                'https://www.trollcoinbot.com/:' + json.prefix + '/' + json.channel + '/comands');

        // QUEUE FUNCTIONS
        case 'gotnext':
        case 'joinqueue':
            TrollCoinBotAPI.Queue.IsUserInQueue(
                json.prefix,
                json.channel,
                json.nick
            ).then(function (qResponse) {
                if (!qResponse.queued) {
                    TrollCoinBotAPI.Queue.Add(
                        json.prefix,
                        json.channel,
                        json.nick
                    ).then(function (qAddResponse) {
                        return callback(true, qAddResponse.message);
                    });
                } else
                    return callback(true, '@' + json.nick + ' -> Already in queue!');
            });
            return callback(true, null);

        case 'queue':
            if (json.params === 'list') {
                TrollCoinBotAPI.Queue.Get(json.prefix, json.channel).then(function (queue) {
                    if (queue.users.length > 0) {
                        let
                            max = (queue.users.length > 10 ? 10 : queue.users.length),
                            temp = 'Next 10 in Queue: ';

                        for (let i = 0; i < max; i++)
                            temp += (i + 1) + ') ' + queue.users[i].user + ' ';

                        return callback(true, temp.trim());
                    } else
                        return callback(true, '@' + json.nick + ' No users in queue!');
                });
            }
            return callback(true, null);

        case 'leavequeue':
            TrollCoinBotAPI.Queue.Delete(
                json.prefix,
                json.channel,
                json.nick
            ).then(function (response) {
                return callback(true, response.message);
            });
            return callback(true, null);

        // BET FUNCTIONS
        case 'bet':
            TrollCoinBotAPI.Bets.IsLocked(
                json.prefix,
                json.channel
            ).then(function (locked) {
                if (!locked) {
                    //Place/Update a bet
                    if (json.params.indexOf(' ') > -1) {
                        temp = json.params.split(' ');
                        let ticket = temp[0], amount = temp[1];

                        try {
                            amount = parseInt(amount);
                        } catch (ignored) {
                            amount = -1;
                        }

                        amount = Math.floor(amount);

                        if (amount > 0) {
                            if (amount > 1000) amount = 1000;

                            Logic.Bets.PlaceOrUpdate(
                                json.prefix,
                                json.channel,
                                json.nick,
                                ticket,
                                amount
                            ).then(function (msg) {
                                return callback(true, msg);
                            });
                        } else
                            return callback(true, '@' + json.nick + ' -> Amount must be greater than 0! (whole numbers only!)')

                        //Remove a bet
                    } else {
                        switch (json.params.toLowerCase()) {
                            case 'remove':
                            case 'cancel':
                                Logic.Bets.Cancel(
                                    json.prefix,
                                    json.channel,
                                    json.nick
                                ).then(function (msg) {
                                    return callback(true, msg);
                                });
                                return callback(true, null);
                        }
                    }
                } else
                    return callback(true, '@' + json.nick + ' -> Bets are locked!');
            });
            return callback(true, null);

        // DAEMON FUNCTIONS
        case 'balance':
        case 'trolls':
            TrollCoinBotAPI.Daemon.GetBalance(json.user).then(function (bal) {
                return callback(true,
                    '@' + json.nick + ' -> Balance: ' + bal.balance + ' TROLLs ($' + bal.usd + ' USD)');
            });
            return callback(true, null);

        case 'address':
        case 'deposit':
            TrollCoinBotAPI.Daemon.GetAddress(json.user).then(function (address) {
                return callback(true,
                    '@' + json.nick + ' -> ' + address.address);
            });
            return callback(true, null);

        case 'withdraw':
        case 'cashout':
        case 'takemymoney':
            temp = json.params.split(' ');

            if (temp.length === 2) {
                let amt = parseFloat(temp[1].trim());
                TrollCoinBotAPI.Daemon.SendFrom(json.user, temp[0], amt).then(function (sendFrom) {
                    return callback(true,
                        '@' + json.nick + ' -> ' + sendFrom.message);
                });
            }
            return callback(true, null);

        case 'tip':
        case 'toss':
        case 'throw':
        case 'give':
            temp = json.params.split(' ');

            if (temp.length === 2) {
                let to = temp[0].replace('@', ''), amt;

                if (to.indexOf('twitch_') !== 0 && to.indexOf('smashcast_') !== 0)
                    to = prefixNick(json.prefix, to);

                try {
                    amt = parseFloat(temp[1].trim());
                    if (amt >= 0.00000001) {
                        TrollCoinBotAPI.Daemon.Move(json.user, to, amt).then(function (move) {
                            return callback(true,
                                '@' + json.nick + ' -> ' + move.message);
                        });
                    }
                } catch (ignored) {
                }
            }
            return callback(true, null);

        // MATCH FUNCTIONS

        case 'challenge':
            temp = json.params.split(' ');
            if (temp.length > 0) {
                let user = stripNick(json.prefix, temp[0]), amt = '0.0', game = null;
                if (temp.length > 1) amt = temp[1];
                if (temp.length > 2) game = json.params.substr(json.params.indexOf(temp[1]) + temp[1].length).trim();

                amt = parseFloat(amt);

                TrollCoinBotAPI.Matches.GetByUser(json.prefix, json.channel, json.nick).then(function (matches) {
                    if (matches.match === null) {
                        TrollCoinBotAPI.Matches.GetByUser(json.prefix, json.channel, user).then(function (matches) {
                            if (matches.match === null) {
                                TrollCoinBotAPI.Daemon.Move(json.user, prefixNick(json.prefix, 'trollcoinbot'), amt).then(function (move) {
                                    //if Move fails balance < amt | continue otherwise
                                    if (amt === 0.0 || move.error === false) {
                                        TrollCoinBotAPI.Matches.Create(
                                            json.prefix,
                                            {
                                                channel: json.channel,
                                                u1: json.nick,
                                                u2: user,
                                                amt: amt,
                                                game: game
                                            }
                                        ).then(function (create) {
                                            if (create.error === false) {
                                                setTimeout(function () {
                                                    TrollCoinBotAPI.Matches.Decline(json.prefix, json.channel, user).then(function (decline) {
                                                        if (decline.error === false) {
                                                            module.exports.eventEmitter.emit('message#' + json.prefix,
                                                                json.channel,
                                                                '@' + json.nick + ' -> @' +
                                                                user + ' did not respond to your challenge. ' +
                                                                "They're probably looking for an 8 button stick.");
                                                        }
                                                    });

                                                    if (amt > 0) {
                                                        TrollCoinBotAPI.Daemon.Move(
                                                            prefixNick(json.prefix, 'trollcoinbot'),
                                                            json.user,
                                                            amt
                                                        ).then(function (move) {
                                                            module.exports.eventEmitter.emit('message#' + json.prefix,
                                                                json.channel,
                                                                move.message);
                                                        });
                                                    }
                                                }, 45000);//45 seconds
                                                return callback(true, create.message);
                                            }
                                        });
                                    } else {
                                        return callback(true, '@' + json.nick + " -> You don't have enough TROLLs to do that!");
                                    }
                                });
                            } else {
                                return callback(true, '@' + json.nick + ' -> @' + user +
                                    ' is already in the challenge queue. Find someone else to fight!');
                            }
                        });
                    } else {
                        return callback(true, '@' + json.nick + ' -> You may only be queued for 1 match at a time!');
                    }
                });
            }
            return callback(true, null);

        case 'match':
            if (json.params.indexOf(' ') === -1) {
                switch (json.params.toLowerCase()) {
                    case 'info':
                        TrollCoinBotAPI.Matches.GetConfirmed(json.prefix, json.channel).then(function (matches) {
                            if (matches.matches.length > 0) {
                                let match = matches.matches[0],
                                    u1 = match.user1.toString(),
                                    u2 = match.user2.toString(),
                                    amt = match.amount,
                                    game = match.game;

                                return callback(true, 'Current Match: @' + u1 + ' vs @' + u2 + ' for ' +
                                    (amt > 0 ? amt + ' TROLLs' : 'GLORY') + (game == null ? '' : ' in a game of ' +
                                        game.toUpperCase()) + '!');
                            } else
                                return callback(true, '@' + json.nick + ' -> No current match!');
                        });
                        return callback(true, null);
                    case 'list':
                        TrollCoinBotAPI.Matches.GetConfirmed(json.prefix, json.channel).then(function (matches) {
                            if (matches.matches.length > 0) {
                                let msg = '';

                                for (let i = 0; i < 5; i++) {
                                    let match = matches.matches[i],
                                        u1 = match.user1.toString(),
                                        u2 = match.user2.toString(),
                                        amt = match.amount,
                                        game = match.game;

                                    msg += (i + 1) + ') @' + u1 + ' vs @' + u2 + ' for ' +
                                        (amt > 0 ? amt + ' TROLLs' : 'GLORY') +
                                        (game == null ? '' : ' in a game of ' + game.toUpperCase()) + '! ';
                                }
                                return callback(true, msg.trim());
                            } else
                                return callback(true, '@' + json.nick + ' -> No matches in queue!');
                        });
                        return callback(true, null);
                }
            }
            return callback(true, null);

        case 'accept':
            TrollCoinBotAPI.Matches.GetPendingByUser(json.prefix, json.channel, json.nick).then(function (matchResult) {
                let match = matchResult.match;

                if (match !== null) {
                    TrollCoinBotAPI.Matches.Accept(json.prefix, json.channel, json.nick).then(function (accept) {
                        if (accept.error === false) {
                            if (match.amount > 0) {
                                TrollCoinBotAPI.Daemon.Move(json.user, prefixNick(json.prefix, 'trollcoinbot'), match.amount).then(function (move) {
                                    if (move.error === false) return callback(true, accept.message);
                                    else {
                                        TrollCoinBotAPI.Matches.Destroy(json.prefix, json.channel, json.nick).then(function (ignored) {
                                            return callback(true, '@' + json.nick + " -> You don't have enough TROLLs to accept that challenge!");
                                        });
                                    }
                                });
                            } else
                                return callback(true, accept.message);
                        }
                    });
                }
            });
            return callback(true, null);

        case 'decline':
            TrollCoinBotAPI.Matches.GetPendingByUser(json.prefix, json.channel, json.nick).then(function (matches) {
                if (matches.match !== null) {
                    TrollCoinBotAPI.Matches.Decline(json.prefix, json.channel, json.nick).then(function (decline) {
                        callback(true, decline.message);
                    });

                    if (matches.match.amount > 0) {
                        TrollCoinBotAPI.Daemon.Move(
                            prefixNick(json.prefix, 'trollcoinbot'),
                            matches.match.user1,
                            matches.match.amount
                        ).then(function (move) {
                            callback(true, move.message);
                        });

                        TrollCoinBotAPI.Daemon.Move(
                            prefixNick(json.prefix, 'trollcoinbot'),
                            matches.match.user2,
                            matches.match.amount
                        ).then(function (move) {
                            callback(true, move.message);
                        });
                    }
                }
            });
            return callback(true, null);

        default:
            return callback(false, null);
    }
}

function handleCustomCommand(json, callback) {
    TrollCoinBotAPI.Commands.GetByName(json.prefix, json.channel, json.cmd).then(function (commands) {
        return callback(true, commands.command.response);
    });
}

function prefixNick(prefix, nick) {
    return prefix + '_' + stripNick(prefix, nick);
}

function stripNick(prefix, nick) {
    return nick.replace(prefix + '_', '').replace('@', '').toLowerCase();
}
