const User = require("../user/model");
const Address = require("./model");

module.exports = {
   createAddress: async (req, res) => {
      try {
         const {
            addressLabel,
            recipientName,
            address,
            province,
            city,
            postcode,
            phone,
            user,
            asDefault: asDefaultReq,
         } = req.body;

         if (asDefaultReq) {
            await Address.updateOne(
               {
                  user,
                  asDefault: true,
               },
               { asDefault: false }
            );
         }

         const newAddress = new Address({
            addressLabel,
            recipientName,
            address,
            province,
            city,
            postcode,
            phone,
            user,
            asDefault: asDefaultReq,
         });

         await newAddress.save();

         if (newAddress) {
            const theUser = await User.findById(user);

            theUser.addresses.push(newAddress._id);
            await theUser.save();

            if (theUser) {
               res.status(201).send({
                  status: 201,
                  payload: newAddress,
                  message: "Address added successfully",
                  errorDetail: null,
               });
            }
         }
      } catch (error) {
         if (error.name === "ValidationError") {
            return res.status(409).send({
               status: 409,
               payload: null,
               message: "Validation Error",
               errorDetail: error.errors,
            });
         } else if (error.code === 11000) {
            // Mengambil nama field yang menyebabkan error
            const key = Object.keys(error.keyValue)[0];
            res.status(409).send({
               status: 409,
               code: 11000,
               payload: null,
               message: "Failed to create user with existed value",
               errorDetail: {
                  [key]: { message: "Please insert unique value" },
               },
            });
         } else {
            res.status(400).send({
               status: 400,
               payload: null,
               message: "Failed to create user",
               errorDetail: error,
            });
         }
      }
   },
   getAddresses: async (req, res) => {
      try {
         const addresses = await Address.find();

         res.status(200).send({
            status: 200,
            payload: addresses,
            message: "Get all addresses successful",
            errorDetail: null,
         });
      } catch (error) {
         res.status(400).send({
            status: 400,
            payload: null,
            message: "Bad request",
            errorDetail: error,
         });
      }
   },
   addressDetail: async (req, res) => {
      try {
         const { id } = req.params;
         const address = await Address.findById(id);

         res.status(200).send({
            status: 200,
            payload: address,
            message: "Get address detail successful",
            errorDetail: null,
         });
      } catch (error) {
         res.status(400).send({
            status: 400,
            payload: null,
            message: "Bad request",
            errorDetail: error,
         });
      }
   },
   updateAddress: async (req, res) => {
      try {
         const { id } = req.params;
         const {
            addressLabel,
            recipientName,
            address,
            province,
            city,
            district,
            postcode,
            phone,
            user,
            asDefault,
         } = req.body;

         if (asDefault) {
            const checkAddress = await Address.findOne({
               user,
               asDefault: true,
            });

            if (checkAddress) {
               checkAddress.asDefault = false;
               await checkAddress.save();
            }
         }

         const updateAddress = await Address.findByIdAndUpdate(
            id,
            {
               addressLabel,
               recipientName,
               address,
               province,
               city,
               district,
               postcode,
               phone,
               user,
               asDefault,
            },
            { new: true, runValidators: true }
         );

         if (updateAddress) {
            const theUser = await User.findById(user);

            theUser.addresses.push(updateAddress._id);
            await theUser.save();

            if (theUser) {
               res.status(201).send({
                  status: 201,
                  payload: updateAddress,
                  message: "Address updated successfully",
                  errorDetail: null,
               });
            }
         }
      } catch (error) {
         if (error.name === "ValidationError") {
            return res.status(409).send({
               status: 409,
               payload: null,
               message: "Validation Error",
               errorDetail: error.errors,
            });
         } else if (error.code === 11000) {
            // Mengambil nama field yang menyebabkan error
            const key = Object.keys(error.keyValue)[0];
            res.status(409).send({
               status: 409,
               code: 11000,
               payload: null,
               message: "Failed to create user with existed value",
               errorDetail: {
                  [key]: { message: "Please insert unique value" },
               },
            });
         } else {
            res.status(400).send({
               status: 400,
               payload: null,
               message: "Failed to create user",
               errorDetail: error,
            });
         }
      }
   },
   deleteAddress: async (req, res) => {
      try {
         const { id } = req.params;

         const address = await Address.findById(id);
         const theUser = await User.findById(address.user);
         theUser.addresses.pull({ _id: id });

         await theUser.save();

         const deleteAddress = await Address.findOneAndDelete({ _id: id });

         if (deleteAddress) {
            res.status(200).send({
               status: 200,
               payload: deleteAddress,
               message: "Address deleted successfully",
               errorDetail: null,
            });
         } else {
            // Handling error yang disebabkan ketika object sudah terhapus namun tidak masuk ke .catch/error
            res.status(404).send({
               status: 404,
               payload: null,
               message: "Address not found",
               errorDetail: null,
            });
         }
      } catch (error) {
         res.status(400).send({
            status: 400,
            payload: null,
            message: "Failed to delete address",
            errorDetail: error,
         });
      }
   },
};
