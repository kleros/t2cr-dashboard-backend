var redis = require('redis');
var client = redis.createClient();

client.on('connect', function() {
    console.log('Redis client connected!');
});

client.on('error', function (err) {
    console.log('Error connecing to Redis server' + err);
});

module.exports = client;
