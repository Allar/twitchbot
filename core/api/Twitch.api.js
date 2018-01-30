const
    path = require('path'),
    HttpClient = require(path.join(__dirname, '..', 'io', 'HttpClient.js'));

module.exports = {
    fetchChatters: function (channel) {
        return new Promise(function (fulfill, reject) {
            HttpClient.get({
                host: 'tmi.twitch.tv',
                port: 443,
                path: '/group/user/' + channel + '/chatters'
            }).then(function (response) {
                return fulfill(response.statusCode === 200 && response.body != null ? JSON.parse(response.body).chatters : null);
            });
        });
    },

    fetchUserInfo: function (nick) {
        return new Promise(function (fulfill, reject) {
            HttpClient.get({
                host: 'api.twitch.tv',
                port: 443,
                path: '/kraken/users/' + nick
            }).then(function (response) {
                if (response.statusCode === 200 && response.body != null) {
                    let json = JSON.parse(response.body);
                    return fulfill(json.hasOwnProperty('error') ? null : json);
                }
                return fulfill(null);
            });
        });
    }
};
