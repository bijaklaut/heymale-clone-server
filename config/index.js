const dotenv = require("dotenv");
const path = require("path");
dotenv.config();

module.exports = {
   SERVICE_NAME: process.env.SERVICE_NAME,
   DATABASE_URL: process.env.DATABASE_URL,
   ROOT_PATH: path.resolve(__dirname, ".."),
   SECRET_KEY: process.env.SECRET_KEY,
   MIDTRANS_BASEURL_SBOX: process.env.MIDTRANS_BASEURL_SBOX,
   MIDTRANS_CLIENTKEY_SBOX: process.env.MIDTRANS_CLIENTKEY_SBOX,
   MIDTRANS_SERVERKEY_SBOX: process.env.MIDTRANS_SERVERKEY_SBOX,
   BITESHIP_BASEURL: process.env.BITESHIP_BASEURL,
   BITESHIP_TEST_TOKEN: process.env.BITESHIP_TEST_TOKEN,
   BITESHIP_WEBHOOKS_SIGNATURE: process.env.BITESHIP_WEBHOOKS_SIGNATURE,
   EXPIRED_ACCESS: 1000 * 60 * 15, // 15 MINUTES
   EXPIRED_REFRESH: 1000 * 60 * 60 * 24 * 14, // 14 DAYS
   AWS_S3_BUCKET: process.env.CYCLIC_BUCKET_NAME,
   AWS_REGION: process.env.AWS_REGION,
   AWS_SIGNEDURL_EXPIRE: 3600,
};
