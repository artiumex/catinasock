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

const mcservers = require('./servers.json');
const servers = new Map();

app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

server.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
})

for (const data of mcservers) {
    const mcserver = client.server(data.id);
    const s = data.alias;
    const nsp = io.of(`/${s}`)


    servers.set(data.alias, {
        s: mcserver,
        nsp: nsp,
    });

    mcserver.subscribe();
    mcserver.on("status", function(server) {
        getServer(data.alias);
    });

    app.get(`/${data.name}`, function(req, res){
        res.render('server', {
            servers: mcservers,
            dat: data,
        });
    });

    nsp.on('connection', (socket) => {
        getServer(s);
        console.log(`[${s}] user connect`);
        socket.on('disconnect', () => {
          console.log(`[${s}] user disconnect`);
        });
        socket.on('start server', function() {
            console.log(`[${s}] starting server...`);
            startServer(s);
        });
        socket.on('stop server', function() {
            console.log(`[${s}] stopping server...`);
            stopServer(s);
        });
    });
}



app.get('/', function(req, res){
    res.render('', {
        servers: mcservers,
    });
});




function ServerStatus(status) {
    const messages = ['Offline', 'Online', 'Starting...', 'Stopping...','Restarting...','Saving...','Loading...','Crashed!','Pending','','Preparing'];
    return messages[status]
}

function chooseServer(text) {
    try {
        const chosenserver = servers.get(text);
        return chosenserver;
    } catch (e) {
        console.log(e);
    }
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


async function startServer(s) {
    const chosenserver = chooseServer(s);
    const mcserver = chosenserver.s;
    try {
        await mcserver.start();
    } catch (e) {
        console.error(e.message);
    }
}

async function stopServer(s) {
    const chosenserver = chooseServer(s);
    const mcserver = chosenserver.s;
    try {
        await mcserver.stop();
    } catch (e) {
        console.error(e.message);
    }
}

async function getServer(s) {
    const chosenserver = chooseServer(s);
    const mcserver = chosenserver.s;
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

    chosenserver.nsp.emit('new data', data);
}

