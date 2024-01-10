const Category = require("./model");

module.exports = {
   getCategories: async (req, res) => {
      try {
         const { search = "", p } = req.query;
         let criteria = {};
         let options = {
            sort: { name: 1 },
            pagination: false,
         };

         if (search)
            criteria = {
               name: { $regex: `${search}`, $options: "i" },
            };

         if (p)
            options = {
               ...options,
               pagination: true,
               page: p,
               limit: 10,
            };
         const categories = await Category.paginate(criteria, options);

         res.status(200).send({
            status: 200,
            payload: categories,
            message: "Get all categories",
         });
      } catch (error) {
         res.status(500).send({
            status: 500,
            message: "Failed to get categories",
            errorDetail: error,
         });
      }
   },
   createCategory: async (req, res) => {
      const { name } = req.body;
      const newCategory = new Category({ name });

      await newCategory
         .save()
         .then((result) => {
            res.status(200).send({
               payload: result,
               message: "Category created successfully",
               errorDetail: null,
            });
         })
         .catch((err) => {
            if (err.name === "ValidationError") {
               res.status(409).send({
                  payload: null,
                  message: "Validation Error",
                  errorDetail: err.errors,
               });
            } else if (err.code === 11000) {
               const key = Object.keys(err.keyValue)[0];
               res.status(409).send({
                  payload: null,
                  message: `Failed to create category with existed ${key}`,
                  errorDetail: err,
               });
            } else {
               res.status(409).send({
                  payload: null,
                  message: "Failed to create category",
                  errorDetail: err,
               });
            }
         });
   },
   detailCategory: async (req, res) => {
      const { id } = req.params;

      await Category.findById(id)
         .then((result) => {
            res.status(200).send({
               payload: result,
               message: "Get category detail successful",
               errorDetail: null,
            });
         })
         .catch((err) => {
            res.status(404).send({
               payload: null,
               message: "Category not found",
               errorDetail: err,
            });
         });
   },
   updateCategory: async (req, res) => {
      const { id } = req.params;
      const { name } = req.body;

      try {
         const result = await Category.findByIdAndUpdate(
            id,
            { name },
            { new: true, runValidators: true }
         );

         if (result) {
            res.status(201).send({
               status: 201,
               payload: result,
               message: "Category updated successfully",
               errorDetail: null,
            });
         }
      } catch (error) {
         if (error.name === "ValidationError") {
            res.status(409).send({
               status: 409,
               payload: null,
               message: "Validation Error",
               errorDetail: error.errors,
            });
         } else if (error.code === 11000) {
            // Mengambil nama field yang menyebabkan error
            const key = Object.keys(error.keyValue)[0];
            res.status(409).send({
               status: 409,
               payload: null,
               message: `Failed to update category with existed ${key}`,
               errorDetail: error,
            });
         } else {
            res.status(400).send({
               status: 400,
               payload: null,
               message: "Failed to update category",
               errorDetail: error,
            });
         }
      }
   },
   deleteCategory: async (req, res) => {
      const { id } = req.params;

      await Category.findOneAndDelete({ _id: id })
         .then((result) => {
            if (result) {
               res.status(200).send({
                  payload: result,
                  message: "Category deleted successfully",
                  errorDetail: null,
               });
            } else {
               // Handling error yang disebabkan ketika object sudah terhapus namun tidak masuk ke .catch/error
               res.status(404).send({
                  payload: null,
                  message: "Category has been deleted",
                  errorDetail: null,
               });
            }
         })
         .catch((err) => {
            res.status(404).send({
               payload: null,
               message: "Failed to delete Category",
               errorDetail: err,
            });
         });
   },
};
