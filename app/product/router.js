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

router.get("/", getProducts);
router.post(
   "/create",
   multerMiddleware(upload.single("thumbnail")),
   createProduct
);
router.get("/detail/:id", productDetail);
router.put(
   "/update/:id",
   multerMiddleware(upload.single("thumbnail")),
   updateProduct
);
router.delete("/:id", deleteProduct);

module.exports = router;
