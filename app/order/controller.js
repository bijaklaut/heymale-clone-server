const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
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
   biteshipSignature,
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

      const token = req.headers.authorization.split(" ")[1];
      const { id } = jwt.decode(token);
      const { orderItems, voucher, shipping } = req.body;
      const invoice = await generateInvoice();
      const coreApi = new midtransClient.CoreApi({
         isProduction: false,
         serverKey: midServerDev,
         clientKey: midClientDev,
      });

      try {
         const customer = await User.findOne({ _id: id });
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
            req.body
         );

         // When new Transaction created, reduce product stock and voucher quota
         await Product.bulkWrite(bulkOperations, {
            session,
         });

         if (voucher.voucher_id) {
            await Voucher.updateOne(
               { _id: voucher._id },
               { $inc: { voucherQuota: -1 } },
               { session }
            );
         }

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
            id,
            newOrderItems,
            newTransaction,
            req.body,
            newShipment._id
         );

         const newOrder = new Order(newOrderData);
         await newOrder.save({ session });

         await session.commitTransaction();
         session.endSession();

         let responseData = {
            status: 201,
            message: "Successfully placed order",
            payload: paymentCharge.order_id,
         };

         return res.status(responseData.status).send(responseData);
      } catch (error) {
         await session.abortTransaction();

         // Probably unnecessary action
         // const cancelPaymentResult = await cancelPayment(invoice);

         let responseData = {
            status: 500,
            message: "Internal Server Error",
            error_details: error,
         };

         if (error.message.includes("Midtrans")) {
            responseData = {
               status: Number(error.httpStatusCode),
               error_details: error.ApiResponse,
               message: `Failed to process order payment. Please try again later (${error.httpStatusCode})`,
            };
         }

         if (error.name == "ValidationError") {
            responseData = {
               status: 409,
               error_details: error.errors,
               message: error.name,
            };
         }

         if (error.code === 11000) {
            const key = Object.keys(error.keyValue)[0];
            responseData = {
               status: 409,
               message: `Got problem on field ${key}`,
               error_details: error,
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
            "shipping_detail"
         );

         if (!order) {
            return res
               .status(404)
               .send({ status: 404, message: "Order not found" });
         }

         if (order.status !== "settlement") {
            throw "Requested order status doesn't meet the requirement";
         }

         const shippingData = transformShippingData(order.shipping_detail);

         // Create Shipping order
         const { data: shippingOrder } = await axios({
            url: shippingOrderURL,
            method: "POST",
            headers: { Authorization: `Bearer ${biteshipTestToken}` },
            data: shippingData,
         });
         const { id: shipment_order_id } = shippingOrder;

         // Update shipment data from Shipping order response
         const updateShipment = await Shipment.findOneAndUpdate(
            { reference_id: invoice },
            {
               ...shippingOrder,
               shipment_order_id,
            },
            { new: true, runValidation: true, session }
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

         if (error.name == "AxiosError") {
            responseData = {
               ...responseData,
               message: error.message,
            };
         }

         if (error.name === "ValidationError") {
            const { errors } = error;
            responseData = {
               ...responseData,
               status: 409,
               message: error.name,
               error_details: { ...error_details, errors },
            };
         }

         if (error.code === 11000) {
            // Mengambil nama field yang menyebabkan error
            const key = Object.keys(error.keyValue)[0];
            responseData = {
               ...responseData,
               status: 409,
               message: `Failed to update shipment with existed ${key}`,
               error_details: { ...error_details, error },
            };
         }

         return res.status(responseData.status).send(responseData);
      } finally {
         session.endSession();
      }
   },
   shipmentHooks: async (req, res) => {
      const shipmentReq = req.body;
      const session = await mongoose.startSession();
      session.startTransaction();

      if (req.headers["bts-signature"] !== biteshipSignature)
         throw "Signature key invalid. Request denied";

      try {
         let responseData = {
            status: 200,
         };

         if (shipmentReq.event === "order.status") {
            const updateShipment = await Shipment.findOneAndUpdate(
               { shipment_order_id: shipmentReq.order_id },
               {
                  "courier.tracking_id": shipmentReq.courier_tracking_id,
                  "courier.waybill_id": shipmentReq.courier_waybill_id,
                  "courier.company": shipmentReq.courier_company,
                  "courier.type": shipmentReq.courier_type,
                  "courier.driver_name": shipmentReq.courier_driver_name,
                  "courier.driver_phone": shipmentReq.courier_driver_phone,
                  "courier.link": shipmentReq.courier_link,
                  price: shipmentReq.order_price,
                  status: shipmentReq.status,
               },
               { session, new: true, runValidation: true }
            );

            responseData = {
               status: 201,
               updateShipment,
            };
         }
         if (shipmentReq.event === "order.waybill_id") {
            const updateShipment = await Shipment.findOneAndUpdate(
               { shipment_order_id: shipmentReq.order_id },
               {
                  "destination.cash_on_delivery.fee":
                     shipmentReq.cash_on_delivery_fee,
                  "courier.tracking_id": shipmentReq.courier_tracking_id,
                  "courier.waybill_id": shipmentReq.courier_waybill_id,
                  price: shipmentReq.price,
                  "destination.proof_of_delivery.fee":
                     shipmentReq.proof_of_delivery_fee,
                  status: shipmentReq.status,
               },
               { session, new: true, runValidation: true }
            );

            responseData = {
               status: 201,
               updateShipment,
            };
         }
         if (shipmentReq.event === "order.price") {
            const updateShipment = await Shipment.findOneAndUpdate(
               { shipment_order_id: shipmentReq.order_id },
               {
                  "courier.tracking_id": shipmentReq.courier_tracking_id,
                  "courier.waybill_id": shipmentReq.courier_waybill_id,
                  status: shipmentReq.status,
               },
               { session, new: true, runValidation: true }
            );

            responseData = {
               status: 201,
               updateShipment,
            };
         }

         await session.commitTransaction();

         return res.status(responseData.status).send(responseData);
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
   getOrders: async (req, res) => {
      try {
         // const {filter, search} = req.body
         const { p = 0 } = req.query;
         let options = {
            pagination: false,
         };

         if (p) {
            options = {
               ...options,
               pagination: true,
               page: p,
               limit: 10,
            };
         }

         const aggregate = Order.aggregate([
            {
               $lookup: {
                  from: "users",
                  localField: "user",
                  foreignField: "_id",
                  as: "user",
                  pipeline: [
                     {
                        $project: {
                           name: 1,
                           email: 1,
                           phoneNumber: 1,
                           avatar: 1,
                        },
                     },
                  ],
               },
            },
            { $unwind: "$user" },
            {
               $lookup: {
                  from: "shipments",
                  localField: "shipping_detail",
                  foreignField: "_id",
                  as: "shipping_detail",
               },
            },
            { $unwind: "$shipping_detail" },
            {
               $lookup: {
                  from: "transactions",
                  localField: "transaction",
                  foreignField: "_id",
                  as: "transaction",
               },
            },
            { $unwind: "$transaction" },
            // {
            //    $lookup: {
            //       from: "vouchers",
            //       localField: "voucher.voucher_id",
            //       foreignField: "_id",
            //       as: "voucher_detail",
            //       pipeline: [{
            //          voucherName: 1, conditions: 1, value: 1,
            //       }]
            //    },
            // },
            // { $unwind: "$voucher_detail" },
         ]);

         const orders = await Order.aggregatePaginate(aggregate, options);

         let responseData = {
            status: 200,
            payload: orders,
            message: "Successfully get all orders",
         };

         if (!orders.docs.length) {
            responseData = {
               status: 404,
               message: "Order not found",
            };
         }

         return res.status(responseData.status).send(responseData);
      } catch (error) {
         let responseData = {
            status: 500,
            message: "Internal Server Error",
         };

         if (error.message) {
            responseData = {
               status: 400,
               message: error.message,
            };
         }

         return res.status(responseData.status).send(responseData);
      }
   },
   getOrderDetail: async (req, res) => {
      try {
         try {
            const { invoice } = req.params;
            const order = await Order.aggregate([
               { $match: { invoice: invoice } },
               {
                  $lookup: {
                     from: "transactions",
                     localField: "transaction",
                     foreignField: "_id",
                     as: "transaction",
                  },
               },
               { $unwind: "$transaction" },
               {
                  $lookup: {
                     from: "shipments",
                     localField: "shipping_detail",
                     foreignField: "_id",
                     as: "shipping_detail",
                  },
               },
               { $unwind: "$shipping_detail" },
               {
                  $lookup: {
                     from: "vouchers",
                     // localField: "voucher",
                     // foreignField: "_id",
                     let: { voucher_id: "voucher.voucher_id" },
                     pipeline: [
                        {
                           $match: {
                              $expr: {
                                 $cond: [
                                    { $ne: ["$$voucher_id", ""] },
                                    { $eq: ["$$voucher_id", "$_id"] },
                                    {},
                                 ],
                              },
                           },
                        },
                     ],
                     as: "voucher_detail",
                  },
               },
               // { $unwind: "$voucher" },
            ]);

            let responseData = {
               status: 200,
               payload: order[0],
               message: "Successfully get order detail",
            };

            if (!order.length) {
               responseData = {
                  status: 404,
                  message: "Order not found",
               };
            }

            return res.status(responseData.status).send(responseData);
         } catch (error) {
            let responseData = {
               status: 500,
               message: "Internal Server Error",
            };

            if (error.message) {
               responseData = {
                  status: 400,
                  message: error.message,
               };
            }

            return res.status(responseData.status).send(responseData);
         }
      } catch (error) {}
   },
};
