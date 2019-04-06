'use strict';
var https = require('https');

//set these values to retrieve the oauth token
var crmorg = 'https://k4mobilityltdsb.crm8.dynamics.com';
//Application ID
var clientid = '16df0e29-09f6-45a1-aef0-ae9a6e8ce0cb';
var Client_secret = 'pzkGMd3SFZ/znahYMrQnET9OB0s3Eg9DimIYJvA0XLE=';
var tokenendpoint = 'https://login.microsoftonline.com/6a9fbffa-96d5-47ff-843d-3a291cc10465/oauth2/token';

//set these values to query your crm data
var crmwebapihost = 'k4mobilityltdsb.api.crm8.dynamics.com';
var fetchProductPropQuery = "%3Cfetch%20top%3D%2250%22%3E%0A%3Centity%20name%3D%22dynamicproperty%22%3E%0A%3Cattribute%20name%3D%22defaultvaluestring%22%2F%3E%0A%3Cattribute%20name%3D%22name%22%2F%3E%0A%3Cfilter%3E%0A%3Ccondition%20attribute%3D%22statecode%22%20operator%3D%22eq%22%20value%3D%220%22%2F%3E%0A%3Ccondition%20attribute%3D%22statuscode%22%20operator%3D%22eq%22%20value%3D%221%22%2F%3E%0A%3C%2Ffilter%3E%0A%3Clink-entity%20name%3D%22product%22%20from%3D%22parentproductid%22%20to%3D%22regardingobjectid%22%20alias%3D%22Product%22%3E%0A%3Cattribute%20name%3D%22name%22%2F%3E%0A%3Cattribute%20name%3D%22productid%22%2F%3E%0A%3Cfilter%3E%0A%3Ccondition%20attribute%3D%22statuscode%22%20operator%3D%22eq%22%20value%3D%221%22%2F%3E%0A%3Ccondition%20attribute%3D%22k4_productsubtype%22%20operator%3D%22eq%22%20value%3D%22636130000%22%2F%3E%0A%3C%2Ffilter%3E%0A%3C%2Flink-entity%3E%0A%3C%2Fentity%3E%0A%3C%2Ffetch%3E";
var crmwebapipath = '/api/data/v9.1/dynamicproperties?fetchXml=' + fetchProductPropQuery;

//remove https from tokenendpoint url
tokenendpoint = tokenendpoint.toLowerCase().replace('https://', '');

//get the authorization endpoint host name
var authhost = tokenendpoint.split('/')[0];

//get the authorization endpoint path
var authpath = '/' + tokenendpoint.split('/').slice(1).join('/');

//build the authorization request
//if you want to learn more about how tokens work, see IETF RFC 6749 - https://tools.ietf.org/html/rfc6749
var reqstring = 'client_id=' + clientid;
reqstring += '&resource=' + encodeURIComponent(crmorg);
reqstring += '&client_secret=' + Client_secret;
reqstring += '&grant_type=client_credentials';


//set the token request parameters
var tokenrequestoptions = {
    host: authhost,
    path: authpath,
    method: 'POST',
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(reqstring)
    }
};

//make the token request
var tokenrequest = https.request(tokenrequestoptions, function (response) {
    //make an array to hold the response parts if we get multiple parts
    var responseparts = [];
    response.setEncoding('utf8');
    response.on('data', function (chunk) {
        //add each response chunk to the responseparts array for later
        responseparts.push(chunk);
    });
    response.on('end', function () {
        //once we have all the response parts, concatenate the parts into a single string
        var completeresponse = responseparts.join('');
        //console.log('Response: ' + completeresponse);
        console.log('Token response retrieved . . . ');

        //parse the response JSON
        var tokenresponse = JSON.parse(completeresponse);

        //extract the token
        var token = tokenresponse.access_token;
        console.log(token);

        //pass the token to our data retrieval function
        getActiveProductProperties(token);

    });
});
tokenrequest.on('error', function (e) {
    console.error(e);
});

//post the token request data
tokenrequest.write(reqstring);

//close the token request
tokenrequest.end();

function getActiveProductProperties(token) {
    //set the web api request headers
    var requestheaders = {
        'Authorization': 'Bearer ' + token,
        'OData-MaxVersion': '4.0',
        'OData-Version': '4.0',
        'Accept': 'application/json',
        'Content-Type': 'application/json; charset=utf-8',
        'Prefer': 'odata.maxpagesize=500',
        'Prefer': 'odata.include-annotations=OData.Community.Display.V1.FormattedValue'
    };

    //set the crm request parameters
    var crmrequestoptions = {
        host: crmwebapihost,
        path: crmwebapipath,
        method: 'GET',
        headers: requestheaders
    };

    //make the web api request
    var crmrequest = https.request(crmrequestoptions, function (response) {
        //make an array to hold the response parts if we get multiple parts
        var responseparts = [];
        response.setEncoding('utf8');
        response.on('data', function (chunk) {
            //add each response chunk to the responseparts array for later

            responseparts.push(chunk);
        });

        response.on('end', function () {
            //once we have all the response parts, concatenate the parts into a single string
            var completeresponse = responseparts.join('');

            //parse the response JSON
            if (completeresponse != "") {
                var collection = JSON.parse(completeresponse).value;
                var ProductId;
                //loop through the results and write out the fullname
                collection.forEach(function (row, i) {
                    console.log(row['Product.name'] + ":" + row['Product.productid'] + ":" + row['name'] + ":" + row['defaultvaluestring']);
                    ProductId = row['Product.productid'];
                });
                console.log(ProductId);
                createLead(token, ProductId);
            }
        });
    });
    crmrequest.on('error', function (e) {

        console.error(e);
    });
    //crmrequest.write(crmrequestoptions);
    //close the web api request
    crmrequest.end();
}
var LeadId;
function createLead(token, ProductId) {

    var leadObj = {};
    leadObj["subject"] = "Lead From Node JS";
    leadObj["firstname"] = "First name";
    leadObj["lastname"] = "Last name";
    leadObj["k4_username"] = "username";
    leadObj["k4_password"] = "password";
    leadObj["k4_gender"] = 1; //male
    leadObj["k4_yachtidmmsi"] = "Yachtid";
    leadObj["emailaddress1"] = "Lead@FromNodeJS.com";
    leadObj["k4_subscription@odata.bind"] = "/products(" + ProductId + ")"; //Lookup
    leadObj["k4_dateofbirth"] = "2019-04-06T11:56:21Z"; //date time field


    var requestdata = JSON.stringify(leadObj);
    var contentlength = Buffer.byteLength(JSON.stringify(leadObj));

    //set the crm request parameters and headers
    var crmrequestoptions = {
        path: '/api/data/v9.1/leads?$select=leadid',
        host: crmwebapihost,
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json',
            'Content-Length': contentlength,
            'OData-MaxVersion': '4.0',
            'OData-Version': '4.0',
            'Prefer': 'return=representation'
        }
    };

    //make the web api request
    var crmrequest = https.request(crmrequestoptions, function (response) {
        //make an array to hold the response parts if we get multiple parts
        var responseparts = [];
        //response.setEncoding('utf8');
        response.on('data', function (chunk) {
            //add each response chunk to the responseparts array for later
            responseparts.push(chunk);
        });
        response.on('end', function () {
            var completeresponse = responseparts.join('');

            //parse the response JSON
            if (completeresponse != "") {

            }

            //   var collection = JSON.parse(response);
            console.log(response);
            console.log("Lead Created !!");
            var LeadId = '35AD1D0D-3D58-E911-A95B-000D3AF266C5';
            createPayment(token, LeadId) 
        });
    });
    crmrequest.on('error', function (e) {
        console.error(e);
    });

    //send the data to update
    crmrequest.write(requestdata);

    //close the web api request
    crmrequest.end();
}

function createPayment(token, LeadId) {
    //  var LeadId = '35AD1D0D-3D58-E911-A95B-000D3AF266C5';
    var PaymentObj = {};
    PaymentObj["k4_amount"] = 34; //money
    PaymentObj["k4_lead@odata.bind"] = "/leads(" + LeadId + ")"; //Lookup
    PaymentObj["k4_email"] = "node@node.com"; //single text field
    PaymentObj["k4_name"] = "Token Payment test"; //single text field
    PaymentObj["k4_payeeid"] = "Payee004 test"; //single text field
    PaymentObj["k4_paymentdate"] = "2019-04-06T11:56:21Z"; //date time field
    PaymentObj["k4_paymentid"] = "payment001"; //single text field
    PaymentObj["k4_paymenttype"] = 636130002; //Option set field-- Token Paymnet 636130002


    var requestdata = JSON.stringify(PaymentObj);
    var contentlength = Buffer.byteLength(JSON.stringify(PaymentObj));

    //set the crm request parameters and headers
    var crmrequestoptions = {
        path: '/api/data/v9.1/k4_paymentinformations',
        host: crmwebapihost,
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json',
            'Content-Length': contentlength,
            'OData-MaxVersion': '4.0',
            'OData-Version': '4.0'
        }
    };

    //make the web api request
    var crmrequest = https.request(crmrequestoptions, function (response) {
        //make an array to hold the response parts if we get multiple parts
        var responseparts = [];
        //response.setEncoding('utf8');
        response.on('data', function (chunk) {
            //add each response chunk to the responseparts array for later
            responseparts.push(chunk);
        });
        response.on('end', function () {
            //once we have all the response parts, concatenate the parts into a single string - response should be empty for this, though
            var completeresponse = responseparts.join('');

            console.log(completeresponse);
            console.log("success");
        });
    });
    crmrequest.on('error', function (e) {
        console.error(e);
    });

    //send the data to update
    crmrequest.write(requestdata);

    //close the web api request
    crmrequest.end();
}
