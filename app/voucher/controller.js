const Voucher = require("./model");

module.exports = {
   createVoucher: async (req, res) => {
      try {
         const {
            voucherName,
            conditions,
            minTransaction,
            validProducts,
            validCategories,
            voucherCode,
            value,
            validUntil,
            status,
            voucherQuota,
         } = req.body;

         const newVoucher = new Voucher({
            voucherName,
            conditions,
            minTransaction,
            validProducts,
            validCategories,
            voucherCode,
            value,
            validUntil,
            status,
            voucherQuota,
         });

         await newVoucher.save();

         return res.status(201).send({
            status: 201,
            payload: newVoucher,
            message: "Voucher created successfully",
         });
      } catch (error) {
         if (error.name == "ValidationError") {
            return res.status(409).send({
               status: 409,
               errorDetail: error.errors,
               message: "Validation Error",
            });
         }

         return res.status(400).send({
            status: 400,
            errorDetail: error,
            message: "Failed to create voucher",
         });
      }
   },
   getVouchers: async (req, res) => {
      try {
         const { search } = req.body;
         const { p } = req.query;
         let criteria = {};
         let options = {
            pagination: false,
         };

         if (search) {
            criteria = {
               ...criteria,
               voucherName: { $regex: `${search}`, $options: "i" },
            };
         }

         if (p) {
            options = {
               ...options,
               pagination: true,
               page: p,
               limit: 10,
            };
         }

         const aggregate = Voucher.aggregate([
            { $match: criteria },
            {
               $lookup: {
                  from: "categories",
                  let: { localCategory: "$validCategories" },
                  pipeline: [
                     {
                        $match: {
                           $expr: {
                              $in: ["$_id", "$$localCategory"],
                           },
                        },
                     },
                  ],
                  as: "validCategories",
               },
            },
            {
               $lookup: {
                  from: "products",
                  let: { localProduct: "$validProducts" },
                  pipeline: [
                     {
                        $match: {
                           $expr: {
                              $in: ["$_id", "$$localProduct"],
                           },
                        },
                     },
                  ],
                  as: "validProducts",
               },
            },
         ]);
         const vouchers = await Voucher.aggregatePaginate(aggregate, options);
         res.status(200).send({
            status: 200,
            payload: vouchers,
            message: "Get vouchers",
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
   deleteVoucher: async (req, res) => {
      try {
         const { id } = req.params;
         const result = await Voucher.findOneAndDelete({ _id: id });

         if (result) {
            res.status(200).send({
               status: 200,
               payload: result,
               message: "Voucher deleted successfully",
            });
         } else {
            res.status(404).send({
               status: 404,
               message: "Voucher not found",
            });
         }
      } catch (error) {
         res.status(404).send({
            status: 404,
            message: "Failed to delete Voucher",
            errorDetail: error,
         });
      }
   },
};
