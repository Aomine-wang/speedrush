const express = require('express');
const router = express.Router();

// Import real data from trade module
let tradeModule;
let LEADERBOARD = [];
let users = {};

// Get data from trade module
try {
  tradeModule = require('./trade');
} catch(e) {}

// Refresh data function
function refreshData() {
  if (tradeModule) {
    LEADERBOARD = tradeModule.LEADERBOARD || [];
    users = tradeModule.users || {};
  }
}

// Get leaderboard
router.get('/', (req, res) => {
  refreshData();
  
  const { limit = 100, offset = 0 } = req.query;
  
  // Convert users to leaderboard format if empty
  let leaderboardData = LEADERBOARD.length > 0 ? LEADERBOARD : Object.values(users)
    .map(u => ({
      walletAddress: u.walletAddress,
      totalDistance: u.totalDistance || 0,
      demoBalance: u.demoBalance || 10000,
      rank: 0
    }))
    .sort((a, b) => b.totalDistance - a.totalDistance)
    .map((e, i) => ({ ...e, rank: i + 1 }));
  
  const paginated = leaderboardData.slice(parseInt(offset), parseInt(offset) + parseInt(limit));
  
  res.json({
    leaderboard: paginated,
    total: leaderboardData.length,
    prizePool: 5234
  });
});

// Get user's rank
router.get('/me', (req, res) => {
  refreshData();
  
  const { walletAddress } = req.query;
  
  // Search in leaderboard first
  let userEntry = LEADERBOARD.find(e => e.walletAddress === walletAddress);
  
  // If not found, check users
  if (!userEntry && users[walletAddress]) {
    const u = users[walletAddress];
    userEntry = {
      walletAddress: u.walletAddress,
      totalDistance: u.totalDistance || 0,
      demoBalance: u.demoBalance || 10000,
      rank: null
    };
  }
  
  if (!userEntry) {
    return res.json({ rank: null, message: 'Not ranked yet' });
  }
  
  // Calculate real rank
  const allUsers = Object.values(users).sort((a, b) => (b.totalDistance || 0) - (a.totalDistance || 0));
  const rank = allUsers.findIndex(u => u.walletAddress === walletAddress) + 1;
  
  res.json({
    ...userEntry,
    rank: rank || userEntry.rank
  });
});

module.exports = router;
