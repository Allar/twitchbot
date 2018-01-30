const
    path = require('path'),
    sql = require('mysql'),
    config = require(path.join(__dirname, 'Settings.js')),
    LoggerObj = require(path.join(__dirname, 'debug', 'Logger.js')),
    Logger = new LoggerObj('CORE#MySQL.js'),
    pool = sql.createPool({
        connectionLimit: config.mysql.connectionLimit,
        host: config.mysql.host,
        user: config.mysql.user,
        password: config.mysql.pass,
        database: config.mysql.name,
        supportBigNumbers: true
    });

module.exports = {
    query: function (query, params, callback) {
        params = params || [];

        pool.getConnection(function (error, connection) {
            if (error) {
                Logger.error('#Query => ', error);
                if (connection) connection.release();
                return callback(null);
            } else {
                connection.query(query, params, function (error, results) {
                    connection.release();

                    if (error) Logger.error('#Query => %s', error);
                    return callback(error ? null : results);
                });
            }
        });
    }
};
