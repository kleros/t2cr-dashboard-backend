<p align="center">
  <b style="font-size: 32px;">T²CR Dashboard Backend</b>
</p>

Service and database for caching statistics on the T²CR and Badges.

## Get Started

1.  Clone this repo.
2.  Duplicate `.env.example`, rename it to `.env` and fill in the environment variables.
3.  Run `npm install` to install dependencies and then `npm start` to run the service in development mode.

> To run the service in production mode use `node -r dotenv/config index.js`.
> To start with PM2 use `pm2 start --node-args="-r dotenv/config" index.js --name t2cr-dashboard-backend`