const { default: mongoose } = require("mongoose");
const Cart = require("./model");
const Product = require("../product/model");
const ObjectId = mongoose.Types.ObjectId;

module.exports = {
   postCart: async (req, res) => {
      try {
         const { user, items } = req.body;

         let insertCart = await Cart.findOneAndUpdate(
            { user },
            { items },
            {
               upsert: true,
               new: true,
               runValidators: true,
               projection: { items: 1, user: 1 },
            }
         );

         return res.status(201).send({
            status: 201,
            message: "Item has been added to your cart",
            payload: insertCart,
         });
      } catch (error) {
         let responseData = {
            status: 500,
            message: "Internal Server Error",
         };

         if (error) {
            responseData = {
               ...responseData,
               error_detail: error,
            };
         }

         if (error.message) {
            responseData = {
               ...responseData,
               message: error.message,
            };
         }

         return res.status(responseData.status).send(responseData);
      }
   },
   getUserCart: async (req, res) => {
      try {
         const { user } = req.body;
         const userCart = await Cart.findOne({ user: user });

         let responseData = {
            status: 200,
            message: "Get user cart successfully",
            payload: userCart,
         };

         if (!userCart) {
            responseData = {
               status: 404,
               message: "User cart not found",
               payload: userCart,
            };
         }

         return res.status(responseData.status).send(responseData);
      } catch (error) {
         let responseData = {
            status: 500,
            message: "Internal Server Error",
         };

         if (error) {
            responseData = {
               ...responseData,
               error_detail: error,
            };
         }

         if (error.message) {
            responseData = {
               ...responseData,
               message: error.message,
            };
         }

         return res.status(responseData.status).send(responseData);
      }
   },
};
