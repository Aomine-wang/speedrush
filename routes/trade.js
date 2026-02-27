const express = require('express');
const router = express.Router();

// Mock database
const users = require('./auth').users || {};
const trades = [];
const LEADERBOARD = [];

// Place order (handle /trade endpoint)
router.post('/', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied - no token' });
  }
  
  const jwt = require('jsonwebtoken');
  const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
  
  let walletAddress;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    walletAddress = decoded.walletAddress;
  } catch (err) {
    return res.status(403).json({ error: 'Invalid token' });
  }
  
  const { direction, amount, leverage } = req.body;
  if (!users[walletAddress]) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  const user = users[walletAddress];
  const totalCost = amount + 0.1; // amount + fee
  
  if (user.demoBalance < totalCost) {
    return res.status(400).json({ error: 'Insufficient balance' });
  }
  
  // Deduct balance
  user.demoBalance -= totalCost;
  
  // Create trade
  const trade = {
    id: Date.now().toString(),
    walletAddress,
    direction, // 'long' or 'short'
    amount,
    entryPrice: global.currentBTCPrice || 67234.56,
    status: 'open',
    createdAt: new Date()
  };
  
  trades.push(trade);
  
  // Auto settle after 30 seconds
  setTimeout(() => settleTrade(trade), 30000);
  
  res.json({
    tradeId: trade.id,
    message: 'Order placed successfully',
    settlementIn: 30
  });
});

// Settle trade
async function settleTrade(trade) {
  if (trade.status !== 'open') return;
  
  const exitPrice = global.currentBTCPrice || 67234.56;
  const priceChange = (exitPrice - trade.entryPrice) / trade.entryPrice;
  
  let profit = 0;
  if (trade.direction === 'long') {
    profit = priceChange * 10000 * trade.amount;
  } else {
    profit = -priceChange * 10000 * trade.amount;
  }
  
  // Cap profit/loss
  profit = Math.max(-trade.amount * 2, Math.min(profit, 50));
  
  trade.status = 'closed';
  trade.exitPrice = exitPrice;
  trade.profit = profit;
  trade.settledAt = new Date();
  
  const user = users[trade.walletAddress];
  if (user) {
    user.demoBalance += trade.amount + profit;
    
    // Update distance (1m per 1 USDT profit)
    if (profit > 0) {
      user.totalDistance += Math.floor(profit);
    }
    
    // Update leaderboard
    updateLeaderboard(user);
  }
  
  console.log(`Trade ${trade.id} settled. Profit: ${profit.toFixed(2)} USDT`);
}

// Update leaderboard
function updateLeaderboard(user) {
  const existing = LEADERBOARD.find(e => e.walletAddress === user.walletAddress);
  if (existing) {
    existing.totalDistance = user.totalDistance;
    existing.demoBalance = user.demoBalance;
  } else {
    LEADERBOARD.push({
      walletAddress: user.walletAddress,
      totalDistance: user.totalDistance,
      demoBalance: user.demoBalance,
      rank: 0
    });
  }
  
  // Sort and update ranks
  LEADERBOARD.sort((a, b) => b.totalDistance - a.totalDistance);
  LEADERBOARD.forEach((entry, index) => {
    entry.rank = index + 1;
  });
}

// Get trade history
router.get('/history', (req, res) => {
  const { walletAddress } = req.query;
  const userTrades = trades.filter(t => t.walletAddress === walletAddress);
  res.json(userTrades);
});

// Export leaderboard for other routes
module.exports = router;
module.exports.LEADERBOARD = LEADERBOARD;
module.exports.users = users;
