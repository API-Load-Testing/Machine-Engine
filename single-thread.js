'use strict';

var _ = require('lodash');
var path = require('path');
var VUE = require('virtual-user-engine');
var fs = require('fs');

var fullContexts = [];
var systemTimeoutHappen = false;
var intervalsList = [];

var RunConfigs = {
    userScriptFileName: null,
    VUCount: 1000,
    runCycleType: 0,
    cycleSleepTime: 1000,
    SystemRunTime: 600000,
    VUoptions: {
        timeout: 120000,
    },
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

    var methods = {};
    if (configs.libraryFileName) {

        configs.libraryFileName = path.resolve(filesPath, configs.libraryFileName);
        checkFileAccess(configs.libraryFileName);
        methods = require(configs.libraryFileName);
    }
    
    if (configs.userScriptFileName) RunConfigs.userScriptFileName = path.resolve(filesPath, configs.userScriptFileName);
    if (configs.VUCount) RunConfigs.VUCount = configs.VUCount;
    if (configs.runCycleType) RunConfigs.runCycleType = configs.runCycleType;
    if (configs.cycleSleepTime) RunConfigs.cycleSleepTime = configs.cycleSleepTime;
    if (configs.SystemRunTime) RunConfigs.SystemRunTime = configs.SystemRunTime;
    if (methods.contextVariables) RunConfigs.contextVariables = methods.contextVariables;


    if (configs.VUoptions) {
        if (configs.VUoptions.timeout) RunConfigs.VUoptions.timeout = configs.VUoptions.timeout;
        if (configs.VUoptions.onStart) RunConfigs.VUoptions.onStart = configs.VUoptions.onStart;
        if (configs.VUoptions.onEnd) RunConfigs.VUoptions.onEnd = configs.VUoptions.onEnd;
        if (configs.VUoptions.onEndofCode) RunConfigs.VUoptions.onEndofCode = configs.VUoptions.onEndofCode;
        if (configs.VUoptions.onTimeout) RunConfigs.VUoptions.onTimeout = configs.VUoptions.onTimeout;
    }

    if (configs.controlMethods) {
        for (var i = 0; i < configs.controlMethods.length; i++) {
            if (!configs.controlMethods[i].runPeriod) continue;
            if (!configs.controlMethods[i].Methods) continue;
            if (!_.isArray(configs.controlMethods[i].Methods)) continue;

            if (!RunConfigs.controlMethods[configs.controlMethods[i].runPeriod]) {
                // run period Not available, Create the node
                RunConfigs.controlMethods[configs.controlMethods[i].runPeriod] = [];
            }
            configs.controlMethods[i].Methods.forEach(function (methodName) {
                if (_.isFunction(methods[methodName]))
                    RunConfigs.controlMethods[configs.controlMethods[i].runPeriod].push(methods[methodName]);
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
        if (configs.requestOptions.onRequestError) RunConfigs.requestOptions.onRequestError = getMethodsFromArray(methods, configs.requestOptions.onRequestError);
        if (configs.requestOptions.onResponse) RunConfigs.requestOptions.onResponse = getMethodsFromArray(methods, configs.requestOptions.onResponse);
        if (configs.requestOptions.onAfterResponse) RunConfigs.requestOptions.onAfterResponse = getMethodsFromArray(methods, configs.requestOptions.onAfterResponse);
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
    Object.getOwnPropertyNames(methodsObject).forEach(function (keyName) {
        var methodName = methodsObject[keyName];
        if (_.isFunction(methodList[methodName]))
            res.push({keyName: methodList[methodName]});
    });
    return res;
}

function addEventList(eventEmitterObj, eventName, methodsList) {

    if (Array.isArray(methodsList)) {

        methodsList.forEach(function (method) {
            eventEmitterObj.on(eventName, method);
        });
    }
}

function applyConfigToVUE() {

    //requireOptions
    if (RunConfigs.requireOptions.useCopy) VUE.requireOptions.useCopy = RunConfigs.requireOptions.useCopy;
    if (RunConfigs.requireOptions.reload) VUE.requireOptions.reload = RunConfigs.requireOptions.reload;
    if (RunConfigs.requireOptions.allowExternalModules) VUE.requireOptions.allowExternalModules = RunConfigs.requireOptions.allowExternalModules;
    if (RunConfigs.requireOptions.onBeforeRequire) addEventList(VUE, 'beforeRequire', RunConfigs.requireOptions.onBeforeRequire);
    if (RunConfigs.requireOptions.onRequire) addEventList(VUE, 'require', RunConfigs.requireOptions.onRequire);
    if (RunConfigs.requireOptions.onAfterRequire) addEventList(VUE, 'afterRequire', RunConfigs.requireOptions.onAfterRequire);
    if (RunConfigs.requireOptions.Blacklist) VUE.requireOptions.Blacklist = RunConfigs.requireOptions.Blacklist.slice(0);
    if (RunConfigs.requireOptions.Whitelist) VUE.requireOptions.Whitelist = RunConfigs.requireOptions.Whitelist.slice(0);
    if (RunConfigs.requireOptions.pathList) VUE.requireOptions.addPath(RunConfigs.requireOptions.pathList);
    if (RunConfigs.requireOptions.extentionList) VUE.requireOptions.addExtensionList(RunConfigs.requireOptions.extentionList);
    if (RunConfigs.requireOptions.overrideList) VUE.requireOptions.addOverrideModuleList(RunConfigs.requireOptions.overrideList);

    //requestOptions
    if (RunConfigs.requestOptions.timeout) VUE.requestOptions.timeout = RunConfigs.requestOptions.timeout;
    if (RunConfigs.requestOptions.onBeforeRequest) addEventList(VUE.requestOptions, 'beforeRequest', RunConfigs.requestOptions.onBeforeRequest);
    if (RunConfigs.requestOptions.onRequest) addEventList(VUE.requestOptions, 'request', RunConfigs.requestOptions.onRequest);
    if (RunConfigs.requestOptions.onRequest) addEventList(VUE.requestOptions, 'error', RunConfigs.requestOptions.onRequestError);
    if (RunConfigs.requestOptions.onResponse) addEventList(VUE.requestOptions, 'response', RunConfigs.requestOptions.onResponse);
    if (RunConfigs.requestOptions.onResponse) addEventList(VUE.requestOptions, 'afterResponse', RunConfigs.requestOptions.onAfterResponse);
    if (RunConfigs.requestOptions.Blacklist) VUE.requestOptions.Blacklist = RunConfigs.requestOptions.Blacklist.slice(0);
    if (RunConfigs.requestOptions.Whitelist) VUE.requestOptions.Whitelist = RunConfigs.requestOptions.Whitelist.slice(0);

    // VU options
    VUE.timeout = RunConfigs.VUoptions.timeout;
    if (RunConfigs.VUoptions.onStart)     addEventList(VUE, 'vmStart', RunConfigs.VUoptions.onStart);
    if (RunConfigs.VUoptions.onEnd)       addEventList(VUE, 'vmEnd', RunConfigs.VUoptions.onEnd);
    if (RunConfigs.VUoptions.onEndofCode) addEventList(VUE, 'vmEndofCode', RunConfigs.VUoptions.onEndofCode);
    if (RunConfigs.VUoptions.onTimeout)   addEventList(VUE, 'vmTimeout', RunConfigs.VUoptions.onTimeout);
    if (Object.keys(RunConfigs.contextVariables).length > 0) VUE.contextVariables = {systemInfo: RunConfigs.contextVariables};


    VUE.getCodeFromFile(RunConfigs.userScriptFileName);
}


//-------- Run From Command Line, get config files and start operation

function checkFileAccess(filename) {
    try {
        fs.accessSync(filename, fs.R_OK || fs.F_OK);
        return true;
    } catch (err) {
        return false;
    }
}

// Check Exists and read-access of config files, and make the config file list

function initConfigs() {

    if (process.argv.length > 2) {

        for (var i = 2; i < process.argv.length; i++) {

            if (checkFileAccess(process.argv[i])) {
                addConfigFile(process.argv[i]);
            }
        }
    }

    if (configFiles.length < 1) {
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
        throw new Error('No user-script file indicated to execute')
    }
    return (checkFileAccess(RunConfigs.userScriptFileName));
} // init Configs


function applySystemRunTimeout() {

    systemTimeoutHappen = true;
    for (var i = 0; i < RunConfigs.VUCount; i++) {
        fullContexts[i].sandbox.__timeoutHappen = true;
    }
    clearTimelyMethodRunIntervals();

    setTimeout(function () {
        process.exit();
    }, 1000);

}

function clearTimelyMethodRunIntervals() {

    for (var i = 0; i < intervalsList.length; i++) {
        clearInterval(intervalsList[i]);
    }
}


function createContexts() {

    for (var i = 0; i < RunConfigs.VUCount; i++) {
        fullContexts[i] = VUE.getFullContext(i);
    }
}


function runMethodList(methodList) {

    if (!methodList) return;
    if (!Array.isArray(methodList)) return;

    var args = Array.prototype.slice.call(arguments);
    args.shift();
    methodList.forEach(function (method) {
        method.apply(this, args);
    });
}


function setupTimelyMethodRunIntervals() {

    var index = 0;

    Object.keys(RunConfigs.controlMethods).forEach(function (RunPeriods) {

        if (isNaN(RunPeriods)) return;
        if (Number(RunPeriods) <= 0) return;

        intervalsList[index] = setInterval(runMethodList, Number(RunPeriods), RunConfigs.controlMethods[RunPeriods]);
        index++;
    });
}

function startNewCycle() {

    if (systemTimeoutHappen) return;
    if (RunConfigs.controlMethods[-3])
        runMethodList(RunConfigs.controlMethods[-3]);

    for (var i = 0; i < RunConfigs.VUCount; i++) {
        startNewVU(i);
    }
}

function startNewVU(sandboxID) {

    if (systemTimeoutHappen) return;
    if (RunConfigs.controlMethods[-1])
        runMethodList(RunConfigs.controlMethods[-1], sandboxID);

    VUE.run(fullContexts[sandboxID]);
}


function runOnceVUs() {

    var runningVUList = {};
    var totalStarted = 0;
    var systemTimeoutObject;

    VUE.on('vmStart', function (sandboxID) {
        runningVUList[sandboxID] = 'Start';
        totalStarted++;
    });

    VUE.on('vmEnd', function (sandboxID, totalRunTime) {
        
        delete runningVUList[sandboxID];

        if (RunConfigs.controlMethods[-2])
            runMethodList(RunConfigs.controlMethods[-2], sandboxID);

        if ( (Object.keys(runningVUList).length === 0) && (totalStarted >= RunConfigs.VUCount) ) {
            // means one full cycle executed
            clearTimeout(systemTimeoutObject);
            clearTimelyMethodRunIntervals();
        }
    });

    // VUE.on('vmEndofCode', function (sandboxID, codeRunTime) {
    //
    // });
    //
    // VUE.on('vmTimeout', function (sandboxID, remainingActiveHandlers) {
    //
    // });

    systemTimeoutObject = setTimeout(applySystemRunTimeout, RunConfigs.SystemRunTime);
    setupTimelyMethodRunIntervals();

    startNewCycle();
}


function cyclicRunVUs() {

    var runningVUList = {};

    VUE.on('vmStart', function (sandboxID) {
        runningVUList[sandboxID] = 'Start';
    });

    VUE.on('vmEnd', function (sandboxID, totalRunTime) {
        delete runningVUList[sandboxID];
        if (RunConfigs.controlMethods[-2])
            runMethodList(RunConfigs.controlMethods[-2], sandboxID);

        if (runningVUList === {}) {
            if (RunConfigs.controlMethods[-4])  // end of cycle method run
                runMethodList(RunConfigs.controlMethods[-4], sandboxID);

            setTimeout(startNewCycle, RunConfigs.cycleSleepTime);
        }
    });

    // VUE.on('vmEndofCode', function (sandboxID, codeRunTime) {
    //
    // });
    //
    // VUE.on('vmTimeout', function (sandboxID, remainingActiveHandlers) {
    //
    // });

    setTimeout(applySystemRunTimeout, RunConfigs.SystemRunTime);
    setupTimelyMethodRunIntervals();

    startNewCycle();
}


function continuousRunVUs() {

    // var runningVUList = {};

    // VUE.on('vmStart', function (sandboxID) {
    //
    // });

    VUE.on('vmEnd', function (sandboxID, totalRunTime) {

        if (RunConfigs.controlMethods[-2])
            runMethodList(RunConfigs.controlMethods[-2], sandboxID);

        setImmediate(startNewVU, sandboxID);
    });

    // VUE.on('vmEndofCode', function (sandboxID, codeRunTime) {
    //
    // });
    //
    // VUE.on('vmTimeout', function (sandboxID, remainingActiveHandlers) {
    //
    // });

    setTimeout(applySystemRunTimeout, RunConfigs.SystemRunTime);
    setupTimelyMethodRunIntervals();

    startNewCycle();
}


function runContexts() {

    // apply run policy
    switch (RunConfigs.runCycleType) {

        case 0: // continuous run

            continuousRunVUs();
            break;
        case 1: // cyclic run

            cyclicRunVUs();
            break;
        case 2: // run once

            runOnceVUs();
            break;

        default:

            runOnceVUs();
            break;
    }
} // end of runContexts


// process.on('uncaughtException', function (err) {
//     //log('process Error', err, process.pid);
// });


// ***********  call functions to start operation
if (!initConfigs()) return;
applyConfigToVUE();
createContexts();
runContexts();


