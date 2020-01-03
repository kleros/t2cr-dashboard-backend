const getCrowdfundingTokens = (crowdfundingTokens, crowdfundedTokens, crowdfundingAddresses, crowdfundedAddresses, tokens) => {
    let resultingList = [];
    const crowdfunding = [...crowdfundingTokens, ...crowdfundingAddresses].sort(compareLastRequest);
    const crowdfunded = [...crowdfundedTokens, ...crowdfundedAddresses].sort(compareFundingData);
    const crowdfundingCount = crowdfunding.length;
    if (crowdfundingCount >= 16) {
        resultingList = crowdfunding;
    } else {
        const remaining = 16 - crowdfundingCount;
        resultingList = [...crowdfunding, ...crowdfunded.slice(0, remaining)];
    }
    return resultingList.map((token) => {
        if (token.tokenId) { 
            return token 
        };
        // Add token data for the address (tokenId, name, ticker, symbolMultihash)
        return {
            ...token,
            ...getTokenData(tokens, token)
        }
    });
}

const compareFundingData = (token1, token2) => {
    if (token1.lastCrowdfunding < token2.lastCrowdfunding) {
      return 1;
    }
    if (token1.lastCrowdfunding > token2.lastCrowdfunding) {
      return -1;
    }
    return 0;
}

const compareLastRequest = (token1, token2) => {
    if (token1.lastRequestTime < token2.lastRequestTime) {
        return 1;
      }
      if (token1.lastRequestTime > token2.lastRequestTime) {
        return -1;
      }
      return 0;
}

const getTokenData = (tokens, address) => {
    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        if (token.addr === address.address) {
            const { tokenId, name, ticker, symbolMultihash } = token
            return { tokenId, name, ticker, symbolMultihash };
        }
    }
}

module.exports = { getCrowdfundingTokens };
