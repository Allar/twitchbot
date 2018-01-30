const
    util = require('util'),
    shortMonths = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nob', 'Dec'
    ];

module.exports = {
    dateTime: function () {
        const date = new Date();
        return util.format(
            '%s %d, %d %s',
            shortMonths[date.getMonth()],
            date.getDate(),
            date.getFullYear(),
            module.exports.time()
        );
    },

    time: function () {
        const date = new Date();
        return util.format(
            '%d:%d:%d',
            date.getHours(),
            date.getMinutes(),
            date.getSeconds()
        );
    }
};
