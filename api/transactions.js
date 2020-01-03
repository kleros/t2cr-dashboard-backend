const axios = require("axios");
const abiDecoder = require('abi-decoder');
const { TOKEN_CONTRACT_ABI, TOKEN_CONTRACT_ADDR } = require("../config/token-contract");
const { BADGE_CONTRACT_ABI, BADGE_CONTRACT_ADDRS } = require("../config/badge-contract");

/*
 * Fetch transactions done to the token contract
 */
const fetchTokenTransactions = async (network) => {
  const tokenContractAddress = TOKEN_CONTRACT_ADDR[network];
  return await fetchTransactions(network, tokenContractAddress);
}

/* 
 * Fetch transactions done to the badge contracts
 * The keys of the returned object are addresses of the badge contracts
 * The values are arrays with the respective transactions
 */
const fetchBadgesTransactions = async (network) => {
  const txsByContract = {};
  const txsByContractPromise = []; 
  const badgeContractAddresses = BADGE_CONTRACT_ADDRS[network];
  badgeContractAddresses.forEach(BADGE_CONTRACT_ADDR => {
    txsByContractPromise.push(fetchTransactions(network, BADGE_CONTRACT_ADDR));
  });
  const txsByContractArray = await Promise.all(txsByContractPromise);
  for (let i = 0; i < badgeContractAddresses.length; i++) {
    txsByContract[badgeContractAddresses[i]] = txsByContractArray[i];
  }
  return txsByContract;
}


/*
 * Helper function to fetch all transactions by account using Etherscan account api
 * TODO: replace for a valid api key token
 */
const fetchTransactions = async (network, address) => {
  const url = (network === "main") ? "https://api.etherscan.io/api" : `https://api-${network}.etherscan.io/api`;
 
  // The api returns a maximum of 10000 transactions per call/page, so this value is used as the offset
  const offset = 10000;
  let page = 1;
  let hasMorePages = true;
  
  const rawTxs = [];

  while (hasMorePages) {
      const pageTxs = await fetchTransactionsPage(url, address, page, offset)
      rawTxs.push(...pageTxs);
      
      if (pageTxs.length !== offset) {
        hasMorePages = false;
        break;
      }

      page++;
  }

  // Filter out irrelevant transactions
  const txs = filterTransactions(rawTxs, address);

  // Decode input data and convert data to proper numeric types
  return decodeData(txs);
}

/*
 * Helper function to fetch a page of raw transactions
 */
const fetchTransactionsPage = async (url, address, page, offset) => {
  const response = await axios.get(url, {
    params: {
      module: "account",
      action: "txlist",
      address: address,
      page,
      offset: offset,
      sort: "asc",
      apikey: "YourApiKeyToken"
    }
  });
  return response.data.result;
}

/*
 * Filter out irrelevant transactions
 * - Remove outgoing transactions
 * - Remove transactions with non-positive value
 * - Remove failed transactions
 */
const filterTransactions = (rawTxs, address) => {
  return rawTxs.filter(rawTx => {
    
    // Outgoing transactions
    if (rawTx.from === address) {
      return false;
    }

    // Non-positive value
    if (parseFloat(rawTx.value) <= 0) {
      return false;
    }

    // Failed transactions
    if (parseInt(rawTx.txreceipt_status) === 0) {
      return false;
    }

    return true;
  });
}

/*
 * Decode input data (ABI), convert strings to proper numeric values and 
 * returns an object with only relevant data:
 * - timestamp (int): timestamp of the transaction
 * - from (string): address of transaction initiator
 * - value (float): the value of the transaction
 * - isFundAppeal (boolean): if the transaction is related to a fund appeal
 * - tokenId (string): (only if transaction is related to a fund appeal)
 *   the ID of the token (in case of a TokenArbitrableList) 
 *   or address (in case of a ArbitrableAddressList contract)
 */
const decodeData = (txs) => {
  
  // Setup decoder for ABI data
  abiDecoder.addABI(TOKEN_CONTRACT_ABI);
  abiDecoder.addABI(BADGE_CONTRACT_ABI);

  return txs.map(tx => {
    let isFundAppeal = false;
    let tokenId = null;
    
    const txInputData = abiDecoder.decodeMethod(tx.input);
    if (txInputData && txInputData.name === 'fundAppeal') {
      isFundAppeal = true;
      tokenId = txInputData.params[0].value.toLowerCase();
    }

    return {
      timestamp: parseInt(tx.timeStamp),
      from: tx.from.toLowerCase(),
      value: parseFloat(tx.value),
      isFundAppeal,
      tokenId
    };
  });
}

module.exports =  { 
  fetchTransactions,
  fetchTokenTransactions,
  fetchBadgesTransactions
};
