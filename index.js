/**
 * Kleros T2CR Dashboard Backend - Application file
 *
 * @author Jefferson Sofarelli<jmsofarelli@protonmail.com>
 * @date 30.10.2019
 */
const express = require('express');
const http = require('http');

// Initialize Redis server
require("./util/redis");

// Fetch data on app initialization
const fetchData = require('./util/fetchData');
fetchData.fetchEthPrice();
fetchData.fetchDataMain();
fetchData.fetchDataKovan();

// Schedule data refreshing
setInterval(fetchData.fetchEthPrice, 10 * 60 * 1000);  // Update each 10 minutes
setInterval(fetchData.fetchDataMain, 90 * 60 * 1000);  // Update each 90 minutes
setInterval(fetchData.fetchDataKovan, 360 * 60 * 1000); // Update each 6 hours

// Configure Express app
const app = global.app = express();
app.set('port', process.env.PORT || 4000);

// Enabling CORS requests
app.use(function(req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	next();
});

// Configure Express routes
require('./routes');

// Create and start server
http.createServer(app).listen(4000, function(){
	console.log('Kleros T2CR Dashboard Backend Server listening on port 4000');
});
