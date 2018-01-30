const
    path = require('path'),
    Promise = require('promise'),
    config = require(path.join(__dirname, 'Settings.js')),
    HttpClient = require(path.join(__dirname, 'io', 'HttpClient.js'));

function Request(method) {
    const self = this;

    self.params = [];

    self.run = function () {
        return new Promise(function (fulfill, reject) {
            HttpClient.request({
                url: 'http://' + config.daemon.ip + ':' + config.daemon.port + '/',
                method: 'POST',
                json: { jsonrpc: '1.0', id: config.daemon.id, method: method, params: self.params },
                headers: {
                    'X-Requested-With': 'CURL',
                    'Authorization': 'Basic ' + new Buffer(config.daemon.user + ':' + config.daemon.pass).toString('base64')
                }
            }).then(function (response) {
                try {
                    return fulfill(response.body);
                } catch (ex) {
                    return reject(ex);
                }
            });
        });
    };
}

module.exports = {
    getAccountAddress: function (account) {
        return new Promise(function (fulfill) {
            const req = new Request('getaccountaddress');
            req.params[0] = account.toLowerCase();

            req.run().then(function (json) {
                return fulfill(json && json.error == null ? json.result : null);
            });
        });
    },

    getBalance: function (account) {
        return new Promise(function (fulfill) {
            const req = new Request('getbalance');
            req.params[0] = account.toLowerCase();

            req.run().then(function (json) {
                return fulfill(json && json.error == null ? parseFloat(json.result) : -1);
            });
        });
    },

    move: function (fromAccount, toAccount, amount) {
        return new Promise(function (fulfill) {
            const req = new Request('move');
            req.params[0] = fromAccount.toLowerCase();
            req.params[1] = toAccount.toLowerCase();
            req.params[2] = amount;

            req.run().then(function (json) {
                return fulfill(json && json.error == null ? json.result : false);
            });
        });
    },

    sendFrom: function (fromAccount, toAddress, amount) {
        return new Promise(function (fulfill) {
            const req = new Request('sendfrom');
            req.params[0] = fromAccount.toLowerCase();
            req.params[1] = toAddress;
            req.params[2] = amount;

            req.run().then(function (json) {
                return fulfill(json && json.error == null ? json.result : false);
            });
        });
    }
};
