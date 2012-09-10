var os = require('os');
var express = require('express');
var ejs = require('ejs');
var fs = require('fs');
var child_process = require('child_process');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);

var findLocalAddress = function() {
  var interfaces = os.networkInterfaces();
  var en1 = interfaces.en1 || interfaces.en0;
  for (var i = 0, l = en1.length; i < l; i++) {
    if (en1[i].family === 'IPv4') {
      return en1[i].address;
    }
  }
}


// Check for keynote files
if (!fs.existsSync(__dirname + "/public/index.html")) { 
  console.log("Presentation not found in public directory, using test");
  child_process.exec("cp -R test_pres/* public/.");
}


// Write presentation javascript files
var ejsFile = fs.readFileSync(__dirname + '/presentation.ejs').toString();
var writeJs = function(dest, options) {
  options.address = findLocalAddress();

  var rendered = ejs.render(ejsFile, options);
  var jsDir = __dirname + '/public/js/';
  fs.mkdir(jsDir);
  fs.writeFile(jsDir + dest, rendered, function(err) { if(err) { throw err; } });
};
writeJs('fallback_presentation.js', { 
  nextFunction: 'setPlayheadByEventTimeline(parseInt(pos)+1, true); loadEventTimeline(parseInt(pos), true)',
  prevFunction: 'setPlayheadByEventTimeline(parseInt(pos)+1, true); loadEventTimeline(parseInt(pos), true)',
  nextCall: 'currentEventTimeline+1',
  prevCall: 'currentEventTimeline-1'
});
writeJs('presentation.js', { 
  nextFunction: 'gShowController.jumpToScene(parseInt(pos))',
  prevFunction: 'gShowController.jumpToScene(parseInt(pos))',
  nextCall: 'gShowController.nextSceneIndex',
  prevCall: 'gShowController.currentSceneIndex'
});


// Patch keynote files
function puts(error, stdout, stderr) { 
  var sys = require('sys')
  if (stdout.indexOf('Skipping patch') == -1) sys.puts(stdout);
}
child_process.exec("patch -Np0 < keynote.patch", puts);


// Server
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

io.sockets.on('connection', function (socket) {
  addSocket(socket);
  socket.on('next', function (pos) {
    if (socket === masterSocket) {
      console.log('next call from master at', pos.slice(1, pos.length-1));
      broadcast('next', pos.slice(1,pos.length-1), masterSocket);
    }
  });

  socket.on('prev', function (pos) {
    if (socket === masterSocket) {
      console.log('prev call from master at', pos.slice(1, pos.length-1));
      broadcast('prev', pos.slice(1,pos.length-1), masterSocket);
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
