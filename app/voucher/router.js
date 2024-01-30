const express = require("express");
const router = express.Router();
const { createVoucher, getVouchers, deleteVoucher } = require("./controller");
const { isLogin } = require("../middleware/auth");
const multer = require("multer");
const upload = multer();

router.post("/create", isLogin, upload.none(), createVoucher);
router.post("/", upload.none(), getVouchers);
router.delete("/:id", isLogin, deleteVoucher);

module.exports = router;
