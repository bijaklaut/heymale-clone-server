const express = require("express");
const router = express.Router();
const {
   createUser,
   getUsers,
   deleteUser,
   userDetail,
   updateUser,
   updatePassword,
   authSignin,
} = require("./controller");
const { multerMiddleware, upload } = require("./multer-config");
const { isLogin } = require("../middleware/auth");

router.get("/", isLogin, getUsers);
router.post(
   "/create",
   isLogin,
   multerMiddleware(upload.single("avatar")),
   createUser
);
router.get("/detail/:id", userDetail);
router.put(
   "/update/:id",
   isLogin,
   multerMiddleware(upload.single("avatar")),
   updateUser
);
router.delete("/:id", isLogin, deleteUser);
router.put("/reauth/:id", multerMiddleware(upload.none()), updatePassword);

// Auth
router.post("/signin", multerMiddleware(upload.none()), authSignin);

module.exports = router;
