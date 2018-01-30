const
    path = require('path'),
    fs = require('fs'),
    util = require('util'),
    Colors = require('colors'),
    Utils = require(path.join(__dirname, '..', 'util', 'Utils.js'));

function calculateFinal(args) {
    let final = args[0];

    for (let i = 1; i < args.length; i++)
        final = util.format(final, args[i]);

    return final;
}

function Logger(owner) {
    this.owner = owner || null;

    this.log = function () {
        let args = [];
        for (let i = 0; i < arguments.length; i++) args.push(arguments[i]);

        console.log((this.owner === null ? '' : '[' + this.owner + '] ') + '%s', calculateFinal(args));
    };

    this.info = function () {
        let args = [];
        for (let i = 0; i < arguments.length; i++) args.push(arguments[i]);

        console.log('[' + '*'.green + ']' + (this.owner === null ? '' : '[' + this.owner + '] ') + '%s', calculateFinal(args));
    };

    this.subInfo = function () {
        let args = [];
        for (let i = 0; i < arguments.length; i++) args.push(arguments[i]);

        console.log('    [' + '+'.cyan + ']' + (this.owner === null ? '' : '[' + this.owner + '] ') + ' %s', calculateFinal(args));
    };

    this.sub = function () {
        let args = [];
        for (let i = 0; i < arguments.length; i++) args.push(arguments[i]);

        console.log('    %s', calculateFinal(args));
    };

    this.error = function () {
        let args = [];
        for (let i = 0; i < arguments.length; i++) args.push(arguments[i]);

        let final = util.format('[' + '*'.red + ']' + (this.owner === null ? '' : '[' + this.owner + '] ') + ' %s', calculateFinal(args));
        console.error(final);
        fs.appendFile(path.join(__dirname, '..', '..', 'logs', 'error.log'), final + '\n', function (err) {});
    };
}

module.exports = Logger;
