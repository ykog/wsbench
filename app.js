

var express = require('express');
var http = require('http') ;
var url = require('url') ;
var io = require('socket.io') ;
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mysql = require('mysql') ;
var pool = mysql.createPool({
    host: 'localhost' ,
    user: 'wsbench' ,
    password: 'wsbench',
    database: 'wsbench' ,
    debug: true
}) ;
var routes = require('./routes/index');
var users = require('./routes/user');

var app = express();

var env = process.env.NODE_ENV || 'development';
app.locals.ENV = env;
app.locals.ENV_DEVELOPMENT = env == 'development';

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// app.use(favicon(__dirname + '/public/img/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.use('/users', users);

/// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

/// error handlers

// development error handler
// will print stacktrace

if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err,
            title: 'error'
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {},
        title: 'error'
    });
});

// WebSocket
app.initWs = function(server) {
    var socket = io.listen(server) ;

    // グローバルな認証の例
    // ただしこのコードは古いやりかたで socket.io 1.0 以降は
    // expressと同様にミドルウェアを挿入する方式で認証する
    /*
    socket
    .set('authorization',function(data,accept) {
	console.log('authorization') ;
	console.log(data.url) ;
	var parsed = url.parse(data.url,true) ;
	var key = parsed.query.key ;
	console.log(key) ;
	if (key.indexOf('Chrome') >= 0) {
	    accept(null,true) ;
	} else {
	    accept(null,false) ;
	}
    }) ;
    */

    var nsp = socket.of('/ws') ;

    // 認証のミドルウェア
    nsp.use(function(socket,next) {
	console.log('authorization:',socket.request.url) ;
	var parsed = url.parse(socket.request.url,true) ;
	var key = parsed.query.key ;
	console.log(key) ;
	if (key.indexOf('Chrome') >= 0) {
	    next() ;
	} else {
	    next(new Error('Unacceptable brower')) ;
	}
    }) ;

    nsp.on('connection', function(client) {
        console.log('connection') ;
	console.log(client.handshake.query) ;
      // connect
      client.on('message', function(message) {
	  var b = message.split("\t") ;
	  console.log(b) ;
	  console.log('user:' + b[0]) ;
          console.log('message:' + b[1]) ;
	  pool.query('INSERT INTO message SET ?',{'usr': b[0], 'msg': b[1]},
		     function(err,result){
			 if (err) throw err ;
			 console.log('inserted:' + result.insertId) ;
			 nsp.emit('message',b[0] + ':' +  b[1]) ;
		     }) ;
        // message
      });
      client.on('search', function(who) {
	  pool.query('SELECT * FROM message WHERE usr = ?',[who],
		     function(err,result) {
			 if (err) throw err ;
			 console.log('selected:',result) ;
			 if (Array.isArray(result)) {
			     result.forEach(function(row,index,arr){
				               console.log('id= ' + row.id + ' usr= ' + row.usr + ' msg= ' + row.msg) ;
			                    }) ;
			 }
		     }) ;
      }) ;
      client.on('disconnect', function() {
          console.log('disconnect') ;
        // disconnect
      });
    });
} ;

module.exports = app;
