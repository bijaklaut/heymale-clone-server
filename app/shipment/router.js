const express = require("express");
const router = express.Router();
const { createShipment } = require("./controller");
const { isLogin } = require("../middleware/auth");

router.post("/create", createShipment);

module.exports = router;
