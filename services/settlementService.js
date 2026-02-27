const cron = require('node-cron');
const { vault } = require('../routes/vault');
const { users } = require('../routes/auth');

// Daily settlement at 00:00 UTC
// Rule:
// - dailyPool = 10% of vault
// - top1 gets 10% of dailyPool
// - remaining distributed by distance proportion among all users with distance>0
// - deduct dailyPool from vault

function runSettlement() {
  try {
    const vaultBalance = vault.balance;
    const dailyPool = vaultBalance * 0.10;
    if (dailyPool <= 0.000001) return;

    // Build leaderboard from users
    const userList = Object.values(users || {});
    const eligible = userList.filter(u => (u.totalDistance || 0) > 0);
    if (eligible.length === 0) return;

    eligible.sort((a, b) => (b.totalDistance || 0) - (a.totalDistance || 0));
    const top1 = eligible[0];

    const top1Reward = dailyPool * 0.10;
    const restPool = dailyPool - top1Reward;

    const totalDistance = eligible.reduce((sum, u) => sum + (u.totalDistance || 0), 0);
    if (totalDistance <= 0) return;

    // Distribute
    // 1) top1
    top1.demoBalance = (top1.demoBalance || 0) + top1Reward;

    // 2) proportional by distance
    eligible.forEach(u => {
      const share = restPool * ((u.totalDistance || 0) / totalDistance);
      u.demoBalance = (u.demoBalance || 0) + share;
    });

    // Deduct from vault
    vault.balance = Math.max(0, vault.balance - dailyPool);

    console.log(`[settlement] dailyPool=${dailyPool.toFixed(2)} top1=${top1.walletAddress} top1Reward=${top1Reward.toFixed(2)} eligible=${eligible.length}`);
  } catch (e) {
    console.error('[settlement] error', e);
  }
}

function start() {
  // Every day at 00:00 UTC
  cron.schedule('0 0 * * *', runSettlement, { timezone: 'UTC' });
  console.log('[settlement] cron scheduled at 00:00 UTC');
}

module.exports = { start, runSettlement };
