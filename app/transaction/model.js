const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-aggregate-paginate-v2");

const transactionSchema = mongoose.Schema(
   {
      transaction_id: {
         type: String,
         unique: true,
         required: [true, "Transaction ID is required"],
      },
      order_id: {
         type: String,
         unique: true,
         required: [true, "Order ID is required"],
      },
      merchant_id: {
         type: String,
      },
      gross_amount: {
         type: Number,
         required: [true, "Transaction Amount is required"],
      },
      currency: {
         type: String,
         required: [true, "Currency is required"],
      },
      payment_type: {
         type: String,
         required: [true, "Payment Type is required"],
      },
      transaction_time: {
         type: Date,
         required: [true, "Transaction Time is required"],
      },
      transaction_status: {
         type: String,
         required: [true, "Transaction Status is required"],
      },
      va_numbers: [
         {
            bank: {
               type: String,
            },
            va_number: {
               type: String,
            },
         },
      ],
      fraud_status: {
         type: String,
         required: [true, "Fraud Status is required"],
      },
      bill_key: {
         type: String,
      },
      biller_code: {
         type: String,
      },
      permata_va_number: {
         type: String,
      },
      expiry_time: {
         type: Date,
      },
      manual_updated: {
         type: Boolean,
         default: false,
      },
   },
   { timestamps: true }
);

transactionSchema.plugin(mongoosePaginate);

module.exports = mongoose.model("Transaction", transactionSchema);
