const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const statusDiv = document.getElementById('status');

const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
const ws = new WebSocket(`${protocol}://${window.location.host}`);

let myId = null;
let gameState = { players: {}, coins: [] };

ws.onopen = () => {
    statusDiv.innerText = 'Connected. Waiting for data...';
    console.log('Connected to server');
};

ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    
    if (msg.type === 'init') {
        myId = msg.id;
        gameState = msg.state;
        statusDiv.innerText = `Connected as ${myId}`;
        console.log('Game initialized:', gameState);
    } else if (msg.type === 'newPlayer') {
        gameState.players[msg.player.id] = msg.player;
        console.log('New player joined:', msg.player.id);
    } else if (msg.type === 'removePlayer') {
        delete gameState.players[msg.id];
        console.log('Player left:', msg.id);
    } else if (msg.type === 'update') {
        // Naive update for now (Part A), will add interpolation later
        gameState.coins = msg.coins; // Sync coins
        for (const id in msg.players) {
            if (gameState.players[id]) {
                // Update props but keep local reference if needed, 
                // though replacing the object is fine for now
                gameState.players[id].x = msg.players[id].x;
                gameState.players[id].y = msg.players[id].y;
                gameState.players[id].score = msg.players[id].score;
                gameState.players[id].color = msg.players[id].color; // Sync color just in case
            } else {
                // In case we missed a join event
                gameState.players[id] = msg.players[id];
            }
        }
    }
};

// Input Handling
const keys = { w: false, a: false, s: false, d: false, ArrowUp: false, ArrowLeft: false, ArrowDown: false, ArrowRight: false };
let lastInput = { x: 0, y: 0 };

window.addEventListener('keydown', (e) => {
    if (keys.hasOwnProperty(e.key)) {
        keys[e.key] = true;
        sendInput();
    }
});

window.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.key)) {
        keys[e.key] = false;
        sendInput();
    }
});

function sendInput() {
    const x = (keys.d || keys.ArrowRight ? 1 : 0) - (keys.a || keys.ArrowLeft ? 1 : 0);
    const y = (keys.s || keys.ArrowDown ? 1 : 0) - (keys.w || keys.ArrowUp ? 1 : 0);

    if (x !== lastInput.x || y !== lastInput.y) {
        lastInput = { x, y };
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'move', input: { x, y } }));
        }
    }
}

ws.onclose = () => {
    statusDiv.innerText = 'Disconnected.';
    console.log('Disconnected from server');
};

ws.onerror = (err) => {
    statusDiv.innerText = 'Error connecting.';
    console.error('WebSocket error:', err);
};

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Render Coins
    ctx.fillStyle = 'gold';
    for (const coin of gameState.coins) {
        ctx.beginPath();
        ctx.arc(coin.x, coin.y, 5, 0, Math.PI * 2);
        ctx.fill();
    }

    // Render Players
    for (const id in gameState.players) {
        const p = gameState.players[id];
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 20, 20);
        
        // Draw Score
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.fillText(`Score: ${p.score}`, p.x, p.y - 5);

        // Highlight self
        if (id === myId) {
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.strokeRect(p.x, p.y, 20, 20);
        }
    }
    
    requestAnimationFrame(render);
}

render();
