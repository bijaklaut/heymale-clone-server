const Voucher = require("./model");
const Product = require("../product/model");
const { getSignedUrl } = require("../helper");

module.exports = {
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
                     {
                        $lookup: {
                           from: "categories",
                           localField: "category",
                           foreignField: "_id",
                           as: "category",
                        },
                     },
                     {
                        $unwind: "$category",
                     },
                  ],
                  as: "validProducts",
               },
            },
            {
               $set: {
                  validUntil: {
                     $dateToString: { format: "%Y-%m-%d", date: "$validUntil" },
                  },
               },
            },
         ]);

         // Voucher need signed url for applicable product
         // This solution is bad at scalability, need a better one
         let vouchers = await Voucher.aggregatePaginate(aggregate, options);
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

               return res.status(200).send({
                  status: 200,
                  payload: { vouchers, products },
                  message: "Get vouchers",
               });
            })
            .catch((error) => {
               throw error;
            });
      } catch (error) {
         return res.status(500).send({
            status: 500,
            payload: null,
            message: "Internal Server Error",
            errorDetail: error,
         });
      }
   },
   getVoucherDetail: async (req, res) => {
      try {
         const { id } = req.params;
         const voucher = await Voucher.findById(id);

         res.status(200).send({
            status: 200,
            payload: voucher,
            message: "Get voucher detail",
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

         let data = {
            voucherName,
            conditions,
            voucherCode,
            value,
            validUntil,
            status,
            voucherQuota,
         };

         switch (conditions) {
            case "Minimal Transaction":
               data = { ...data, minTransaction };
               break;
            case "Particular Product":
               data = { ...data, validProducts };
               break;
            case "Particular Category":
               data = { ...data, validCategories };
               break;
         }

         const newVoucher = new Voucher(data);

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
               message: error.name,
            });
         }

         if (error.code === 11000) {
            const key = Object.keys(error.keyValue)[0];
            return res.status(409).send({
               status: 409,
               message: `Failed to create voucher with existed ${key}`,
               errorDetail: error,
            });
         }

         return res.status(400).send({
            status: 400,
            errorDetail: error,
            message: "Failed to create voucher",
         });
      }
   },
   updateVoucher: async (req, res) => {
      try {
         const {
            id,
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

         let data = {
            voucherName,
            conditions,
            voucherCode,
            value,
            validUntil,
            status,
            voucherQuota,
         };

         switch (conditions) {
            case "Minimal Transaction":
               data = {
                  ...data,
                  minTransaction,
                  validProducts: [],
                  validCategories: [],
               };
               break;
            case "Particular Product":
               data = {
                  ...data,
                  minTransaction: 0,
                  validProducts,
                  validCategories: [],
               };
               break;
            case "Particular Category":
               data = {
                  ...data,
                  minTransaction: 0,
                  validProducts: [],
                  validCategories,
               };
               break;
         }

         const updateVoucher = await Voucher.findByIdAndUpdate(id, data, {
            new: true,
            runValidators: true,
         });

         res.status(201).send({
            status: 201,
            payload: updateVoucher,
            message: "Voucher updated successfully",
         });
      } catch (error) {
         if (error.name === "ValidationError") {
            return res.status(409).send({
               status: 409,
               errorDetail: error.errors,
               message: error.name,
            });
         }

         if (error.code === 11000) {
            const key = Object.keys(error.keyValue)[0];
            return res.status(409).send({
               status: 409,
               errorDetail: error,
               message: `Failed to update voucher with existed ${key}`,
            });
         }

         return res.status(400).send({
            status: 400,
            errorDetail: error,
            message: "Failed to update voucher",
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
            errorDetail: error,
            message: "Failed to delete Voucher",
         });
      }
   },
   getAvailableVoucher: async (req, res) => {
      try {
         const today = new Date();

         let options = {
            pagination: false,
         };

         const aggregate = Voucher.aggregate([
            {
               $match: {
                  status: "Active",
                  validUntil: { $gte: today },
                  voucherQuota: { $gte: 1 },
               },
            },
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
                     {
                        $lookup: {
                           from: "categories",
                           localField: "category",
                           foreignField: "_id",
                           as: "category",
                        },
                     },
                     {
                        $unwind: "$category",
                     },
                  ],
                  as: "validProducts",
               },
            },
            {
               $set: {
                  validUntil: {
                     $dateToString: { format: "%Y-%m-%d", date: "$validUntil" },
                  },
               },
            },
         ]);
         const vouchers = await Voucher.aggregatePaginate(aggregate, options);
         let responseData = {
            status: 200,
            message: "Get user cart successfully",
            payload: vouchers,
         };

         if (!vouchers) {
            responseData = {
               status: 404,
               message: "User cart not found",
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
};
