const RateLimiter = require('limiter').RateLimiter;

function JoinQueue() {
    const self = this;

    self.joinLimiter = new RateLimiter(50, 15000);
    self.queue = [];

    self.add = function (channel) {
        self.queue.push(channel);
    };

    self.get = function (fulfill) {
        if (self.queue.length > 0) {
            self.joinLimiter.removeTokens(1, function (error, ignored) {
                if (!error) return fulfill(self.queue.shift());
            });
        }
        return fulfill(null);
    };
}

module.exports = JoinQueue;
