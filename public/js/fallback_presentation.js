console.log(io);
if (window.io) {
  var socket = io.connect('http://192.168.13.170:3000');

  socket.on('next', function (stepId) {
    handleHudNext();
  });

  socket.on('prev', function (stepId) {
    handleHudPrevious();
  });

  document.onkeydown = function(e) {
    var key;
    if (window.event) {
      key = window.event.keyCode;
    } else {
      key = e.keyCode;
    }
    if (key == 39) {
      socket.emit('next');
    } else if (key == 37) {
      socket.emit('prev');
    }
  };
}
