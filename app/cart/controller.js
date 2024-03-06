const Cart = require("./model");

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
            message: "Cart has been updated",
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
   emptyCart: async (req, res) => {
      try {
         const { user } = req.params;
         // const cart = await Cart.findOneAndDelete({ user: user });

         let cart = await Cart.findOneAndUpdate(
            { user },
            { items: [] },
            {
               new: true,
               runValidators: true,
               projection: { items: 1, user: 1 },
            }
         );

         let responseData = {
            status: 200,
            message: "Cart has been emptied",
            payload: cart,
         };

         if (!cart) {
            responseData = {
               status: 404,
               message: "Cart not found",
            };
         }

         return res.status(responseData.status).send(responseData);
      } catch (error) {
         let responseData = {
            status: 500,
            message: "Internal Server Error",
            error_detail: error,
         };

         return res.status(responseData.status).send(responseData);
      }
   },
};
