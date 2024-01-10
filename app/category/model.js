const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const categorySchema = mongoose.Schema(
   {
      name: {
         type: String,
         unique: true,
         required: [true, "Category name is required"],
         minLength: [3, "Category name minimum length is 3 character"],
         maxLength: [50, "Category name maximum length is 50 character"],
      },
   },
   {
      timestamps: true,
   }
);

categorySchema.plugin(mongoosePaginate);

module.exports = mongoose.model("Category", categorySchema);
