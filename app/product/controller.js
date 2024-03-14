const Product = require("./model");
const Test = require("./aws-model");
// const fs = require("fs");
const { ROOT_PATH } = require("../../config");
const fs = require("@cyclic.sh/s3fs");
const {
   getSignedUrl,
   deleteS3Object,
   checkS3Object,
   getS3Object,
} = require("../helper");

module.exports = {
   getProducts: async (req, res) => {
      try {
         const { query: filter, search } = req.body;
         const { p = 0 } = req.query;
         let criteria = {};
         let options = {
            pagination: false,
            sort: { "category.name": 1, name: 1 },
         };

         if (filter) {
            criteria = {
               "category.name": { $regex: `${filter}`, $options: "i" },
            };
         }
         if (search) {
            criteria = {
               ...criteria,
               name: { $regex: `${search}`, $options: "i" },
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

         const aggregate = Product.aggregate([
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
            {
               $match: criteria,
            },
            {
               $sort: { "category.name": 1, name: 1 },
            },
         ]);

         let products = await Product.aggregatePaginate(aggregate, options);
         let copyProducts = JSON.parse(JSON.stringify(products.docs));
         let promises = [];

         for (let item of copyProducts) {
            let promise = getSignedUrl(item.thumbnail);
            promises.push(promise);
         }

         Promise.all(promises)
            .then((values) => {
               copyProducts.forEach((item, index) => {
                  copyProducts[index].thumbnail = values[index];
               });

               products.docs = copyProducts;

               return res.status(200).send({
                  status: 200,
                  payload: products,
                  message: "Get all products",
                  errorDetail: null,
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
   createProduct: async (req, res) => {
      try {
         const { name, category, variant, price, description, status, weight } =
            req.body;
         let thumbnail = "";

         if (req.file) {
            thumbnail = req.file.key;
         }

         const newProduct = await new Product({
            name,
            category,
            variant,
            price,
            description,
            thumbnail,
            status,
            weight,
         }).save();

         return res.status(201).send({
            status: 201,
            payload: newProduct,
            message: "Product created successfully",
            errorDetail: null,
         });
      } catch (err) {
         // Untuk menghapus file yang diupload
         if (req.file) {
            deleteS3Object(req.file.key);
         }

         let response = {
            status: 500,
            message: "Internal Server Error",
         };

         if (err.name === "ValidationError") {
            response = {
               status: 409,
               message: "Validation Error",
               errorDetail: err.errors,
            };
         }

         if (err.code === 11000) {
            // Mengambil nama field yang menyebabkan error
            const key = Object.keys(err.keyValue)[0];
            response = {
               status: 409,
               message: `Failed to create product with existed ${key}`,
               errorDetail: err,
            };
         }

         return res.status(response.status).send(response);
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
         const { name, category, variant, price, description, status, weight } =
            req.body;
         const { id } = req.params;
         const oldProduct = await Product.findById(id);
         let { thumbnail } = oldProduct;

         if (req.file) {
            thumbnail = req.file.key;
         }

         const updateProduct = await Product.findByIdAndUpdate(
            id,
            {
               name,
               category,
               variant,
               price,
               description,
               thumbnail,
               status,
               weight,
            },
            { new: true, runValidators: true }
         );

         if (checkS3Object(oldProduct.thumbnail) && req.file) {
            deleteS3Object(oldProduct.thumbnail);
         }

         return res.status(201).send({
            status: 201,
            payload: updateProduct,
            message: "Product updated successfully",
            errorDetail: null,
         });
      } catch (err) {
         // Untuk menghapus file yang diupload
         if (req.file) {
            deleteS3Object(req.file.key);
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
               message: `Failed to update product with existed ${key}`,
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
               if (checkS3Object(thumbnail)) {
                  deleteS3Object(thumbnail);
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
         res.status(500).send({
            status: 500,
            payload: null,
            message: "Failed to delete product",
            errorDetail: error,
         });
      }
   },
   getCatalog: async (req, res) => {
      try {
         let criteria = { status: "Active" };
         let options = {
            pagination: false,
            sort: { "category.name": 1, name: 1 },
         };

         const aggregate = Product.aggregate([
            {
               $match: criteria,
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
            {
               $sort: { "category.name": 1, name: 1 },
            },
         ]);

         let products = await Product.aggregatePaginate(aggregate, options);
         let copyProducts = JSON.parse(JSON.stringify(products.docs));
         let promises = [];

         for (let item of copyProducts) {
            let promise = getS3Object(item.thumbnail);
            promises.push(promise);
         }

         Promise.all(promises)
            .then((values) => {
               copyProducts.forEach((item, index) => {
                  copyProducts[index].display = values[index];
               });

               products.docs = copyProducts;

               return res.status(200).send({
                  status: 200,
                  payload: products,
                  message: "Get all products",
               });
            })
            .catch((error) => {
               throw error;
            });
      } catch (error) {
         return res.status(500).send({
            status: 500,
            message: "Internal Server Error",
            errorDetail: error,
         });
      }
   },
   awsTest: async (req, res) => {
      try {
         const { name } = req.body;
         let thumbnail = "";

         if (req.file) {
            thumbnail = req.file.key;
         }

         const newTestItem = await new Test({
            name,
            thumbnail,
         }).save();

         res.status(201).send({
            status: 201,
            payload: newTestItem,
            message: "Product created successfully",
            errorDetail: null,
         });
      } catch (err) {
         // Untuk menghapus file yang diupload
         if (req.file) {
            fs.unlinkSync(req.file.key);
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
               status: 400,
               payload: null,
               message: "Failed to create product",
               errorDetail: err,
            });
         }
      }
   },
   getTest: async (req, res) => {
      try {
         let items = await Test.find();
         let promises = [];

         for (let item of items) {
            let promise = getSignedUrl(item.thumbnail);
            promises.push(promise);
         }

         Promise.all(promises)
            .then((values) => {
               items.forEach((item, index) => {
                  items[index].thumbnail = values[index];
               });

               res.status(200).send({
                  status: 200,
                  payload: items,
                  message: "Get all test items",
               });
            })
            .catch((error) => {
               throw error;
            });
      } catch (error) {
         res.status(500).send({
            status: 500,
            message: "Internal Server Error",
            error_detail: error,
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
