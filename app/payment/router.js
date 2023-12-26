const express = require("express");
const {
   getPayments,
   createPayment,
   deletePayment,
   detailPayment,
   updatePayment,
} = require("./controller");
const router = express.Router();

/* GET home page. */
router.get("/", getPayments);
router.post("/create", createPayment);
router.get("/:id", detailPayment);
router.put("/:id", updatePayment);
router.delete("/:id", deletePayment);

module.exports = router;
