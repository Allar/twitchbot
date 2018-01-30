const RateLimiter = require('limiter').RateLimiter;

function MessageQueue() {
    const self = this;

    self.messageLimiter = new RateLimiter(100, 30000);
    self.queue = [];

    self.add = function (message) {
        self.queue.push(message);
    };

    self.get = function (fulfill) {
        if (self.queue.length > 0) {
            self.messageLimiter.removeTokens(1, function (error, ignored) {
                if (!error) return fulfill(self.queue.shift());
            });
        }
        return fulfill(null);
    }
}

module.exports = MessageQueue;
