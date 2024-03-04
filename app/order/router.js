const express = require("express");
const router = express.Router();
const {
   createOrder,
   paymentHooks,
   createShippingOrder,
   shipmentHooks,
   getOrders,
   getOrderDetail,
} = require("./controller");
const { isLogin } = require("../middleware/auth");
const multer = require("multer");
const upload = multer();

router.post("/", upload.none(), getOrders);
router.get("/:invoice", upload.none(), isLogin, getOrderDetail);
router.post("/create", upload.none(), isLogin, createOrder);
router.post("/paymenthooks", upload.none(), paymentHooks);
router.post("/shipping", upload.none(), createShippingOrder);
router.post("/shipmenthooks", upload.none(), shipmentHooks);

module.exports = router;
