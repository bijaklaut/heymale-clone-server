const dotenv = require("dotenv");
const path = require("path");
dotenv.config();

module.exports = {
   serviceName: process.env.SERVICE_NAME,
   databaseUrl: process.env.DATABASE_URL,
   rootPath: path.resolve(__dirname, ".."),
   jwtKey: process.env.SECRET_KEY,
   midBaseURLDev: process.env.MID_SANDBOX,
   midClientDev: process.env.MID_SANDBOX_CLIENT,
   midServerDev: process.env.MID_SANDBOX_SERVER,
   biteshipBaseURL: process.env.BITESHIP_BASEURL,
   biteshipTestToken: process.env.BITESHIP_TEST_TOKEN,
   biteshipSignature: process.env.BITESHIP_WEBHOOKS_SIGNATURE,
};
