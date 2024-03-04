const express = require("express");
const router = express.Router();
const {
   createAddress,
   getAddresses,
   addressDetail,
   deleteAddress,
   updateAddress,
   testQuery,
   getAddressByUser,
} = require("./controller");
const { isLogin } = require("../middleware/auth");
const multer = require("multer");
const upload = multer();

router.get("/", isLogin, getAddresses);
router.post("/create", isLogin, upload.none(), createAddress);
router.get("/detail/:id", isLogin, addressDetail);
router.put("/update/:id", isLogin, upload.none(), updateAddress);
router.delete("/:id", isLogin, deleteAddress);
router.post("/byuser", isLogin, upload.none(), getAddressByUser);

module.exports = router;
