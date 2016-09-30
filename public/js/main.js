/****************************************************************/
/*                                                              */
/* Simulated home                                               */
/* Developed by JeanCarl Bisson (jbisson@us.ibm.com)            */
/*                                                              */
/* Modified from Quickstart IoT Sensor (ibm.biz/iotsensor)      */
/* Socket IoT communication inpsired by Stefania Kaczmarczyk    */
/*                                                              */
/* Licensed Materials - Property of IBM                         */
/* 5725-F96 IBM MessageSight                                    */
/* (C) Copyright IBM Corp. 2012, 2013 All Rights Reserved.      */
/*                                                              */
/* US Government Users Restricted Rights - Use, duplication or  */
/* disclosure restricted by GSA ADP Schedule Contract with      */
/* IBM Corp.                                                    */
/*                                                              */
/****************************************************************/

var interval = 2000;
var connected = false;
var timer = null;

var socket = io({
    autoConnect: true
});

socket.connect();

socket.on('connect', function() {
    console.log('Connected to socket server');
});

socket.on('disconnect', function() {
	$.get('/iotDisconnect', function(res) {
    connected = false;
    clearInterval(timer);
    timer = null;
  });
});

socket.on('command', function(data) {
  console.log('received command:'+JSON.stringify(data));

  switch(data.deviceId) {
    case 'fireplace':
      $('#fireplace').css('color', data.command == 'turnOn' ? data.payload.color : 'black');
    break;
    case 'airconditioner':
      $('#airConditioner').css('color', data.command == 'turnOn' ? 'green' : 'black');
    break;
    case 'lcd':
      $('#lcd').html(data.payload.text.replace(/\n/,'<br>'));
      $('#lcd').css('background-color', data.payload.background ? data.payload.background : 'white');
      $('#lcd').css('color', data.payload.foreground ? data.payload.foreground : 'black');
    break;
    case 'weather':
      switch(data.payload.condition) {
        case 'cloudy':
          weatherIcon = 'glyphicon glyphicon-cloud';
        break;
        case 'sunny':
          weatherIcon = 'glyphicon glyphicon-certificate';
        break;
        case 'night':
          weatherIcon = 'glyphicon glyphicon-star';
        break;
        case 'raining':
          weatherIcon = 'glyphicon glyphicon-tint';
        break;
        case 'windy':
          weatherIcon = 'glyphicon glyphicon-send';
        break;
        case 'lightning':
          weatherIcon = 'glyphicon glyphicon-flash';
        break;
        default:
          weatherIcon = 'glyphicon glyphicon-remove';
      }

      $('#weather').html(data.payload.text.replace(/\n/,'<br>'));
      $('#weatherIcon').css('color', data.payload.color ? data.payload.color : 'black');
      $('#weatherIcon').attr('class', weatherIcon);
    break;
  }
})

function connectSimulator() {
  if (!connected) {
    console.log('Sending request to connect to the broker.');

    $.post('/iotConnect', {}, function(res) {
      connected = true;

      $('#connectSimulator').prop('disabled', false);
      $('#deviceStatus').html('Connected');
      $('#connectSimulator').text('Disconnect');

      console.log('Successfully connected to the IoT broker');
    });

    timer = setInterval(publish, 2000);
  } else {
    $.get('/iotDisconnect', function(res) {
      connected = false;
      $('#deviceStatus').html('Not Connected');
      $('#connectSimulator').text('Connect');
    });
  }
}

$('#connectSimulator').on('click', connectSimulator);

function init() {
  $('#interval').html(interval);

  $('#myCarousel').swiperight(function() {
    $('#myCarousel').carousel('prev');
  });

  $('#myCarousel').swipeleft(function() {
    $('#myCarousel').carousel('next');
  });

  $('#myCarousel').carousel('pause');

  for(var i in sensors) {
    $('#'+i+'Down').click((function(type) {
      return function() {
        if(sensors[type] > lowerLimits[type]) {
          sensors[type] -= 1;
          updateSensors();
        }
      }
    })(i));
    $('#'+i+'Up').click((function(type) {
      return function() {
        if(sensors[type] < upperLimits[type]) {
          sensors[type] += 1;
          updateSensors();
        }
      }
    })(i));
  }

  updateSensors();
}

var sensors = {
  temp: 15 + Math.random() * 4,
  humidity: 75 + Math.random() * 5,
  objectTemp: 23 + Math.random() * 4,
};

var lowerLimits = {
  temp: -100,
  humidity: 0,
  objectTemp: -100
};

var upperLimits = {
  temp: 100,
  humidity: 100,
  objectTemp: 100
};

function updateSensors() {
  for(var i in sensors) {
    if(i == 'temp') {
      sensors[i] = Math.floor(parseFloat(sensors[i]));
      $('#'+i+'Reading').html(sensors[i] + '&deg;C');
    }

    if(i == 'humidity') {
      sensors[i] = Math.floor(parseFloat(sensors[i]));
      $('#'+i+'Reading').html(sensors[i] + '%');
    }

    if(i == 'objectTemp') {
      sensors[i] = Math.floor(parseFloat(sensors[i]));
      $('#'+i+'Reading').html(sensors[i] + '&deg;C');
    }
  }
}

function publish() {
  updateSensors();

  if(connected) {
    var payload = {
      d: {
        name: 'simulator',
        temp: sensors.temp,
        humidity: sensors.humidity,
        objectTemp: sensors.objectTemp,
      }
    };

    socket.emit('newData', payload);
    console.log('publish | '+JSON.stringify(payload));
  }
}
