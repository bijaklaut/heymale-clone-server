const express = require("express");
const {
   getPayments,
   createPayment,
   deletePayment,
   detailPayment,
   updatePayment,
} = require("./controller");
const { isLogin } = require("../middleware/auth");
const router = express.Router();

/* GET home page. */
router.get("/", getPayments);
router.post("/create", isLogin, createPayment);
router.get("/:id", detailPayment);
router.put("/:id", isLogin, updatePayment);
router.delete("/:id", isLogin, deletePayment);

module.exports = router;
