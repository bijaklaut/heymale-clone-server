const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const saltRounds = 10;

const userSchema = mongoose.Schema(
   {
      name: {
         type: String,
         required: [true, "User name is required"],
         minLength: [3, "User name minimum length is 3 character"],
         maxLength: [255, "User name maximum length is 255 character"],
      },
      email: {
         type: String,
         unique: true,
         required: [true, "Email is required"],
      },
      password: {
         type: String,
         required: [true, "Password is required"],
         minLength: [8, "Password length must be between 8-255 characters"],
         maxLength: [255, "Password length must be between 8-255 characters"],
      },
      phoneNumber: {
         type: String,
         unique: true,
         required: [true, "Phone number is required"],
         minLength: [8, "Phone number length must be between 8-15 characters"],
         maxLength: [15, "Phone number length must be between 8-15 characters"],
      },
      role: {
         type: String,
         enum: ["Customer", "Administrator", "Superadmin"],
         default: "Customer",
      },
      avatar: {
         type: String,
      },
      addresses: [
         {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Address",
         },
      ],
      status: {
         type: String,
         enum: ["Active", "Inactive"],
         default: "Active",
      },
   },
   {
      timestamps: true,
   }
);

// Password Encryption
userSchema.pre("save", function (next) {
   let user = this;

   // Only hash the password if it has been modified
   if (!user.isModified("password")) return next();

   bcrypt.hash(user.password, saltRounds, function (err, hash) {
      if (err) return next(err);

      user.password = hash;
      next();
   });
});
// userSchema.index({ "addresses.asDefault": 1, email: 1 }, { unique: true });
module.exports = mongoose.model("User", userSchema);
