// server.js
// where your node app starts

// init project
const express = require('express');
const ApiAiAssistant = require('actions-on-google').ApiAiAssistant;
const bodyParser = require('body-parser');
const request = require('request');
const app = express();
const Map = require('es6-map');
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI1ODkyMmRmOGM4ZWJmNDJkN2I5NmE2YWYiLCJlbWFpbCI6ImRlbW9Ac3BsaXRzZWNuZC5jb20iLCJmaXJzdE5hbWUiOiJFbGxpcyIsImxhc3ROYW1lIjoiTmljaG9scyIsImNyZWF0ZWRBdCI6MTQ4NTk3NTAzMjI3MywiaWF0IjoxNTA2NjEyNzMxLCJleHAiOjE1MDY2NTU5MzF9.qAkMYylJWdwC6KE4oMBMBZXmSaCYLIuoaL9cPRa8AiE'

// Pretty JSON output for logs
const prettyjson = require('prettyjson');
// Join an array of strings into a sentence
// https://github.com/epeli/underscore.string#tosentencearray-delimiter-lastdelimiter--string
const toSentence = require('underscore.string/toSentence');

app.use(bodyParser.json({type: 'application/json'}));

// This boilerplate uses Express, but feel free to use whatever libs or frameworks
// you'd like through `package.json`.

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function (request, response) {
  response.sendFile(__dirname + '/views/index.html');
});

// Uncomment the below function to check the authenticity of the API.AI requests.
// See https://docs.api.ai/docs/webhook#section-authentication
/*app.post('/', function(req, res, next) {
  // Instantiate a new API.AI assistant object.
  const assistant = new ApiAiAssistant({request: req, response: res});
  
  // Throw an error if the request is not valid.
  if(assistant.isRequestFromApiAi(process.env.API_AI_SECRET_HEADER_KEY, 
                                  process.env.API_AI_SECRET_HEADER_VALUE)) {
    next();
  } else {
    console.log('Request failed validation - req.headers:', JSON.stringify(req.headers, null, 2));
    
    res.status(400).send('Invalid request');
  }
});*/

// Handle webhook requests
app.post('/', function(req, res, next) {
  // Log the request headers and body, to aide in debugging. You'll be able to view the
  // webhook requests coming from API.AI by clicking the Logs button the sidebar.
  logObject('Request headers: ', req.headers);
  logObject('Request body: ', req.body);
  console.log('TOKEN=', process.env.TOKEN);
    
  // Instantiate a new API.AI assistant object.
  const assistant = new ApiAiAssistant({request: req, response: res});

  // Declare constants for your action and parameter names
  // const ASK_WEATHER_ACTION = 'askWeather';  // The action name from the API.AI intent
  // const CITY_PARAMETER = 'geo-city'; // An API.ai parameter name
  
  const STATUS_REPORT_ACTION = 'statusReport';
  const SEARCH_DRIVER_ACTION = 'searchDriver';
  const SAFE_TO_CONTACT_ACTION = 'safeToContact';
  const DRIVER_NAME_PARAMETER = 'driver-name';

  // Create functions to handle intents here
  
  function statusReport(assistant) {
    console.log('Handling action: ' + STATUS_REPORT_ACTION);
    const options = {  
      url: 'https://dashboard-backend.splitsecnd.com/dashboardDevices',
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': token
      }
    };
    
    request(options, function (error, response) {
      if (error) {
        next(error)
      } else {
        let body = JSON.parse(response.body);
        logObject('dashboardDevices call response: ', body);
        let assistantResponseString =  body.devices.map(function (device) {
          return `${device.driver.name} is ${getDriverStatusString(device.status)} near ${formatLocationString(device.location)}`
        }).join(';\n');
        console.log(assistantResponseString);
        // Do all of the JSON work to return the devices here
        
        // Respond to the user with the current temperature.
        assistant.tell(assistantResponseString);
      }
    });
  }
  
  function searchDriver(assistant) {
    console.log('Handling action: ' + SEARCH_DRIVER_ACTION);
    const options = {  
      url: 'https://dashboard-backend.splitsecnd.com/dashboardDevices',
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': token
      }
    };
    
    request(options, function (error, response) {
      if (error) {
        next(error)
      } else {
        let body = JSON.parse(response.body);
        logObject('dashboardDevices call response: ', body);
        let driverName = assistant.getArgument(DRIVER_NAME_PARAMETER);
        
        let requestedDevice =  body.devices.filter(function (device) {
          return device.driver.name.split(' ')[0] == driverName;
        })[0]
        
        let assistantResponseString = `${requestedDevice.driver.name} is ${getDriverStatusString(requestedDevice.status)} near ${formatLocationString(requestedDevice.location)}`
        
        // Respond to the user with the current temperature.
        assistant.tell(assistantResponseString);
      }
    });
  }
  
  function safeToContact(assistant) {
    console.log('Handling action: ' + SAFE_TO_CONTACT_ACTION);
    const options = {  
      url: 'https://dashboard-backend.splitsecnd.com/dashboardDevices',
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': token
      }
    };
    
    request(options, function (error, response) {
      if (error) {
        next(error)
      } else {
        let body = JSON.parse(response.body);
        logObject('dashboardDevices call response: ', body);
        
        let assistantResponseString = '';
        let driverName = assistant.getArgument(DRIVER_NAME_PARAMETER);
        
        let requestedDevice =  body.devices.filter(function (device) {
          return device.driver.name.split(' ')[0] == driverName;
        })[0]
        
        if (requestedDevice.status == 1 || requestedDevice.status == 2) {
          assistantResponseString = `No, it is not safe to call or text. ${requestedDevice.driver.name.split(' ')[0]} is ${getDriverStatusString(requestedDevice.status)}`
        } else {
          assistantResponseString = `Yes, it is safe to call or text. ${requestedDevice.driver.name.split(' ')[0]} is ${getDriverStatusString(requestedDevice.status)}`
        }
        
        // Respond to the user with the current temperature.
        assistant.tell(assistantResponseString);
      }
    });
  }
  
  // Add handler functions to the action router.
  let actionRouter = new Map();
  
  // The STATUS_REPORT_ACTION (statusReport) should map to the statusReport method.
  actionRouter.set(STATUS_REPORT_ACTION, statusReport);
  actionRouter.set(SEARCH_DRIVER_ACTION, searchDriver)
  actionRouter.set(SAFE_TO_CONTACT_ACTION, safeToContact)
  
  // Route requests to the proper handler functions via the action router.
  assistant.handleRequest(actionRouter);
});
// Handle errors.
app.use(function (err, req, res, next) {
  console.error(err.stack)
  res.status(500).send('Something broke!')
})

// Pretty print objects for logging.
function logObject(message, object, options) {
  console.log(message);
  console.log(prettyjson.render(object, options));
}

function getDriverStatusString(status) {
  switch (status) {
    case 1: return "driving"
    case 2: return "stopped"
    case 3: return "parked"
    case 4: return "unable to be located"
  }
}

function formatLocationString(loc) {
  let splitString = loc.split(',')
  return `${splitString[0]},${splitString[1]}`
}

// Listen for requests.
let server = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + server.address().port);
})
  