const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const state = require('../state');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

function auth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = state.users[decoded.walletAddress];
    if (!user) return res.status(403).json({ error: 'Invalid session' });
    if (decoded.sessionId && user.sessionId && decoded.sessionId !== user.sessionId) {
      return res.status(401).json({ error: 'Logged in elsewhere' });
    }
    req.walletAddress = decoded.walletAddress;
    next();
  } catch (e) {
    return res.status(403).json({ error: 'Invalid token' });
  }
}

router.get('/history', auth, (req, res) => {
  const walletAddress = req.walletAddress;
  const history = state.trades
    .filter(t => t.walletAddress === walletAddress)
    .map(t => ({
      id: t.id,
      direction: t.direction,
      amount: t.amount,
      leverage: t.leverage,
      entryPrice: t.entryPrice,
      exitPrice: t.exitPrice,
      pnl: t.pnl,
      profit: t.profit,
      loss: t.loss,
      liquidated: t.liquidated,
      createdAt: t.createdAt,
      settledAt: t.settledAt,
      status: t.status,
    }));

  res.json({ history });
});

module.exports = router;
