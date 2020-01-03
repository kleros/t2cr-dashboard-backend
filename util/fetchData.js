const client = require("./redis");
const crowdfundingUtil = require("./crowdfunding");
const badgesApi = require("../api/badges");
const badgesUtil = require("./badges");
const depositsUtil = require("./deposits");
const ethPriceApi = require("../api/ethPrice");
const tokensApi = require("../api/tokens");
const tokensUtil = require("./tokens");
const transactionsApi = require("../api/transactions");

const fetchEthPrice = async () => {
  console.log("Fetching ETH price ...");
  const ethPrice = await ethPriceApi.fetchEthPrice();
  client.set("eth-price", ethPrice);
};

const fetchDataByNetwork = async network => {
  const date = new Date();
  console.log(`Fetching data for ${network} network [${date}]`);
  try {
    const resultPromises = [
      tokensApi.fetchTokens(network),
      transactionsApi.fetchTokenTransactions(network),
      badgesApi.fetchAddressesByContract(network),
      transactionsApi.fetchBadgesTransactions(network)
    ];
    const results = await Promise.all(resultPromises);
    
    // Compute tokens data
    const tokens = results[0];
    const tokenTxs = results[1];
    const {
      tokensByStatus,
      crowdfundingTokens,
      crowdfundedTokens
    } = tokensUtil.getTokensByStatus(tokens, tokenTxs);

    // Compute badges data
    const addrsByContract = results[2];
    const txsByContract = results[3];
    const {
      badgeTxs,
      addressesByStatus,
      crowdfundingAddresses,
      crowdfundedAddresses
    } = badgesUtil.getAggregateData(addrsByContract, txsByContract, network);

    // Crowdfunding data
    const aggregateCrowdfundingTokens = crowdfundingUtil.getCrowdfundingTokens(
      crowdfundingTokens,
      crowdfundedTokens,
      crowdfundingAddresses,
      crowdfundedAddresses,
      tokens
    );

    // Deposit data
    const depositData = depositsUtil.getDepositData(tokenTxs, badgeTxs);

    // Store updated information in cache database
    client.set(`${network}_tokens-by-status`, JSON.stringify(tokensByStatus));
    client.set(`${network}_addresses-by-status`,JSON.stringify(addressesByStatus));
    client.set(`${network}_crowdfunding-tokens`,JSON.stringify(aggregateCrowdfundingTokens));
    client.set(`${network}_deposit-data`, JSON.stringify(depositData));
    console.log(`Finished fetching data for ${network} network [${new Date()}]`);
  } catch (err) {
    console.log(err);
    throw err;
  }
};

const fetchDataMain = async () => {
  fetchDataByNetwork("main");
}

const fetchDataKovan = async () => {
  fetchDataByNetwork("kovan");
}

module.exports = {
  fetchEthPrice,
  fetchDataMain,
  fetchDataKovan
};
