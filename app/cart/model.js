const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const cartSchema = mongoose.Schema(
   {
      user: {
         type: mongoose.Schema.Types.ObjectId,
         ref: "User",
      },
      items: [
         {
            _id: {
               type: mongoose.Schema.Types.ObjectId,
               ref: "Product",
            },
            item_name: {
               type: String,
            },
            thumbnail: {
               type: String,
            },
            price: {
               type: String,
            },
            variants: {
               s: {
                  type: Number,
               },
               m: {
                  type: Number,
               },
               l: {
                  type: Number,
               },
               xl: {
                  type: Number,
               },
            },
         },
      ],
   },
   {
      timestamps: true,
   }
);

cartSchema.plugin(mongoosePaginate);

module.exports = mongoose.model("Cart", cartSchema);
