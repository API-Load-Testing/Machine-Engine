'use strict';

function myLibrary() {

    this.contextVariables = {

    };

    var reqCount = 0;
    var resCount = 0;
    var pcount = 0;


    this.logRequest = function (req, options) {
        reqCount++;
    };

    this.logResponse = function (req, res) {
        resCount++;
    };

    this.printReq = function () {
        console.log("print count: ", pcount, "   --- req count: " , reqCount, "   --- res Count: ", resCount);
        pcount++;
    }

}


module.exports = new myLibrary();