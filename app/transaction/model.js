const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-aggregate-paginate-v2");

const transactionSchema = mongoose.Schema({
   invoice: {
      type: String,
      unique: true,
      required: [true, "Transaction Invoice is required"],
   },
   user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
   },
   orderItem: [
      {
         productName: {
            type: String,
            required: [true, "Product Name is required"],
         },
         quantity: {
            type: Number,
            required: [true, "Quantity is required"],
         },
         price: {
            type: Number,
            required: [true, "Price is required"],
         },
      },
   ],
   shippingAddress: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Address",
      required: [true, "Shipping Address is required"],
   },
   shippingFee: {
      type: Number,
      required: [true, "Shipping Fee is required"],
   },
   payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      required: [true, "Payment is required"],
   },
   voucher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Voucher",
   },
   price: {
      type: Number,
      required: [true, "Price is required"],
   },
   totalPrice: {
      type: Number,
      required: [true, "Total Price is required"],
   },
});

transactionSchema.plugin(mongoosePaginate);

module.exports = mongoose.model("Transaction", transactionSchema);
