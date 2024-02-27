const { midServerDev, midBaseURLDev } = require("../../config");
const Transaction = require("./model");
const axios = require("axios").default;

module.exports = {
   getTransactions: async (req, res) => {
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

         const aggregate = Transaction.aggregate([
            {
               $sort: { transaction_time: -1 },
            },
         ]);

         const transactions = await Transaction.aggregatePaginate(
            aggregate,
            options
         );

         let responseData = {
            status: 200,
            payload: transactions,
            message: "Successfully get all transactions",
         };

         if (!transactions.docs.length) {
            responseData = {
               status: 404,
               message: "Transaction not found",
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
   createTransaction: async (req, res) => {
      try {
         const newTransaction = await Transaction.create(req.body);

         res.status(201).send({
            status: 201,
            message: "Transaction created successfully",
            payload: newTransaction,
         });
      } catch (error) {
         res.status(400).send({
            status: 400,
            message: "Failed to create transaction",
            errorDetail: error,
         });
      }
   },
   cancelTransaction: async (req, res) => {
      try {
         const { order_id } = req.params;
         const url = `${midBaseURLDev}/v2/${order_id}/cancel`;

         const request = await axios({
            url,
            auth: { username: midServerDev, password: "" },
            method: "POST",
         });

         res.status(200).send({
            status: 400,
            message: "Success",
            payload: request.data,
         });
      } catch (error) {
         res.status(400).send({
            status: 400,
            message: "Failed to cancel transaction",
            errorDetail: error.data,
         });
      }
   },
};
