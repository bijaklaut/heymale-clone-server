const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-aggregate-paginate-v2");

const productSchema = mongoose.Schema(
   {
      name: {
         type: String,
         unique: true,
         required: [true, "Product name is required"],
         minLength: [3, "Product name minimum length is 3 character"],
         maxLength: [255, "Product name maximum length is 255 character"],
      },
      category: {
         type: mongoose.Schema.Types.ObjectId,
         ref: "Category",
         required: [true, "Product category is required"],
      },
      variant: {
         s: {
            type: Number,
            min: [0, "Variant minimum value is 0"],
            default: 0,
            required: [true, "Product variant is required"],
         },
         m: {
            type: Number,
            min: [0, "Variant minimum value is 0"],
            default: 0,
            required: [true, "Product variant is required"],
         },
         l: {
            type: Number,
            min: [0, "Variant minimum value is 0"],
            default: 0,
            required: [true, "Product variant is required"],
         },
         xl: {
            type: Number,
            min: [0, "Variant minimum value is 0"],
            default: 0,
            required: [true, "Product variant is required"],
         },
      },
      price: {
         type: Number,
         required: [true, "Product price is required"],
      },
      description: {
         type: String,
         required: [true, "Product description is required"],
         minLength: [3, "Description minimum length is 3 character"],
         maxLength: [1000, "Description maximum length is 1000 character"],
      },
      thumbnail: {
         type: String,
      },
      status: {
         type: String,
         enum: ["Active", "Inactive"],
         default: "Active",
      },
      weight: {
         type: Number,
         default: 200,
      },
   },
   {
      timestamps: true,
   }
);

productSchema.plugin(mongoosePaginate);

module.exports = mongoose.model("Product", productSchema);
