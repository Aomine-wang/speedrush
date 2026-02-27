const express = require('express');
const router = express.Router();

// In-memory vault
const vault = {
  balance: 0
};

router.get('/', (req, res) => {
  res.json({ vaultBalance: vault.balance });
});

module.exports = router;
module.exports.vault = vault;
