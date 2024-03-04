const mongoose = require("mongoose");
const { DATABASE_URL } = require("../config");

mongoose.connect(DATABASE_URL);

const database = mongoose.connection;

module.exports = database;
