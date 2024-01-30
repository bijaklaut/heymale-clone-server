const express = require("express");
const router = express.Router();
const { createVoucher, getVouchers } = require("./controller");
const { isLogin } = require("../middleware/auth");
const multer = require("multer");
const upload = multer();

router.post("/create", isLogin, upload.none(), createVoucher);
router.post("/", upload.none(), getVouchers);

module.exports = router;
