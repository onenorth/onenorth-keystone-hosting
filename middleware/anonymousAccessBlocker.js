'use strict';

var rangeCheck = require('range_check');

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
                // The set of allowed ranges has to be separated by space characters, a comma, or newline.
                var allowedRanges = ipRanges.split(/\s+|,|\n/);
                
                // Using req.ips requires that express 'trust proxy' setting is
                // true. When it *is* set the value for ips is extracted from the
                // X-Forwarded-For request header. The originating IP address is
                // the last one in the array.
                var requestIP = (process.env.CLIENT_IP_ADDRESS_HEADER) ? req.header(process.env.CLIENT_IP_ADDRESS_HEADER) : req.ip;
                requestIP = rangeCheck.searchIP(requestIP);
                
                // Deny the request if request IP is not in one of the allowed
                // IP address ranges.
                var requestAllowed = rangeCheck.in_range(requestIP, allowedRanges);
                
                if (requestAllowed) {
                    // Allow the request to process
                    console.log('Allowed IP: ' + requestIP);
                    return next();
                }
            }

            // Request is not allowed.  Send the contents of the unauthorized.html file.
            console.log('Blocked IP: ' + requestIP);
            res.sendfile(__dirname + '/unauthorized.html');
            return;
        }

        // Allow the request to process
        next();
    };
};