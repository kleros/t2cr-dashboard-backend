const WEB3 = require("../util/web3");
const EMPTY_ADDR = '0x0000000000000000000000000000000000000000';
const { BADGE_CONTRACT_ABI, BADGE_CONTRACT_ADDRS } = require("../config/badge-contract");
const { KLEROS_LIQUID_CONTRACT_ABI, KLEROS_LIQUID_CONTRACT_ADDR } = require("../config/kleros-liquid-contract");
const { AddressStatus, DashboardStatus, DisputeStatus } = require('../util/enums');

/*
 * Returns a list of addresses by contract
 */
const fetchAddressesByContract = async network => {
    const addrsByContract = {};
    const addrsByContractPromise = []; 
    const badgeContractAddresses = BADGE_CONTRACT_ADDRS[network];
    badgeContractAddresses.forEach(BADGE_CONTRACT_ADDR => {
        addrsByContractPromise.push(fetchAddresses(network, BADGE_CONTRACT_ADDR));
    });
    const addrsByContractArray = await Promise.all(addrsByContractPromise);
    for (let i = 0; i < badgeContractAddresses.length; i++) {
        addrsByContract[badgeContractAddresses[i]] = addrsByContractArray[i];
    }
    return addrsByContract;
}

/*
 * Returns a list (array) of address objects with the following data:
 * - address (string),
 * - status (int): the status in the ArbitrableAddressList contract,
 * - currentStatus (int): the status in the Dashboard,
 * - requests (array): requests to change the status of the address,
 * - challenged (boolean): was the address challenged at some point?, 
 * - appealed (boolean): was the address appealed at some point?,
 * - parties (array): parties involved in disputes (challenges and appeals)
 */
const fetchAddresses = async (network, BADGE_CONTRACT_ADDR) => {
    const web3 = WEB3[network];
    const contract = new web3.eth.Contract(BADGE_CONTRACT_ABI, BADGE_CONTRACT_ADDR);
    const klContract = new web3.eth.Contract(KLEROS_LIQUID_CONTRACT_ABI, KLEROS_LIQUID_CONTRACT_ADDR[network]);

    // Get number of addresses
    const addressCount = await contract.methods.addressCount().call();

    // Load addresses
    let addressPromises = [];
    for (let i = 0; i < addressCount; i++) {
        addressPromises.push(loadAddress(contract, klContract, i));
    }

    const addresses = await Promise.all(addressPromises);
    return addresses;
}

const loadAddress = async (contract, klContract, index) => {
    const address = await contract.methods.addressList(index).call();
    const addressInfo = await contract.methods.getAddressInfo(address).call();
    const status = parseInt(addressInfo.status);
    const requests = await loadRequests(contract, address, addressInfo.numberOfRequests);
    const currentStatus = await getCurrentStatus(klContract, status, requests);
    const extraInfo = getExtraInfo(requests);

    return {
        address: address.toLowerCase(),
        status,
        currentStatus,
        requests,
        ...extraInfo
    };
}

const loadRequests = async (contract, address, numberOfRequests) => {
    const requestsPromise = [];
    for (let i = 0; i < numberOfRequests; i++) {
      requestsPromise[i] = contract.methods.getRequestInfo(address, i).call();
    }
    const requestsRaw = await Promise.all(requestsPromise);

    // Load rounds
    for (let reqIndex = 0; reqIndex < requestsRaw.length; reqIndex++) {
      const requestRaw = requestsRaw[reqIndex];
      requestRaw.rounds = await loadRounds(contract, address, reqIndex, requestRaw.numberOfRounds);
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

const loadRounds = async (contract, address, reqIndex, numberOfRounds) => {
    const roundsPromise = [];
    for (let roundIndex = 0; roundIndex < numberOfRounds; roundIndex++) {
        roundsPromise[roundIndex] = contract.methods.getRoundInfo(address, reqIndex, roundIndex).call();
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
    if (status === AddressStatus.Registered) {
        return DashboardStatus.Accepted;
    } else if (status === AddressStatus.Absent) {
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

module.exports = { fetchAddresses, fetchAddressesByContract };
