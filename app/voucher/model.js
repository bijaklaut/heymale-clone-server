const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-aggregate-paginate-v2");

const voucherSchema = mongoose.Schema({
   voucherName: {
      type: String,
      required: [true, "Voucher Name is required"],
      minLength: [3, "Voucher Name length must be between 3-50 characters"],
      maxLength: [50, "Voucher Name length must be between 3-50 characters"],
   },
   conditions: {
      type: String,
      required: [true, "Voucher Conditions is required"],
      enum: [
         "Minimal Transaction",
         "Particular Product",
         "Particular Category",
         "None",
      ],
   },
   minTransaction: {
      type: Number,
      required: [
         function () {
            return this.conditions == "Minimal Transaction";
         },
         "Voucher's Minimal Transaction is required",
      ],
   },
   validProducts: [
      {
         type: mongoose.Schema.Types.ObjectId,
         ref: "Product",
         required: [
            function () {
               return this.conditions == "Particular Product";
            },
            "Voucher's Valid Products is required",
         ],
      },
   ],
   validCategories: [
      {
         type: mongoose.Schema.Types.ObjectId,
         ref: "Category",
         required: [
            function () {
               return this.conditions == "Particular Category";
            },
            "Voucher's Valid Categories is required",
         ],
      },
   ],
   voucherCode: {
      type: String,
      required: [true, "Voucher Code is required"],
      minLength: [3, "Voucher Code length must be between 3-50 characters"],
      maxLength: [50, "Voucher Code length must be between 3-50 characters"],
   },
   value: {
      type: Number,
      required: [true, "Voucher Value is required"],
   },
   validUntil: {
      type: Date,
      required: [true, "Voucher Validity Period is required"],
   },
   status: {
      type: String,
      enum: ["Active", "Inactive"],
   },
   voucherQuota: {
      type: Number,
      required: [true, "Voucher Quota is required"],
   },
});

voucherSchema.plugin(mongoosePaginate);

module.exports = mongoose.model("Voucher", voucherSchema);
