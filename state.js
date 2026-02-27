// Global in-memory state (shared across routes)

const state = {
  users: {},
  vault: {
    balance: 0,
  },
  trades: [],
  leaderboard: [],
  // for debugging / cache bust
  bootId: Date.now().toString(),
};

module.exports = state;
