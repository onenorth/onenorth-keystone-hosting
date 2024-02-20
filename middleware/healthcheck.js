'use strict';

var async = require('async'),
    azure = require('azure-storage'),
    cloudinary = require('cloudinary'),
    fs = require('fs'),
    handlebars = require('handlebars'),
    knox = require('knox-s3'),
    NodeCache = require('node-cache'),
    request = require('request');

// Health Check middleware
module.exports = function(keystone) {

    //10 seconds
    var cache = new NodeCache({ stdTTL: 10, checkperiod: 1 });

    const healchCheckDisabled = process.env.HEALTH_CHECK_ENABLED !== 'true';
    const healthCheckPath = process.env.HEALTH_CHECK_PATH || '/healthcheck';

    return function(req, res, next) {
        // Bail out if the health check is not enabled.  Process only the HEALTH_CHECK_PATH.
        // Default to /healthcheck, if enabled.
        if (healchCheckDisabled || req.path !== healthCheckPath) {
            return next();
        }
        
        // Serve from Cache to lower the impact of DOS attacks.
        var value = cache.get( "healthcheck" );
        if (value != undefined) {
            res.status(value.status).send(value.html);
            return;
        }
        
        var locals = {};
        locals.timestamp = new Date().toISOString();
        
        // Run all checks in parallel because they can be run asynchronously
        async.parallel([
        
            // Test MongoDB
             //TODO: consider using keystone.mongoose 
            // or test keystone.mongoose.connection.readyState
            // (Did not want to import a specific version mongoose library)
            function(callback) {
                var users = keystone.list(keystone.get('user model'));
                //any user will do
                users.model.findOne().exec(function(err, user) {    
                    locals.mongodb = {
                        pass: (!err && user) ? true : false
                    };
                    callback();
                });
            },
        
            // Test S3 Bucket
            function(callback) {
                var s3Config = keystone.get('s3 config')
                if (process.env.HEALTH_CHECK_AMAZON_TEST_FILE && s3Config) {
                    var client = knox.createClient(s3Config);
                    var url = client.http(process.env.HEALTH_CHECK_AMAZON_TEST_FILE || '');
                    request(url, function (err, response, body) {
                        locals.amazon = {
                            pass: (!err && response.statusCode == 200) ? true : false
                        };
                        callback();
                    })
                } else {
                    callback();
                }
            },

            // Test Cloudinary
            function(callback) {
                if (process.env.HEALTH_CHECK_CLOUDINARY_TEST_FILE && keystone.get('cloudinary config')) {
                    var url = cloudinary.url(process.env.HEALTH_CHECK_CLOUDINARY_TEST_FILE || '');
                    request(url, function (err, response, body) {
                        locals.cloudinary = {
                            pass: (!err && response.statusCode == 200) ? true : false
                        };
                        callback();
                    })
                } else {
                    callback();
                }
            },
        
            // Test Azure Files
            function(callback) {
                var azureFileConfig = keystone.get('azurefile config');
                if (process.env.HEALTH_CHECK_AZURE_TEST_FILE && azureFileConfig) {
                    var blobService = azure.createBlobService();
                    var url = blobService.getUrl(azureFileConfig.container, process.env.HEALTH_CHECK_AZURE_TEST_FILE || '')
                    
                    request(url, function (err, response, body) {
                        locals.azure = {
                            pass: (!err && response.statusCode == 200) ? true : false
                        };
                        callback();
                    })
                } else {
                    callback();
                }
            }
        ], function(err) {
            // Wait for all to complete
            
            locals.general = {
                pass: (!err) ? true : false
            }

            // Determine status code.
            var status = 200;
            if (locals.general && !locals.general.pass) {
                status = 503.101;
            } else if (locals.mongodb && !locals.mongodb.pass) {
                status = 503.102;
            } else if (locals.amazon && !locals.amazon.pass) {
                status = 503.103;
            } else if (locals.azure && !locals.azure.pass) {
                status = 503.104;
            } else if (locals.cloudinary && !locals.cloudinary.pass) {
                status = 503.105;
            }
            
            // Render results
            fs.readFile(__dirname + '/healthcheck.hbs', 'utf-8', function(err, source) {
                
                // Render the template
                var template = handlebars.compile(source);
                var html = template(locals);
                
                // Cache the results to hinder DOS attacks
                cache.set("healthcheck", { status: status, html: html})
                
                // send the results
                res.status(status).send(html);
            });
            
        });
    };
};