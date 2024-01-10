const express = require("express");
const {
   getCategories,
   createCategory,
   updateCategory,
   deleteCategory,
   detailCategory,
} = require("./controller");
const { isLogin } = require("../middleware/auth");
const router = express.Router();

/* GET home page. */
router.get("/", getCategories);
router.post("/create", isLogin, createCategory);
router.get("/:id", detailCategory);
router.put("/:id", isLogin, updateCategory);
router.delete("/:id", isLogin, deleteCategory);

module.exports = router;
