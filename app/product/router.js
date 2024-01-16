const express = require("express");
const router = express.Router();
const { upload, multerMiddleware } = require("./multer-config");
const {
   createProduct,
   getProducts,
   productDetail,
   updateProduct,
   deleteProduct,
} = require("./controller");
const { isLogin } = require("../middleware/auth");

// router.get("/", getProducts);
router.post("/", getProducts);
router.post(
   "/create",
   isLogin,
   multerMiddleware(upload.single("thumbnail")),
   createProduct
);
router.get("/detail/:id", productDetail);
router.put(
   "/update/:id",
   isLogin,
   multerMiddleware(upload.single("thumbnail")),
   updateProduct
);
router.delete("/:id", isLogin, deleteProduct);

module.exports = router;
