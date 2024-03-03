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
   authRefresh,
   authSignOut,
} = require("./controller");
const { multerMiddleware, upload } = require("./multer-config");
const { isLogin } = require("../middleware/auth");

router.get("/", getUsers);
router.post(
   "/create",
   isLogin,
   multerMiddleware(upload.single("avatar")),
   createUser
);
router.get("/:id", userDetail);
router.put(
   "/update/:id",
   isLogin,
   multerMiddleware(upload.single("avatar")),
   updateUser
);
router.delete("/:id", isLogin, deleteUser);
router.put(
   "/reauth/:id",
   isLogin,
   multerMiddleware(upload.none()),
   updatePassword
);

// Auth
router.post("/signin", multerMiddleware(upload.none()), authSignin);
router.post("/refresh", authRefresh);
router.post("/signout", authSignOut);

module.exports = router;
