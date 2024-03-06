const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-aggregate-paginate-v2");

const testSchema = mongoose.Schema({
   name: {
      type: String,
      unique: true,
      required: [true, "Product name is required"],
      minLength: [3, "Product name minimum length is 3 character"],
      maxLength: [255, "Product name maximum length is 255 character"],
   },
   thumbnail: {
      type: String,
   },
});

testSchema.plugin(mongoosePaginate);

module.exports = mongoose.model("Test", testSchema);
