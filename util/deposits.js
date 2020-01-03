const { TOKEN_CONTRACT_ADDR } = require("../config/token-contract");
const { BADGE_CONTRACT_ADDRS } = require("../config/badge-contract");
const prepareDataset = require("./prepareDataset");

/*
 * Get deposit data, including:
 * - Total amount of ETH deposited in the token contract (tokensTotalEth)
 * - Total amount of ETH deposited in the badge contracts (badgesTotalEth)
 * - Data used to build a chart to visualize evolution of deposited ETH (chatDataset)
 */
const getDepositData = (tokenTxs, badgeTxs) => {
  
  // Token contract transactions
  const tokensTotalEth = tokenTxs.reduce((total, tx) => {
    return total + tx.value / Math.pow(10, 18);
  }, 0);

  // Badge contracts transactions
  const badgesTotalEth = badgeTxs.reduce((total, tx) => {
    return total + tx.value / Math.pow(10, 18);
  }, 0);

  // ** All transactions
  const txs = [...tokenTxs, ...badgeTxs];
  const chartDataset = prepareDataset(txs);

  return {
    tokensTotalEth,
    badgesTotalEth,
    chartDataset
  };
};

module.exports = {
  getDepositData
};
