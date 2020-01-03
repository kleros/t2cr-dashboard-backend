/**
 * Routes configuration
 *
 * @author Jefferson Sofarelli<jmsofarelli@protonmail.com>
 * @date 30.10.2019
 */
const client = require('./util/redis');


const ethPrice = (req, res) => {
    client.get('eth-price', (err, price) => {
        if (err) {
            console.log('Err', err);
            res.status(400).json({ error: 'Error fetching ETH price!'});
        } else {
            res.status(200).json({ price });
        }
    });
}

const depositData = (req, res) => {
    const network = req.query.network;
    client.get(`${network}_deposit-data`, (err, depositDataStr) => {
        if (err) {
            console.log('Err', err);
            res.status(400).json({ error: 'Error fetching deposit data!'});
        } else {
            const depositData = JSON.parse(depositDataStr)
            res.status(200).json({ depositData });
        }
    });
}

const addressesByStatus = async (req, res) => {
    const network = req.query.network;
    client.get(`${network}_addresses-by-status`, (err, addressesByStatusStr) => {
        if (err) {
            console.log('Err', err);
            res.status(400).json({ error: 'Error fetching addresses count by status!'});
        } else {
            const countByStatus = JSON.parse(addressesByStatusStr)
            res.status(200).json({ countByStatus });
        }
    })
}

const crowdfundingTokens = async (req, res) => {
    const network = req.query.network;
    client.get(`${network}_crowdfunding-tokens`, (err, crowdfundingTokensStr) => {
        if (err) {
            console.log('Err', err);
            res.status(400).json({ error: 'Error fetching crowdfunding tokens!'});
        } else {
            const tokens = JSON.parse(crowdfundingTokensStr)
            res.status(200).json({ crowdfundingTokens: tokens });
        }
    })
}

const tokensByStatus = async (req, res) => {
    const network = req.query.network;
    client.get(`${network}_tokens-by-status`, (err, addressesByStatusStr) => {
        if (err) {
            console.log('Err', err);
            res.status(400).json({ error: 'Error fetching tokens count by status!'});
        } else {
            const countByStatus = JSON.parse(addressesByStatusStr)
            res.status(200).json({ countByStatus });
        }
    })
}

var app = global.app;
app.get('/eth-price', ethPrice);
app.get('/deposit-data', depositData);
app.get('/addresses-by-status', addressesByStatus);
app.get('/tokens-by-status', tokensByStatus);
app.get('/crowdfunding-tokens', crowdfundingTokens);
