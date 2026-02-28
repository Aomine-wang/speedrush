const axios = require('axios');
const WebSocket = require('ws');

let currentPrice = 67234.56;
let priceCallback = null;

// Simulate Binance price feed
function simulatePrice() {
  const change = (Math.random() - 0.5) * 100;
  currentPrice += change;

  // keep global price for trade settlement
  global.currentBTCPrice = currentPrice;

  if (priceCallback) {
    priceCallback({
      symbol: 'BTCUSDT',
      price: Number(currentPrice.toFixed(2)),
      change: Number(change.toFixed(2)),
      changePercent: Number(((change / currentPrice) * 100).toFixed(2)),
      timestamp: Date.now()
    });
  }
}

// Start price updates
function start() {
  console.log('Price service started');

  // initialize global price immediately
  global.currentBTCPrice = currentPrice;

  // Use Binance Futures LAST price (aggTrade) instead of simulated ticks
  connectBinanceWS_LastPrice();
}

// Connect to Binance Futures WebSocket (LAST price)
function connectBinanceWS_LastPrice() {
  const ws = new WebSocket('wss://fstream.binance.com/ws/btcusdt@aggTrade');
  
  ws.on('open', () => {
    console.log('Connected to Binance Futures (aggTrade last price)');
  });
  
  ws.on('message', (data) => {
    const parsed = JSON.parse(data);
    // aggTrade: p=price, T=trade time
    const p = parseFloat(parsed.p);
    if (!Number.isFinite(p)) return;

    currentPrice = p;
    global.currentBTCPrice = currentPrice;

    if (priceCallback) {
      priceCallback({
        symbol: 'BTCUSDT',
        price: Number(currentPrice.toFixed(2)),
        timestamp: parsed.T || Date.now(),
        source: 'binance-futures-aggTrade'
      });
    }
  });
  
  ws.on('error', (err) => {
    console.error('Binance WS error:', err);
  });

  ws.on('close', () => {
    console.warn('Binance WS closed, retrying in 2s...');
    setTimeout(connectBinanceWS_LastPrice, 2000);
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
