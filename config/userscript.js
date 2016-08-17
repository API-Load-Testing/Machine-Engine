// 'use strict';
//
// var fs = require('fs');
// var path = require('path');
//
// fs.appendFileSync(path.resolve(__dirname, 'myfile.txt'), (__sandboxID + '  Hello world\n'));



'use strict';
var http = require('http');
var querystring = require('querystring');

var postData = querystring.stringify({
    'msg': 'Hello World!'
});

var options = {
    hostname: 'www.google.com',
    port: 80,
    path: '/upload',
    method: 'POST',
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': postData.length
    }
};


function sendReq() {
    var req = http.request(options, (res) => {

        res.setEncoding('utf8');
        res.on('data', (chunk) => {

        });
        res.on('end', () => {

        })
    });

    req.on('error', (e) => {
    });


    req.write(postData);
    req.end();

}
sendReq();
