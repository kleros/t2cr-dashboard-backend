const Web3 = require('web3');
const infura = require('../config/infura');

module.exports = {
    kovan: new Web3(new Web3.providers.HttpProvider(infura['kovan'])),
    main: new Web3(new Web3.providers.HttpProvider(infura['main'])),
};
