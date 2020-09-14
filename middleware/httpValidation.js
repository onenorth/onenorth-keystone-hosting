'use strict';

module.exports = function() {

    const enabled = process.env.HTTP_VALIDATION_LISTEN;
    const httpPath = process.env.HTTP_VALIDATION_PATH;
    const httpBody = process.env.HTTP_VALIDATION_BODY;

    //register a route to a static (e.g. /.well-known/etc) response, if configured
    return function(req, res, next) {

        //example from cloudflare:
        //"http_url": "http://http-preval.example.com/.well-known/pki-validation/ca3-0052344e54074d9693e89e27486692d6.txt",
        //(include leading slash) /.well-known/pki-validation/ca3-0052344e54074d9693e89e27486692d6.txt
        //"http_body": "ca3-be794c5f757b468eba805d1a705e44f6"
        //ca3-be794c5f757b468eba805d1a705e44f6
        

        //ignore all requests except the exact match for /.well-known/etc...
        if(enabled !== 'true' || !httpPath || !httpBody || req.path !== httpPath) {
            // console.log('keystone-hosting: ignoring request' + req.path)
            return next();
        }

        //hijack this request and simply return the desired body (a guid)
        console.log('keystone-hosting: HTTP Validation responding to ' + req.path)
        res.send(httpBody);
    }
}