'use strict';

var rangeCheck = require('range_check');

// Anonymous Access Blocker middleware
module.exports = function() {

    //process.env calls can be slow- store on init
    const isEnabled = process.env.ANONYMOUS_ACCESS_BLOCKER_ENABLED === 'true';

    return function(req, res, next) {
        
        // Bail out if the anonymous access blocker is not enabled.  Do not handle anything under /keystone
        if (!isEnabled || req.path.lastIndexOf('/keystone', 0) === 0) {
            return next();
        }
 
        // Process anonymous requests.
        if (!req.user || !req.user.canAccessKeystone) {

            if(process.env.ANONYMOUS_ACCESS_BLOCKER_DEBUG === 'true'){
                console.log(req.headers)
            }
            
            // Check for IP range allowances.  Requests will be allowed through if the IP address is in range.
            var ipRanges = process.env.ANONYMOUS_ACCESS_BLOCKER_ALLOWED_IP_RANGES;
            if (ipRanges) {
                // The set of allowed ranges has to be separated by space characters, a comma, or newline.
                var allowedRanges = ipRanges.split(/\s+|,|\n/);
                
                // The ideal case: only allow traffic that can prove it passed through your cloud waf provider first, before [heroku's] reverse proxy. 
                // May require using an unguessable app name + obscured dns to prevent <appname>.herokuapp.com access
                // Set CLIENT_IP_ADDRESS_HEADER in [heroku]
                var requestIP = '';
                var requestIPSource = 'req.ip'
                if(process.env.CLIENT_IP_ADDRESS_HEADER) {
                    requestIP = req.header(process.env.CLIENT_IP_ADDRESS_HEADER)
                    requestIPSource = process.env.CLIENT_IP_ADDRESS_HEADER

                    //fallback to trust-proxy - only if configured
                    if(!requestIP && process.env.ANONYMOUS_ACCESS_BLOCKER_ENFORCE_HEADER === 'false') {
                        requestIP = req.ip;
                        requestIPSource = 'fallback req.ip'
                    }
                }
                // Less ideal: fallback to express 'trust-proxy' setting
                else {
                    requestIP = req.ip;
                }

                requestIP = rangeCheck.searchIP(requestIP);
                
                // Deny the request if request IP is not in one of the allowed
                // IP address ranges.
                var requestAllowed = rangeCheck.in_range(requestIP, allowedRanges);
                
                if (requestAllowed) {
                    // Allow the request to process
                    console.log('keystone-hosting: Allowed [' + requestIPSource + '] IP ' + requestIP);
                    return next();
                }
            }
            else {
                console.error('keystone-hosting: IP restriction enabled with no allowed IP ranges!')
            }

            // Request is not allowed.  Send the contents of the unauthorized.html file.
            console.log('keystone-hosting: Blocked [' + requestIPSource + '] IP ' + requestIP);
            
            //set 'unauthorized' response code
            res.status(401)

            //discourage anything that might cache this response 
            res.set('Cache-Control','no-store');

            //for logging
            res.set('x-oni-type','ksndny');

            //"express deprecated res.sendfile: Use res.sendFile"
            // res.sendfile(__dirname + '/unauthorized.html');

            res.sendFile(__dirname + '/unauthorized.html');
            return;
        }

        // Allow the request to process
        next();
    };
};