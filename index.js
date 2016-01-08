'use strict';

var anonymousAccessBlocker = require('./middleware/anonymousAccessBlocker');
var healthcheck = require('./middleware/healthcheck');
var log41n = require('./middleware/log41n');

var Log1n = function() {
    var self = this;

    self.register = function(keystone){
        keystone.pre('routes', healthcheck(keystone));
        keystone.pre('routes', log41n(keystone));
        keystone.pre('routes', anonymousAccessBlocker());
    };
}

module.exports = new Log1n();
module.exports.anonymousAccessBlocker = anonymousAccessBlocker;
module.exports.healthcheck = healthcheck;
module.exports.log41n = log41n;
