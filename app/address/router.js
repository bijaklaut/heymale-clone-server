const express = require("express");
const router = express.Router();
const {
   createAddress,
   getAddresses,
   addressDetail,
   deleteAddress,
   updateAddress,
} = require("./controller");
const { multerMiddleware, upload } = require("./multer-config");
const { isLogin } = require("../middleware/auth");

router.get("/", isLogin, getAddresses);
router.post("/create", isLogin, multerMiddleware(upload.none()), createAddress);
router.get("/detail/:id", isLogin, addressDetail);
router.put(
   "/update/:id",
   isLogin,
   multerMiddleware(upload.none()),
   updateAddress
);
router.delete("/:id", isLogin, deleteAddress);

module.exports = router;
