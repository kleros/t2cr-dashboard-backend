const axios = require("axios");

/* 
 * Fetch ETH price 
 */
const fetchEthPrice = async () => {
  const response = await axios.get("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd");
  return response.data.ethereum.usd;
};

module.exports = { fetchEthPrice };
