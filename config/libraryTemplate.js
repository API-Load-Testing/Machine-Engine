'use strict';

module.exports = {

    contextVariables: {
        //Global Variables for userScript,
        // Like Remainig Credit
        // this is accessible in VUs under 'sysmtemInfo' global object
        // change these variables and the userScript will see the new values
        // Attention: as userScript can change the values, these are not safe
        //         to store data, only put final results for user access here
    },


    //...... the rest is administrative methods & operations addressed in config file
    saveReqTime: new WeakMap(),
    
    logRequest: function (req, options) {
        var myTempDate = new Date();
        saveReqTime.set(req, myTempDate.getTime());
        console.log('req Start Time : ', myTempDate.toString());
    },
    
    logResponse: function (req, res) {
        var myTempDate = new Date();
        var OperationTime = myTempDate.getTime() - saveReqTime.get(req);
        saveReqTime.delete(req)
        console.log('response time : ', OperationTime);
    }


}