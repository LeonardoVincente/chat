var express = require('express'),
	app = express(),
	server = require('http').createServer(app),
	io = require('socket.io').listen(server),
	mongoose = require('mongoose'),
	users = { };

server.listen(3000);
mongoose.connect('mongodb://localhost/chat', function(err){
	if(err){
		console.log("error");
	}else{
		console.log('cone4cted');
	}
});

var chatSchema = mongoose.Schema({
	nick: String,
	msg: String,
	created: {type: Date, default: Date.now}
});
var Chat =  mongoose.model('Message', chatSchema);

app.get('/',function(req,res){
	res.sendFile(__dirname + '/index.html' );
});

io.sockets.on('connection', function(socket){
	var query = Chat.find({});
	query.sort('-created').limit(8).exec(function(err, docs){
		if(err) throw err;
		console.log("sending old messages");
		socket.emit('load old msgs', docs);
	});
	socket.on('new user', function(data, callback){
		if(data in users){
			callback(false);
		}else{
			callback(true);
			socket.nickname = data;
			users[socket.nickname] = socket;
			//nicknames.push(socket.nickname);
			updateNicknames();
		}
	});
	function updateNicknames(){
		io.sockets.emit('usernames', Object.keys(users));
	}

	socket.on('send message', function(data, callback){
		var msg  = data.trim();
		if(msg.substr(0,3) == "/w "){
			msg = msg.substr(3);
			var ind = msg.indexOf(' ');
			if(ind != -1){
				var name = msg.substr(0,ind);
				var msg = msg.substr(ind+1);
				if(name in users){
					users[name].emit('wisper', { msg: msg, nick : socket.nickname})
				}else{
					callback("Enter a valid user");
				}
			}else{
				callback("Please enter a message");
			}
		}else{
			var newMsg = new Chat({ msg: msg, nick : socket.nickname});
			newMsg.save(function(err){
				if(err) throw err;
				io.sockets.emit('new message',{ msg: msg,nick : socket.nickname});
			})
			
		}
	});
	socket.on("disconnect", function(data){
		if(!socket.nickname){
			return;
		}
		delete users[socket.nickname];
		//nicknames.splice(nicknames.indexOf(socket.nickname),1);
		updateNicknames();
	});
});