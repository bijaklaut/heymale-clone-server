const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const paymentSchema = mongoose.Schema(
   {
      ownerName: {
         type: String,
         required: [true, "Owner name is required"],
         minLength: [3, "Owner name minimum length is 3 character"],
         maxLength: [255, "Owner name maximum length is 255 character"],
      },
      accountNo: {
         type: String,
         unique: true,
         required: [true, "Account Number is required"],
         minLength: [5, "Account Number minimum length is 5 character"],
         maxLength: [25, "Account Number maximum length is 25 character"],
      },
      bankName: {
         type: String,
         required: [true, "Bank name is required"],
         minLength: [3, "Bank name minimum length is 3 character"],
         maxLength: [25, "Bank name maximum length is 25 character"],
      },
   },
   {
      timestamps: true,
   }
);

paymentSchema.plugin(mongoosePaginate);

module.exports = mongoose.model("Payment", paymentSchema);
