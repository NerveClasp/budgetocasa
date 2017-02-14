const express = require('express');
const app = express();
const http = require('http').Server(app);
// const io = require('socket.io')(http);

app.use(express.static(__dirname + '/app'));
app.use(express.static(__dirname + '/app/bower_components'));

// app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({
//     extended: true
// }));

app.get('/', function(req, res) {
  res.render('index.html');
});

http.listen(8080, function() {
    console.log('listening on *:8080');
});
