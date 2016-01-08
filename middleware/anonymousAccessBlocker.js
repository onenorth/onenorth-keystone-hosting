'use strict';

var range_check = require('range_check');

// Anonymous Access Blocker middleware
module.exports = function() {

    return function(req, res, next) {
        
        // Bail out if the anonymous access blocker is not enabled.  Do not handle anything under /keystone
        if (process.env.ANONYMOUS_ACCESS_BLOCKER_ENABLED !== 'true' || req.path.lastIndexOf('/keystone', 0) === 0) {
            return next();
        }
 
        // Process anonymous requests.
        if (!req.user || !req.user.canAccessKeystone) {
            
            // Check for IP range allowances.  Requests will be allowed through if the IP address is in range.
            var ipRanges = process.env.ANONYMOUS_ACCESS_BLOCKER_ALLOWED_IP_RANGES;
            if (ipRanges) {
                console.log(ipRanges);
                // The set of allowed ranges has to be separated by space
                // characters or a comma.
                var allowedRanges = ipRanges.split(/\s+|,/);
                
                // Using req.ips requires that express 'trust proxy' setting is
                // true. When it *is* set the value for ips is extracted from the
                // X-Forwarded-For request header. The originating IP address is
                // the last one in the array.
                var requestIP = (req.ips.length > 0) ? req.ips.slice().pop() : req.ip;
                                
                // Deny the request if request IP is not in one of the allowed
                // IP address ranges.
                var requestAllowed = range_check.in_range(requestIP, allowedRanges);
                
                if (requestAllowed) {
                    
                    // Allow the request to process
                    return next();
                }
            }

            // Request is not allowed.  Send the contents of the unauthorized.html file.
            res.sendfile(__dirname + '/unauthorized.html');
            return;
        }

        // Allow the request to process
        next();
    };
};