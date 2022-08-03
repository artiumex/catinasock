const {Client} = require('exaroton');
const express = require('express');
var path = require('path');
const http = require('http');
const { Server } = require("socket.io");
const axios = require('axios');

const port = process.env.PORT;
const app = express();
var server = http.createServer(app);
const io = new Server(server);
const client = new Client(process.env.TOKEN);
const mcserver = client.server(process.env.SERVERID);


mcserver.subscribe();

mcserver.on("status", function(server) {
    getServer();
});

app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

server.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
})

app.get('/', function(req, res){
    res.render('');
});

io.on('connection', (socket) => {
    getServer(); //update all connections
    console.log('a user connected');
    socket.on('disconnect', () => {
      console.log('user disconnected');
    });
    socket.on('start server', function() {
        console.log('starting server...');
        startServer();
    });
    socket.on('stop server', function() {
        console.log('stopping server...');
        stopServer();
    });
});


function ServerStatus(status) {
    const messages = ['Offline', 'Online', 'Starting...', 'Stopping...','Restarting...','Saving...','Loading...','Crashed!','Pending','','Preparing'];
    return messages[status]
}

async function playerheads(list) {
    const output = [];
    for (const p of list) {
        const test = `https://playerdb.co/api/player/minecraft/${p}`;
        const data = await axios.get(test);
        output.push(data.data.data.player.avatar);
    }
    return output
}


async function startServer() {
    try {
        await mcserver.start();
    } catch (e) {
        console.error(e.message);
    }
}

async function stopServer() {
    try {
        await mcserver.stop();
    } catch (e) {
        console.error(e.message);
    }
}

async function getServer() {
    console.log('running getServer...')
    const data = {};
    await mcserver.get();

    data.status = ServerStatus(mcserver.status);
    data.status_raw =  mcserver.status;
    data.motd = mcserver.motd;
    if (data.status_raw == 1) {
        data.player_count = mcserver.players.count;
        data.player_max = mcserver.players.max;
        data.players = mcserver.players.list
        data.heads = await playerheads(mcserver.players.list);
    }

    console.log(data);

    io.emit('new data', data);
}
