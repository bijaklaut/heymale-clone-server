const mongoose = require("mongoose");
const { databaseUrl } = require("../config");

mongoose.connect(databaseUrl);

const database = mongoose.connection;

module.exports = database;
