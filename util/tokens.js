const { DashboardStatus } = require('../util/enums.js');

/*
 * Returns an object with the following data:
 * - tokensByStatus (object): count of tokens by status
 * - crowdfundingTokens (array): tokens currently crowdfunding
 * - crowdfundedTokens (array): tokens that had crowdfunding
 */
const getTokensByStatus = (tokens, txs) => {
    const tokensByStatus = {
        accepted: 0,
        rejected: 0,
        pending: 0,
        challenged: 0,
        crowdfunding: 0,
        appealed: 0,
        total: tokens.length
    }
    const crowdfundingTokens = [];
    const crowdfundedTokens = [];
    const fundingData = getFundingData(txs);
    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i]
        const { currentStatus, challenged, appealed } = token;
        const crowdfundingData = getCrowdfundingData(fundingData, token);
        currentStatus === DashboardStatus.Accepted && tokensByStatus.accepted ++;
        currentStatus === DashboardStatus.Rejected && tokensByStatus.rejected ++;
        currentStatus === DashboardStatus.Pending && tokensByStatus.pending ++;
        challenged && tokensByStatus.challenged ++;
        appealed && tokensByStatus.appealed ++;
        if (crowdfundingData.hadCrowdfunding) {
            tokensByStatus.crowdfunding ++;
            token.lastCrowdfunding = crowdfundingData.lastCrowdfunding;
            if (currentStatus !== DashboardStatus.Crowdfunding) {
                crowdfundedTokens.push(token);
            }
        }
        if (currentStatus === DashboardStatus.Crowdfunding) {
            crowdfundingTokens.push(token);
        }
    }
    return {
        tokensByStatus,
        crowdfundingTokens,
        crowdfundedTokens,
    };
}

/*
 * Returns an object with funding data of tokens
 * The key are tokenIds
 * The values objects:
 * funders: list of funders
 * lastFundings: list of corresponding last funding (timestamps)
 */
const getFundingData = (txs) => {
    const fundingData = {}
    txs.forEach((tx) => {
        if (tx.isFundAppeal) {
            const tokenFundingData = fundingData[tx.tokenId] || {};
            
            const funders = tokenFundingData.funders || [];
            const lastFundings = tokenFundingData.lastFundings || [];
            
            // Both list are related by their indexes (funder index)
            const funderIndex = funders.indexOf(tx.from);

            if (funderIndex === -1) {
                funders.push(tx.from);
                lastFundings.push(tx.timestamp);
            } else {
                const lastFunding = tx.timestamp > lastFundings[funderIndex] ? tx.timestamp : lastFundings[funderIndex];
                lastFundings[funderIndex] = lastFunding;
            }
            
            tokenFundingData.funders = funders;
            tokenFundingData.lastFundings = lastFundings;
            fundingData[tx.tokenId] = tokenFundingData;
        }
    });
    return fundingData;
}

/*
 * Crowdfunding happens if a token receives funds from someone that is not one of the parties
 * Returns an object:
 * hadCrowdfunding (boolean): did the token receive crowdfunding?
 * timestamp (integer): timestamp of the last crowdfunding or 0 if it didn't happened
 */ 
const getCrowdfundingData = (fundingData, token) => {
    let hadCrowdfunding = false;
    let lastCrowdfunding = 0;

    const tokenFundingData = fundingData[token.tokenId];
    if (tokenFundingData) {
        const funders = tokenFundingData.funders;
        const lastFundings = tokenFundingData.lastFundings;
        const parties = token.parties;
        
        for (let i = 0; i < funders.length ; i++) {
            const funder = funders[i];
            const lastFunding = lastFundings[i];
            if (parties.indexOf(funder) === -1 ) { 
                hadCrowdfunding = true,
                lastCrowdfunding = lastFunding > lastCrowdfunding ? lastFunding : lastCrowdfunding;
            }
        }
    }
    return { 
        hadCrowdfunding,
        lastCrowdfunding
    };
}

module.exports = { getTokensByStatus, getFundingData };
