const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-aggregate-paginate-v2");

const orderSchema = mongoose.Schema({
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
         thumbnail: {
            type: String,
         },
      },
   ],
   shippingDetail: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shipment",
   },
   transaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
      required: [true, "Transaction is required"],
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

orderSchema.plugin(mongoosePaginate);

module.exports = mongoose.model("Order", orderSchema);
