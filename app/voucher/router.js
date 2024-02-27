const express = require("express");
const router = express.Router();
const {
   createVoucher,
   getVouchers,
   deleteVoucher,
   updateVoucher,
   getVoucherDetail,
   getAvailableVoucher,
} = require("./controller");
const { isLogin } = require("../middleware/auth");
const multer = require("multer");
const upload = multer();

router.post("/", upload.none(), getVouchers);
router.get("/detail/:id", getVoucherDetail);
router.get("/available", getAvailableVoucher);
router.post("/create", isLogin, upload.none(), createVoucher);
router.put("/update", isLogin, upload.none(), updateVoucher);
router.delete("/:id", isLogin, deleteVoucher);

module.exports = router;
