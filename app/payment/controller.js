const Payment = require("./model");

module.exports = {
   getPayments: async (req, res) => {
      try {
         const { search = "", p } = req.query;
         let criteria = {};
         let options = {
            pagination: false,
            sort: { bankName: 1 },
         };

         if (search)
            criteria = {
               accountNo: { $regex: `${search}`, $options: "i" },
            };

         if (p) {
            options = {
               ...options,
               pagination: true,
               page: p,
               limit: 10,
            };
         }

         const payments = await Payment.paginate(criteria, options);

         res.status(200).send({
            status: 200,
            payload: payments,
            message: "Get all payments",
            errorDetail: null,
         });
      } catch (error) {
         res.status(500).send({
            status: 500,
            payload: null,
            message: "Internal Server Error",
            errorDetail: error,
         });
      }
   },
   createPayment: async (req, res) => {
      const { ownerName, accountNo, bankName } = req.body;
      const newPayment = new Payment({ ownerName, accountNo, bankName });

      await newPayment
         .save()
         .then((result) => {
            res.status(200).send({
               payload: result,
               message: "Payment created successfully",
               errorDetail: null,
            });
         })
         .catch((err) => {
            if (err.name === "ValidationError") {
               // Mengambil nama field yang menyebabkan error
               res.status(409).send({
                  payload: null,
                  message: "Validation Error",
                  errorDetail: err.errors,
               });
            } else if (err.code === 11000) {
               const key = Object.keys(err.keyValue)[0];
               res.status(409).send({
                  payload: null,
                  message: `Failed to create payment with existed ${key}`,
                  errorDetail: err,
               });
            } else {
               res.status(409).send({
                  payload: null,
                  message: "Failed to create payment",
                  errorDetail: err,
               });
            }
         });
   },
   detailPayment: async (req, res) => {
      const { id } = req.params;

      await Payment.findById(id)
         .then((result) => {
            res.status(200).send({
               payload: result,
               message: "Get payment detail successful",
               errorDetail: null,
            });
         })
         .catch((err) => {
            res.status(404).send({
               payload: null,
               message: "Payment not found",
               errorDetail: err,
            });
         });
   },
   updatePayment: async (req, res) => {
      const { id } = req.params;
      const { ownerName, accountNo, bankName } = req.body;

      await Payment.findByIdAndUpdate(
         id,
         {
            ownerName,
            accountNo,
            bankName,
         },
         { new: true, runValidators: true }
      )
         .then((result) => {
            res.status(200).send({
               payload: result,
               message: "Payment updated successfully",
               errorDetail: null,
            });
         })
         .catch((err) => {
            if (err.name === "ValidationError") {
               // Mengambil nama field yang menyebabkan error
               res.status(409).send({
                  payload: null,
                  message: "Validation Error",
                  errorDetail: err.errors,
               });
            } else if (err.code === 11000) {
               const key = Object.keys(err.keyValue)[0];
               res.status(409).send({
                  payload: null,
                  message: `Failed to create payment with existed ${key}`,
                  errorDetail: err,
               });
            } else {
               res.status(409).send({
                  payload: null,
                  message: "Failed to update payment",
                  errorDetail: err,
               });
            }
         });
   },
   deletePayment: async (req, res) => {
      const { id } = req.params;

      Payment.findOneAndDelete({ _id: id })
         .then((result) => {
            if (result) {
               res.status(200).send({
                  payload: result,
                  message: "Payment deleted successfully",
                  errorDetail: null,
               });
            } else {
               // Handling error yang disebabkan ketika object sudah terhapus namun tidak masuk ke .catch/error
               res.status(404).send({
                  payload: null,
                  message: "Payment has been deleted",
                  errorDetail: null,
               });
            }
         })
         .catch((err) => {
            res.status(404).send({
               payload: null,
               message: "Failed to delete payment",
               errorDetail: err,
            });
         });
   },
};
