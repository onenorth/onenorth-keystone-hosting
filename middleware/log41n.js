'use strict';

var crypto = require('crypto'),
    OAuth = require('oauth'),
    request = require('request'),
    url = require('url');

// log41n middleware
module.exports = function(keystone) {

    // Setup Variables
    const clientId = process.env.LOG41N_CLIENT_ID;
    const clientSecret = process.env.LOG41N_CLIENT_SECRET;
    const endpoint = process.env.LOG41N_ENDPOINT
    const log41nPath = process.env.LOG41N_PATH;
    const log41nEnabled = process.env.LOG41N_ENABLED;

    return function(req, res, next) {

        // Bail out if the anonymous access blocker is not enabled.  Process only the LOG41N_PATH
        if (log41nEnabled !== 'true' ||  req.path !== log41nPath ||
            !(clientId) || !(clientSecret) || !(endpoint)) {
            return next();
        }
        
        // Ensure the endpoint is HTTPS
        var endpointUrl = url.parse(endpoint);
        if (endpointUrl.protocol !== 'https:') {
            console.log('Error: ' + endpoint + ' should be https.')
            return next();
        }

        // Determine the protocol, host, and path for later redirection.
        var redirect_uri = url.format({ protocol: req.protocol, host: req.get('host'), pathname: req.path });

        // Initialize OAuth.
        var OAuth2 = OAuth.OAuth2;
        var oauth2 = new OAuth2(clientId, clientSecret, 
            endpoint, 
            '/oauth2/authorize',
            '/oauth2/token', 
            null);
        
        // Make sure session / csrf secret exists.  We need the _csrf_secret to create the state state.
        if (!req.session._csrf_secret) {
            req.flash('error', 'Session does not exist, please try log41n again.');
            return res.redirect(keystone.get('signin url'));
        }
        
        // Create a hash of the CSRF Secret for CSRF protection.
        var state = crypto.createHash('md5').update(req.session._csrf_secret).digest('hex');
        
        // If "code" and "state" are querystring variables, then the request was authorized.
        if (req.query.code && req.query.state) {
            
            // Validate the state to prevent CSRF attack.
            if (req.query.state !== state) {
                req.flash('error', 'Cross-site request forgery (CSRF) attack detected! Please contact your administrator.');
                return res.redirect(keystone.get('signin url'));
            }
            
            // Get the access token to be used in the request for the username.
            oauth2.getOAuthAccessToken(
                req.query.code,
                {'redirect_uri':redirect_uri, 'grant_type':'authorization_code'},
                function (e, access_token, refresh_token, results){
                    if (e) {
                        // Handle error
                        console.log(e);
                        res.send(e);
                    } else if (results.error) {
                        // Handle error
                        console.log(results);
                        res.send(JSON.stringify(results));
                    }
                    else {
                        // Token request successful. Request username.
                        
                        // Configure options for the request.  This must include the authorization token
                        var options = {
                            url: endpoint + '/api/account/' + clientId,
                            headers: {
                                'authorization': 'Bearer ' + access_token
                            }
                        }
                        
                        // Setup the callback to handle the response of the username request.
                        var callback = function(error, response, body) {
                            
                            // Only process if request was successful.
                            if (!error && response.statusCode == 200) {
                                
                                // Get the username
                                var result = JSON.parse(body);
                                var email = result.ClientUserName
                                
                                // Find user based on returned username.
                                var User = keystone.list(keystone.get('user model'));
                                User.model.findOne({ email: email }).exec(function(err, user) {
                                    
                                    // User does not exist.
                                    if (err || !user) {
                                        req.flash('error', (err && err.message ? err.message : false) || 'Sorry, there was an issue signing you in, please try again. (' + email + ' not found)');
                                        return res.redirect(keystone.get('signin url'));
                                    }
                                    
                                    // Authentication Successful.  Redirect to /keystone
                                    var onSuccess = function(user) {
                                        res.redirect('/keystone');
                                    };
                                    
                                    // Authentication failed.
                                    var onFail = function(err) {
                                        req.flash('error', (err && err.message ? err.message : false) || 'Sorry, there was an issue signing you in, please try again.');
                                        res.redirect(keystone.get('signin url'));
                                    };
                                    
                                    // Authenticate the user.
                                    keystone.session.signin(user.id, req, res, onSuccess, onFail);

                                });
                            }
                        }
                        
                        // Request the username.
                        request(options, callback);
                    }
            });
            
        } else {
            // User has not authorized the OAuth2 Request yet.  Redirect to Central Login.
            var authURL = oauth2.getAuthorizeUrl({
                redirect_uri: redirect_uri,
                scope: ['account'],
                response_type: 'code',
                state: state
            });
            res.redirect(authURL);
        }

    };
};