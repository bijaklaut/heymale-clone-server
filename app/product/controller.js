const Product = require("./model");
const fs = require("fs");
const { rootPath } = require("../../config");

module.exports = {
   getProducts: async (req, res) => {
      try {
         const { query = "", search = "" } = req.body;
         const { p } = req.query;
         let criteria = {};
         let options = {
            pagination: false,
            // populate: { path: "category", select: "name" },
            sort: { "category.name": 1, name: 1 },
         };

         if (query)
            criteria = {
               "category.name": { $regex: `${query}`, $options: "i" },
            };
         if (search)
            criteria = {
               ...criteria,
               name: { $regex: `${search}`, $options: "i" },
            };
         if (p) {
            options = {
               ...options,
               pagination: true,
               page: p,
               limit: 10,
            };
         }

         const aggregate = Product.aggregate([
            {
               $lookup: {
                  from: "categories",
                  localField: "category",
                  foreignField: "_id",
                  as: "category",
                  pipeline: [{ $project: { name: 1 } }],
               },
            },
            {
               $unwind: "$category",
            },
            {
               $match: criteria,
            },
            {
               $sort: { "category.name": 1, name: 1 },
            },
         ]);

         const products = await Product.aggregatePaginate(aggregate, options);

         res.status(200).send({
            status: 200,
            payload: products,
            message: "Get all products",
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
   createProduct: async (req, res) => {
      try {
         const { name, category, variant, price, description, status } =
            req.body;
         let thumbnail = "";
         if (req.file) {
            thumbnail = req.file.filename;
         }

         const newProduct = new Product({
            name,
            category,
            variant,
            price,
            description,
            thumbnail,
            status,
         });

         await newProduct.save();

         res.status(201).send({
            status: 201,
            payload: newProduct,
            message: "Product created successfully",
            errorDetail: null,
         });
      } catch (err) {
         // Untuk menghapus file yang diupload
         if (req.file) {
            fs.unlinkSync(req.file.path);
         }

         if (err.name === "ValidationError") {
            return res.status(409).send({
               status: 409,
               payload: null,
               message: "Validation Error",
               errorDetail: err.errors,
            });
         } else if (err.code === 11000) {
            // Mengambil nama field yang menyebabkan error
            const key = Object.keys(err.keyValue)[0];
            res.status(409).send({
               status: 409,
               payload: null,
               message: `Failed to create product with existed ${key}`,
               errorDetail: err,
            });
         } else {
            res.status(400).send({
               status: 409,
               payload: null,
               message: "Failed to create product",
               errorDetail: err,
            });
         }
      }
   },
   productDetail: async (req, res) => {
      const { id } = req.params;

      try {
         const product = await Product.findById(id).populate(
            "category",
            "name"
         );

         if (product) {
            res.status(200).send({
               status: 200,
               payload: product,
               message: "Get product detail successful",
               errorDetail: null,
            });
         } else {
            res.status(404).send({
               status: 404,
               payload: null,
               message: "Requested data not found",
               errorDetail: error,
            });
         }
      } catch (error) {
         res.status(500).send({
            status: 500,
            payload: null,
            message: "Internal Server Error",
            errorDetail: error,
         });
      }
   },
   updateProduct: async (req, res) => {
      try {
         const { name, category, variant, price, description, status } =
            req.body;
         const { id } = req.params;
         const oldProduct = await Product.findById(id);
         let { thumbnail } = oldProduct;

         if (req.file) {
            thumbnail = req.file.filename;
         }

         Product.findByIdAndUpdate(
            id,
            { name, category, variant, price, description, thumbnail, status },
            { new: true, runValidators: true }
         ).then((result) => {
            if (
               fs.existsSync(
                  `${rootPath}/public/upload/product/${oldProduct.thumbnail}`
               ) &&
               req.file
            ) {
               fs.unlinkSync(
                  `${rootPath}/public/upload/product/${oldProduct.thumbnail}`
               );
            }
            res.status(201).send({
               status: 201,
               payload: result,
               message: "Product updated successfully",
               errorDetail: null,
            });
         });
      } catch (err) {
         // Untuk menghapus file yang diupload
         if (req.file) {
            fs.unlinkSync(req.file.path);
         }

         if (err.name === "ValidationError") {
            res.status(409).send({
               status: 409,
               payload: null,
               message: "Validation Error",
               errorDetail: err.errors,
            });
         } else if (err.code === 11000) {
            // Mengambil nama field yang menyebabkan error
            const key = Object.keys(err.keyValue)[0];
            res.status(409).send({
               status: 409,
               payload: null,
               message: `Failed to create product with existed ${key}`,
               errorDetail: err,
            });
         } else {
            res.status(400).send({
               status: 400,
               payload: null,
               message: "Failed to update product",
               errorDetail: err,
            });
         }
      }
   },
   deleteProduct: async (req, res) => {
      try {
         const { id } = req.params;
         const { thumbnail } = await Product.findById(id, "thumbnail -_id");

         Product.findOneAndDelete({ _id: id }).then((result) => {
            if (result) {
               const deletePath = `${rootPath}/public/upload/product/${thumbnail}`;

               if (fs.existsSync(deletePath) && thumbnail) {
                  fs.unlinkSync(deletePath);
               }

               res.status(200).send({
                  status: 200,
                  payload: result,
                  message: "Product deleted successfully",
                  errorDetail: null,
               });
            } else {
               // Handling error yang disebabkan ketika object sudah terhapus namun tidak masuk ke .catch/error
               res.status(404).send({
                  status: 404,
                  payload: null,
                  message: "Product not found",
                  errorDetail: null,
               });
            }
         });
      } catch (error) {
         res.status(400).send({
            status: 400,
            payload: null,
            message: "Failed to delete product",
            errorDetail: error,
         });
      }
   },
};

function generatePaginationQuery(query, sort, nextKey) {
   const sortField = sort[0] || null;

   // Generate next key
   function nextKeyFn(items) {
      if (items.length === 0) {
         return null;
      }

      const item = items[items.length - 1];

      if (sortField == null) {
         return { _id: item._id };
      }

      return { _id: item._id, [sortField]: item[sortField] };
   }

   if (nextKey == null) {
      return { paginatedQuery: query, nextKeyFn };
   }

   let paginatedQuery = query;

   if (sort == null) {
      paginatedQuery._id = { $gt: nextKey._id };
      return { paginatedQuery, nextKey };
   }

   const sortOperator = sort[1] === 1 ? "$gt" : "$lt";

   const paginationQuery = [
      { [sortField]: { [sortOperator]: nextKey[sortField] } },
      {
         $and: [
            { [sortField]: nextKey[sortField] },
            { _id: { [sortOperator]: nextKey._id } },
         ],
      },
   ];

   if (paginatedQuery.$or == null) {
      paginatedQuery.$or = paginationQuery;
   } else {
      paginatedQuery = { $and: [query, { $or: paginationQuery }] };
   }

   return { paginatedQuery, nextKeyFn };
}
