const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const Product = require("../product/model");
const Transaction = require("../transaction/model");
const Shipment = require("../shipment/model");
const Order = require("./model");
const User = require("../user/model");
const Voucher = require("../voucher/model");
const crypto = require("crypto");
const {
   MIDTRANS_SERVERKEY_SBOX,
   MIDTRANS_CLIENTKEY_SBOX,
   BITESHIP_TEST_TOKEN,
   BITESHIP_WEBHOOKS_SIGNATURE,
   BITESHIP_BASEURL,
} = require("../../config");
const midtransClient = require("midtrans-client");
const {
   orderItemsAction,
   generateInvoice,
   generatePaymentData,
   generateOrderData,
   generateShippingData,
   transformShippingData,
   getSignedUrl,
} = require("../helper");
const { default: axios } = require("axios");

module.exports = {
   createOrder: async (req, res) => {
      const session = await mongoose.startSession();
      session.startTransaction();
      try {
         const token = req.headers.authorization.split(" ")[1];
         const { id } = jwt.decode(token);
         const { orderItems, voucher, shipping } = req.body;
         const invoice = await generateInvoice();
         const coreApi = new midtransClient.CoreApi({
            isProduction: false,
            serverKey: MIDTRANS_SERVERKEY_SBOX,
            clientKey: MIDTRANS_CLIENTKEY_SBOX,
         });
         const customer = await User.findOne({ _id: id });
         let {
            transactionItems,
            bulkOperations,
            newOrderItems,
            shippingItems,
         } = orderItemsAction(orderItems, session);

         const paymentData = generatePaymentData(
            customer,
            transactionItems,
            invoice,
            req.body
         );

         // Create Payment API
         const paymentCharge = await coreApi.charge(paymentData);

         if (paymentCharge.status_code != 201) {
            throw paymentCharge;
         }

         // When new Transaction created, reduce product stock and voucher quota
         const results = await Promise.all(bulkOperations);

         results.forEach((result) => {
            Object.entries(result.variant).forEach(([key, value]) => {
               if (value < 0) {
                  throw `There is unavailable item`;
               }
            });
         });

         if (voucher.voucher_id) {
            await Voucher.updateOne(
               { _id: voucher._id },
               { $inc: { voucherQuota: -1 } },
               { session, runValidator: true }
            );
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

         let responseData = {
            status: 500,
            message: "Internal Server Error",
            error_details: error,
         };

         if (error.includes("unavailable")) {
            responseData = {
               status: 400,
               message: error,
            };
         }

         if (error.message && error.message.includes("Midtrans")) {
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

      const notificationJson = req.body;

      try {
         const { order_id, transaction_status, status_code, gross_amount } =
            notificationJson;
         const signature_key = crypto
            .createHash("sha512")
            .update(
               `${order_id}${status_code}${gross_amount}${MIDTRANS_SERVERKEY_SBOX}`
            )
            .digest("hex");

         if (notificationJson.signature_key !== signature_key) {
            throw "Invalid signature key, can't handle request";
         }

         // if (
         //    transaction_status == "cancel" ||
         //    transaction_status == "deny" ||
         //    transaction_status == "expire"
         // ) {
         // }

         if (transaction_status == "pending") {
            const order = await Order.findOne({ invoice: order_id });

            if (!order) {
               await Transaction.findOneAndDelete({ order_id });
               await Shipment.findOneAndDelete({ reference_id: order_id });
            }
         }

         await Order.updateOne(
            { invoice: order_id },
            { status: transaction_status },
            { session }
         );

         await Transaction.updateOne(
            { order_id: order_id },
            { transaction_status },
            { session }
         );

         await session.commitTransaction();

         return res.status(200).send({
            status: 200,
            message: "Request handled successfully",
         });
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
   createShippingOrder: async (req, res) => {
      const { invoice } = req.body;
      const shippingOrderURL = `${BITESHIP_BASEURL}/v1/orders`;

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
            headers: { Authorization: `Bearer ${BITESHIP_TEST_TOKEN}` },
            data: shippingData,
         });
         const { id: shipment_order_id, status } = shippingOrder;

         // Update shipment data from Shipping order response
         await Shipment.findOneAndUpdate(
            { reference_id: invoice },
            {
               ...shippingOrder,
               shipment_order_id,
            },
            { new: true, runValidation: true, session }
         );

         await Order.findOneAndUpdate(
            { invoice },
            { status },
            { runValidation: true, session }
         );

         await session.commitTransaction();

         let responseData = {
            status: 200,
            message: "Shipping order successfully created",
         };

         return res.status(responseData.status).send(responseData);
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
      try {
         const shipmentReq = req.body;
         const session = await mongoose.startSession();
         session.startTransaction();

         if (req.headers["bts-signature"] !== BITESHIP_WEBHOOKS_SIGNATURE)
            throw "Signature key invalid. Request denied";

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

            await Order.findOneAndUpdate(
               {
                  invoice: updateShipment.reference_id,
               },
               { status: shipmentReq.status },
               { session, runValidation: true }
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
         if (shipmentReq.event === "order.waybill_id") {
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
         const { filter, search } = req.body;
         const { p = 0 } = req.query;
         let criteria = {};
         const failedStatus = [
            "deny",
            "cancel",
            "expire",
            "failure",
            "courier_not_found",
            "cancelled",
            "rejected",
            "disposed",
            "returned",
         ];

         const ongoingStatus = [
            "confirmed",
            "allocated",
            "picking_up",
            "picked",
            "dropping_off",
            "return_in_transit",
         ];

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

         if (
            filter == "pending" ||
            filter == "delivered" ||
            filter == "completed" ||
            filter == "settlement"
         ) {
            criteria = {
               status: filter,
            };
         }

         if (filter == "ongoing") {
            criteria = {
               $expr: { $in: ["$status", ongoingStatus] },
            };
         }

         if (filter == "failed") {
            criteria = {
               $expr: { $in: ["$status", failedStatus] },
            };
         }

         const aggregate = Order.aggregate([
            { $match: criteria },
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
         ]);

         // Order need signed url for related items
         // This solution is bad at scalability, need a better one
         const orders = await Order.aggregatePaginate(aggregate, options);
         let products = await Product.find({}, "thumbnail");
         let copyProducts = JSON.parse(JSON.stringify(products));
         let promises = [];

         for (const item of copyProducts) {
            promises.push(getSignedUrl(item.thumbnail));
         }

         Promise.all(promises)
            .then((values) => {
               copyProducts.forEach((item, index) => {
                  copyProducts[index].thumbnail = values[index];
               });

               products = copyProducts;

               let responseData = {
                  status: 200,
                  payload: { orders, products },
                  message: "Successfully get all orders",
               };

               if (!orders.docs.length) {
                  responseData = {
                     status: 404,
                     message: "Order not found",
                  };
               }

               return res.status(responseData.status).send(responseData);
            })
            .catch((error) => {
               throw error;
            });
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
