const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const statusDiv = document.getElementById('status');

const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
const ws = new WebSocket(`${protocol}://${window.location.host}`);

let myId = null;
let gameState = { players: {}, coins: [] };
let serverUpdates = [];
const INTERPOLATION_DELAY = 150; // ms to buffer updates

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
        // We can just rely on the update loop to populate this, 
        // or add it immediately to prevent errors before first update
        gameState.players[msg.player.id] = msg.player;
        console.log('New player joined:', msg.player.id);
    } else if (msg.type === 'removePlayer') {
        delete gameState.players[msg.id];
        console.log('Player left:', msg.id);
    } else if (msg.type === 'update') {
        // Store update for interpolation
        gameState.coins = msg.coins; // Sync coins directly (no interpolation needed for static spawn/despawn usually, or can be added if they moved)
        
        serverUpdates.push({
            timestamp: Date.now(),
            players: msg.players
        });

        // Keep buffer small (e.g., last 2 seconds)
        if (serverUpdates.length > 60) {
            serverUpdates.shift();
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

function getInterpolatedState() {
    const renderTime = Date.now() - INTERPOLATION_DELAY;

    // Find two updates surrounding renderTime
    let prev = null;
    let next = null;

    for (let i = serverUpdates.length - 1; i >= 0; i--) {
        if (serverUpdates[i].timestamp <= renderTime) {
            prev = serverUpdates[i];
            if (i + 1 < serverUpdates.length) {
                next = serverUpdates[i + 1];
            }
            break;
        }
    }

    if (!prev || !next) {
        // Not enough data to interpolate, return latest or null
        // If we have at least one update, use the latest (extrapolation/snap)
        return serverUpdates.length > 0 ? serverUpdates[serverUpdates.length - 1].players : gameState.players;
    }

    const timeWindow = next.timestamp - prev.timestamp;
    const ratio = (renderTime - prev.timestamp) / timeWindow;
    
    const interpolatedPlayers = {};
    
    // Interpolate each player present in both updates
    for (const id in next.players) {
        if (prev.players[id]) {
            const p1 = prev.players[id];
            const p2 = next.players[id];
            
            interpolatedPlayers[id] = {
                ...p2, // Copy other props like color, score
                x: p1.x + (p2.x - p1.x) * ratio,
                y: p1.y + (p2.y - p1.y) * ratio
            };
        } else {
            // New player in 'next', just snap to it
            interpolatedPlayers[id] = next.players[id];
        }
    }
    
    return interpolatedPlayers;
}

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Render Coins
    ctx.fillStyle = 'gold';
    for (const coin of gameState.coins) {
        ctx.beginPath();
        ctx.arc(coin.x, coin.y, 5, 0, Math.PI * 2);
        ctx.fill();
    }

    // Render Interpolated Players
    const playersToRender = getInterpolatedState();

    for (const id in playersToRender) {
        const p = playersToRender[id];
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
