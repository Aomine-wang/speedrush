// Utility: compute current pnl for an open trade
function computePnl(trade, currentPrice) {
  const entry = trade.entryPrice;
  const exitPrice = currentPrice;
  const priceChange = (exitPrice - entry) / entry;
  const lev = trade.leverage || 10000;

  let pnl = 0;
  if (trade.direction === 'LONG') pnl = priceChange * lev * trade.amount;
  else if (trade.direction === 'SHORT') pnl = -priceChange * lev * trade.amount;

  // guard
  const maxProfit = trade.amount * 5;
  const maxLoss = trade.amount;
  pnl = Math.min(maxProfit, Math.max(-maxLoss, pnl));

  return pnl;
}

module.exports = { computePnl };
