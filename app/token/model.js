const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const saltRounds = 10;

const tokenSchema = mongoose.Schema(
   {
      user: {
         type: mongoose.Schema.Types.ObjectId,
         ref: "User",
      },
      refresh_token: {
         type: String,
         unique: true,
      },
      expire_date: {
         type: Date,
      },
   },
   {
      timestamps: true,
   }
);

// Password Encryption
tokenSchema.pre("save", function (next) {
   let token = this;

   // Only hash the password if it has been modified
   if (!token.isModified("refresh_token")) return next();

   bcrypt.hash(token.refresh_token, saltRounds, function (err, hash) {
      if (err) return next(err);

      token.refresh_token = hash;
      next();
   });
});

// Token Time-To-Live - Auto remove after 14 days (MUST MATCH WITH EXPIRED TIME FROM USER CONTROLLER)
// 14 days = 1209600 seconds
tokenSchema.index({ createdAt: 1 }, { expireAfterSeconds: 1209600 });

module.exports = mongoose.model("Token", tokenSchema);
