var express = require('express'),
    app = express(),
    _ = require('underscore'),
    c = require('chalk'),
    pj = require('prettyjson'),
    Config = require('./config'),
    telnet = require('telnet-client'),
    ASN = Config.ASN,
    cacheMS = Config.cacheMS,
    cache = require('memory-cache'),
    md5 = require('MD5');


var Telnet_params = {
    host: Config.routeHost,
    port: 23,
    loginPrompt: 'Username: ',
    username: 'rviews',
    shellPrompt: 'route-views>',
    pageSeparator: '--More-- ',
    timeout: 1500,
};

app.get('/', function(req, res) {
    res.send('Hello World!');
});
app.get('/api/Isps', function(req, res) {
    res.json(Config.isps);
});
app.get('/api/TestIsp/Network/:Network/:Subnet/:ASN/:Filter?', function(req, res) {
    var setup = {
        Network: req.params.Network + '/' + req.params.Subnet,
        ASN: req.params.ASN,
    };
    var cmd = 'sh ip bgp ' + setup.Network;
    var key = md5(JSON.stringify(cmd));
    if (cache.get(key)) {
        var Result = cache.get(key);
        if (req.params.Filter == 'brief')
            return res.json(Result.Valid);
        else
            return res.json(Result);
    }
    var connection = new telnet();
    connection.on('ready', function(prompt) {
        connection.exec(cmd, function(response) {
            var Result = {
                setup: setup,
                response: response,
                Valid: response.split(setup.ASN + ' ' + ASN).length > 1,
            };
            if (Result.Valid)
                cache.put(key, Result, cacheMS);

            var CSV = 'col1,col2\ndat1,dat2';
            console.log(Result);
            if (req.params.Filter == 'brief')
                return res.json(Result.Valid);
            else
                return res.json(Result);
        });
    });
    connection.on('timeout', function() {
        console.log('socket timeout!');
        connection.end();
    });

    connection.on('close', function() {
        console.log('connection closed');
    });
    connection.connect(Telnet_params);
});

var server = app.listen(Config.port, function() {
    var host = server.address().address;
    var port = server.address().port;

    console.log('Example app listening at http://%s:%s', host, port);
});
