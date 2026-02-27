const express = require('express');
const router = express.Router();

const state = require('../state');
const vault = state.vault;

router.get('/', (req, res) => {
  res.json({ vaultBalance: vault.balance });
});

module.exports = router;
