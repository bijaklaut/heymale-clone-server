const User = require("./model");
const fs = require("fs");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { rootPath, jwtKey } = require("../../config");

module.exports = {
   createUser: async (req, res) => {
      try {
         const { name, email, password, phoneNumber } = req.body;
         let avatar = "";

         if (req.file) {
            avatar = req.file.filename;
         }

         const newUser = new User({
            name,
            email,
            password,
            phoneNumber,
            avatar,
         });

         await newUser.save();
         delete newUser._doc.password;

         if (newUser) {
            res.status(201).send({
               status: 201,
               payload: newUser,
               message: "User created successfully",
               errorDetail: null,
            });
         }
      } catch (error) {
         // Untuk menghapus file yang diupload
         if (req.file) {
            fs.unlinkSync(req.file.path);
         }

         if (error.name === "ValidationError") {
            return res.status(409).send({
               status: 409,
               payload: null,
               message: "Validation Error",
               errorDetail: error.errors,
            });
         } else if (error.code === 11000) {
            // Mengambil nama field yang menyebabkan error
            const key = Object.keys(error.keyValue)[0];
            res.status(409).send({
               status: 409,
               code: 11000,
               payload: null,
               message: "Failed to create user with existed value",
               errorDetail: {
                  [key]: { message: "Please insert unique value" },
               },
            });
         } else {
            res.status(400).send({
               status: 409,
               payload: null,
               message: "Failed to create user",
               errorDetail: error,
            });
         }
      }
   },
   getUsers: async (req, res) => {
      try {
         const { p = "", search = "" } = req.query;
         let criteria = {};
         let options = {
            pagination: false,
            sort: { createdAt: 1 },
         };

         if (search)
            criteria = {
               ...criteria,
               name: { $regex: `${search}`, $options: "i" },
            };

         if (p)
            options = {
               ...options,
               pagination: true,
               page: p,
               limit: 1,
            };

         const aggregate = User.aggregate([
            {
               $lookup: {
                  from: "addresses",
                  localField: "addresses",
                  foreignField: "_id",
                  as: "addresses",
                  pipeline: [{ $sort: { asDefault: -1 } }],
               },
            },
            { $match: criteria },
            { $sort: { createdAt: 1 } },
         ]);

         // const users = await User.find()
         //    .select("-password")
         //    .populate({
         //       path: "addresses",
         //       options: { sort: { asDefault: -1 } },
         //    });
         const users = await User.aggregatePaginate(aggregate, options);
         res.status(200).send({
            status: 200,
            payload: users,
            message: "Get all users",
            errorDetail: null,
         });
      } catch (error) {
         res.status(500).send({
            status: 500,
            payload: null,
            message: "Internal Server Error",
            errorDetail: error,
         });
      }
   },
   userDetail: async (req, res) => {
      try {
         const { id } = req.params;
         const user = await User.findById(id, "-password -__v").populate(
            "addresses"
         );

         if (user) {
            res.status(200).send({
               status: 200,
               payload: user,
               message: "Get user detail successful",
               errorDetail: null,
            });
         } else {
            res.status(404).send({
               status: 404,
               payload: null,
               message: "Requested data not found",
               errorDetail: error,
            });
         }
      } catch (error) {
         res.status(500).send({
            status: 500,
            payload: null,
            message: "Internal Server Error",
            errorDetail: error,
         });
      }
   },
   updateUser: async (req, res) => {
      try {
         const { id } = req.params;
         const { name, email, phoneNumber } = req.body;
         const oldUser = await User.findById(id);
         let { avatar } = oldUser;

         if (req.file) {
            avatar = req.file.filename;
         }

         const updateUser = await User.findByIdAndUpdate(
            id,
            {
               name,
               email,
               phoneNumber,
               avatar,
            },
            { new: true, runValidators: true }
         );

         if (updateUser) {
            const deletePath = `${rootPath}/public/upload/user/${oldUser.avatar}`;

            if (fs.existsSync(deletePath) && req.file) {
               fs.unlinkSync(deletePath);
            }

            delete updateUser._doc.password;
            res.status(201).send({
               status: 201,
               payload: updateUser,
               message: "User updated successfully",
               errorDetail: null,
            });
         }
      } catch (error) {
         // Untuk menghapus file yang diupload
         if (req.file) {
            fs.unlinkSync(req.file.path);
         }

         if (error.name === "ValidationError") {
            return res.status(409).send({
               status: 409,
               payload: null,
               message: "Validation Error",
               errorDetail: error.errors,
            });
         } else if (error.code === 11000) {
            // Mengambil nama field yang menyebabkan error
            const key = Object.keys(error.keyValue)[0];
            res.status(409).send({
               status: 409,
               code: 11000,
               payload: null,
               message: "Failed to create user with existed value",
               errorDetail: {
                  [key]: { message: "Please insert unique value" },
               },
            });
         } else {
            res.status(400).send({
               status: 400,
               payload: null,
               message: "Unable to handle request",
               errorDetail: error,
            });
         }
      }
   },
   deleteUser: async (req, res) => {
      try {
         const { id } = req.params;
         const { avatar } = await User.findById(id, "avatar -_id");
         const result = await User.findOneAndDelete({ _id: id });

         if (result) {
            const deletePath = `${rootPath}/public/upload/user/${avatar}`;

            if (fs.existsSync(deletePath) && avatar) {
               fs.unlinkSync(deletePath);
            }

            res.status(200).send({
               status: 200,
               payload: result,
               message: "User deleted successfully",
               errorDetail: null,
            });
         } else {
            res.status(404).send({
               status: 404,
               payload: null,
               message: "User not found",
               errorDetail: null,
            });
         }
      } catch (error) {
         res.status(404).send({
            status: 404,
            payload: null,
            message: "Failed to delete user",
            errorDetail: error,
         });
      }
   },
   updatePassword: async (req, res) => {
      try {
         const { id } = req.params;
         const { oldPassword, newPassword } = req.body;

         const user = await User.findById(id);
         const checkPassword = await bcrypt.compare(oldPassword, user.password);

         if (checkPassword) {
            if (oldPassword == newPassword) {
               res.status(409).send({
                  status: 409,
                  payload: null,
                  message: "Existed Password",
                  errorDetail: {
                     newPassword: {
                        message: "New password should be different",
                     },
                  },
               });
            } else {
               user.password = newPassword;
               await user.save();

               delete user._doc.password;
               res.status(201).send({
                  status: 201,
                  payload: user,
                  message: "Password changed successfully",
                  errorDetail: null,
               });
            }
         } else {
            res.status(409).send({
               status: 409,
               payload: null,
               message: "Invalid Password",
               errorDetail: {
                  oldPassword: {
                     message: "Wrong password",
                  },
               },
            });
         }
      } catch (error) {
         res.status(400).send({
            status: 400,
            payload: null,
            message: "Unable to handle request",
            errorDetail: error,
         });
      }
   },
   authSignin: async (req, res) => {
      try {
         const { email, password } = req.body;
         const user = await User.findOne({ email });

         if (!user)
            return res.status(401).send({
               status: 401,
               payload: null,
               message: "Account doesn't exist",
               errorDetail: {
                  email: {
                     message: "Couldn't find your account",
                  },
               },
            });

         const checkPassword = await bcrypt.compare(password, user.password);

         if (!checkPassword)
            return res.status(401).send({
               status: 401,
               payload: null,
               message: "Incorrect password",
               errorDetail: {
                  password: {
                     message: "Password is incorrect",
                  },
               },
            });

         const token = jwt.sign(
            {
               id: user._id,
            },
            jwtKey,
            { expiresIn: "24h" }
         );

         return res.status(200).send({
            status: 200,
            payload: token,
            message: `Welcome, ${user.name}!`,
            errorDetail: null,
         });
      } catch (error) {
         res.status(500).send({
            status: 500,
            payload: null,
            message: "Internal Server Error",
            errorDetail: error,
         });
      }
   },
};
