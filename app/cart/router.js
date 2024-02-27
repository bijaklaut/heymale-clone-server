const express = require("express");
const { isLogin } = require("../middleware/auth");
const router = express.Router();
const multer = require("multer");
const { postCart, getUserCart } = require("./controller");
const upload = multer();

/* GET home page. */
router.post("/usercart", upload.none(), getUserCart);
router.post("/updatecart", upload.none(), postCart);

module.exports = router;
