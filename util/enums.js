const TokenStatus = {
    Absent: 0,                  // The token is not in the registry.
    Registered: 1,              // The token is in the registry.
    RegistrationRequested: 2,   // The token has a request to be added to the registry.
    ClearingRequested: 3        // The token has a request to be removed from the registry.
}

const AddressStatus = {
    Absent: 0,
    Registered: 1,
    RegistrationRequested: 2,
    ClearingRequested: 3
}

const DisputeStatus = { 
    Waiting: 0, 
    Appealable: 1, 
    Solved: 2  
}

const DashboardStatus = {
    Accepted: 0, 
    Rejected: 1,
    Pending: 2,
    Challenged: 3,
    Crowdfunding: 4,
    Appealed: 5,
}

module.exports = { TokenStatus, AddressStatus, DisputeStatus, DashboardStatus };