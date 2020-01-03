const WEB3 = require("../util/web3");
const EMPTY_ADDR = '0x0000000000000000000000000000000000000000';
const { TOKEN_CONTRACT_ABI, TOKEN_CONTRACT_ADDR } = require("../config/token-contract");
const { KLEROS_LIQUID_CONTRACT_ABI, KLEROS_LIQUID_CONTRACT_ADDR } = require("../config/kleros-liquid-contract");
const { TokenStatus, DashboardStatus, DisputeStatus } = require('../util/enums');

/*
 * Returns a list (array) of tokens (object) with the following data:
 * - tokenId (string),
 * - ticker (string),
 * - addr (string): the address of the token,
 * - symbolMultihash (string),
 * - status (int): the status in the ArbitrableTokenList contract,
 * - currentStatus (int): the status in the Dashboard,
 * - requests (array): requests to change the status of token,
 * - challenged (boolean): was the token challenged at some point?, 
 * - appealed (boolean): was the token appealed at some point?,
 * - parties (array): parties involved in disputes (challenges and appeals)
 */
const fetchTokens = async network => {
    const web3 = WEB3[network];
    const contract = new web3.eth.Contract(TOKEN_CONTRACT_ABI, TOKEN_CONTRACT_ADDR[network]);
    const klContract = new web3.eth.Contract(KLEROS_LIQUID_CONTRACT_ABI, KLEROS_LIQUID_CONTRACT_ADDR[network]);

    // Get number of tokens
    const tokenCount = await contract.methods.tokenCount().call();

    // Load tokens
    let tokensPromises = [];
    for (let i = 0; i < tokenCount; i++) {
      tokensPromises.push(loadToken(contract, klContract, i));
    }

    const tokens = await Promise.all(tokensPromises);
    return tokens;
}

const loadToken = async (contract, klContract, index) => {
    const tokenId = await contract.methods.tokensList(index).call();
    const tokenInfo = await contract.methods.getTokenInfo(tokenId).call();
    const status = parseInt(tokenInfo.status);
    const requests = await loadRequests(contract, tokenId, tokenInfo.numberOfRequests);
    const currentStatus = await getCurrentStatus(klContract, status, requests);
    const extraInfo = getExtraInfo(requests);
    return {
        tokenId: tokenId.toLowerCase(),
        name: tokenInfo.name,
        ticker: tokenInfo.ticker,
        addr: tokenInfo.addr.toLowerCase(),
        symbolMultihash: tokenInfo.symbolMultihash,
        status,
        currentStatus,
        requests,
        ...extraInfo
    };
}

const loadRequests = async (contract, tokenId, numberOfRequests) => {
    const requestsPromise = [];
    for (let i = 0; i < numberOfRequests; i++) {
      requestsPromise[i] = contract.methods.getRequestInfo(tokenId, i).call();
    }
    const requestsRaw = await Promise.all(requestsPromise);

    // Load rounds
    for (let reqIndex = 0; reqIndex < requestsRaw.length; reqIndex++) {
      const requestRaw = requestsRaw[reqIndex];
      requestRaw.rounds = await loadRounds(contract, tokenId, reqIndex, requestRaw.numberOfRounds);
    }

    // Clean up request information
    const requests = requestsRaw.map((requestRaw) => {
      let { disputed, disputeID, submissionTime, resolved, parties, rounds, ruling, arbitrator, arbitratorExtraData } = requestRaw;
      disputeID = disputeID != null ? parseInt(disputeID) : null;
      ruling = ruling != null ? parseInt(ruling) : null;
      return { disputed, disputeID, submissionTime, resolved, parties, rounds, ruling, arbitrator, arbitratorExtraData };
    });

    return requests;
}

const loadRounds = async (contract, tokenId, reqIndex, numberOfRounds) => {
    const roundsPromise = [];
    for (let roundIndex = 0; roundIndex < numberOfRounds; roundIndex++) {
        roundsPromise[roundIndex] = contract.methods.getRoundInfo(tokenId, reqIndex, roundIndex).call();
    }

    // Clean up round information
    const roundsRaw = await Promise.all(roundsPromise);
    const rounds = roundsRaw.map((roundRaw) => {
        const paidFees = roundRaw.paidFees.map((paidFee) => paidFee/Math.pow(10,18))
        const { appealed, hasPaid, feeRewards } = roundRaw;
        return { appealed, paidFees, hasPaid, feeRewards };
    });

    return rounds;
}

const getCurrentStatus = async (klContract, status, requests) => {
    if (status === TokenStatus.Registered) {
        return DashboardStatus.Accepted;
    } else if (status === TokenStatus.Absent) {
        return DashboardStatus.Rejected;
    } else {
        const numberOfRequests = requests.length;
        const request = requests[numberOfRequests - 1];
        const { disputed, disputeID } = request;
        if (!disputed) {
            return DashboardStatus.Pending;
        } else {
            const disputeStatus = parseInt(await klContract.methods.disputeStatus(disputeID).call());
            return disputeStatus === DisputeStatus.Appealable 
                ? DashboardStatus.Crowdfunding 
                : DashboardStatus.Appealed;
        }
    }
}

const getExtraInfo = (requests) => {
    let challenged = false;
    let appealed = false;
    let parties = [];
    for (let i = 0; i < requests.length; i++) {
        const request = requests[i];
        challenged = challenged || request.disputed;
        appealed = appealed || request.rounds.length > 2;
        const party1 = request.parties[1].toLowerCase();
        const party2 = request.parties[2].toLowerCase();
        if (party1 !== EMPTY_ADDR && parties.indexOf(party1) === -1) {
            parties.push(party1);
        }
        if (party2 !== EMPTY_ADDR && parties.indexOf(party2) === -1) {
            parties.push(party2);
        }
    }
    const lastRequestTime = requests[requests.length-1].submissionTime;
    return {
        lastRequestTime,
        challenged,
        appealed,
        parties
    };
}

module.exports = { fetchTokens };
