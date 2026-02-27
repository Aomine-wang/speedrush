const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');
const http = require('http');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const tradeRoutes = require('./routes/trade');
const leaderboardRoutes = require('./routes/leaderboard');
const vaultRoutes = require('./routes/vault');
const historyRoutes = require('./routes/history');
const priceService = require('./services/priceService');
const settlementService = require('./services/settlementService');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/trade', tradeRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/vault', vaultRoutes);
app.use('/api/trade', historyRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '2.1', timestamp: new Date().toISOString() });
});

// Test login endpoint (temporary)
app.post('/test-login', (req, res) => {
  res.json({ message: 'Login test working' });
});

// WebSocket for real-time price
wss.on('connection', (ws) => {
  console.log('Client connected');

  // default subscribe to price so frontends get data without extra handshake
  ws.subscription = 'price';

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      if (data.type === 'subscribe_price') {
        ws.subscription = 'price';
      }
    } catch (e) {
      // ignore
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

// Broadcast price updates
priceService.onPriceUpdate((tick) => {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && client.subscription === 'price') {
      client.send(JSON.stringify({ type: 'price', price: tick.price, tick }));
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  priceService.start();
  settlementService.start();
});
// Trigger deploy Fri Feb 27 04:17:42 PM CST 2026
