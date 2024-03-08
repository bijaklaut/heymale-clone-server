const { getS3Object } = require("../helper");
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

         let copyProducts = JSON.parse(JSON.stringify(insertCart.items));
         let promises = [];

         for (let item of copyProducts) {
            let promise = getS3Object(item.thumbnail);
            promises.push(promise);
         }

         Promise.all(promises)
            .then((values) => {
               copyProducts.forEach((item, index) => {
                  copyProducts[index].thumbnail = values[index];
               });

               insertCart.items = copyProducts;

               return res.status(201).send({
                  status: 201,
                  message: "Cart has been updated",
                  payload: insertCart,
               });
            })
            .catch((error) => {
               throw error;
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
         let userCart = await Cart.findOne({ user: user });

         if (!userCart) {
            const responseData = {
               status: 404,
               message: "User cart not found",
            };

            return res.status(responseData.status).send(responseData);
         }

         let copyProducts = JSON.parse(JSON.stringify(userCart.items));
         let promises = [];

         for (let item of copyProducts) {
            let promise = getS3Object(item.thumbnail);
            promises.push(promise);
         }

         Promise.all(promises)
            .then((values) => {
               copyProducts.forEach((item, index) => {
                  copyProducts[index].thumbnail = values[index];
               });

               userCart.items = copyProducts;

               return res.status(200).send({
                  status: 200,
                  payload: userCart,
                  message: "Get user cart successfully",
                  errorDetail: null,
               });
            })
            .catch((error) => {
               throw error;
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
   emptyCart: async (req, res) => {
      try {
         const { user } = req.params;

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
