const mongoose = require("mongoose");
const Product = require("../product/model");
const Transaction = require("../transaction/model");
const Shipment = require("../shipment/model");
const Order = require("./model");
const User = require("../user/model");
const Voucher = require("../voucher/model");
const {
   midServerDev,
   midClientDev,
   biteshipBaseURL,
   biteshipTestToken,
} = require("../../config");
const midtransClient = require("midtrans-client");
const {
   getItemPrice,
   orderItemsAction,
   generateInvoice,
   generatePaymentData,
   cancelPayment,
   generateOrderData,
   generateShippingData,
   transformShippingData,
} = require("../helper");
const { default: axios } = require("axios");

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

         if (paymentCharge.status_code != 201) {
            throw paymentCharge;
         }

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
   paymentHooks: async (req, res) => {
      const session = await mongoose.startSession();
      session.startTransaction();

      const apiClient = new midtransClient.CoreApi({
         isProduction: false,
         serverKey: midServerDev,
         clientKey: midClientDev,
      });

      const notificationJson = req.body;

      try {
         const notification = await apiClient.transaction.notification(
            notificationJson
         );
         const { order_id, transaction_status } = notificationJson;

         if (notification.signature_key !== notificationJson.signature_key) {
            throw "Invalid signature key, can't handle request";
         }

         const updateOrder = await Order.updateOne(
            { invoice: order_id },
            { status: transaction_status },
            { session }
         );

         const updateTransaction = await Transaction.updateOne(
            { order_id: order_id },
            { transaction_status },
            { session }
         );

         // if (transactionStatus == "settlement") {
         // } else if (
         //    transactionStatus == "cancel" ||
         //    transactionStatus == "deny" ||
         //    transactionStatus == "expire"
         // ) {
         //    const updateOrder = await Order.updateOne(
         //       { invoice: order_id },
         //       { status: transactionStatus },
         //       { session }
         //    );

         //    const updateTransaction = await Transaction.updateOne(
         //       { order_id: order_id },
         //       { transaction_status: transactionStatus },
         //       { session }
         //    );
         // } else if (transactionStatus == "pending") {
         //    // TODO set transaction status on your databaase to 'pending' / waiting payment
         // } else if (transactionStatus == "refund") {
         //    // TODO set transaction status on your databaase to 'refund'
         // }

         await session.commitTransaction();

         res.status(200).send({
            updateOrder,
            updateTransaction,
            notification,
            notificationJson,
         });
      } catch (error) {
         await session.abortTransaction();
         let responseData = {
            status: 400,
            error_details: error,
         };

         res.status(responseData.status).send(responseData);
      } finally {
         session.endSession();
      }
   },
   createShippingOrder: async (req, res) => {
      const { invoice } = req.body;
      const shippingOrderURL = `${biteshipBaseURL}/v1/orders`;

      const session = await mongoose.startSession();
      session.startTransaction();

      try {
         const order = await Order.findOne({ invoice }).populate(
            "shippingDetail"
         );

         if (!order) {
            return res
               .status(404)
               .send({ status: 404, message: "Order not found" });
         }

         if (order.status !== "settlement") {
            throw "Requested order status doesn't meet the requirement";
         }

         const shippingData = transformShippingData(order.shippingDetail);

         // Create Shipping order
         const createShippingOrder = await axios({
            url: shippingOrderURL,
            method: "POST",
            headers: { Authorization: `Bearer ${biteshipTestToken}` },
            data: shippingData,
         });
         const shippingOrder = createShippingOrder.data;
         const { id: shipment_order_id } = shippingOrder;

         // Create new Shipment from Shipping order response
         const updateShipment = await Shipment.updateOne(
            { reference_id: invoice },
            {
               ...shippingOrder,
               shipment_order_id,
            },
            { session }
         );

         await session.commitTransaction();
         return res
            .status(200)
            .send({ shippingOrder, updateShipment, shippingData, order });
      } catch (error) {
         await session.abortTransaction();
         let responseData = {
            status: 400,
            error_details: error,
         };

         return res.status(responseData.status).send(responseData);
      } finally {
         session.endSession();
      }
   },
};
