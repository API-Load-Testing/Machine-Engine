'use strict';

module.exports = {

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