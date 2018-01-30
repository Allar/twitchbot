const
    path = require('path'),
    express = require('express'),
    config = require(path.join(__dirname, '..', '..', 'Settings.js')),
    router = express.Router(),
    Daemon = require(path.join(__dirname, '..', '..', 'Daemon.js')),
    sql = require(path.join(__dirname, '..', '..', 'MySQL.js')),
    CommandHandler = require(path.join(__dirname, '..', '..', 'CommandHandler.js')),
    HttpClient = require(path.join(__dirname, '..', '..', 'io', 'HttpClient.js')),
    TwitchObj = require(path.join(__dirname, '..', '..', 'Twitch.js')),
    Twitch = new TwitchObj();

let tickerUsd = 0;

function cleanNick(nick) {
    return nick.replace(/^@/, '');
}

function updateTicker() {
    HttpClient.get({
        host: 'chainz.cryptoid.info',
        port: 443,
        path: '/troll/api.dws?q=ticker.usd'
    }).then(function (response) {
        if (response.statusCode === 200) tickerUsd = parseFloat(response.body.toString().toLowerCase());
    });
    setTimeout(updateTicker, (1000 * 60) * 60);//1 hour
}

function trollsToUsd(trolls) {
    let out = (parseFloat(trolls) * tickerUsd).toFixed(6);
    //remove useless zeros
    while (out.charAt(out.length - 1) === '0')
        out = out.substr(0, out.length - 2);

    return out;
}

updateTicker();

/**
 * ================CHANNELS================
 */
router.get('/api/:instance/channels', function (req, res) {
    sql.query('SELECT channel FROM ' + req.params.instance + '_channels;', [], function (result) {
        res.status(200).json(result && result.length > 0 ? result : []);
    });
});

/**
 * ================QUEUE================
 */
router.delete('/papi/:instance/queue/clear', function (req, res) {
    let pref = req.params.instance.toLowerCase(),
        channel = req.body.channel;

    sql.query(
        'DELETE FROM ' + pref + '_queue WHERE channel = ?;',
        [channel],
        function (result) {
            let success = result && result.affectedRows > 0, json = {};

            json.instance = pref;
            json.channel = channel;
            json.message = success ? 'Successfully removed ' + result.affectedRows + ' players from queue!' : 'No users in queue!';
            json.error = false;

            res.status(200).json(json);
        }
    );
});

router.post('/papi/:instance/queue/add', function (req, res) {
    let pref = req.params.instance.toLowerCase(),
        user = cleanNick(req.body.user),
        channel = req.body.channel;

    sql.query(
        'INSERT INTO ' + pref + '_queue SET channel = ?, user = ?;',
        [channel, user],
        function (result) {
            let success = result && result.affectedRows > 0, json = {};

            json.instance = pref;
            json.channel = channel;
            json.user = user;
            json.message = 'User @' + user + (success ? ' successfully added to the queue!' : ' is already in the queue!');
            json.error = success;
            if (!success) json.error_code = 'MYSQL_ERROR[DUPLICATE KEY]';

            res.status(200).json(json);
        }
    );
});

router.delete('/papi/:instance/queue/delete', function (req, res) {
    let pref = req.params.instance.toLowerCase(),
        user = cleanNick(req.body.user),
        channel = req.body.channel;

    sql.query(
        'DELETE  FROM ' + pref + '_queue WHERE channel = ? AND user = ?;',
        [channel, user],
        function (result) {
            let success = result && result.affectedRows > 0, json = {};

            json.instance = pref;
            json.channel = channel;
            json.user = user;
            json.message = 'User @' + user + (success ? ' successfully removed from the queue!' : ' is not in the queue!');
            json.error = success;
            if (!success) json.error_code = '';

            res.status(200).json(json);
        }
    );
});

router.get(['/api/:instance/queue/:channel', '/api/:instance/queue/:channel/page/:page'], function (req, res) {
    let pref = req.params.instance.toLowerCase(),
        channel = req.params.channel,
        page = req.params.page || '1',
        query = 'SELECT user FROM ' + pref + '_queue WHERE channel = ? LIMIT ?,20;';

    page = parseInt(page);

    sql.query(
        'SELECT COUNT(*) FROM ' + pref + '_queue WHERE channel = ?;',
        [channel],
        function (result) {
            let total = parseInt(result[0]['COUNT (*)']) || 1;
            if (page < 1) page = 1;
            if (page > total) page = total;

            sql.query(query, [channel, (page - 1) * 20], function (result) {
                let success = result && result.length > 0, json = {}, i = (page - 1) * 20;

                json.instance = pref;
                json.channel = channel;
                json.users = [];
                result.forEach(function (row) {
                    json.users.push({position: i++, user: row.user});
                });
                json.page = page;
                json.totalPages = Math.ceil((total / 20));
                json.message = success ? null : 'No users in queue!';
                json.error = false;

                res.status(200).json(json);
            });
        }
    );
});

router.get('/api/:instance/queue/:channel/:user', function (req, res) {
    let pref = req.params.instance.toLowerCase(),
        channel = req.params.channel.toLowerCase(),
        user = cleanNick(req.params.user.toLowerCase());

    sql.query(
        'SELECT NULL FROM ' + pref + '_queue WHERE channel = ? AND user = ? LIMIT 1;',
        [channel, user],
        function (results) {
            let queued = results && results.length > 0;

            res.status(200).json({
                instance: pref,
                channel: channel,
                user: user,
                queued: queued
            });
        }
    );
});

/**
 * ================COMMANDS================
 */
router.post('/papi/:instance/commands/add', function (req, res) {
    let pref = req.params.instance.toLowerCase(),
        cmd = req.body.command,
        data = req.body.response,
        channel = req.body.channel;

    sql.query('INSERT INTO ' + pref + '_commands SET channel = ?, command = ?, output = ?;', [channel, cmd, data],
        function (result) {
            let success = result && result.affectedRows > 0, json = {};

            json.instance = pref;
            json.channel = channel;
            json.message = 'Command !' + cmd + (success ? ' added successfully!' : ' already exists!');
            json.error = !success;
            if (!success) json.error_code = 'MYSQL_ERROR[DUPLICATE KEY]';

            res.status(200).json(json);
        }
    );
});

router.put('/papi/:instance/commands/edit', function (req, res) {
    let pref = req.params.instance.toLowerCase(),
        cmd = req.body.command,
        data = req.body.response,
        channel = req.body.channel;

    sql.query('UPDATE ' + pref + '_commands SET output = ? WHERE command = ? AND channel = ?;', [data, cmd, channel],
        function (result) {
            let success = result && result.affectedRows > 0, json = {};

            json.instance = pref;
            json.channel = channel;
            json.message = 'Command ! ' + cmd + (success ? ' updated successfully!' : ' does not exist!');
            json.error = !success;
            if (!success) json.error_code = 'MYSQL_ERROR[MISSING KEY]';

            res.status(200).json(json);
        }
    );
});

router.delete('/papi/:instance/commands/delete', function (req, res) {
    let pref = req.params.instance.toLowerCase(),
        cmd = req.body.command,
        channel = req.body.channel;

    sql.query('DELETE FROM ' + pref + '_commands WHERE command = ? AND channel = ?;', [cmd, channel],
        function (result) {
            let success = result && result.affectedRows > 0, json = {};

            json.instance = pref;
            json.channel = channel;
            json.message = 'Command !' + cmd + (success ? ' deleted successfully!' : ' does not exist!');
            json.error = !success;
            if (!success) json.error_code = 'MYSQL_ERROR[MISSING KEY]';

            res.status(200).json(json);
        }
    );
});

router.get('/api/:instance/commands/:channel/:command', function (req, res) {
    let pref = req.params.instance.toLowerCase(),
        cmd = req.params.command,
        channel = req.params.channel;

    sql.query('SELECT output FROM ' + pref + '_commands WHERE channel = ? AND command = ? LIMIT 1;', [channel, cmd],
        function (result) {
            let success = result && result.length > 0, json = {};

            json.instance = pref;
            json.channel = channel;
            json.command = (success ? {name: cmd, response: result[0].output} : null);
            json.message = success ? null : 'Command !' + cmd + ' does not exist!';
            json.error = !success;
            if (!success) json.error_code = 'MYSQL_ERROR[MISSING KEY]';

            res.status(200).json(json);
        }
    );
});

router.get(['/api/:instance/commands/:channel', '/api/:instance/commands/:channel/page/:page'], function (req, res) {
    let pref = req.params.instance.toLowerCase(),
        channel = req.params.channel,
        page = req.params.page || '1',
        query = 'SELECT command,output FROM ' + pref + '_commands WHERE channel = ? LIMIT ?,20;';

    page = parseInt(page);

    sql.query('SELECT COUNT(*) FROM ' + pref + '_commands WHERE channel = ?;', [channel], function (result) {
        let total = parseInt(result[0]['COUNT(*)']) || 1;
        sql.query(query, [channel, (page - 1) * 20], function (result) {
            let commands = [];
            if (result && result.length > 0) {
                result.forEach(function (command) {
                    commands.push({name: command.command, response: command.output});
                });
            }

            res.status(200).json({
                instance: pref,
                channel: channel,
                page: page,
                totalPages: Math.ceil((total / 20)),
                commands: commands
            });
        });
    });
});

/**
 * ================DAEMON================
 */
router.get('/api/daemon/address/:user', function (req, res) {
    let user = cleanNick(req.params.user.toLowerCase()),
        pref = user.substr(0, user.indexOf('_'));

    sql.query('SELECT address FROM ' + pref + '_daemon_accounts WHERE username = ?;',
        [user],
        function (result) {
            if (result && result.length > 0) {
                res.status(200).json({
                    account: user,
                    address: result[0].address,
                    needsUpdate: false,
                    updated: false,
                    error: false
                });
            } else {
                Daemon.getAccountAddress(user).then(function (address) {
                    if (address !== null) {
                        sql.query('INSERT INTO ' + pref + '_daemon_accounts SET username = ?, address = ?;',
                            [user, address],
                            function (result) {
                                let success = result && result.affectedRows > 0, json = {};

                                json.account = user;
                                json.address = success ? address : null;
                                json.needsUpdate = true;
                                json.updated = success;
                                json.error = !success;
                                if (!success) json.error_code = 'MYSQL_ERROR[INSERT Query Failed]';

                                res.status(200).json(json);
                            }
                        );
                    }
                });
            }
        }
    );
});

router.get('/api/daemon/balance/:user', function (req, res) {
    Daemon.getBalance(cleanNick(req.params.user)).then(function (balance) {
        res.status(200).json({
            account: req.params.user,
            balance: balance,
            usd: trollsToUsd(balance)
        });
    });
});

router.put('/papi/daemon/move', function (req, res) {
    let from = req.body.from,
        to = req.body.to,
        amount = parseFloat(req.body.amount) || 0;

    if (amount >= 0.00000001) {
        Daemon.getBalance(from).then(function (balance) {
            if (balance && balance >= amount) {
                Daemon.move(from, to, amount).then(function (success) {
                    let json = {from: from, to: to, amount: amount};

                    json.message = success ?
                        'Successfully sent ' + amount + ' TROLLs ($' + trollsToUsd(amount) + ' USD) to ' + to :
                        'Something went wrong while attempting to transfer TROLLs. Contact an admin.';
                    json.error = !success;
                    if (!success) json.error_code = 'DAEMON_ERROR[Unknown Error]';

                    res.status(200).json(json);
                });
            } else {
                res.status(200).json({
                    from: from,
                    to: to,
                    amount: amount,
                    message: 'You do not have enough TROLLs to do that!',
                    error: true,
                    error_code: 'DAEMON_ERROR[Amount exceeds balance]'
                });
            }
        });
    } else {
        res.status(200).json({
            from: from,
            to: to,
            amount: amount,
            message: 'Amount must be at least 0.00000001!',
            error: true,
            error_code: 'DAEMON_ERROR[Amount must be >= 0.00000001]'
        });
    }
});

router.put('/papi/daemon/sendfrom', function (req, res) {
    let from = req.body.from,
        to = req.body.to,
        amount = parseFloat(req.body.amount) || 0;

    if (amount > 0.001) {
        Daemon.getBalance(from).then(function (balance) {
            if (balance >= (amount + 0.001)) {
                Daemon.sendFrom(from, to, amount - 0.001).then(function (txId) {
                    let json = {from: from, to: to, amount: amount, fee: 0.001, transactionId: txId};

                    json.message = (txId !== null ? 'Successfully withdrew ' + amount + ' TROLLs ($' +
                        trollsToUsd(amount) + ' USD)! Transaction ID: ' + txId : 'Withdrawal failed!');
                    json.error = (txId === null);
                    if (txId === null) json.error_code = 'DAEMON_ERROR[Unknown Error]';

                    res.status(200).json(json);
                });
            } else {
                res.status(200).json({
                    from: from,
                    to: to,
                    amount: amount,
                    fee: 0.001,
                    message: 'You do not have enough TROLLs to do that (be sure to subtract 0.001 (transaction fee)!',
                    error: true,
                    error_code: 'DAEMON_ERROR[Amount exceeds balance]'
                });
            }
        });
    } else {
        res.status(200).json({
            from: from,
            to: to,
            amount: amount,
            fee: 0.001,
            message: 'Amount must be greater than 0.001 (transaction fee)!',
            error: true,
            error_code: 'DAEMON_ERROR[Amount must be > 0.001]'
        });
    }
});

/**
 * ================MATCHES================
 */
router.get(['/api/:instance/matches/:channel', '/api/:instance/matches/:channel/page/:page'], function (req, res) {
    let pref = req.params.instance.toLowerCase(),
        channel = req.params.channel.toLowerCase(),
        pending = (req.query.hasOwnProperty('pending') ? req.query.pending : "'*'"),
        started = (req.query.hasOwnProperty('started') ? req.query.started : "'*'"),
        page = req.params.page || '1';

    page = parseInt(page);
    if (page < 1) page = 1;

    sql.query('SELECT COUNT(*) FROM ' + pref + '_matches WHERE channel = ?;', [channel], function (result) {
        let total = parseInt(result[0]['COUNT(*)']) || 1;
        if (page > total) page = total;
        sql.query('SELECT user1,user2,amount,game FROM ' + pref + '_matches WHERE channel = ? AND pending = ? ' +
            'AND started = ? ORDER BY id ASC LIMIT ?,20;', [channel, pending.toString(), started, (page - 1) * 20], function (result) {
            let matches = [];
            result.forEach(function (match) {
                matches.push({user1: match.user1, user2: match.user2, amount: match.amount, game: match.game});
            });

            res.status(200).json({
                instance: pref,
                channel: channel,
                page: page,
                totalPages: Math.ceil((total / 20)),
                matches: matches
            });
        });
    });
});

router.get('/api/:instance/matches/:channel/:user', function (req, res) {
    let pref = req.params.instance.toLowerCase(),
        channel = req.params.channel.toLowerCase(),
        user = cleanNick(req.params.user.toLowerCase()),
        pending = req.query.pending || "'*'";

    sql.query('SELECT user1,user2,amount,game FROM ' + pref + '_matches WHERE (channel = ? AND pending = ?) AND ' +
        ' (user1 = ? OR user2 = ?) ORDER BY id ASC;', [channel, pending, user, user], function (result) {
        let success = result && result.length > 0, json = {};

        json.instance = pref;
        json.channel = channel;
        json.match = (success ? {
            user1: result[0].user1,
            user2: result[0].user2,
            amount: result[0].amount,
            game: result[0].game
        } : null);
        json.message = success ? null : 'No matches could be found.';
        json.error = !success;
        if (!success) json.error_code = 'MYSQL_ERROR[MISSING KEY]';

        res.status(200).json(json);
    });
});

router.post('/papi/:instance/matches/start', function (req, res) {
    let pref = req.params.instance.toLowerCase(),
        channel = req.body.channel,
        u1 = cleanNick(req.body.u1),
        u2 = cleanNick(req.body.u2);

    sql.query('UPDATE ' + pref + '_matches SET started = ? WHERE channel = ? AND user1 = ? AND user2 = ?;',
        ['1', channel, u1, u2],
        function (result) {
            let success = result && result.affectedRows > 0, json = {};

            json.instance = pref;
            json.channel = channel;
            json.user1 = u1;
            json.user2 = u2;
            json.message = (success ? 'Match started!' : null);
            json.error = !success;
            if (!success) json.error_code = 'MYSQL_ERROR[MISSING KEY]';

            res.status(200).json(json);
        }
    );
});

router.post('/papi/:instance/matches/add', function (req, res) {
    let pref = req.params.instance.toLowerCase(),
        channel = req.body.channel,
        u1 = cleanNick(req.body.u1),
        u2 = cleanNick(req.body.u2),
        amt = parseFloat(req.body.amt) || 0.0,
        game = req.body.game || null;

    sql.query('INSERT INTO ' + pref + '_matches SET channel = ?, user1 = ?, user2 = ?, amount = ?, game = ?, pending = ?;',
        [channel, u1, u2, amt, game, '1'],
        function (result) {
            let success = result && result.affectedRows > 0, json = {};

            json.instance = pref;
            json.channel = channel;
            json.match = success ? {user1: u1, user2: u2, amount: amt, game: game} : null;
            json.message = success ? '@' + u2 + ' @' + u1 + ' has challenged you to a match for ' + (amt == 0 ? 'GLORY' : amt + ' Trolls') + (game == null ? '' : ' in a game of ' + game.toUpperCase()) + '! !accept or !decline' : null;
            json.error = !success;
            if (!success) json.error_code = 'MYSQL_ERROR[INSERT Query Failed]';

            res.status(200).json(json);
        }
    );
});

router.put('/papi/:instance/matches/accept', function (req, res) {
    let pref = req.params.instance.toLowerCase(),
        channel = req.body.channel.toLowerCase(),
        u1 = null,
        u2 = cleanNick(req.body.user2);

    sql.query('SELECT user1 FROM ' + pref + '_matches WHERE channel = ? AND user2 = ? LIMIT 1;',
        [channel, u2],
        function (result) {
            if (result && result.length > 0) {
                u1 = result[0].user1;
                sql.query('UPDATE ' + pref + "_matches SET pending = '0' WHERE channel = ? AND user1 = ? AND user2 = ?;",
                    [channel, u1, u2],
                    function (result) {
                        let success = result && result.affectedRows > 0, json = {};

                        json.instance = pref;
                        json.channel = channel;
                        json.message = success ? '@' + u1 + ' @' + u2 + ' has accepted your challenge!' : null;
                        json.error = !success;
                        if (!success) json.error_code = 'MYSQL_ERROR[INSERT Query Failed]';

                        res.status(200).json(json);
                    }
                );
            } else {
                res.status(200).json({
                    instance: pref,
                    channel: channel,
                    user1: u1,
                    user2: u2,
                    message: null,
                    error: true,
                    error_code: 'MYSQL_ERROR[MISSING KEY]'
                });
            }
        }
    );
});

router.delete('/papi/:instance/matches/decline', function (req, res) {
    let pref = req.params.instance.toLowerCase(),
        channel = req.body.channel,
        user2 = cleanNick(req.body.user2);

    if (user2 !== null) {
        sql.query('DELETE FROM ' + pref + "_matches WHERE channel = ? AND user2 = ? AND pending = '1';", [channel, user2], function (result) {
            let success = result && result.affectedRows > 0, json = {};

            json.instance = pref;
            json.user2 = user2;
            json.message = success ? '@' + user2 + " -> Wow! Way to wuss out! Come back when you're stronger." : null;
            json.error = !success;
            if (!success) json.error_code = 'MYSQL_ERROR[DELETE Query Failed]';

            res.status(200).json(json);
        });
    } else {
        res.status(200).json({
            instance: pref,
            message: null,
            error: true,
            error_code: 'ROUTING_ERROR[Not Enough Data | Missing body parameter "user2"]'
        });
    }
});

router.delete('/papi/:instance/matches/:channel/clear', function (req, res) {
    let pref = req.params.instance.toLowerCase(),
        channel = req.params.channel.toLowerCase();

    sql.query('DELETE FROM ' + pref + '_matches WHERE channel = ?;', [channel], function (result) {
        if (result && result.affectedRows > 0) {
            res.status(200).json({
                instance: pref,
                channel: channel,
                message: 'Successfully cleared ' + result.affectedRows + ' matches.',
                error: false
            });
        } else {
            res.status(200).json({
                instance: pref,
                channel: channel,
                message: 'No matches in queue.',
                error: true,
                error_code: 'MYSQL_ERROR[NULL ENTRIES]'
            });
        }
    });
});

router.delete('/papi/:instance/matches/destroy', function (req, res) {
    let pref = req.params.instance.toLowerCase(),
        channel = req.body.channel,
        user2 = req.body.user2 || null;

    if (user2 !== null) {
        user2 = cleanNick(user2);
        sql.query('DELETE FROM ' + pref + "_matches WHERE channel = ? AND user2 = ? AND pending = '0';", [channel, user2], function (result) {
            let success = result && result.affectedRows > 0, json = {};

            json.instance = pref;
            json.user2 = user2;
            json.message = success ? 'Destroyed match successfully.' : null;
            json.error = !success;
            if (!success) json.error_code = 'MYSQL_ERROR[MISSING KEY]';

            json.status(200).json(json);
        });
    } else {
        res.status(200).json({
            instance: pref,
            message: null,
            error: true,
            error_code: 'ROUTING_ERROR[Not Enough Data | Missing body parameter "user2"]'
        });
    }
});

/**
 * ================BETS================
 */
//PLACE A BET
router.post('/papi/:instance/bets/:channel/place', function (req, res) {
    let pref = req.params.instance.toLowerCase(),
        channel = req.params.channel.toLowerCase(),
        user = req.body.user.toLowerCase() || null,
        bet = req.body.bet.toLowerCase() || null,
        amount = req.body.amount || -1;

    //Whole numbers only - fuck change
    amount = Math.floor(amount);

    if (user !== null && bet !== null) {
        bet = cleanNick(bet);
        user = cleanNick(user);
        if (amount >= 1) {
            sql.query(
                'INSERT INTO ' + pref + '_bets SET user = ?, bet = ?, amount = ?, channel = ?;',
                [user, bet, amount, channel],
                function (result) {
                    let
                        success = (result && result.affectedRows > 0),
                        json = {
                            instance: pref,
                            channel: channel,
                            user: user,
                            bet: bet,
                            amount: amount,
                            message: success ?
                                'Successfully placed a bet for ' + amount + ' TROLLs on ' + bet + '!' :
                                'Something went wrong while placing your bet. Your TROLLs have been returned to you.',
                            error: !success
                        };

                    if (!success) json.error_code = 'UNKNOWN_ERROR';

                    res.status(200).json(json);
                }
            );
        } else {
            res.status(200).json({
                instance: pref,
                channel: channel,
                user: user,
                bet: bet,
                amount: amount,
                message: 'You must bet at least 1 TROLL!',
                error: true,
                error_code: 'AMOUNT_LESS_THAN_1'
            });
        }
    } else {
        res.status(200).json({
            instance: pref,
            channel: channel,
            user: user,
            bet: bet,
            amount: amount,
            message: null,
            error: true,
            error_code: 'NOT_ENOUGH_INFO[Expected POST_FIELDS => user,bet,amount]'
        });
    }
});

router.put('/papi/:instance/bets/:channel/place', function (req, res) {
    let pref = req.params.instance.toLowerCase(),
        channel = req.params.channel.toLowerCase(),
        user = req.body.user.toLowerCase() || null,
        bet = req.body.bet.toLowerCase() || null,
        amount = req.body.amount || -1;

    //Whole numbers only - fuck change
    amount = Math.floor(amount);

    if (user !== null && bet !== null) {
        bet = cleanNick(bet);
        user = cleanNick(user);
        if (amount >= 1) {
            sql.query(
                'UPDATE ' + pref + '_bets SET bet = ?, amount = ?, channel = ? WHERE user = ?;',
                [bet, amount, channel, user],
                function (result) {
                    let
                        success = (result && result.affectedRows > 0),
                        json = {
                            instance: pref,
                            channel: channel,
                            user: user,
                            bet: bet,
                            amount: amount,
                            message: success ?
                                'Successfully updated your bet to ' + amount + ' TROLLs on ' + bet + '!' : null,
                            error: !success
                        };

                    if (!success) json.error_code = 'UNKNOWN_ERROR';

                    res.status(200).json(json);
                }
            );
        } else {
            res.status(200).json({
                instance: pref,
                channel: channel,
                user: user,
                bet: bet,
                amount: amount,
                message: 'You must bet at least 1 TROLL!',
                error: true,
                error_code: 'AMOUNT_LESS_THAN_1'
            });
        }
    } else {
        res.status(200).json({
            instance: pref,
            channel: channel,
            user: user,
            bet: bet,
            amount: amount,
            message: null,
            error: true,
            error_code: 'NOT_ENOUGH_INFO[Expected POST_FIELDS => user,bet,amount]'
        });
    }
});

//REMOVE/CANCEL A BET
router.delete('/papi/:instance/bets/:channel/remove', function (req, res) {
    let pref = req.params.instance.toLowerCase(),
        channel = req.params.channel.toLowerCase(),
        user = req.body.user.toLowerCase() || null;

    if (user !== null) {
        user = cleanNick(user);
        sql.query(
            'DELETE FROM ' + pref + '_bets WHERE channel = ? AND user = ?;',
            [channel, user],
            function (result) {
                let
                    success = result && result.length > 0,
                    json = {
                        instance: pref,
                        channel: channel,
                        user: user,
                        message: success ? 'Bet successfully removed. Wussy.' : null,
                        error: !success
                    };

                if (!success) json.error_code = 'UNKNOWN_ERROR';

                res.status(200).json(json);
            }
        );
    } else {
        res.status(200).json({
            instance: pref,
            channel: channel,
            user: user,
            message: null,
            error: true,
            error_code: 'NOT_ENOUGH_INFO[Expected POST_FIELDS => user]'
        });
    }
});

//GET BETS BY CHANNEL
router.get('/api/:instance/bets/:channel', function (req, res) {
    let pref = req.params.instance.toLowerCase(),
        channel = req.params.channel.toLowerCase();

    sql.query(
        'SELECT user,bet,amount FROM ' + pref + '_bets WHERE channel = ?;',
        [channel],
        function (results) {
            let json = {
                instance: pref,
                channel: channel,
                bets: [],
                error: false
            };

            results.forEach(function (r) {
                json.bets.push({user: r.user, amount: r.amount, bet: r.bet});
            });

            res.status(200).json(json);
        }
    );
});

//GET BETS BY USERNAME
router.get('/api/:instance/bets/:channel/user/:user', function (req, res) {
    let pref = req.params.instance.toLowerCase(),
        channel = req.params.channel.toLowerCase(),
        nick = cleanNick(req.params.user.toLowerCase());

    sql.query(
        'SELECT bet,amount FROM ' + pref + '_bets WHERE channel = ? AND user = ? LIMIT 1;',
        [channel, nick],
        function (result) {
            res.status(200).json({
                instance: pref,
                channel: channel,
                user: nick,
                bet: (result && result.length > 0 ?
                    {ticket: result[0].bet, amount: result[0].amount} : null),
                error: false
            });
        }
    );
});

//GET BETS BY TICKET
router.get('/api/:instance/bets/:channel/ticket/:ticket', function (req, res) {
    let pref = req.params.instance.toLowerCase(),
        channel = req.params.channel.toLowerCase(),
        ticket = req.params.ticket.toLowerCase();

    sql.query(
        'SELECT * FROM ' + pref + '_bets WHERE channel = ? AND bet = ?;',
        [channel, ticket],
        function (results) {
            let json = {
                instance: pref,
                channel: channel,
                ticket: ticket,
                bets: [],
                error: false
            };

            if (results && results.length > 0) {
                results.forEach(function (row) {
                    json.bets.push({user: row.user, amount: row.amount, ticket: row.bet});
                });
            }

            res.status(200).json(json);
        }
    );
});

//CLEAR BETS FOR CHANNEL
router.delete('/papi/:instance/bets/:channel/clear', function (req, res) {
    let pref = req.params.instance.toLowerCase(),
        channel = req.params.channel.toLowerCase();

    sql.query(
        'DELETE FROM ' + pref + '_bets WHERE channel = ?;',
        [channel],
        function (result) {
            res.status(200).json({
                instance: pref,
                channel: channel,
                removed: result.affectedRows,
                error: false
            });
        }
    );
});

/**
 * ================SETTINGS================
 */
router.get('/api/:instance/settings/:channel', function (req, res) {
    let pref = req.params.instance.toLowerCase(),
        channel = req.params.channel.toLowerCase();

    sql.query(
        'SELECT channel,settings FROM ' + pref + '_settings WHERE channel = ? LIMIT 1;',
        [channel],
        function (result) {
            let json = {channel: channel, settings: {}};
            if (result && result.length > 0) {
                try {
                    json.settings = JSON.parse(result[0].settings);
                } catch (ignored) {
                }
            }

            res.status(200).json(json);
        });
});

router.put('/papi/:instance/settings/:channel/:setting/:value', function (req, res) {
    let pref = req.params.instance.toLowerCase(),
        channel = req.params.channel.toLowerCase(),
        setting = req.params.setting.toLowerCase(),
        value = req.params.value.toLowerCase();

    sql.query(
        'SELECT settings FROM ' + pref + '_settings WHERE channel = ?;',
        [channel],
        function (result) {
            let json = {channel: channel, settings: {}};
            if (result && result.length > 0) {
                try {
                    json.settings = JSON.parse(result[0].settings);
                } catch (ignored) {
                }
            }

            json.settings[setting] = value;

            if (result && result.length > 0) {
                sql.query(
                    'UPDATE ' + pref + '_settings SET settings = ? WHERE channel = ?;',
                    [JSON.stringify(json.settings), channel],
                    function (result) {
                        res.status(200).json({
                            channel: channel,
                            setting: setting,
                            value: value,
                            success: result.affectedRows > 0
                        });
                    }
                );
            } else {
                sql.query(
                    'INSERT INTO ' + pref + '_settings SET settings = ?, channel = ?;',
                    [JSON.stringify(json.settings), channel],
                    function (result) {
                        res.status(200).json({
                            channel: channel,
                            setting: setting,
                            value: value,
                            success: true
                        });
                    }
                );
            }
        }
    );
});

/**
 * ================JOIN|PART================
 */
router.post('/papi/:instance/join/:channel', function (req, res) {
    let pref = req.params.instance.toLowerCase(),
        instance = pref === 'twitch' ? Twitch : null,
        channel = req.params.channel.toLowerCase();

    if (!instance.inChannel(channel)) {
        sql.query(
            'INSERT INTO ' + pref + '_channels SET channel = ?;',
            [channel],
            function (result) {
                let success = result && result.affectedRows > 0, json = {};

                json.instance = pref;
                json.channel = channel;
                json.message = success ?
                    'Successfully joined channel "' + channel + '".' :
                    'Failed to execute INSERT query. Please contact an admin.';
                json.error = !success;
                if (!success) json.error_code = 'MYSQL_ERROR[INSERT Query Failed]';
                if (success) instance.joinChannel(channel);

                res.status(200).json(json);
            }
        );
    } else {
        res.status(200).json({
            instance: pref,
            channel: channel,
            message: 'I am already in that channel!',
            error: true,
            error_code: 'MISSING_ENTRY[Not in channel]'
        });
    }
});

router.delete('/papi/:instance/part/:channel', function (req, res) {
    let pref = req.params.instance.toLowerCase(),
        instance = pref === 'twitch' ? Twitch : null,
        channel = req.params.channel.toLowerCase(),
        instant = (req.query.instant && req.query.instant === 'true');

    if (instance.inChannel(channel)) {
        sql.query('DELETE FROM ' + pref + '_channels WHERE channel = ?;', [channel], function (result) {
            let success = result && result.affectedRows > 0, json = {};

            json.instance = pref;
            json.channel = channel;
            json.message = success ?
                'Successfully left channel "' + channel + '".' :
                'Failed to execute DELETE query. Please contact an admin.';
            json.error = !success;
            if (!success) json.error_code = 'MYSQL_ERROR[DELETE Query Failed]';
            if (success) instance.partChannel(channel, instant);

            res.status(200).json(json);
        });
    } else {
        res.status(200).json({
            instance: pref,
            channel: channel,
            message: config.name + ' is not in channel "' + channel + '".',
            error: true,
            error_code: 'MISSING_ENTRY[' + channel + ']'
        });
    }
});

CommandHandler.eventEmitter.on('message#twitch', function (channel, message) {
    Twitch.sendMessage(channel, message);
});

CommandHandler.eventEmitter.on("root#exec", function (raw) {
    try {
        eval(raw);
    } catch (ignored) {
    }
});

Twitch.init(CommandHandler);

module.exports = router;
