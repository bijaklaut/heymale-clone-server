const express = require("express");
const router = express.Router();
const { cancelTransaction, createTransaction } = require("./controller");
// const { isLogin } = require("../middleware/auth");
const multer = require("multer");

const upload = multer();

router.post("/create", upload.none(), createTransaction);
router.post("/:order_id/cancel", upload.none(), cancelTransaction);

module.exports = router;
