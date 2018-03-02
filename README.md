# onenorth-keystone-hosting

This is an NPM module that provides One North Hosting functionality for KeystoneJS applications.

# Installation

```sh
npm install --save @onenorth/keystone-hosting
```

# API

'trust proxy' is required when behind a proxy.  Set this to enable processing of the HTTP request X-Forwarded-For header.  

```js
var keystone = require('keystone');
var hosting = require('@onenorth/keystone-hosting');
...
keystone.init({
    ...
    'trust proxy': true
});
...
hosting.register(keystone);
keystone.start();
```
# Configuration

The following environment variables need to be set

```txt
ANONYMOUS_ACCESS_BLOCKER_ENABLED=true
ANONYMOUS_ACCESS_BLOCKER_ALLOWED_IP_RANGES=127.0.0.1/32 ::1

HEALTH_CHECK_ENABLED=true
HEALTH_CHECK_PATH={application path}
HEALTH_CHECK_KEYSTONE_USER_EMAIL={email address}
HEALTH_CHECK_AMAZON_TEST_FILE={filename}
HEALTH_CHECK_AZURE_TEST_FILE={filename}
HEALTH_CHECK_CLOUDINARY_TEST_FILE={filename}

LOG41N_CLIENT_ID={client id}
LOG41N_CLIENT_SECRET={client secret}
LOG41N_ENABLED=true
LOG41N_ENDPOINT={log41n endpoint}
LOG41N_PATH={application path}
```

# Examples

```js
var keystone = require('keystone');
var hosting = require('@onenorth/keystone-hosting');
...
keystone.init({
    ...
    'trust proxy': true
});
...
hosting.register(keystone);
keystone.start();
```

# License

The associated code is released under the terms of the [MIT license](http://onenorth.mit-license.org).
