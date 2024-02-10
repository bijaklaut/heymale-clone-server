const express = require("express");
const router = express.Router();
const { createTransaction } = require("./controller");
const { isLogin } = require("../middleware/auth");
const multer = require("multer");
const upload = multer();

router.post("/create", upload.none(), createTransaction);
// router.get("/detail/:id", getVoucherDetail);
// router.post("/create", isLogin, upload.none(), createVoucher);
// router.put("/update", isLogin, upload.none(), updateVoucher);
// router.delete("/:id", isLogin, deleteVoucher);

module.exports = router;
