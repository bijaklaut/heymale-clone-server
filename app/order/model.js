const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-aggregate-paginate-v2");

const orderSchema = mongoose.Schema(
   {
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
            _id: {
               type: mongoose.Schema.Types.ObjectId,
               ref: "Product",
            },
            item_name: {
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
      status: {
         type: String,
      },
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
         voucher_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Voucher",
         },
         value: {
            type: Number,
         },
      },
      shippingFee: {
         type: Number,
         required: [true, "Price is required"],
      },
      price: {
         type: Number,
         required: [true, "Price is required"],
      },
      totalPrice: {
         type: Number,
         required: [true, "Total Price is required"],
      },
      manualUpdated: {
         type: Boolean,
         default: false,
      },
   },
   { timestamps: true }
);

orderSchema.plugin(mongoosePaginate);

module.exports = mongoose.model("Order", orderSchema);
