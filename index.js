const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const http = require('http').Server(app);
const io = require('socket.io')(http);

const moment = require('moment');
const colorOne = "#e9ac8c";
const colorTwo = "#25353d";
const colorExt = "#607D8B";

app.use(express.static(__dirname + '/app'));
// app.use(express.static(__dirname + '/app/bower_components'));

io.on('connection', function(socket) {
    socket.emit('news', { hello: 'world' });
    socket.on('chat message', function(msg) {
        io.emit('chat message', msg);
    });
});

app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({
//     extended: true
// }));

app.get('/', function(req, res) {
  res.render('index.html');
});

function postAjaxData(link, data){
  app.post(link, function(req, res) {
    res.json(data);
  })
}

app.post('/api/engines', function(req, res) { // Update engines status in the SQL and send new state to frontend
  let body = req.body;
  connection.query("UPDATE engines SET working="+body.working+", enabled="+body.enabled+" WHERE name='"+body.name+"';", function(error, results, fields) {
    if(error) console.log(error);
    connection.query('SELECT * FROM engines', function(err, results, field) {
      if (err) console.log(err);
      res.json(results);
    })
  });
})


app.get('/api/engines', function(req, res) {
  connection.query('SELECT * FROM engines', function(err, results, field) {
    if (err) console.log(err);
    res.json(results);
  })
})


function sensorsSQLupdate(){
  app.post('/api/sensors', function(req, res) {
    connection.query("SELECT * FROM (SELECT * FROM sensors ORDER BY id DESC LIMIT 20) AS `table` ORDER BY id ASC", function(err, results, field) {
      if (err) console.log(err);
      let data = sensorsSQLtoChartObject(results);
      res.json(data);
    })
  })
}

app.get('/api/sensors', function(req, res) {
  connection.query("SELECT * FROM (SELECT * FROM sensors ORDER BY id DESC LIMIT 20) AS `table` ORDER BY id ASC", function(err, results, field) {
    if (err) console.log(err);
    let data = sensorsSQLtoChartObject(results);
    res.json(data);
  })
})

app.get('/api/errors', function(req, res) {
  connection.query("SELECT * FROM accident ORDER BY id DESC LIMIT 5", function(err, results, field) {
    if (err) console.log(err);
    let data = errorsSQLtoObject(results);
    res.json(data);
  })
})

app.post('/api/errors', function(req, res) {
  connection.query("SELECT * FROM accident ORDER BY id DESC LIMIT "+req.body.number, function(err, results, field) {
    if (err) console.log(err);
    let data = errorsSQLtoObject(results);
    res.json(data);
  })
})

app.get('/api/energy', function(req, res) {
  connection.query("SELECT * FROM energy ORDER BY id DESC LIMIT 1800", function(err, results, field) {
    if (err) console.log(err);
    let data = energySQLtoObject(results);
    res.json(data);
  })
})

app.get('/api/launches', function(req, res) {
  connection.query("SELECT * FROM launches ORDER BY id DESC LIMIT 6", function(err, results, field) {
    if (err) console.log(err);
    let data = launchesSQLtoObject(results);
    res.json(data);
  })
})

app.get('/api/settings', function(req, res) {
  connection.query("SELECT * FROM settings", function(err, results, field) {
    if (err) console.log(err);
    let data = settingsSQLtoObject(results[0]);
    res.json(data);
  })
})

function settingsSQLtoObject(results) {
  return {
    freq_a: results.freq_a,
    freq_b: results.freq_b,
    winter: results.winter,
    summer: results.summer
  };
}

app.post('/api/settings', function(req, res) { // Update settings in the SQL and send new state to frontend
  let b = req.body;
  if(b.type == "rpm"){
    connection.query("UPDATE settings SET freq_a="+b.freq_a+", freq_b="+b.freq_b+" WHERE id='1';",
    function(error, results, fields) {
      if(error) console.log(error);
      connection.query('SELECT * FROM settings', function(err, results, field) {
        if (err) console.log(err);
        let data = settingsSQLtoObject(results[0]);
        res.json(data);
      })
    });
  }else{
    connection.query("UPDATE settings SET winter="+b.winter+", summer="+b.summer+" WHERE id='1';",
    function(error, results, fields) {
      if(error) console.log(error);
      connection.query('SELECT * FROM settings', function(err, results, field) {
        if (err) console.log(err);
        let data = settingsSQLtoObject(results[0]);
        res.json(data);
      })
    });
  }
})


function energySQLtoObject(results){
  let data = [{ color: colorOne, key: "A", values: [] },
              { color: colorTwo, key: "Б", values: [] }];
  results.forEach(function(item, i, results) {
    data[0].values[i] = { x: i, y: item.a };
    data[1].values[i] = { x: i, y: item.b };
  });
  return data;
}

function launchesSQLtoObject(results){
  let array = [];
  results.forEach(function(item, i, results) {
    array[i] = {
      date: moment(item.timestamp).format("DD.MM.YYYY"),
      time: moment(item.timestamp).format("HH:mm:ss"),
      a: item.a,
      b: item.b
    };
  });
  return array;
}

function errorsSQLtoObject(results) {
  // let datetime = timestampToDateAndTime(results.timestamp);
  // date: datetime.date,
  // time: datetime.time,
  let array = [];
  results.forEach(function(item, i, results) {
    array[i] = {
      date: moment(item.timestamp).format("DD.MM.YYYY"),
      time: moment(item.timestamp).format("HH:mm:ss"),
      code: item.code,
      area: item.area,
      engine: item.engine,
      message: errorDict[item.code]
    };
  });
  return array;
}


// let errorExplained = [ "все ок", "аварія двигуна", "обрив фази", "обезточення", "невідповідність заданим оборотам", "необхідна перевірка", "ручне керування призведе до аварійної ситуації", "дія призведе до створення різниці тисків між блоками, можливе пошкодження конструкцій", "дія призведе до руйнування конструкцій", "дія призведе до переохолодження", "дія призведе до перегріву", "помилка дверей", "закриті двері, мають бути відкритими", "відкриті двері, мають бути закритим" ];
// let errorCodes = [ 0, 1, 11, 12, 13, 14, 2, 21, 22, 23, 24, 3, 31, 32 ];




// function mysqlquery(url){
//   connection.connect(function(err) {
//     if (err) {
//       console.error('error connecting: ' + err.stack);
//       return;
//     }
//     console.log('connected as id ' + connection.threadId);
//   });
//   connection.query('SELECT * FROM engines', function(err, results, field) {
//     if (err) {
//       console.log(err);
//     }
//     // console.log(results);
//     // console.log(JSON.stringify(results[0].id));
//     return results[0];
//   })
// }

// app.listen(8080, '127.0.0.1');

http.listen(8080, function() {
    console.log('listening on *:8080');
});

/*
let db = admin.database();
let refEngines = db.ref("engines");
let refSettings = db.ref("settings");
let refErrors = db.ref("errors");
let refSQL = db.ref("sql");

const firebase = require('firebase/app');
const admin = require('firebase-admin');
require('firebase/auth');
require('firebase/database-node');

// DB actions
refEngines.on("child_changed", function(snapshot) {
  var changedPost = snapshot.val();
  console.log(JSON.stringify(changedPost));

});
refSettings.on("child_changed", function(snapshot) {
  var changedPost = snapshot.val();
  console.log(JSON.stringify(changedPost));

});
refErrors.on("child_changed", function(snapshot) {
  var changedPost = snapshot.val();
  console.log(JSON.stringify(changedPost));

});
refSQL.on("child_changed", function(snapshot) {
  var changedPost = snapshot.val();
  console.log(JSON.stringify(changedPost));

});

const configFirebase= {
  "apiKey": "AIzaSyDMm0_VX3CTl96J69WpHsf1yMJuKU-y598",
  "authDomain": "fuzzy-cow.firebaseapp.com",
  "databaseURL": "https://fuzzy-cow.firebaseio.com",
  "storageBucket": "fuzzy-cow.appspot.com",
  "messagingSenderId": "552135088392"
};
const adminCert = {
  "type": "service_account",
  "project_id": "fuzzy-cow",
  "private_key_id": "2e64ef73ea10da925b73aae7f55ee3445a32813b",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDDsEmHx5NjIxIk\n4t22zHFrUwiL2xhHW8+rvWZh290e42W4ttqYaEqq4vVEk2hohFUhIaI4XSLxNZX3\nfOPfEqCa8xmgpONVmc1ItZ+Bk0Gi6QqL2ydQKJBDc8cwyolRqenokHKOKA6m/TRW\npYuqj6mj7DSXUCOvvCuzoNcRAFJ2Ws7BRXyZfDJEbwoCMnCXqo6zTt0rnBvhKbNm\nLy9HlMo2/nZPnzqCccRLhrW5FzSiGjdQgAmgw3omoj+g2DoB6E0eIsvV6W6XoeyT\ntIfYB11KqJeZrL5l/1xPgi5hmAyEqEEq48fdTC2E934vSY3v67ReK43lA6bpY9Q/\nauO81pyFAgMBAAECggEAXxoLgith26otpTOEINSWwlvmKWHfGL7r3ED9ws1BV0OY\nKf7jmXIF56rJG/yvnyvA24sm9VF+K8+pBE/zxnOdDfDbIZFA0lcexxlNXYGdQnkT\nIQjuwCwWgFGCGpozxjZXcSjSI3ggNtOTXhCyIcAT55Bhtq/ByCQg8PlXy/FmIhIB\n51qrg9Mwuk4P0MUHyBOQQjAuk6mtC2Ta1XDpoUk5FNXbqoRXLKqeq1PgarRtC6wR\nksoMP9GzDPiMgdlkhsHBkCBC1H1CkVORyEbQ9Scrr0TldKe8GolNAsw3IiIi20I1\nV3UcobPrlkNbM2BsikMxl6ldYtDzYGNkAcHwQ2Oc+QKBgQDqJeGJHVwxhOs5OcOm\n34vA2vXfcW8XlxIUekofW31iMG3CUc2K2R1Q385dyHNLLG/+LsMne+dt6xexJaeg\nDAzp6xBdXQSxwYBXgqo2PVBm2YVRnuTf3UEELVflBpaPFKEYudD5gC0hlPRzj2/K\nQR1nDexQ0MHJrXFN4pPkdp06vwKBgQDV848je10iD29qO0jMJ132Ica7Pad1AE6l\nF462flJyuzqE4z8Y9oZ/r8t5qVK/3zTtaPRmOFwAJ5QwnTCliI7yVdxINPVVwa6m\nkuiEuWbJw9c/R6CfjHpRJ+0nDEIvceJXMQaOVD5FSv2k/Xn89CxT8hog1VHPNKi4\nQFazGT8NuwKBgQC8IX2qPqXhv8uDqk7ymHDgns2pH6pECQTk4TEHKup+Zyz5UeLV\nagctAPX90l4Yi3bcg1QYOGzFm3vowLmDVctWc6EtctyfujrVlU4P0In2aVW+M+3v\nlQV1Rr11biqwgcHCbSJkJcGdVuJmq1wF5PWr5Lr4YBMkaTA9hQyRJ2DDXwKBgF4x\ndaJEbLNTIlUdtqYS6t4y7qB+u1vaf8VVQsJ7iOb0IQZiWeQunPZYOffdIQ5SQaYI\nIBlk1LRIuIhSnBk0ruJoBKxRjHVt6OtzICVWzrcjnn9AlKnJmgxizJj1X6ottF14\nuw8sbaHqKxNZeTxxb5ahrvknkXXtFB7STJlbExSDAoGAP0DndSAEU6LOynfKRu14\nW5DdV3NMwnSixw2fsAuH0Uj7wulzkxTbc5bsUeEv6b0UoPDQwfJz+aO04e9jRLBF\nHBhirei69uUMCJXSfAz5MqBk9MSyxaKFcypXG67U+0D8ybQEUNCowBeXHNQN9Tx+\nQjPrYt5SEEAeZ0krOdOzFtg=\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-nmckd@fuzzy-cow.iam.gserviceaccount.com",
  "client_id": "102212298378869019283",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://accounts.google.com/o/oauth2/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-nmckd%40fuzzy-cow.iam.gserviceaccount.com"
};
firebase.initializeApp(configFirebase);
admin.initializeApp({
  credential: admin.credential.cert(adminCert),
  databaseURL: "https://fuzzy-cow.firebaseio.com"
})
*/
