const { default: mongoose } = require("mongoose");
const Product = require("../product/model");
const Transaction = require("../transaction/model");
const Shipment = require("../shipment/model");
const Order = require("./model");
const User = require("../user/model");
const Voucher = require("../voucher/model");
const { midServerDev, midClientDev } = require("../../config");
const midtransClient = require("midtrans-client");
const {
   getItemPrice,
   orderItemsAction,
   generateInvoice,
   generatePaymentData,
   cancelPayment,
   generateOrderData,
   generateShippingData,
} = require("../helper");

module.exports = {
   createOrder: async (req, res) => {
      const session = await mongoose.startSession();
      session.startTransaction();

      const { user, orderItems, voucher, shipping } = req.body;
      const invoice = await generateInvoice();
      const coreApi = new midtransClient.CoreApi({
         isProduction: false,
         serverKey: midServerDev,
         clientKey: midClientDev,
      });

      try {
         // const shippingOrderURL = `${biteshipBaseURL}/v1/orders`;
         const customer = await User.findOne({ _id: user });
         const itemsPrice = orderItems.reduce(getItemPrice, 0);
         let {
            transactionItems,
            bulkOperations,
            newOrderItems,
            shippingItems,
         } = orderItemsAction(orderItems);

         const paymentData = generatePaymentData(
            customer,
            transactionItems,
            invoice,
            itemsPrice,
            req.body
         );

         // When new Transaction created, reduce product stock and voucher quota
         const bulkResult = await Product.bulkWrite(bulkOperations, {
            session,
         });

         const appliedVoucher = await Voucher.updateOne(
            { _id: voucher._id },
            { $inc: { voucherQuota: -1 } },
            { session }
         );

         // Create Payment API
         const paymentCharge = await coreApi.charge(paymentData);

         if (paymentCharge.status_code == 201) {
            // Create new Transaction from Payment Response
            const newTransaction = new Transaction(paymentCharge);
            await newTransaction.save({ session });

            // Generate shipping data
            const shippingData = generateShippingData(
               shipping,
               invoice,
               shippingItems
            );

            // Create new Shipment from Shipping order response
            const newShipment = new Shipment(shippingData);
            await newShipment.save({ session });

            const newOrderData = generateOrderData(
               newOrderItems,
               newTransaction,
               req.body,
               newShipment._id
            );

            const newOrder = new Order(newOrderData);
            await newOrder.save({ session });

            await session.commitTransaction();
            session.endSession();
            return res.status(200).send({
               bulkResult,
               appliedVoucher,
               paymentCharge,
               newTransaction,
               newShipment,
               newOrder,
            });
         }

         throw paymentCharge;
      } catch (error) {
         await session.abortTransaction();

         // Probably unnecessary action
         const cancelPaymentResult = await cancelPayment(invoice);

         let responseData = {
            status: 400,
            message: "Failed to create order",
            cancelPaymentResult,
         };

         if (error.message.includes("Midtrans")) {
            responseData = {
               ...responseData,
               status: Number(error.httpStatusCode),
               errorDetail: error.ApiResponse,
               message: `Failed to process order payment. Please try again later (${error.httpStatusCode})`,
            };
         }

         if (error.name == "ValidationError") {
            responseData = {
               ...responseData,
               status: 409,
               errorDetail: error.errors,
               message: error.name,
            };
         }

         if (error.code === 11000) {
            const key = Object.keys(error.keyValue)[0];
            responseData = {
               ...responseData,
               status: 409,
               message: `Got problem on field ${key}`,
               errorDetail: error,
            };
         }

         return res.status(responseData.status).send(responseData);
      } finally {
         session.endSession();
      }
   },
};

// Generate shipping data
// const shippingData = generateShippingData(
//    shipping,
//    invoice,
//    shippingItems
// );
// Create Shipping order
// const createShippingOrder = await axios({
//    url: shippingOrderURL,
//    method: "POST",
//    headers: { Authorization: `Bearer ${biteshipTestToken}` },
//    data: shippingData,
// });
// const { id: order_id } = createShippingOrder.data;
// Create new Shipment from Shipping order response
// const newShipment = await Shipment.create({
//    ...createShippingOrder.data,
//    order_id,
// });
