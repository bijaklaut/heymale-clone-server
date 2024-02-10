const mongoose = require("mongoose");

const addressSchema = mongoose.Schema(
   {
      addressLabel: {
         type: String,
         required: [true, "Address Label is required"],
         minLength: [3, "Address Label length must be between 3-50 characters"],
         maxLength: [
            50,
            "Address Label length must be between 3-50 characters",
         ],
      },
      recipientName: {
         type: String,
         required: [true, "Recipient's name is required"],
         minLength: [
            3,
            "Recipient's name length must be between 3-50 characters",
         ],
         maxLength: [
            50,
            "Recipient's name length must be between 3-50 characters",
         ],
      },
      address: {
         type: String,
         required: [true, "Address is required"],
         maxLength: [500, "Address maximum length is 500 characters"],
      },
      addressNote: {
         type: String,
         maxLength: [100, "Address Note maximum length is 100 characters"],
      },
      phone: {
         type: String,
         required: [true, "Recipient's contact phone is required"],
         minLength: [
            8,
            "Recipient's contact phone length must be between 8-15 characters",
         ],
         maxLength: [
            15,
            "Recipient's contact phone length must be between 8-15 characters",
         ],
      },
      addressArea: {
         areaId: {
            type: String,
            required: [true, "Area ID is required"],
         },
         province: {
            type: String,
            required: [true, "Province is required"],
         },
         city: {
            type: String,
            required: [true, "City is required"],
         },
         district: {
            type: String,
            required: [true, "District is required"],
         },
         postalCode: {
            type: String,
            required: [true, "Postal Code is required"],
         },
      },
      user: {
         type: mongoose.Schema.Types.ObjectId,
         ref: "User",
      },
      asDefault: {
         type: Boolean,
      },
   },
   {
      timestamps: true,
   }
);

module.exports = mongoose.model("Address", addressSchema);
