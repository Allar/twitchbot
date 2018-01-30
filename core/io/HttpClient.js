const
    path = require('path'),
    LoggerObj = require(path.join(__dirname, '..', 'debug', 'Logger.js')),
    Logger = new LoggerObj('CORE#IO#HttpClient.js'),
    Promise = require('promise'),
    Request = require('request'),
    config = require(path.join(__dirname, '..', 'Settings.js'));

module.exports = {
    request: function (options) {
        return new Promise(function (fulfill, reject) {
            if (config.debug) Logger.log('#request => %s', JSON.stringify(options));
            Request(options, function (error, response, body) {
                if (error) {
                    Logger.error(error);
                    reject(error);
                } else
                    fulfill({ statusCode: response.statusCode, body: body });
            });
        });
    },

    get: function (options) {
        return module.exports.request(generateUrl(options));
    },

    post: function (options, form) {
        form = form || {};
        return module.exports.request({
            url: generateUrl(options),
            method: 'POST',
            form: form
        });
    },

    put: function (options, form) {
        form = form || {};
        return module.exports.request({
            url: generateUrl(options),
            method: 'PUT',
            form: form
        });
    },

    delete: function (options, form) {
        form = form || {};
        return module.exports.request({
            url: generateUrl(options),
            method: 'DELETE',
            form: form
        });
    }
};

function generateUrl(options) {
    return ('http' + (options.port === 443 ? 's' : '') + '://' + options.host + ':' + options.port + options.path).toString();
}
