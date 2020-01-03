const { DashboardStatus } = require("../util/enums.js");
const { BADGE_CONTRACT_ADDRS } = require("../config/badge-contract");

/*
 * Returns: an object with the following data:
 * {
 *   addressesByStatus,     // count of addresses by status (object)
 *   crowdfundingAddresses, // addresses currently crowdfunding (array)
 *   crowdfundedAddresses   // addresses that had crowdfunding (array)
 * }
 */
const getAddressesByStatus = (addresses, txs) => {
  const addressesByStatus = {
    accepted: 0,
    rejected: 0,
    pending: 0,
    challenged: 0,
    crowdfunding: 0,
    appealed: 0,
    total: addresses.length
  };
  const crowdfundingAddresses = [];
  const crowdfundedAddresses = [];
  const fundingData = getFundingData(txs);
  for (let i = 0; i < addresses.length; i++) {
    const address = addresses[i];
    const { currentStatus, challenged, appealed } = address;
    const crowdfundingData = getCrowdfundingData(fundingData, address);
    currentStatus === DashboardStatus.Accepted && addressesByStatus.accepted++;
    currentStatus === DashboardStatus.Rejected && addressesByStatus.rejected++;
    currentStatus === DashboardStatus.Pending && addressesByStatus.pending++;
    challenged && addressesByStatus.challenged++;
    appealed && addressesByStatus.appealed++;
    if (crowdfundingData.hadCrowdfunding) {
      addressesByStatus.crowdfunding++;
      address.lastCrowdfunding = crowdfundingData.lastCrowdfunding;
      if (currentStatus !== DashboardStatus.Crowdfunding) {
        crowdfundedAddresses.push(address);
      }
    }
    if (currentStatus === DashboardStatus.Crowdfunding) {
      crowdfundingAddresses.push(address);
    }
  }
  return {
    addressesByStatus,
    crowdfundingAddresses,
    crowdfundedAddresses
  };
};

/*
 * Returns: an object with funding data of addresses
 * The key are addresses
 * The values objects: 
 * {
 *   funders,     // list of funders
 *   lastFundings // list of corresponding last funding (timestamps)
 * }
 */
const getFundingData = txs => {
  const fundingData = {};
  txs.forEach(tx => {
    if (tx.isFundAppeal) {
      const addressFundingData = fundingData[tx.tokenId] || {};

      const funders = addressFundingData.funders || [];
      const lastFundings = addressFundingData.lastFundings || [];

      // Both list are related by their indexes (funder index)
      const funderIndex = funders.indexOf(tx.from);

      if (funderIndex === -1) {
        funders.push(tx.from);
        lastFundings.push(tx.timestamp);
      } else {
        const lastFunding = tx.timestamp > lastFundings[funderIndex]
            ? tx.timestamp
            : lastFundings[funderIndex];
        lastFundings[funderIndex] = lastFunding;
      }

      addressFundingData.funders = funders;
      addressFundingData.lastFundings = lastFundings;
      fundingData[tx.tokenId] = addressFundingData;
    }
  });
  return fundingData;
};

/*
 * Crowdfunding happens if a token receives funds from someone that is not one of the parties
 * Returns: an object containing
 * {
 *   hadCrowdfunding, // did the token receive crowdfunding? (boolean)
 *   timestamp        // timestamp of the last crowdfunding or 0 if it didn't happened (integer)
 * }
 */
const getCrowdfundingData = (fundingData, address) => {
  let hadCrowdfunding = false;
  let lastCrowdfunding = 0;

  const tokenFundingData = fundingData[address.address];
  if (tokenFundingData) {
    const funders = tokenFundingData.funders;
    const lastFundings = tokenFundingData.lastFundings;
    const parties = address.parties;

    for (let i = 0; i < funders.length; i++) {
      const funder = funders[i];
      const lastFunding = lastFundings[i];
      if (parties.indexOf(funder) === -1) {
        hadCrowdfunding = true;
        lastCrowdfunding = lastFunding > lastCrowdfunding ? lastFunding : lastCrowdfunding;
      }
    }
  }
  return {
    hadCrowdfunding,
    lastCrowdfunding
  };
};

/*
 * Agggregate data from different badge contracts
 * Params:
 *   addrsByContract - addresses by badge contract
 *   txsByContract - transactions by badge contract
 * 
 * Returns: an object containing
 * {
 *   badgeTxs,              // transactions of all badge contracts
 *   addressesByStatus,     // aggregate count of addresses by status
 *   crowdfundingAddresses, // aggregate list of crowdfunding addresses
 *   crowdfundedAddresses   // aggregate list of addresses that had crowdfunding
 * }
 */
const getAggregateData = (addrsByContract, txsByContract, network) => {
  const badgeContractAddrs = BADGE_CONTRACT_ADDRS[network];
  
  let badgeTxs = [];
  let addressesByStatus = { accepted: 0, rejected: 0, pending: 0, challenged: 0, crowdfunding: 0, appealed: 0, total: 0 };
  let crowdfundingAddresses = [];
  let crowdfundedAddresses = [];
    
  for (let i = 0; i < badgeContractAddrs.length; i++) {
    const badgeContractAddr = badgeContractAddrs[i];

    // Aggregate badges transactions
    const contractTxs = txsByContract[badgeContractAddr];
    badgeTxs = [...badgeTxs, ...contractTxs];

    // Aggregate count by status
    const addrs = addrsByContract[badgeContractAddr];
    const addrsByStatusByContract = getAddressesByStatus(addrs, contractTxs);
    addressesByStatus.accepted += addrsByStatusByContract.addressesByStatus.accepted;
    addressesByStatus.rejected += addrsByStatusByContract.addressesByStatus.rejected;
    addressesByStatus.pending += addrsByStatusByContract.addressesByStatus.pending;
    addressesByStatus.challenged += addrsByStatusByContract.addressesByStatus.challenged;
    addressesByStatus.crowdfunding += addrsByStatusByContract.addressesByStatus.crowdfunding;
    addressesByStatus.appealed += addrsByStatusByContract.addressesByStatus.appealed;
    addressesByStatus.total += addrsByStatusByContract.addressesByStatus.total;
    //addrsByStatusByContract[badgeContractAddr] = addrsByStatusByContract;

    // Aggregate crowdfunding data
    crowdfundingAddresses.push(...addrsByStatusByContract.crowdfundingAddresses);
    crowdfundedAddresses.push(...addrsByStatusByContract.crowdfundedAddresses);
  }

  return {
    badgeTxs,
    addressesByStatus,
    crowdfundingAddresses,
    crowdfundedAddresses
  }
};

module.exports = { getAggregateData };
