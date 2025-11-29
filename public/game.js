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
    }
};

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
    
    // Render Players
    for (const id in gameState.players) {
        const p = gameState.players[id];
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 20, 20);
        
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
