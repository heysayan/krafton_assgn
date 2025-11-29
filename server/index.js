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

// LATENCY SIMULATION
const LATENCY = 200;

function sendDelayed(ws, data) {
    setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(data));
        }
    }, LATENCY);
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
        score: 0,
        input: { x: 0, y: 0 }
    };

    // Send init packet to the new client (Delayed)
    sendDelayed(ws, {
        type: 'init',
        id: playerId,
        state: gameState
    });

    // Broadcast new player to everyone else (Delayed inside broadcast)
    broadcast({
        type: 'newPlayer',
        player: gameState.players[playerId]
    }, ws);

    ws.on('message', (message) => {
        // Simulate Network Latency on Receive
        setTimeout(() => {
            try {
                const data = JSON.parse(message);
                if (data.type === 'move') {
                    if (gameState.players[playerId]) {
                        gameState.players[playerId].input = data.input; // {x: -1|0|1, y: -1|0|1}
                    }
                }
            } catch (e) {
                console.error('Invalid message:', message);
            }
        }, LATENCY);
    });

    ws.on('close', () => {
        console.log(`Client disconnected: ${playerId}`);
        delete gameState.players[playerId];
        broadcast({
            type: 'removePlayer',
            id: playerId
        });
    });
});

const SPEED = 5;
const MAP_WIDTH = 800;
const MAP_HEIGHT = 600;
const PLAYER_SIZE = 20;
const COIN_RADIUS = 5;
const MAX_COINS = 10;

// Coin Spawner
setInterval(() => {
    if (gameState.coins.length < MAX_COINS) {
        const id = 'coin_' + Date.now() + '_' + Math.random();
        gameState.coins.push({
            id: id,
            x: randomInt(20, MAP_WIDTH - 20),
            y: randomInt(20, MAP_HEIGHT - 20)
        });
    }
}, 3000);

// Game Loop (60Hz) - Physics/Logic
setInterval(() => {
    for (const id in gameState.players) {
        const p = gameState.players[id];
        if (p.input) {
            p.x += p.input.x * SPEED;
            p.y += p.input.y * SPEED;

            // Boundary checks
            if (p.x < 0) p.x = 0;
            if (p.x > MAP_WIDTH - PLAYER_SIZE) p.x = MAP_WIDTH - PLAYER_SIZE;
            if (p.y < 0) p.y = 0;
            if (p.y > MAP_HEIGHT - PLAYER_SIZE) p.y = MAP_HEIGHT - PLAYER_SIZE;

            // Coin Collision
            // Player center
            const px = p.x + PLAYER_SIZE / 2;
            const py = p.y + PLAYER_SIZE / 2;

            for (let i = gameState.coins.length - 1; i >= 0; i--) {
                const c = gameState.coins[i];
                const dx = px - c.x;
                const dy = py - c.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                // Collision threshold: Player Half Size + Coin Radius
                if (distance < (PLAYER_SIZE / 2 + COIN_RADIUS)) {
                    // Collected
                    p.score += 1;
                    gameState.coins.splice(i, 1);
                }
            }
        }
    }
}, 1000 / 60);

// Broadcast Loop (30Hz) - Network
setInterval(() => {
    broadcast({
        type: 'update',
        players: gameState.players,
        coins: gameState.coins
    });
}, 1000 / 30);

function broadcast(data, excludeWs) {
    wss.clients.forEach((client) => {
        if (client !== excludeWs) {
            sendDelayed(client, data);
        }
    });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});