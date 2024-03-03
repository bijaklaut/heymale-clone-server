const express = require("express");
const router = express.Router();
const { createShipment, getShipments } = require("./controller");
const { isLogin } = require("../middleware/auth");
const multer = require("multer");
const upload = multer();

router.post("/", upload.none(), getShipments);
router.post("/create", createShipment);

module.exports = router;
