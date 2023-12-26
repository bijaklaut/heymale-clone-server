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
      province: {
         id: {
            type: String,
            required: [true, "Province is required"],
         },
         name: {
            type: String,
            required: [true, "Province is required"],
         },
      },
      city: {
         id: {
            type: String,
            required: [true, "City is required"],
         },
         name: {
            type: String,
            required: [true, "City is required"],
         },
      },
      postcode: {
         type: String,
         required: [true, "Postal code is required"],
         minLength: [3, "Postal code length must be between 3-10 characters"],
         maxLength: [10, "Postal code length must be between 3-10 characters"],
      },
      phone: {
         type: String,
         required: [true, "Phone number is required"],
         minLength: [8, "Phone number length must be between 8-15 characters"],
         maxLength: [15, "Phone number length must be between 8-15 characters"],
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
