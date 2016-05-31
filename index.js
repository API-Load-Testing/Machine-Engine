'use strict';

var _ = require('lodash');
var path = require('path');
var VUE = require('virtual-user-engine');
var fs = require('fs');


var configFiles = [];
function addConfigFile(filename) {
    if (_.isString(filename))
        if (configFiles.indexOf(path.resolve(filename)) < 0)
            configFiles.push(path.resolve(filename));
}


function checkFileAccess(filename) {
    fs.accessSync(filename, fs.R_OK || fs.F_OK);
}

//-------- Run From Command Line, get config files and start operation

// Check Exists and read-access of config files, and make the config file list

if (process.argv.length > 2) {
    // print process.argv
    for (var i = 2; i < process.argv.length; i++) {
        checkFileAccess(process.argv[i]);
        addConfigFile(process.argv[i]);
        console.log(path.resolve(process.argv[i]));
    }

} else {
    //if no config file presented, the default config file will be used
    // attention on no config file available, error will throw
    checkFileAccess('./config/config.json');
    addConfigFile('./config/config.json');
}


// read config files