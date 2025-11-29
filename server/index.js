const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, '../public')));

const gameState = {
    players: {},
    coins: []
};

// Helper to generate random integer
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Helper to generate random color
function randomColor() {
    return '#' + Math.floor(Math.random()*16777215).toString(16);
}

wss.on('connection', (ws) => {
    const playerId = 'player_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    console.log(`Client connected: ${playerId}`);

    // Initialize player
    gameState.players[playerId] = {
        id: playerId,
        x: randomInt(50, 750),
        y: randomInt(50, 550),
        color: randomColor(),
        score: 0
    };

    // Send init packet to the new client
    ws.send(JSON.stringify({
        type: 'init',
        id: playerId,
        state: gameState
    }));

    // Broadcast new player to everyone else
    broadcast({
        type: 'newPlayer',
        player: gameState.players[playerId]
    }, ws);

    ws.on('close', () => {
        console.log(`Client disconnected: ${playerId}`);
        delete gameState.players[playerId];
        broadcast({
            type: 'removePlayer',
            id: playerId
        });
    });
});

function broadcast(data, excludeWs) {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN && client !== excludeWs) {
            client.send(JSON.stringify(data));
        }
    });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
