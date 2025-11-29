# Coin Collector Multiplayer

A real-time multiplayer Coin Collector game developed for the Krafton Associate Game Developer Assignment.

## Features
- **Authoritative Server:** All logic (movement, collision, scoring) runs on the server.
- **Raw WebSockets:** Uses `ws` library, no high-level networking engines.
- **Latency Simulation:** Artificial 200ms latency added to all network traffic.
- **Client Interpolation:** Smooth rendering despite network lag.

## How to Run
1. `npm install`
2. `npm start`
3. Open `http://localhost:3000` in two different browser tabs.