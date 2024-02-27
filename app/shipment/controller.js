const Shipment = require("./model");

module.exports = {
   getShipments: async (req, res) => {
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

         const aggregate = Shipment.aggregate([
            { $sort: { "delivery.datetime": -1 } },
         ]);

         const shipments = await Shipment.aggregatePaginate(aggregate, options);

         let responseData = {
            status: 200,
            payload: shipments,
            message: "Successfully get all shipments",
         };

         if (!shipments.docs.length) {
            responseData = {
               status: 404,
               message: "Shipment not found",
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

   createShipment: async (req, res) => {
      try {
         const newShipment = await Shipment.create(req.body);
         res.status(201).send({
            status: 201,
            message: "Shipment created successfully",
            payload: newShipment,
         });
      } catch (error) {
         res.status(400).send({
            status: 400,
            message: "Failed to create shipment",
            errorDetail: error,
         });
      }
   },
};
