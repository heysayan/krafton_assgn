# Coin Collector Multiplayer

A real-time multiplayer Coin Collector game developed for the Krafton Associate Game Developer Assignment.

## Features
- **Authoritative Server:** All logic (movement, collision, scoring) runs on the server.
- **Raw WebSockets:** Uses `ws` library, no high-level networking engines.
- **Latency Simulation:** Artificial 200ms latency added to all network traffic (both ways) to simulate bad network conditions.
- **Client Interpolation:** Implements entity interpolation (100ms buffer) to ensure smooth movement of remote players despite the 30Hz server tick rate and network latency.

## How to Run
1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Start the Server:**
   ```bash
   npm start
   ```

3. **Play:**
   - Open `http://localhost:3000` in multiple browser tabs.
   - Use **WASD** or **Arrow Keys** to move.
   - Collect yellow coins to score points.
   - Notice the smooth movement despite the simulated lag!

## Architecture
- **Server (`server/index.js`):**
  - Runs at 60Hz for physics (movement, collision).
  - Broadcasts state updates at 30Hz.
  - Enforces 200ms delay on all incoming and outgoing messages.
  - Validates all inputs (authoritative).

- **Client (`public/game.js`):**
  - Renders at 60Hz+ (monitor refresh rate).
  - buffers server updates.
  - Interpolates positions between the last two valid server snapshots to prevent stuttering.