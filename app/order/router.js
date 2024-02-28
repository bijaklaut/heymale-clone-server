const express = require("express");
const router = express.Router();
const {
   createOrder,
   paymentHooks,
   createShippingOrder,
   shipmentHooks,
   getOrders,
} = require("./controller");
const { isLogin } = require("../middleware/auth");
const multer = require("multer");
const upload = multer();

router.post("/", upload.none(), getOrders);

router.post("/create", upload.none(), isLogin, createOrder);
router.post("/paymenthooks", upload.none(), paymentHooks);
router.post("/shipping", upload.none(), createShippingOrder);
router.post("/shipmenthooks", upload.none(), shipmentHooks);

// router.get("/detail/:id", getVoucherDetail);
// router.post("/create", isLogin, upload.none(), createVoucher);
// router.put("/update", isLogin, upload.none(), updateVoucher);
// router.delete("/:id", isLogin, deleteVoucher);

module.exports = router;
