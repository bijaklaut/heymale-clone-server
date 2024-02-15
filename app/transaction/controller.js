const { midServerDev, midBaseURLDev } = require("../../config");
const Transaction = require("./model");
const axios = require("axios").default;

module.exports = {
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
