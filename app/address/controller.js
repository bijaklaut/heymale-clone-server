const User = require("../user/model");
const Address = require("./model");

module.exports = {
   createAddress: async (req, res) => {
      try {
         const {
            addressLabel,
            recipientName,
            address,
            addressNote,
            addressArea,
            phone,
            user,
            asDefault,
         } = req.body;

         const totalAddress = await Address.find({ user: user });
         const isFirst = totalAddress.length == 0;

         if (asDefault) {
            await Address.findOneAndUpdate(
               { $and: [{ user: user }, { asDefault: true }] },
               { asDefault: false }
            );
         }

         const newAddress = new Address({
            addressLabel,
            recipientName,
            address,
            addressNote,
            addressArea,
            phone,
            user,
            asDefault: isFirst ? true : asDefault,
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
            addressNote,
            addressArea,
            phone,
            user,
            asDefault,
         } = req.body;

         if (asDefault) {
            await Address.findOneAndUpdate(
               { $and: [{ user: user }, { asDefault: true }] },
               { asDefault: false }
            );
         }

         const updateAddress = await Address.findByIdAndUpdate(
            id,
            {
               addressLabel,
               recipientName,
               address,
               addressNote,
               addressArea,
               phone,
               user,
               asDefault,
            },
            { new: true, runValidators: true }
         );

         res.status(201).send({
            status: 201,
            payload: updateAddress,
            message: "Address updated successfully",
            errorDetail: null,
         });
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

         await Address.findOneAndUpdate(
            {
               $and: [{ user: address.user }, { _id: { $ne: id } }],
            },
            { asDefault: true }
         );

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
   testQuery: async (req, res) => {
      try {
         // const {
         //    addressLabel,
         //    recipientName,
         //    address,
         //    province,
         //    city,
         //    postcode,
         //    phone,
         //    user,
         //    asDefault: asDefaultReq,
         // } = req.body;
         // const totalAddress = await Address.find({ user: address.user });
         // const isFirst = totalAddress.length == 0;

         // const theDefault = await Address.find({
         //    user,
         // });

         const { id } = req.params;

         const address = await Address.findById(id);
         const otherAddress = await Address.findOneAndUpdate(
            {
               $and: [{ user: address.user }, { _id: { $ne: id } }],
            },
            { asDefault: true }
         );

         res.status(201).send({
            status: 201,
            payload: otherAddress,
            message: "Address added successfully",
         });

         // const newAddress = new Address({
         //    addressLabel,
         //    recipientName,
         //    address,
         //    province,
         //    city,
         //    postcode,
         //    phone,
         //    user,
         //    asDefault: asDefaultReq,
         // });

         // await newAddress.save();

         // if (newAddress) {
         //    const theUser = await User.findById(user);

         //    theUser.addresses.push(newAddress._id);
         //    await theUser.save();

         //    if (theUser) {
         //       res.status(201).send({
         //          status: 201,
         //          payload: newAddress,
         //          message: "Address added successfully",
         //          errorDetail: null,
         //       });
         //    }
         // }
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
};
