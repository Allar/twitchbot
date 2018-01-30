const
    path = require('path'),
    Promise = require('promise'),
    TrollCoinBotAPI = require(path.join(__dirname, '..', 'api', 'TrollCoinBot.api.js')),
    LoggerObj = require(path.join(__dirname, '..', 'debug', 'Logger.js')),
    Logger = new LoggerObj('CORE#Util#CommandLogic.js');

module.exports = {
    Bets: {
        PlaceOrUpdate: function (instance, channel, nick, ticket, amount) {
            return new Promise(function (fulfill, ignored) {
                try {
                    TrollCoinBotAPI.Bets.GetByUser(instance, channel, nick).then(function (b) {

                        if (b.bet !== null) {

                            TrollCoinBotAPI.Daemon.Move(
                                prefixNick(instance, 'trollcoinbot'),
                                prefixNick(instance, nick),
                                b.bet.amount
                            ).then(function (m) {

                                TrollCoinBotAPI.Daemon.GetBalance(prefixNick(instance, nick)).then(function (bal) {

                                    if (bal.balance >= amount) {
                                        TrollCoinBotAPI.Bets.Update(instance, channel, nick, ticket, amount).then(function (bu) {
                                            TrollCoinBotAPI.Daemon.Move(
                                                prefixNick(instance, nick),
                                                prefixNick(instance, 'trollcoinbot'),
                                                amount
                                            ).then(function (move) {
                                                fulfill('@' + nick + ' -> ' + bu.message);
                                            });
                                        });
                                    } else
                                        fulfill('@' + nick + ' -> You do not have enough TROLLs to honor that kind of commitment.');

                                });

                            });
                        } else {

                            TrollCoinBotAPI.Daemon.GetBalance(prefixNick(instance, nick)).then(function (bal) {

                                if (bal.balance >= amount) {
                                    TrollCoinBotAPI.Bets.Place(instance, channel, nick, ticket, amount).then(function (bp) {
                                        TrollCoinBotAPI.Daemon.Move(
                                            prefixNick(instance, nick),
                                            prefixNick(instance, 'trollcoinbot'),
                                            amount
                                        ).then(function (move) {
                                            fulfill('@' + nick + ' -> ' + bp.message);
                                        });
                                    });
                                } else
                                    fulfill('@' + nick + ' -> You do not have enough TROLLs to honor that kind of commitment.');

                            });

                        }

                    });
                } catch (e) {
                    Logger.error(e);
                }
            });
        },

        Cancel: function (instance, channel, nick) {
            return new Promise(function (fulfill, ignored) {
                try {
                    TrollCoinBotAPI.Bets.GetByUser(instance, channel, nick).then(function (b) {

                        if (b.bet !== null) {

                            TrollCoinBotAPI.Bets.Remove(instance, channel, nick).then(function (br) {

                                TrollCoinBotAPI.Daemon.Move(
                                    prefixNick(instance, 'trollcoinbot'),
                                    prefixNick(instance, nick),
                                    b.bet.amount
                                ).then(function (move) {
                                    fulfill('@' + nick + ' -> Bet successfully returned.');
                                });
                            });

                        } else
                            fulfill('@' + nick + ' -> No bet to remove!');
                    });
                } catch (e) {
                    Logger.error(e);
                }
            });
        },

        Remove: function (instance, channel, nick) {
            return new Promise(function (fulfill, ignored) {
                try {
                    TrollCoinBotAPI.Bets.GetByUser(instance, channel, nick).then(function (b) {

                        if (b.bet !== null) {

                            TrollCoinBotAPI.Bets.Remove(instance, channel, nick).then(function (br) {
                                fulfill(true);
                            });

                        } else
                            fulfill(false);
                    });
                } catch (e) {
                    Logger.error(e);
                }
            });
        },

        ClearAllForChannel: function (instance, channel) {
            return new Promise(function (fulfill, ignored) {
                try {
                    TrollCoinBotAPI.Bets.GetByChannel(
                        instance,
                        channel
                    ).then(function (r) {
                        if (r.bets.length > 0) {
                            r.bets.forEach(function (b) {
                                TrollCoinBotAPI.Daemon.Move(
                                    prefixNick(instance, 'trollcoinbot'),
                                    prefixNick(instance, b.user),
                                    b.amount
                                ).then(function (ignored) {
                                });
                            });
                        }

                        TrollCoinBotAPI.Bets.ClearForChannel(
                            instance,
                            channel
                        ).then(function (r) {
                            fulfill('Successfully returned ' + r.removed + ' bets!');
                        });
                    });
                } catch (e) {
                    Logger.error(e);
                }
            });
        },

        End: function (instance, channel, winningTicket) {
            return new Promise(function (fulfill, ignored) {
                try {
                    let winners = [], losers = [], winTotal = 0, totalPot = 0;

                    TrollCoinBotAPI.Bets.GetByChannel(instance, channel).then(function (betResponse) {
                        if (betResponse.bets.length > 0) {
                            betResponse.bets.forEach(function (betItem) {
                                if (betItem.bet.toLowerCase() === winningTicket.toLowerCase()) {
                                    winners.push(betItem);
                                    winTotal += betItem.amount;
                                } else {
                                    losers.push(betItem);
                                    totalPot += betItem.amount;
                                }
                            });

                            losers.forEach(function (betItem) {
                                TrollCoinBotAPI.Bets.Remove(instance, channel, betItem.user).then(function (ignored) {
                                });
                            });

                            winners.forEach(function (betItem) {
                                TrollCoinBotAPI.Bets.Remove(instance, channel, betItem.user).then(function (remove) {
                                    TrollCoinBotAPI.Daemon.Move(
                                        prefixNick(instance, 'trollcoinbot'),
                                        prefixNick(instance, betItem.user),
                                        betItem.amount + (toFixed((betItem.amount / winTotal), 2) * totalPot)
                                    ).then(function (move) {
                                        TrollCoinBotAPI.Bets.Unlock(instance, channel).then(function (ignored) {
                                            fulfill('Bets have been distributed!');
                                        });
                                    });
                                });
                            });
                        }
                    });
                } catch (e) {
                    Logger.error(e);
                }
            });
        }
    }
};

function prefixNick(prefix, nick) {
    return prefix + '_' + stripNick(prefix, nick);

}

function stripNick(prefix, nick) {
    return nick.replace(prefix + '_', '').replace('@', '').toLowerCase();

}

function toFixed(num, fixed) {
    const re = new RegExp('^-?\\d+(?:\.\\d{0,' + (fixed || -1) + '})?');
    return parseFloat(num.toString().match(re)[0]).toFixed(fixed || -1);
}
