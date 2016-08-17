'use strict';

var path = require('path');
var child_process = require('child_process');
var fs = require('fs');

var RunConfigs = {
    libraryFileName: null,
    userScriptFileName : null,
    child_process_count: 1,
    runCycleType: 0,
    SystemRunTime: 600000,
    systemTimeoutHappen: false,
    childProcesses: [],
    systemTimeoutObject: null,
    canExitAll: false
}


function showHelpScreen() {
    console.log('****  Usage ***');
    console.log('');
    console.log('     node machine-engine.js  config_File');
    console.log('');
    console.log('     config_File:  the path and file name of the config file to be used');
    console.log('');
    console.log('');
}



//-------- Run From Command Line, get config files and start operation
var configFiles = [];
function addConfigFile(filename) {

    if (configFiles.indexOf(path.resolve(filename)) < 0)
        configFiles.push(path.resolve(filename));
}

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

        if (checkFileAccess(process.argv[2])) {
            addConfigFile(process.argv[2]);
        }
    } else {  // no parameters, show help screen
        showHelpScreen();
        return(-3); // show Help Screen , exit
    }

    if (configFiles.length < 1) {
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

    if (checkFileAccess(RunConfigs.userScriptFileName)) {

        if (RunConfigs.libraryFileName) {

            if (checkFileAccess(RunConfigs.libraryFileName)) return(2);  // both files exists
            else {
                console.log(`  Error: library file "${RunConfigs.libraryFileName}"  does not exists`);
                return(-2);
            }  // library file does not exists
        } else return(1); // only userScript file exists

    } else {
        console.log(`  Error: user script file "${RunConfigs.userScriptFileName}"  does not exists`);
        return (-1);
    }  // userScript File not exists

} // init Configs

function setConfig(configs, filesPath) {

    if (configs.libraryFileName) RunConfigs.libraryFileName = path.resolve(filesPath, configs.libraryFileName);
    if (configs.userScriptFileName) RunConfigs.userScriptFileName = path.resolve(filesPath, configs.userScriptFileName);
    if (configs.child_process_count) RunConfigs.child_process_count = configs.child_process_count;
    if (configs.runCycleType) RunConfigs.runCycleType = configs.runCycleType;
    if (configs.SystemRunTime) RunConfigs.SystemRunTime = configs.SystemRunTime;
}


function systemTimeout() {

    RunConfigs.systemTimeoutHappen = true;
    for (var i = 0; i < RunConfigs.child_process_count; i++) {

        if (!RunConfigs.childProcesses[i]) continue;

        if (RunConfigs.childProcesses[i].connected) {
            RunConfigs.childProcesses[i].kill();
        }
    }

    setTimeout(process.exit, 1000);
} // systemTimeout

function executeSingleProcess(index) {

    if (RunConfigs.systemTimeoutHappen) return;

    RunConfigs.childProcesses[index] = child_process.fork(path.resolve(__dirname, 'single-thread.js'), process.argv.slice(2));
    RunConfigs.childProcesses[index].myIndex = index;
}

function countRemainingItems(theArray) {

    var sumRemaining = 0;
    for (var i = 0; i < theArray.length; i++)
        if (theArray[i] != 'Item Deleted') sumRemaining++;

    return sumRemaining;
}

function deleteFromChildProcessList(customChildProcessObj) {

    console.log('process Exit ---> ', customChildProcessObj.myIndex)
    if (RunConfigs.childProcesses[customChildProcessObj.myIndex])
        RunConfigs.childProcesses[customChildProcessObj.myIndex] = 'Item Deleted';

    if (RunConfigs.canExitAll && countRemainingItems(RunConfigs.childProcesses) <= 0) {
        clearTimeout(RunConfigs.systemTimeoutObject);
        RunConfigs.systemTimeoutObject = null;
    }
}

function runProcessesTillSystemRunTimeout() {

    RunConfigs.systemTimeoutObject = setTimeout(systemTimeout , RunConfigs.SystemRunTime+5000);
    RunConfigs.canExitAll = false;
    for (var i = 0; i < RunConfigs.child_process_count; i++) {

        executeSingleProcess(i);
        // Events
        RunConfigs.childProcesses[i].on('error', function(err) {

            RunConfigs.childProcesses[this.myIndex] = null;
        });
        RunConfigs.childProcesses[i].on('close', function(code, signal) {

            RunConfigs.childProcesses[this.myIndex] = null;
        });
        RunConfigs.childProcesses[i].on('exit', function(code, signal) {

            RunConfigs.childProcesses[this.myIndex] = null;
        });
    }
}  // end of runProcessesTillSystemTimeout

function runProcessesJustOnce() {

    RunConfigs.systemTimeoutObject = setTimeout(systemTimeout , RunConfigs.SystemRunTime+5000);
    RunConfigs.canExitAll = false;
    for (var i = 0; i < RunConfigs.child_process_count; i++) {

        executeSingleProcess(i);
        // Events
        RunConfigs.childProcesses[i].on('error', function(err) {
            //RunConfigs.childProcesses[this.myIndex] = child_process.fork(path.resolve(__dirname, 'single-thread.js'), process.argv.slice(2));
            deleteFromChildProcessList(this);
        });
        RunConfigs.childProcesses[i].on('close', function(code, signal) {

            deleteFromChildProcessList(this);
        });
        RunConfigs.childProcesses[i].on('exit', function(code, signal) {

            deleteFromChildProcessList(this);
        });
    }

    RunConfigs.canExitAll = true;
}  // end of runProcessesJustOnce


function applyProcessRunPolicy() {

    // apply run policy
    switch (RunConfigs.runCycleType) {

        case 0: // continuous run
        case 1: // cyclic run

            runProcessesTillSystemRunTimeout();
            break;
        case 2: // run once

            runProcessesJustOnce();
            break;

        default:

            runProcessesJustOnce();
            break;
    }
} // end of applyProcessRunPolicy




//----------------  helper functions are ready, just call the functions to run the app --------

if (initConfigs() <= 0) {  // init unsuccessful
    process.exit(50);
}

applyProcessRunPolicy();