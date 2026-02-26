const express = require('express');
const router = express.Router();

// Mock leaderboard data
const LEADERBOARD = [
  { rank: 1, walletAddress: '0xWhaleKing', totalDistance: 128, demoBalance: 10256, pnl: 256 },
  { rank: 2, walletAddress: '0xCryptoPro', totalDistance: 96, demoBalance: 10192, pnl: 192 },
  { rank: 3, walletAddress: '0xSpeedDemon', totalDistance: 74, demoBalance: 10148, pnl: 148 },
  { rank: 4, walletAddress: '0xWolfTrader', totalDistance: 54, demoBalance: 10108, pnl: 108 },
  { rank: 5, walletAddress: '0xFoxTrader', totalDistance: 42, demoBalance: 10084, pnl: 84 }
];

// Get leaderboard
router.get('/', (req, res) => {
  const { limit = 100, offset = 0 } = req.query;
  const paginated = LEADERBOARD.slice(parseInt(offset), parseInt(offset) + parseInt(limit));
  
  res.json({
    leaderboard: paginated,
    total: LEADERBOARD.length,
    prizePool: 5234
  });
});

// Get user's rank
router.get('/me', (req, res) => {
  const { walletAddress } = req.query;
  const userEntry = LEADERBOARD.find(e => e.walletAddress === walletAddress);
  
  if (!userEntry) {
    return res.json({ rank: null, message: 'Not ranked yet' });
  }
  
  res.json(userEntry);
});

module.exports = router;
