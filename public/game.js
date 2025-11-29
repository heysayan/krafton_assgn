const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const statusDiv = document.getElementById('status');

const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
const ws = new WebSocket(`${protocol}://${window.location.host}`);

ws.onopen = () => {
    statusDiv.innerText = 'Connected. Waiting for players...';
    console.log('Connected to server');
};

ws.onclose = () => {
    statusDiv.innerText = 'Disconnected.';
    console.log('Disconnected from server');
};

ws.onerror = (err) => {
    statusDiv.innerText = 'Error connecting.';
    console.error('WebSocket error:', err);
};
