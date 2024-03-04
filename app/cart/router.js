const express = require("express");
const router = express.Router();
const multer = require("multer");
const { postCart, getUserCart, emptyCart } = require("./controller");
const upload = multer();

/* GET home page. */
router.post("/usercart", upload.none(), getUserCart);
router.post("/updatecart", upload.none(), postCart);
router.delete("/:user", upload.none(), emptyCart);

module.exports = router;
