/**
****************************************************************************
* Copyright 2016 IBM
*
*   Simulator for SVCC IBM IoT Workshop
*
*   By JeanCarl Bisson (@dothewww)
*   More info: https://ibm.biz/svcc-iot
*
*   Licensed under the Apache License, Version 2.0 (the "License");
*   you may not use this file except in compliance with the License.
*   You may obtain a copy of the License at
*
*     http://www.apache.org/licenses/LICENSE-2.0
*
*   Unless required by applicable law or agreed to in writing, software
*   distributed under the License is distributed on an "AS IS" BASIS,
*   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
*   See the License for the specific language governing permissions and
****************************************************************************
*/

var express = require('express'),
    app = express(),
    bodyParser = require('body-parser'),
    cfenv = require('cfenv'),
    appEnv = cfenv.getAppEnv(),
    Client = require('ibmiotf'),
    http = require('http').Server(app),
    io = require('socket.io')(http);

var vcapServices = require('vcap_services');
var iotService = vcapServices.getCredentials('iotf-service');

var appClient;
var isConnected = false;

// serve the files out of ./public as our main files
app.use(bodyParser.urlencoded({
    extended: false
}));

// serve the files out of ./public as our main files
app.use(express.static(__dirname + '/public'));

http.listen(appEnv.port, function() {
  console.log('listening on ' + appEnv.port);
});

io.on('connection', function(socket) {
  console.log('Sockets connected.');

  socket.on('disconnect', function() {
    console.log('Socket disconnected.');
  });

  socket.on('newData', function(data, err) {
    console.log('New Data:'+ JSON.stringify(data));
    if(err) {
      console.log('Socket error:'+err);
    } else {
      if(isConnected) {
        appClient.publishDeviceEvent('simulator', 'environment', 'status', 'json', JSON.stringify(data));
      }
    }
  });

  app.post('/iotConnect', function(req, res) {
    if(isConnected) {
      appClient.disconnect();
      isConnected = false;
    }

    if(!iotService || !iotService.apiKey) {
      res.send('Unable to connect to IoT Platform service');
      return;
    }

    var appClientConfig = {
      'org': iotService.org,
      'id': 'simulator',
      'domain': 'internetofthings.ibmcloud.com',
      'auth-key': iotService.apiKey,
      'auth-token': iotService.apiToken
    }

    appClient = new Client.IotfApplication(appClientConfig);

    appClient.connect();

    appClient.on('connect', function() {
      console.log('Connected to IoT Foundation');
      appClient.subscribeToDeviceCommands('simulator','+','+');
      isConnected = true;
    });

    // Received command from IoT Foundation
    appClient.on('deviceCommand', function(deviceType, deviceId, commandName, format, payload, topic) {
      socket.broadcast.emit('command',{deviceId:deviceId, command:commandName, payload:JSON.parse(payload.toString())});
      console.log(deviceId+':'+payload.toString());
    });

    // On disconnect, update browser client
    appClient.on('disconnect', function() {
      isConnected = false;
      socket.broadcast.emit('iotDisconnected', '');
    });

    // On Error, update browser client
    appClient.on('error', function(err) {
      console.log('Error:'+err);
      socket.broadcast.emit('iotError', '');
    });

    res.send('Connected');
  });

  app.get('/iotDisconnect', function(req, res) {
    if(isConnected) {
      appClient.disconnect();
      isConnected = false;
      console.log('Simulator disconnected');
    }

    res.send('Disconnected');
  });
});
