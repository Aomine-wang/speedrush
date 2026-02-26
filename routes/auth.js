const express = require('express');
const { ethers } = require('ethers');
const jwt = require('jsonwebtoken');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Mock database (replace with Firebase in production)
const users = {};

// Generate nonce for wallet signature
router.post('/nonce', (req, res) => {
  const { walletAddress } = req.body;
  const nonce = Math.floor(Math.random() * 1000000).toString();
  
  if (!users[walletAddress]) {
    users[walletAddress] = {
      walletAddress,
      nonce,
      demoBalance: 10000,
      realBalance: 0,
      totalDistance: 0,
      createdAt: new Date()
    };
  } else {
    users[walletAddress].nonce = nonce;
  }
  
  res.json({ nonce });
});

// Verify signature and login
router.post('/login', async (req, res) => {
  const { walletAddress, signature } = req.body;
  
  try {
    const user = users[walletAddress];
    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }
    
    // Verify signature
    const message = `Login to SpeedRush with nonce: ${user.nonce}`;
    const recoveredAddress = ethers.verifyMessage(message, signature);
    
    if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    // Generate JWT
    const token = jwt.sign(
      { walletAddress, demoBalance: user.demoBalance },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      token,
      user: {
        walletAddress: user.walletAddress,
        demoBalance: user.demoBalance,
        realBalance: user.realBalance,
        totalDistance: user.totalDistance
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get user profile
router.get('/profile', authenticateToken, (req, res) => {
  const user = users[req.walletAddress];
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  res.json({
    walletAddress: user.walletAddress,
    demoBalance: user.demoBalance,
    realBalance: user.realBalance,
    totalDistance: user.totalDistance
  });
});

// Middleware to authenticate JWT
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied' });
  }
  
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.walletAddress = decoded.walletAddress;
    next();
  });
}

module.exports = router;
