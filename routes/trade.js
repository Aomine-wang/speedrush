const express = require('express');
const router = express.Router();

// Import users from auth module (shared in-memory object)
const authModule = require('./auth');
// users is an object keyed by walletAddress
const users = authModule.users || {};
const trades = [];
const LEADERBOARD = [];

// Vault shared module
const vaultModule = require('./vault');
const vault = vaultModule.vault;

// Place order (handle /trade endpoint)
router.post('/', (req, res) => {
  try {
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
  
  const { direction, amount } = req.body;

  // always read latest users object from auth module (avoid stale reference)
  const usersDb = authModule.users;
  if (!usersDb || !usersDb[walletAddress]) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  const user = usersDb[walletAddress];

  const amt = Number(amount);
  const lev = 10000; // fixed leverage per product rule
  if (!Number.isFinite(amt) || amt <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  if (user.demoBalance < amt) {
    return res.status(400).json({ error: 'Insufficient balance' });
  }

  // Freeze / deduct principal
  user.demoBalance -= amt;
  
  // Create trade
  const trade = {
    id: Date.now().toString(),
    walletAddress,
    direction: (direction || '').toUpperCase(), // 'LONG' | 'SHORT'
    amount: amt,
    leverage: lev,
    entryPrice: global.currentBTCPrice || 67234.56,
    status: 'open',
    createdAt: new Date()
  };
  
  trades.push(trade);
  
  // Auto settle after 30 seconds
  setTimeout(() => settleTrade(trade), 30000);

  res.json({
    success: true,
    trade,
    newBalance: user.demoBalance,
    vaultBalance: vault.balance,
    settlementIn: 30
  });
  } catch (e) {
    console.error('[trade] error', e);
    res.status(500).json({ error: 'Internal Server Error', detail: String(e && e.message ? e.message : e) });
  }
});

// Settle trade
async function settleTrade(trade) {
  if (trade.status !== 'open') return;
  
  const exitPrice = global.currentBTCPrice || 67234.56;
  const priceChange = (exitPrice - trade.entryPrice) / trade.entryPrice;
  
  // PnL with fixed 10000x leverage
  const lev = trade.leverage || 10000;
  let pnl = 0;
  if (trade.direction === 'LONG') {
    pnl = priceChange * lev * trade.amount;
  } else if (trade.direction === 'SHORT') {
    pnl = -priceChange * lev * trade.amount;
  } else {
    // invalid direction -> treat as flat
    pnl = 0;
  }

  // Explosion guard: cap to principal range
  // profit can be large, but keep game stable
  const maxProfit = trade.amount * 5;
  const maxLoss = trade.amount; // can't lose more than principal (unless liquidation)
  pnl = Math.min(maxProfit, Math.max(-maxLoss, pnl));

  // Liquidation check: if loss >= 70% principal => immediate liquidation
  const liquidationLoss = trade.amount * 0.7;
  const isLiquidated = (-pnl) >= liquidationLoss;

  let refund = 0;
  let profit = 0;
  let loss = 0;

  if (isLiquidated) {
    // all principal to vault
    loss = trade.amount;
    refund = 0;
    profit = 0;
    vault.balance += trade.amount;
  } else if (pnl >= 0) {
    // profit: refund principal + profit
    profit = pnl;
    refund = trade.amount + profit;
  } else {
    // partial loss: loss part to vault, refund rest
    loss = Math.min(trade.amount, -pnl);
    refund = trade.amount - loss;
    vault.balance += loss;
  }

  trade.status = 'closed';
  trade.exitPrice = exitPrice;
  trade.pnl = Number(pnl.toFixed(2));
  trade.profit = Number(profit.toFixed(2));
  trade.loss = Number(loss.toFixed(2));
  trade.liquidated = isLiquidated;
  trade.refund = Number(refund.toFixed(2));
  trade.settledAt = new Date();

  const usersDb = authModule.users;
  const user = usersDb ? usersDb[trade.walletAddress] : undefined;
  if (user) {
    user.demoBalance += refund;

    // distance: +1m per 1 USDT profit
    if (profit > 0) {
      user.totalDistance += Math.floor(profit);
    }

    updateLeaderboard(user);
  }

  console.log(`Trade ${trade.id} settled. pnl=${trade.pnl} liquidated=${isLiquidated}`);
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
