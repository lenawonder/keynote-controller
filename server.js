var os = require('os');
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);

var sockets = [];
var masterSocket = null;

app.configure(function() {
  app.use(express.static(__dirname + '/public'));
});

server.listen(3000);

var broadcast = function(event, data, ignoreSocket) {
  for (var i = 0, l = sockets.length; i < l; i++) {
    if (sockets[i] !== ignoreSocket) {
      sockets[i].emit(event, data);
    }
  }
  if (masterSocket && (ignoreSocket === undefined || ignoreSocket !== masterSocket)) {
    masterSocket.emit(event, data);
  }
};

var addSocket = function(socket) {
  if (masterSocket === null && socket.handshake.address.address === findLocalAddress()) {
    masterSocket = socket;
  } else {
    sockets.push(socket);
  }
};

var removeSocket = function (socket) {
  if (socket === masterSocket) {
    masterSocket = null;
  } else {
    for (var i = 0, l = sockets.length; i < l; i++) {
      if (socket === sockets[i]) {
        return sockets.splice(i, 1);
      }
    }
  }
};

var findLocalAddress = function() {
  var en1 = os.networkInterfaces().en1;
  for (var i = 0, l = en1.length; i < l; i++) {
    if (en1[i].family === 'IPv4') {
      return en1[i].address;
    }
  }
}

io.sockets.on('connection', function (socket) {
  addSocket(socket);
  socket.on('next', function (stepId) {
    if (socket === masterSocket) {
      console.log('next call from master');
      broadcast('next', stepId, masterSocket);
    }
  });

  socket.on('prev', function (stepId) {
    if (socket === masterSocket) {
      console.log('prev call from master');
      broadcast('prev', stepId, masterSocket);
    }
  });

  socket.on('disconnect', function() {
    console.log('Socket disconnected');
    removeSocket(socket);
    broadcast('connections', sockets.length + 1); // need to include master socket
  });
  broadcast('connections', sockets.length + 1);
});

console.log('Connect to http://' + findLocalAddress() + ':3000');
