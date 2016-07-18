'use strict';

var _ = require('lodash');
var path = require('path');
var VUE = require('virtual-user-engine');
var fs = require('fs');
var virtualUsers = [];


var RunConfigs = {
    userScriptFileName: null,
    VUCount: 4,
    runCycleType: 0,
    ratePerSecond: 10,
    maxPerUserConcurrentRun: 10,
    SystemRunTime: 600000,
    timeout: 300000,
    contextVariables: {},
    controlMethods: {},
    requireOptions: {},
    requestOptions: {}
}

var configFiles = [];
function addConfigFile(filename) {

    if (configFiles.indexOf(path.resolve(filename)) < 0)
        configFiles.push(path.resolve(filename));
}


function setConfig(configs, filesPath) {

    var methods = {}
    if (configs.sourceFileName) {

        configs.sourceFileName = path.resolve(filesPath, configs.sourceFileName);
        checkFileAccess(configs.sourceFileName);
        methods = require(configs.sourceFileName);
    }

    if (configs.userScriptFileName) RunConfigs.userScriptFileName = path.resolve(filesPath, configs.userScriptFileName);
    if (configs.maxConcurrentVirtualUsers) RunConfigs.VUCount = configs.maxConcurrentVirtualUsers;
    if (configs.runCycleType) RunConfigs.runCycleType = configs.runCycleType;
    if (configs.ratePerSecond) RunConfigs.ratePerSecond = configs.ratePerSecond;
    if (configs.maxPerUserConcurrentRun) RunConfigs.maxPerUserConcurrentRun = configs.maxPerUserConcurrentRun;
    if (configs.SystemRunTime) RunConfigs.SystemRunTime = configs.SystemRunTime;
    if (configs.timeout) RunConfigs.timeout = configs.timeout;
    if (configs.contextVariables) RunConfigs.contextVariables = _.cloneDeep(configs.contextVariables);


    if (configs.ControlMethods) {
        for (var i = 0; i < configs.ControlMethods.length; i++) {
            if (!configs.ControlMethods[i].runPeriod) continue;
            if (!configs.ControlMethods[i].Methods) continue;
            if (!_.isArray(configs.ControlMethods[i].Methods)) continue;

            if (!RunConfigs.controlMethods[configs.ControlMethods[i].runPeriod]) {
                // run period Not available, Create the node
                RunConfigs.controlMethods[configs.ControlMethods[i].runPeriod] = [];
            }
            configs.ControlMethods[i].Methods.forEach(function (methodName) {
                if (_.isFunction(methods[methodName]))
                   RunConfigs.controlMethods[configs.ControlMethods[i].runPeriod].push(methods[methodName]);
            });
        }
    }  // Control Methods


    if (configs.requireOptions) {
        if (configs.requireOptions.useCopy) RunConfigs.requireOptions.useCopy = configs.requireOptions.useCopy;
        if (configs.requireOptions.reload) RunConfigs.requireOptions.reload = configs.requireOptions.reload;
        if (configs.requireOptions.allowExternalModules) RunConfigs.requireOptions.allowExternalModules = configs.requireOptions.allowExternalModules;
        if (configs.requireOptions.onBeforeRequire) RunConfigs.requireOptions.onBeforeRequire = getMethodsFromArray(methods, configs.requireOptions.onBeforeRequire);
        if (configs.requireOptions.onRequire) RunConfigs.requireOptions.onRequire = getMethodsFromArray(methods, configs.requireOptions.onRequire);
        if (configs.requireOptions.onAfterRequire) RunConfigs.requireOptions.onAfterRequire = getMethodsFromArray(methods, configs.requireOptions.onAfterRequire);
        if (configs.requireOptions.Blacklist) RunConfigs.requireOptions.Blacklist = configs.requireOptions.Blacklist.slice(0);
        if (configs.requireOptions.Whitelist) RunConfigs.requireOptions.Whitelist = configs.requireOptions.Whitelist.slice(0);
        if (configs.requireOptions.pathList) RunConfigs.requireOptions.pathList = configs.requireOptions.pathList.slice(0);
        if (configs.requireOptions.extentionList) RunConfigs.requireOptions.extentionList = getMethodsFromObject(methods, configs.requireOptions.extentionList);
        if (configs.requireOptions.overrideList) RunConfigs.requireOptions.overrideList = getMethodsFromObject(methods, configs.requireOptions.overrideList);
    } // requireOptions


    if (configs.requestOptions) {
        if (configs.requestOptions.timeout) RunConfigs.requestOptions.timeout = configs.requestOptions.timeout;
        if (configs.requestOptions.onBeforeRequest) RunConfigs.requestOptions.onBeforeRequest = getMethodsFromArray(methods, configs.requestOptions.onBeforeRequest);
        if (configs.requestOptions.onRequest) RunConfigs.requestOptions.onRequest = getMethodsFromArray(methods, configs.requestOptions.onRequest);
        if (configs.requestOptions.onResponse) RunConfigs.requestOptions.onResponse = getMethodsFromArray(methods, configs.requestOptions.onResponse);
        if (configs.requestOptions.Blacklist) RunConfigs.requestOptions.Blacklist = configs.requestOptions.Blacklist.slice(0);
        if (configs.requestOptions.Whitelist) RunConfigs.requestOptions.Whitelist = configs.requestOptions.Whitelist.slice(0);
    } // requestOptions

}


function getMethodsFromArray(methodList, methodNameList) {

    var res = [];
    methodNameList.forEach(function (methodName) {
        if (_.isFunction(methodList[methodName]))
            res.push(methodList[methodName]);
    });
    return res;
}

function getMethodsFromObject(methodList, methodsObject) {

    var res = {};
    Object.getOwnPropertyNames(methodsObject).forEach(function(keyName) {
        var methodName = methodsObject[keyName];
        if (_.isFunction(methodList[methodName]))
            res.push({keyName: methodList[methodName]});
    });
    return res;
}



function applyConfigToVU(vu) {

    //requireOptions
    if (RunConfigs.requireOptions.useCopy) vu.requireOptions.useCopy = RunConfigs.requireOptions.useCopy;
    if (RunConfigs.requireOptions.reload) vu.requireOptions.reload = RunConfigs.requireOptions.reload;
    if (RunConfigs.requireOptions.allowExternalModules) vu.requireOptions.allowExternalModules = RunConfigs.requireOptions.allowExternalModules;
    if (RunConfigs.requireOptions.onBeforeRequire) vu.requireOptions.addOnBeforeRequire(RunConfigs.requireOptions.onBeforeRequire);
    if (RunConfigs.requireOptions.onRequire) vu.requireOptions.addOnRequire(RunConfigs.requireOptions.onRequire);
    if (RunConfigs.requireOptions.onAfterRequire) vu.requireOptions.addOnAfterRequire(RunConfigs.requireOptions.onAfterRequire);
    if (RunConfigs.requireOptions.Blacklist) vu.requireOptions.Blacklist = RunConfigs.requireOptions.Blacklist.slice(0);
    if (RunConfigs.requireOptions.Whitelist) vu.requireOptions.Whitelist = RunConfigs.requireOptions.Whitelist.slice(0);
    if (RunConfigs.requireOptions.pathList) vu.requireOptions.addPath(RunConfigs.requireOptions.pathList);
    if (RunConfigs.requireOptions.extentionList) vu.requireOptions.addExtensionList(RunConfigs.requireOptions.extentionList);
    if (RunConfigs.requireOptions.overrideList) vu.requireOptions.addOverrideModuleList(RunConfigs.requireOptions.overrideList);


    //requestOptions
    if (RunConfigs.requestOptions.timeout) vu.requestOptions.timeout = RunConfigs.requestOptions.timeout;
    if (RunConfigs.requestOptions.onBeforeRequest) vu.requestOptions.addOnBeforeRequest(RunConfigs.requestOptions.onBeforeRequest);
    if (RunConfigs.requestOptions.onRequest) vu.requestOptions.addOnRequest(RunConfigs.requestOptions.onRequest);
    if (RunConfigs.requestOptions.onResponse) vu.requestOptions.addOnResponse(RunConfigs.requestOptions.onResponse);
    if (RunConfigs.requestOptions.Blacklist) vu.requestOptions.Blacklist = RunConfigs.requestOptions.Blacklist.slice(0);
    if (RunConfigs.requestOptions.Whitelist) vu.requestOptions.Whitelist = RunConfigs.requestOptions.Whitelist.slice(0);

    // VU options
    vu.timeout = RunConfigs.timeout;
    vu.contextVariables = _.cloneDeep(RunConfigs.contextVariables);
    vu.getCodeFromFile(RunConfigs.userScriptFileName);
    vu.prepareToRun();
}


function runMethodList(methodList) {

    if (!methodList) return;
    if (!Array.isArray(methodList)) return;
    methodList.forEach(function (method) {
        method.call(this);
    });
}


function runOnceVUs() {   // Cycle type 2 --> only run once

    for (var i = 0; i < RunConfigs.VUCount; i++) {
        virtualUsers[i].run();
    }
}


function runInCycleVUs() {

    for (var i = 0; i < RunConfigs.VUCount; i++) {
        setTimeout(virtualUsers[i].run, 0);
    }

    setTimeout(virtualUsers[i].run, 0);

}
/*
.
.
.
.
.
*/

//-------- Run From Command Line, get config files and start operation

function checkFileAccess(filename) {
    fs.accessSync(filename, fs.R_OK || fs.F_OK);
}

// Check Exists and read-access of config files, and make the config file list

if (process.argv.length > 2) {

    // print process.argv
    for (var i = 2; i < process.argv.length; i++) {
        if (process.argv[i].substr(0, 3) === '--h' || process.argv[i].substr(0, 3) === '--H') {
            console.log('****  Usage ***');
            console.log('');
            console.log('     node index.js --h/--help   to get the help screen ');
            console.log('');
            console.log('     -----------------------');
            console.log('');
            console.log('     node index.js  [config_File1 [config_File2 [...]]]');
            console.log('');
            console.log('     config_File:  the path and file name of the config file to be used');
            console.log('                   one can use multiple config files seperated by space');
            console.log('');
            console.log('                   if no config file path is passed, the default config ');
            console.log('                   file will be called ');
            console.log('');
            console.log('');
            console.log('      Default Config file:  ./config/config.json');
            console.log('      default script file:  ./config/library.js');
            console.log('');
            console.log('');
        } else {

            checkFileAccess(process.argv[i]);
            addConfigFile(process.argv[i]);
            console.log(path.resolve(process.argv[i]));
        }
    }

} else {
    //if no config file presented, the default config file will be used
    // attention on no config file available, error will throw
    checkFileAccess('./config/config.json');
    addConfigFile('./config/config.json');
}


// read config files
configFiles.forEach(function (filename) {
    if (path.extname(filename) !== '.json') return;
    var newConfigs = require(filename);
    var filesPath = path.dirname(filename);
    setConfig(newConfigs, filesPath);
});

if (!_.isString(RunConfigs.userScriptFileName)) {
    throw new Error('No Script file indicated')
}
checkFileAccess(RunConfigs.userScriptFileName);

// Configs are set, now create Virtual Users based on config and run the provided userScript

// for (var i=0; i < RunConfigs.VUCount; i++) {
//
//     virtualUsers[i] = new VUE();
//     applyConfigToVU(virtualUsers[i]);
// }
virtualUsers[0] = new VUE();

// ok apply run policy

switch (RunConfigs.runCycleType) {
    case 0: // continuous run

        break;
    case 1: // continues with rate per-second run

        break;
    case 2: // cyclic run

        break;
    case 3: // run once

        runOnceVUs();
        break;

    default:

        runOnceVUs();
        break;
}


