const dotenv = require("dotenv");
const path = require("path");
dotenv.config();

module.exports = {
   serviceName: process.env.SERVICE_NAME,
   databaseUrl: process.env.DATABASE_URL_LOCAL,
   rootPath: path.resolve(__dirname, ".."),
   jwtKey: process.env.SECRET_KEY,
};
