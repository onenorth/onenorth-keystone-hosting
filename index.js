'use strict';

var anonymousAccessBlocker = require('./middleware/anonymousAccessBlocker');
var healthcheck = require('./middleware/healthcheck');
var httpValidation = require('./middleware/httpValidation');
var log41n = require('./middleware/log41n');

var Log1n = function() {
    var self = this;

    self.register = function(keystone){
        console.log('keystone-hosting: Adding Keystone routes');

        keystone.pre('routes', healthcheck(keystone));
        keystone.pre('routes', httpValidation());
        keystone.pre('routes', log41n(keystone));
        keystone.pre('routes', anonymousAccessBlocker());
    };
}

module.exports = new Log1n();
module.exports.anonymousAccessBlocker = anonymousAccessBlocker;
module.exports.healthcheck = healthcheck;
module.exports.httpValidation = httpValidation;
module.exports.log41n = log41n;
