const express = require("express");
const router = express.Router();
const { upload, multerMiddleware } = require("./multer-aws");
const {
   createProduct,
   getProducts,
   productDetail,
   updateProduct,
   deleteProduct,
   awsTest,
   getTest,
   getCatalog,
} = require("./controller");
const { isLogin } = require("../middleware/auth");

// router.get("/", getProducts);
router.get("/catalog", getCatalog);
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
router.post(
   "/testupload",
   multerMiddleware(upload.single("thumbnail")),
   awsTest
);
router.get("/gettest", getTest);

module.exports = router;
