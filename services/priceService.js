const axios = require('axios');
const WebSocket = require('ws');

let currentPrice = 67234.56;
let priceCallback = null;

// Simulate Binance price feed
function simulatePrice() {
  const change = (Math.random() - 0.5) * 100;
  currentPrice += change;
  
  if (priceCallback) {
    priceCallback({
      symbol: 'BTCUSDT',
      price: currentPrice.toFixed(2),
      change: change.toFixed(2),
      changePercent: ((change / currentPrice) * 100).toFixed(2),
      timestamp: Date.now()
    });
  }
}

// Start price updates
function start() {
  console.log('Price service started');
  
  // Update price every 3 seconds
  setInterval(simulatePrice, 3000);
  
  // In production, connect to Binance WebSocket:
  // connectBinanceWS();
}

// Connect to Binance WebSocket (for production)
function connectBinanceWS() {
  const ws = new WebSocket('wss://fstream.binance.com/ws/btcusdt@markPrice');
  
  ws.on('open', () => {
    console.log('Connected to Binance');
  });
  
  ws.on('message', (data) => {
    const parsed = JSON.parse(data);
    currentPrice = parseFloat(parsed.p);
    
    if (priceCallback) {
      priceCallback({
        symbol: 'BTCUSDT',
        price: currentPrice.toFixed(2),
        change: 0,
        changePercent: 0,
        timestamp: Date.now()
      });
    }
  });
  
  ws.on('error', (err) => {
    console.error('Binance WS error:', err);
  });
}

function onPriceUpdate(callback) {
  priceCallback = callback;
}

function getCurrentPrice() {
  return currentPrice;
}

module.exports = {
  start,
  onPriceUpdate,
  getCurrentPrice
};
